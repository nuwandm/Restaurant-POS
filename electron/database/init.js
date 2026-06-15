const Database = require("better-sqlite3");
const path = require("path");

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  init() {
    const dbPath = process.env.DB_PATH || (() => {
      const { app } = require("electron");
      return path.join(app.getPath("userData"), "hotel_pos.db");
    })();
    console.log("Database path:", dbPath);

    this.db = new Database(dbPath);

    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("cache_size = 10000");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("temp_store = MEMORY");

    this.runMigrations();
    this.runKotMigration();
    this.runFeatureMigrations();
    this.createIndexes();
    this.insertSampleData();

    console.log("Connected to SQLite database");
    return this;
  }

  runMigrations() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        category TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2) DEFAULT 0,
        description TEXT,
        image_url TEXT,
        preparation_time INTEGER DEFAULT 15,
        is_available BOOLEAN DEFAULT 1,
        is_active BOOLEAN DEFAULT 1,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number INTEGER NOT NULL UNIQUE,
        capacity INTEGER NOT NULL,
        zone TEXT DEFAULT 'Main Hall',
        position_x INTEGER DEFAULT 0,
        position_y INTEGER DEFAULT 0,
        shape TEXT DEFAULT 'square',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        pin TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        table_id INTEGER,
        waiter_id INTEGER,
        customer_name TEXT,
        customer_phone TEXT,
        order_type TEXT DEFAULT 'dine-in',
        status TEXT DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (table_id) REFERENCES tables(id),
        FOREIGN KEY (waiter_id) REFERENCES staff(id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        menu_item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        prepared_at DATETIME,
        served_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        transaction_number TEXT UNIQUE NOT NULL,
        payment_method TEXT NOT NULL,
        amount_paid DECIMAL(10, 2) NOT NULL,
        change_amount DECIMAL(10, 2) DEFAULT 0,
        status TEXT DEFAULT 'completed',
        cashier_id INTEGER,
        reference_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (cashier_id) REFERENCES staff(id)
      );
    `);
  }

  runKotMigration() {
    // Add KOT columns to orders if they don't exist yet (safe for existing DBs)
    const orderCols = this.db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
    if (!orderCols.includes('kot_number'))     this.db.exec("ALTER TABLE orders ADD COLUMN kot_number INTEGER");
    if (!orderCols.includes('kot_printed_at')) this.db.exec("ALTER TABLE orders ADD COLUMN kot_printed_at DATETIME");
    // Add kot_required to menu_items (default 1 = needs kitchen, safe for existing DBs)
    const menuCols = this.db.prepare("PRAGMA table_info(menu_items)").all().map(c => c.name);
    if (!menuCols.includes('kot_required')) this.db.exec("ALTER TABLE menu_items ADD COLUMN kot_required INTEGER NOT NULL DEFAULT 1");
    // Daily KOT counter table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kot_counters (
        date TEXT PRIMARY KEY,
        last_number INTEGER NOT NULL DEFAULT 0
      );
    `);
    // Global order sequence counter (never resets)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS order_counters (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_number INTEGER NOT NULL DEFAULT 0
      );
    `);
    // Seed with 1 row if not present; seed value from existing orders so restarts don't collide
    const counterRow = this.db.prepare("SELECT last_number FROM order_counters WHERE id = 1").get();
    if (!counterRow) {
      const maxRow = this.db.prepare("SELECT MAX(id) as m FROM orders").get();
      this.db.prepare("INSERT INTO order_counters (id, last_number) VALUES (1, ?)").run(maxRow?.m || 0);
    }
    // KOT snapshot: tracks qty already sent to kitchen per order item
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kot_snapshots (
        order_id INTEGER NOT NULL,
        menu_item_id INTEGER NOT NULL,
        qty_sent INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (order_id, menu_item_id)
      );
    `);
    // KOT items: each row = one item in one specific KOT print, tracks served qty
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kot_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        kot_number INTEGER NOT NULL,
        menu_item_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        qty_served INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        printed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  runFeatureMigrations() {
    // ── order_items: void tracking ──
    const oiCols = this.db.prepare("PRAGMA table_info(order_items)").all().map(c => c.name);
    if (!oiCols.includes('voided'))      this.db.exec("ALTER TABLE order_items ADD COLUMN voided INTEGER DEFAULT 0");
    if (!oiCols.includes('void_reason')) this.db.exec("ALTER TABLE order_items ADD COLUMN void_reason TEXT");
    if (!oiCols.includes('voided_at'))   this.db.exec("ALTER TABLE order_items ADD COLUMN voided_at DATETIME");

    // ── orders: discount + shift ──
    const orderCols = this.db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
    if (!orderCols.includes('discount_type'))   this.db.exec("ALTER TABLE orders ADD COLUMN discount_type TEXT");
    if (!orderCols.includes('discount_reason')) this.db.exec("ALTER TABLE orders ADD COLUMN discount_reason TEXT");
    if (!orderCols.includes('shift_id'))        this.db.exec("ALTER TABLE orders ADD COLUMN shift_id INTEGER");

    // ── transactions: shift link ──
    const txCols = this.db.prepare("PRAGMA table_info(transactions)").all().map(c => c.name);
    if (!txCols.includes('shift_id')) this.db.exec("ALTER TABLE transactions ADD COLUMN shift_id INTEGER");

    // ── shifts table ──
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opening_float DECIMAL(10,2) NOT NULL DEFAULT 0,
        closing_cash_count DECIMAL(10,2),
        expected_cash DECIMAL(10,2),
        cash_difference DECIMAL(10,2),
        total_cash_sales DECIMAL(10,2) DEFAULT 0,
        total_card_sales DECIMAL(10,2) DEFAULT 0,
        total_mobile_sales DECIMAL(10,2) DEFAULT 0,
        total_discounts DECIMAL(10,2) DEFAULT 0,
        order_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'open',
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        notes TEXT
      );
    `);

    // ── staff: pin reset flag ──
    const staffCols = this.db.prepare("PRAGMA table_info(staff)").all().map(c => c.name);
    if (!staffCols.includes('pin_reset_required')) this.db.exec("ALTER TABLE staff ADD COLUMN pin_reset_required INTEGER DEFAULT 0");

    // ── void_kots audit table ──
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS void_kots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        order_item_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        void_reason TEXT NOT NULL,
        printed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  createIndexes() {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
      CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
    `);
  }

  insertSampleData() {
    const catStmt = this.db.prepare(
      "INSERT OR IGNORE INTO categories (name, color, display_order) VALUES (?, ?, ?)"
    );
    for (const cat of [
      ["Appetizers", "#F59E0B", 1],
      ["Main Course", "#10B981", 2],
      ["Desserts", "#EC4899", 3],
      ["Beverages", "#3B82F6", 4],
      ["Specials", "#8B5CF6", 5],
    ]) catStmt.run(cat);

    const tableStmt = this.db.prepare(
      "INSERT OR IGNORE INTO tables (number, capacity, zone) VALUES (?, ?, ?)"
    );
    for (const t of [
      [1, 4, "Main Hall"],
      [2, 4, "Main Hall"],
      [3, 6, "Main Hall"],
      [4, 2, "Window Side"],
      [5, 8, "Private"],
      [6, 4, "Main Hall"],
      [7, 6, "Window Side"],
      [8, 2, "Bar Area"],
    ]) tableStmt.run(t);

    const menuStmt = this.db.prepare(
      "INSERT OR IGNORE INTO menu_items (name, code, category, price, preparation_time) VALUES (?, ?, ?, ?, ?)"
    );
    for (const item of [
      ["Caesar Salad", "APP001", "Appetizers", 12.99, 10],
      ["Soup of the Day", "APP002", "Appetizers", 8.99, 5],
      ["Garlic Bread", "APP003", "Appetizers", 6.99, 5],
      ["Grilled Chicken", "MAIN001", "Main Course", 24.99, 20],
      ["Beef Steak", "MAIN002", "Main Course", 34.99, 25],
      ["Pasta Carbonara", "MAIN003", "Main Course", 18.99, 15],
      ["Grilled Salmon", "MAIN004", "Main Course", 28.99, 20],
      ["Chocolate Cake", "DES001", "Desserts", 8.99, 5],
      ["Ice Cream", "DES002", "Desserts", 5.99, 2],
      ["Cheesecake", "DES003", "Desserts", 7.99, 5],
      ["Fresh Orange Juice", "BEV001", "Beverages", 5.99, 5],
      ["Coffee", "BEV002", "Beverages", 3.99, 5],
      ["Soft Drinks", "BEV003", "Beverages", 3.99, 1],
      ["Wine", "BEV004", "Beverages", 12.99, 1],
      ["Chef Special", "SPC001", "Specials", 29.99, 30],
    ]) menuStmt.run(item);

    // Seed a default admin only on first run (when no staff exist yet)
    const staffCount = this.db.prepare("SELECT COUNT(*) as c FROM staff WHERE is_active=1").get();
    if (staffCount.c === 0) {
      this.db.prepare(
        "INSERT INTO staff (name, role, pin) VALUES (?, ?, ?)"
      ).run("Admin", "admin", "0000");
    }
  }

  query(action, data) {
    switch (action) {
      case "getTables":
        return this.db.prepare(`
          SELECT t.*,
                 CASE WHEN COUNT(o.id) > 0 THEN 'occupied' ELSE 'available' END as status,
                 MAX(o.id) as active_order_id
          FROM tables t
          LEFT JOIN orders o ON t.id = o.table_id AND o.status IN ('pending', 'preparing')
          WHERE t.is_active = 1
          GROUP BY t.id
          ORDER BY t.number
        `).all();

      case "getMenuItems":
        return this.db.prepare(`
          SELECT *, COALESCE(kot_required, 1) as kot_required FROM menu_items WHERE is_active = 1 ORDER BY category, name
        `).all();

      case "getCategories":
        return this.db.prepare(`
          SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order
        `).all();

      case "getActiveOrders":
        return this.db.prepare(`
          SELECT o.*, t.number as table_number
          FROM orders o
          LEFT JOIN tables t ON o.table_id = t.id
          WHERE o.status IN ('pending', 'preparing')
          ORDER BY o.created_at DESC
        `).all();

      case "createOrder":
        return this.createOrder(data);

      case "updateOrderStatus":
        this.db.prepare(
          "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(data.status, data.orderId);
        return { success: true };

      case "processPayment":
        return this.processPayment(data);

      case "addMenuItem":
        return this.db.prepare(`
          INSERT INTO menu_items (name, code, category, price, cost, description, preparation_time, is_available, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
        `).run(
          data.name, data.code || null, data.category, data.price,
          data.cost || 0, data.description || null, data.preparation_time || 15
        );

      case "updateMenuItem":
        this.db.prepare(`
          UPDATE menu_items SET name=?, code=?, category=?, price=?, cost=?, description=?,
          preparation_time=?, is_available=?, kot_required=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(
          data.name, data.code || null, data.category, data.price,
          data.cost || 0, data.description || null, data.preparation_time || 15,
          data.is_available ? 1 : 0, data.kot_required !== false ? 1 : 0, data.id
        );
        return { success: true };

      case "deleteMenuItem":
        this.db.prepare("UPDATE menu_items SET is_active=0 WHERE id=?").run(data.id);
        return { success: true };

      case "addCategory":
        return this.db.prepare(`
          INSERT OR IGNORE INTO categories (name, color, display_order) VALUES (?, ?, ?)
        `).run(data.name, data.color || '#3B82F6', data.display_order || 0);

      case "deleteCategory": {
        const inUse = this.db.prepare(
          "SELECT COUNT(*) as n FROM menu_items WHERE category = ? AND is_active = 1"
        ).get(data.name);
        if (inUse.n > 0) throw new Error(`Cannot delete — ${inUse.n} item(s) still use this category. Reassign or delete those items first.`);
        this.db.prepare("UPDATE categories SET is_active=0 WHERE name=?").run(data.name);
        return { success: true };
      }

      case "getOrdersHistory": {
        const where = data?.status ? `WHERE o.status = '${data.status}'` : '';
        return this.db.prepare(`
          SELECT o.*, t.number as table_number,
                 COUNT(oi.id) as item_count
          FROM orders o
          LEFT JOIN tables t ON o.table_id = t.id
          LEFT JOIN order_items oi ON o.id = oi.order_id
          ${where}
          GROUP BY o.id
          ORDER BY o.created_at DESC
          LIMIT 200
        `).all();
      }

      case "getOrderItems": {
        return this.db.prepare(`
          SELECT oi.*, m.name, m.category
          FROM order_items oi
          JOIN menu_items m ON oi.menu_item_id = m.id
          WHERE oi.order_id = ?
        `).all(data.orderId);
      }

      case "getPendingOrdersWithItems": {
        const orders = this.db.prepare(`
          SELECT o.*, t.number as table_number
          FROM orders o
          LEFT JOIN tables t ON o.table_id = t.id
          WHERE o.status IN ('pending', 'preparing')
          ORDER BY o.created_at ASC
        `).all();

        const getItems = this.db.prepare(`
          SELECT oi.*, m.name, m.category, m.code
          FROM order_items oi
          JOIN menu_items m ON oi.menu_item_id = m.id
          WHERE oi.order_id = ?
        `);

        return orders.map(order => ({
          ...order,
          items: getItems.all(order.id).map(item => ({
            id: item.menu_item_id,
            orderItemId: String(item.id),
            dbOrderItemId: item.id,
            name: item.name,
            category: item.category,
            code: item.code,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes,
            voided: item.voided ? true : false,
            void_reason: item.void_reason || null,
          })),
        }));
      }

      case "cancelOrder":
        this.db.prepare(
          "UPDATE orders SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).run(data.orderId);
        this.db.prepare("DELETE FROM kot_items WHERE order_id = ?").run(data.orderId);
        return { success: true };

      case "updateOrderItems": {
        this.db.prepare(`
          UPDATE orders SET total_amount=?, tax_amount=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(data.total_amount, data.tax_amount, data.orderId);

        // Only delete non-voided rows so void audit trail is preserved
        this.db.prepare("DELETE FROM order_items WHERE order_id=? AND (voided IS NULL OR voided=0)").run(data.orderId);
        const insertItem = this.db.prepare(`
          INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const item of data.items) {
          insertItem.run(data.orderId, item.id, item.quantity, item.price, item.notes || null);
        }
        return { success: true };
      }

      case "syncTableCount": {
        const count = Math.max(1, Math.min(100, parseInt(data.count) || 1));
        const existing = this.db.prepare("SELECT number FROM tables WHERE is_active=1").all().map(r => r.number);
        const insert = this.db.prepare(`
          INSERT OR IGNORE INTO tables (number, capacity, zone, shape, is_active)
          VALUES (?, 4, 'Main Hall', 'square', 1)
        `);
        const sync = this.db.transaction(() => {
          for (let n = 1; n <= count; n++) {
            if (!existing.includes(n)) insert.run(n);
          }
          // Deactivate tables above count only if they have no active orders
          if (count < existing.length) {
            const safe = this.db.prepare(`
              SELECT t.id FROM tables t
              WHERE t.number > ? AND t.is_active=1
              AND NOT EXISTS (
                SELECT 1 FROM orders o WHERE o.table_id=t.id AND o.status IN ('pending','preparing')
              )
            `).all(count);
            const deact = this.db.prepare("UPDATE tables SET is_active=0 WHERE id=?");
            for (const row of safe) deact.run(row.id);
          }
        });
        sync();
        return { success: true };
      }

      case "addTable": {
        // If a soft-deleted table with this number exists, reactivate it instead of inserting
        const existing = this.db.prepare(
          "SELECT id FROM tables WHERE number = ? AND is_active = 0"
        ).get(data.number);
        if (existing) {
          this.db.prepare(`
            UPDATE tables SET capacity=?, zone=?, shape=?, is_active=1 WHERE id=?
          `).run(data.capacity, data.zone || 'Main Hall', data.shape || 'square', existing.id);
          return { success: true, id: existing.id };
        }
        const inserted = this.db.prepare(`
          INSERT INTO tables (number, capacity, zone, shape, is_active)
          VALUES (?, ?, ?, ?, 1)
        `).run(data.number, data.capacity, data.zone || 'Main Hall', data.shape || 'square');
        return { success: true, id: inserted.lastInsertRowid };
      }

      case "updateTable":
        this.db.prepare(`
          UPDATE tables SET number=?, capacity=?, zone=?, shape=?, is_active=?
          WHERE id=?
        `).run(data.number, data.capacity, data.zone || 'Main Hall', data.shape || 'square', data.is_active ? 1 : 0, data.id);
        return { success: true };

      case "deleteTable":
        this.db.prepare("UPDATE tables SET is_active=0 WHERE id=?").run(data.id);
        return { success: true };

      case "getTablesAdmin":
        return this.db.prepare(`
          SELECT t.*,
                 CASE WHEN COUNT(o.id) > 0 THEN 'occupied' ELSE 'available' END as status,
                 MAX(o.id) as active_order_id,
                 COUNT(o.id) as active_orders
          FROM tables t
          LEFT JOIN orders o ON t.id = o.table_id AND o.status IN ('pending','preparing')
          WHERE t.is_active = 1
          GROUP BY t.id
          ORDER BY t.number
        `).all();

      case "forceReleaseTable":
        this.db.prepare(
          "UPDATE orders SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE table_id=? AND status IN ('pending','preparing')"
        ).run(data.tableId);
        return { success: true };

      case "exportBackup": {
        const categories  = this.db.prepare("SELECT * FROM categories").all();
        const menuItems   = this.db.prepare("SELECT * FROM menu_items").all();
        const tables      = this.db.prepare("SELECT * FROM tables").all();
        const orders      = this.db.prepare("SELECT * FROM orders").all();
        const orderItems  = this.db.prepare("SELECT * FROM order_items").all();
        const transactions = this.db.prepare("SELECT * FROM transactions").all();
        const staff       = this.db.prepare("SELECT * FROM staff").all();
        return { categories, menuItems, tables, orders, orderItems, transactions, staff, exportedAt: new Date().toISOString() };
      }

      case "importBackup": {
        // Disable FK checks, restore in dependency order, re-enable after
        this.db.pragma("foreign_keys = OFF");
        try {
          const imp = this.db.transaction(() => {
            // Delete children first, then parents
            this.db.prepare("DELETE FROM transactions").run();
            this.db.prepare("DELETE FROM order_items").run();
            this.db.prepare("DELETE FROM orders").run();
            this.db.prepare("DELETE FROM tables").run();
            this.db.prepare("DELETE FROM menu_items").run();
            this.db.prepare("DELETE FROM categories").run();
            this.db.prepare("DELETE FROM staff").run();
            this.db.prepare("DELETE FROM kot_counters").run();
            this.db.prepare("DELETE FROM kot_snapshots").run();

            // Insert parents first, then children
            if (data.categories)   { const s = this.db.prepare("INSERT OR REPLACE INTO categories (id,name,color,display_order,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)");                                                                                                              for (const r of data.categories)   s.run(r.id,r.name,r.color,r.display_order,r.is_active,r.created_at,r.updated_at); }
            if (data.menuItems)    { const s = this.db.prepare("INSERT OR REPLACE INTO menu_items (id,name,code,category,price,cost,description,image_url,preparation_time,is_available,is_active,kot_required,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");               for (const r of data.menuItems)    s.run(r.id,r.name,r.code,r.category,r.price,r.cost,r.description,r.image_url,r.preparation_time,r.is_available,r.is_active,r.kot_required??1,r.tags,r.created_at,r.updated_at); }
            if (data.tables)       { const s = this.db.prepare("INSERT OR REPLACE INTO tables (id,number,capacity,zone,position_x,position_y,shape,is_active,created_at) VALUES (?,?,?,?,?,?,?,?,?)");                                                                                               for (const r of data.tables)       s.run(r.id,r.number,r.capacity,r.zone,r.position_x,r.position_y,r.shape,r.is_active,r.created_at); }
            if (data.staff)        { const s = this.db.prepare("INSERT OR REPLACE INTO staff (id,name,role,pin,email,phone,is_active,created_at,last_login) VALUES (?,?,?,?,?,?,?,?,?)");                                                                                                             for (const r of data.staff)        s.run(r.id,r.name,r.role,r.pin,r.email,r.phone,r.is_active,r.created_at,r.last_login); }
            if (data.orders)       { const s = this.db.prepare("INSERT OR REPLACE INTO orders (id,order_number,table_id,waiter_id,customer_name,customer_phone,order_type,status,total_amount,discount_amount,tax_amount,notes,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"); for (const r of data.orders) s.run(r.id,r.order_number,r.table_id,r.waiter_id,r.customer_name,r.customer_phone,r.order_type,r.status,r.total_amount,r.discount_amount,r.tax_amount,r.notes,r.created_at,r.updated_at,r.completed_at); }
            if (data.orderItems)   { const s = this.db.prepare("INSERT OR REPLACE INTO order_items (id,order_id,menu_item_id,quantity,price,notes,status,prepared_at,served_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");                                                                             for (const r of data.orderItems)   s.run(r.id,r.order_id,r.menu_item_id,r.quantity,r.price,r.notes,r.status,r.prepared_at,r.served_at,r.created_at); }
            if (data.transactions) { const s = this.db.prepare("INSERT OR REPLACE INTO transactions (id,order_id,transaction_number,payment_method,amount_paid,change_amount,status,cashier_id,reference_number,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");                                          for (const r of data.transactions) s.run(r.id,r.order_id,r.transaction_number,r.payment_method,r.amount_paid,r.change_amount,r.status,r.cashier_id,r.reference_number,r.created_at); }
          });
          imp();
        } finally {
          this.db.pragma("foreign_keys = ON");
        }
        return { success: true };
      }

      case "getNextKotNumber": {
        // Atomically increment and return today's KOT counter
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
        const getCounter = this.db.transaction(() => {
          this.db.prepare(`
            INSERT INTO kot_counters (date, last_number) VALUES (?, 1)
            ON CONFLICT(date) DO UPDATE SET last_number = last_number + 1
          `).run(today);
          return this.db.prepare("SELECT last_number FROM kot_counters WHERE date = ?").get(today).last_number;
        });
        const kotNum = getCounter();
        return { kotNumber: kotNum, date: today };
      }

      case "markKotPrinted": {
        this.db.prepare(`
          UPDATE orders SET kot_number=?, kot_printed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(data.kotNumber, data.orderId);
        return { success: true };
      }

      case "getKotSnapshot": {
        // Returns { menu_item_id -> qty_sent } for a given order
        const rows = this.db.prepare(
          "SELECT menu_item_id, qty_sent FROM kot_snapshots WHERE order_id = ?"
        ).all(data.orderId);
        const snapshot = {};
        for (const r of rows) snapshot[r.menu_item_id] = r.qty_sent;
        return snapshot;
      }

      case "saveKotSnapshot": {
        // Upsert sent quantities into the snapshot for this order
        // data.items: [{ menu_item_id, qty_sent }]
        const upsert = this.db.prepare(`
          INSERT INTO kot_snapshots (order_id, menu_item_id, qty_sent)
          VALUES (?, ?, ?)
          ON CONFLICT(order_id, menu_item_id)
          DO UPDATE SET qty_sent = excluded.qty_sent
        `);
        const run = this.db.transaction(() => {
          for (const item of data.items) {
            upsert.run(data.orderId, item.menu_item_id, item.qty_sent);
          }
        });
        run();
        return { success: true };
      }

      case "clearKotSnapshot": {
        this.db.prepare("DELETE FROM kot_snapshots WHERE order_id = ?").run(data.orderId);
        // For dine-in: clear kot_items on payment so the table is immediately freed.
        // For takeaway: keep kot_items so kitchen queue shows them until manually marked done.
        if (data.orderType !== 'takeaway') {
          this.db.prepare("DELETE FROM kot_items WHERE order_id = ?").run(data.orderId);
        }
        return { success: true };
      }

      case "addKotItems": {
        // Called after each KOT print — inserts the diff items for this specific KOT
        const ins = this.db.prepare(`
          INSERT INTO kot_items (order_id, kot_number, menu_item_id, name, quantity, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const run = this.db.transaction(() => {
          for (const item of data.items) {
            ins.run(data.orderId, data.kotNumber, item.menu_item_id, item.name, item.quantity, item.notes || null);
          }
        });
        run();
        return { success: true };
      }

      case "markKotItemServed": {
        // Mark a single item line as fully served
        this.db.prepare(`
          UPDATE kot_items SET qty_served = quantity WHERE id = ?
        `).run(data.id);
        return { success: true };
      }

      case "markKotServed": {
        // Delete the KOT items so they don't reappear on next refresh
        this.db.prepare(`
          DELETE FROM kot_items
          WHERE order_id = ? AND kot_number = ?
        `).run(data.orderId, data.kotNumber);
        return { success: true };
      }

      case "getActiveKots": {
        // Returns all unserved KOT items — include completed orders so takeaway stays visible after payment
        const rows = this.db.prepare(`
          SELECT
            ki.id,
            ki.order_id,
            ki.kot_number,
            ki.menu_item_id,
            ki.name,
            ki.quantity,
            ki.qty_served,
            ki.notes,
            ki.printed_at,
            o.order_type,
            o.order_number,
            o.customer_name,
            t.number AS table_number
          FROM kot_items ki
          JOIN orders o ON ki.order_id = o.id
          LEFT JOIN tables t ON o.table_id = t.id
          ORDER BY ki.printed_at ASC, ki.kot_number ASC, ki.id ASC
        `).all();

        // Group by (order_id, kot_number)
        const kotMap = {};
        for (const row of rows) {
          const key = `${row.order_id}_${row.kot_number}`;
          if (!kotMap[key]) {
            kotMap[key] = {
              order_id:      row.order_id,
              kot_number:    row.kot_number,
              order_number:  row.order_number,
              order_type:    row.order_type,
              table_number:  row.table_number,
              customer_name: row.customer_name || null,
              printed_at:    row.printed_at,
              items:         [],
            };
          }
          kotMap[key].items.push({
            id:          row.id,
            menu_item_id: row.menu_item_id,
            name:        row.name,
            quantity:    row.quantity,
            qty_served:  row.qty_served,
            notes:       row.notes,
          });
        }
        return Object.values(kotMap);
      }

      case "clearOrderHistory":
        this.db.prepare("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status IN ('completed','cancelled'))").run();
        this.db.prepare("DELETE FROM transactions WHERE order_id IN (SELECT id FROM orders WHERE status IN ('completed','cancelled'))").run();
        this.db.prepare("DELETE FROM orders WHERE status IN ('completed','cancelled')").run();
        return { success: true };

      case "clearAllOrders":
        this.db.prepare("DELETE FROM order_items").run();
        this.db.prepare("DELETE FROM transactions").run();
        this.db.prepare("DELETE FROM kot_items").run();
        this.db.prepare("DELETE FROM kot_snapshots").run();
        this.db.prepare("DELETE FROM orders").run();
        return { success: true };

      case "getReportSummary": {
        // data: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
        // Use local date as default (toISOString gives UTC date which may be yesterday in +5:30)
        const todayLocal = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz
        const from = data?.from || todayLocal;
        const to   = data?.to   || from;
        // completed_at stored as UTC (CURRENT_TIMESTAMP). Convert local day boundaries to UTC strings.
        const tzOffsetMin = new Date().getTimezoneOffset(); // negative for UTC+ zones e.g. -330 for UTC+5:30
        const localOffsetMin = -tzOffsetMin; // +330 for UTC+5:30
        // Use minutes modifier — SQLite accepts integer minutes, NOT decimal hours ('+5.5 hours' breaks)
        const tzMod = localOffsetMin >= 0 ? `+${localOffsetMin} minutes` : `${localOffsetMin} minutes`;
        const fromTs = new Date(`${from}T00:00:00`).toISOString().slice(0, 19).replace('T', ' ');
        const toTs   = new Date(`${to}T23:59:59`).toISOString().slice(0, 19).replace('T', ' ');

        const totals = this.db.prepare(`
          SELECT
            COUNT(*) as order_count,
            SUM(total_amount) as revenue,
            SUM(tax_amount) as tax,
            SUM(total_amount - tax_amount) as subtotal,
            AVG(total_amount) as avg_order
          FROM orders
          WHERE status = 'completed'
            AND completed_at BETWEEN ? AND ?
        `).get(fromTs, toTs);

        const byDay = this.db.prepare(`
          SELECT
            DATE(completed_at, ?) as day,
            COUNT(*) as orders,
            SUM(total_amount) as revenue
          FROM orders
          WHERE status = 'completed'
            AND completed_at BETWEEN ? AND ?
          GROUP BY DATE(completed_at, ?)
          ORDER BY day ASC
        `).all(tzMod, fromTs, toTs, tzMod);

        const topItems = this.db.prepare(`
          SELECT
            m.name,
            m.category,
            SUM(oi.quantity) as qty,
            SUM(oi.quantity * oi.price) as revenue
          FROM order_items oi
          JOIN menu_items m ON oi.menu_item_id = m.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.status = 'completed'
            AND o.completed_at BETWEEN ? AND ?
          GROUP BY oi.menu_item_id
          ORDER BY qty DESC
          LIMIT 10
        `).all(fromTs, toTs);

        const byMethod = this.db.prepare(`
          SELECT
            payment_method,
            COUNT(*) as count,
            SUM(amount_paid) as total
          FROM transactions
          JOIN orders ON transactions.order_id = orders.id
          WHERE orders.status = 'completed'
            AND orders.completed_at BETWEEN ? AND ?
          GROUP BY payment_method
        `).all(fromTs, toTs);

        const byType = this.db.prepare(`
          SELECT
            order_type,
            COUNT(*) as count,
            SUM(total_amount) as revenue
          FROM orders
          WHERE status = 'completed'
            AND completed_at BETWEEN ? AND ?
          GROUP BY order_type
        `).all(fromTs, toTs);

        const hourly = this.db.prepare(`
          SELECT
            CAST(strftime('%H', completed_at, ?) AS INTEGER) as hour,
            COUNT(*) as orders,
            SUM(total_amount) as revenue
          FROM orders
          WHERE status = 'completed'
            AND completed_at BETWEEN ? AND ?
          GROUP BY hour
          ORDER BY hour ASC
        `).all(tzMod, fromTs, toTs);

        return { totals, byDay, topItems, byMethod, byType, hourly };
      }

      // ── Staff / Auth ──────────────────────────────────────────────────────
      case "loginWithPin": {
        const staff = data.id
          ? this.db.prepare("SELECT id, name, role, pin_reset_required FROM staff WHERE id=? AND pin=? AND is_active=1").get(data.id, data.pin)
          : this.db.prepare("SELECT id, name, role, pin_reset_required FROM staff WHERE pin=? AND is_active=1").get(data.pin);
        if (!staff) return { success: false, error: "Invalid PIN" };
        this.db.prepare("UPDATE staff SET last_login=CURRENT_TIMESTAMP WHERE id=?").run(staff.id);
        return { success: true, staff };
      }

      case "resetStaffPin": {
        // Admin sets a temporary PIN and marks pin_reset_required=1
        this.db.prepare(
          "UPDATE staff SET pin=?, pin_reset_required=1 WHERE id=?"
        ).run(data.tempPin, data.id);
        return { success: true };
      }

      case "setOwnPin": {
        // User sets their own PIN after a reset (clears the flag)
        this.db.prepare(
          "UPDATE staff SET pin=?, pin_reset_required=0 WHERE id=?"
        ).run(data.pin, data.id);
        return { success: true };
      }

      case "getStaff":
        return this.db.prepare("SELECT id, name, role, pin, email, phone, is_active, pin_reset_required, created_at, last_login FROM staff ORDER BY name").all();

      case "addStaff": {
        const { lastInsertRowid } = this.db.prepare(
          "INSERT INTO staff (name, role, pin, email, phone, is_active) VALUES (?,?,?,?,?,1)"
        ).run(data.name, data.role, data.pin, data.email || null, data.phone || null);
        return { success: true, id: lastInsertRowid };
      }

      case "updateStaff": {
        this.db.prepare(
          "UPDATE staff SET name=?, role=?, pin=?, email=?, phone=? WHERE id=?"
        ).run(data.name, data.role, data.pin, data.email || null, data.phone || null, data.id);
        return { success: true };
      }

      case "deleteStaff": {
        const me = this.db.prepare("SELECT role FROM staff WHERE id=?").get(data.id);
        if (me?.role === 'admin') {
          const adminCount = this.db.prepare("SELECT COUNT(*) as n FROM staff WHERE role='admin' AND is_active=1").get();
          if (adminCount.n <= 1) throw new Error("Cannot delete the last admin account.");
        }
        this.db.prepare("UPDATE staff SET is_active=0 WHERE id=?").run(data.id);
        return { success: true };
      }

      // ── Shift Management ──────────────────────────────────────────────────
      case "openShift": {
        const open = this.db.prepare("SELECT id FROM shifts WHERE status='open' LIMIT 1").get();
        if (open) throw new Error("A shift is already open. Close the current shift before opening a new one.");
        const { lastInsertRowid } = this.db.prepare(`
          INSERT INTO shifts (opening_float, status, opened_at) VALUES (?, 'open', CURRENT_TIMESTAMP)
        `).run(data.openingFloat ?? 0);
        return { success: true, shiftId: lastInsertRowid };
      }

      case "getOpenShift": {
        const shift = this.db.prepare("SELECT * FROM shifts WHERE status='open' LIMIT 1").get();
        return shift || null;
      }

      case "closeShift": {
        const shift = this.db.prepare("SELECT * FROM shifts WHERE id=? AND status='open'").get(data.shiftId);
        if (!shift) throw new Error("Shift not found or already closed.");

        // Aggregate sales from completed orders in this shift
        const sales = this.db.prepare(`
          SELECT
            COALESCE(SUM(CASE WHEN t.payment_method='cash'   THEN t.amount_paid END), 0) AS cash,
            COALESCE(SUM(CASE WHEN t.payment_method='card'   THEN t.amount_paid END), 0) AS card,
            COALESCE(SUM(CASE WHEN t.payment_method='mobile' THEN t.amount_paid END), 0) AS mobile,
            COUNT(DISTINCT o.id) AS order_count
          FROM orders o
          LEFT JOIN transactions t ON t.order_id = o.id
          WHERE o.shift_id = ? AND o.status = 'completed'
        `).get(data.shiftId);

        const discounts = this.db.prepare(`
          SELECT COALESCE(SUM(discount_amount), 0) AS total FROM orders WHERE shift_id=? AND status='completed'
        `).get(data.shiftId);

        const expectedCash = (shift.opening_float || 0) + (sales.cash || 0);
        const cashDiff = (data.closingCashCount ?? 0) - expectedCash;

        this.db.prepare(`
          UPDATE shifts SET
            closing_cash_count=?, expected_cash=?, cash_difference=?,
            total_cash_sales=?, total_card_sales=?, total_mobile_sales=?,
            total_discounts=?, order_count=?, status='closed',
            closed_at=CURRENT_TIMESTAMP, notes=?
          WHERE id=?
        `).run(
          data.closingCashCount ?? 0,
          expectedCash,
          cashDiff,
          sales.cash, sales.card, sales.mobile,
          discounts.total, sales.order_count,
          data.notes || null,
          data.shiftId
        );
        return { success: true };
      }

      case "getShiftSummary": {
        const shift = this.db.prepare("SELECT * FROM shifts WHERE id=?").get(data.shiftId);
        if (!shift) throw new Error("Shift not found.");
        const topItems = this.db.prepare(`
          SELECT m.name, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.price) AS revenue
          FROM order_items oi
          JOIN menu_items m ON oi.menu_item_id = m.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.shift_id = ? AND o.status = 'completed'
          GROUP BY oi.menu_item_id ORDER BY qty DESC LIMIT 5
        `).all(data.shiftId);
        return { shift, topItems };
      }

      case "getShiftHistory": {
        const shifts = this.db.prepare(`
          SELECT * FROM shifts ORDER BY opened_at DESC LIMIT 50
        `).all();
        return shifts;
      }

      // ── Void Item ─────────────────────────────────────────────────────────
      case "voidOrderItem": {
        const item = this.db.prepare("SELECT * FROM order_items WHERE id=?").get(data.orderItemId);
        if (!item) throw new Error("Order item not found.");
        if (item.voided) throw new Error("Item already voided.");

        this.db.prepare(`
          UPDATE order_items SET voided=1, void_reason=?, voided_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(data.reason, data.orderItemId);

        // Recalculate order totals excluding voided items
        const remaining = this.db.prepare(`
          SELECT SUM(quantity * price) AS subtotal FROM order_items
          WHERE order_id=? AND (voided IS NULL OR voided=0)
        `).get(item.order_id);
        const subtotal = remaining.subtotal || 0;
        const taxRate  = data.taxRate || 0;
        const newTotal = subtotal * (1 + taxRate / 100);
        const newTax   = subtotal * (taxRate / 100);
        this.db.prepare(`
          UPDATE orders SET total_amount=?, tax_amount=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(newTotal, newTax, item.order_id);

        return { success: true, voidedItem: { ...item, void_reason: data.reason } };
      }

      case "addVoidKot": {
        this.db.prepare(`
          INSERT INTO void_kots (order_id, order_item_id, item_name, quantity, void_reason)
          VALUES (?, ?, ?, ?, ?)
        `).run(data.orderId, data.orderItemId, data.itemName, data.quantity, data.reason);
        return { success: true };
      }

      // ── Discount ──────────────────────────────────────────────────────────
      case "applyDiscount": {
        this.db.prepare(`
          UPDATE orders SET
            discount_amount=?, discount_type=?, discount_reason=?,
            updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `).run(data.discountAmount, data.discountType, data.discountReason || null, data.orderId);
        return { success: true };
      }

      case "removeDiscount": {
        this.db.prepare(`
          UPDATE orders SET discount_amount=0, discount_type=NULL, discount_reason=NULL,
            updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `).run(data.orderId);
        return { success: true };
      }

      // ── JSON Export ───────────────────────────────────────────────────────
      case "exportOrdersJson": {
        const from = data?.from || new Date().toLocaleDateString('en-CA');
        const to   = data?.to   || from;
        const fromTs = new Date(`${from}T00:00:00`).toISOString().slice(0, 19).replace('T', ' ');
        const toTs   = new Date(`${to}T23:59:59`).toISOString().slice(0, 19).replace('T', ' ');
        const orders = this.db.prepare(`
          SELECT * FROM orders WHERE completed_at BETWEEN ? AND ? ORDER BY completed_at ASC
        `).all(fromTs, toTs);
        const ids = orders.map(o => o.id);
        if (ids.length === 0) return { orders: [], orderItems: [], transactions: [] };
        const placeholders = ids.map(() => '?').join(',');
        const orderItems   = this.db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`).all(...ids);
        const transactions = this.db.prepare(`SELECT * FROM transactions WHERE order_id IN (${placeholders})`).all(...ids);
        return { orders, orderItems, transactions, exportedAt: new Date().toISOString() };
      }

      case "verifyManagerPin": {
        const settings = data.pin;
        // PIN is stored in localStorage on the renderer side; here we just validate against staff table
        const staff = this.db.prepare("SELECT id, name, role FROM staff WHERE pin=? AND is_active=1").get(data.pin);
        if (!staff || !['admin', 'manager'].includes(staff.role)) return { valid: false };
        return { valid: true, staff };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  createOrder(orderData) {
    const prefix = (orderData.orderPrefix || 'ORD').toString().trim().toUpperCase();
    // Atomically increment global counter
    this.db.prepare("UPDATE order_counters SET last_number = last_number + 1 WHERE id = 1").run();
    const { last_number } = this.db.prepare("SELECT last_number FROM order_counters WHERE id = 1").get();
    const orderNumber = `${prefix}-${String(last_number).padStart(5, '0')}`;

    const insertOrder = this.db.transaction(() => {
      // Cancel any stale pending orders for this table before creating a new one
      this.db.prepare(
        "UPDATE orders SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE table_id=? AND status IN ('pending','preparing')"
      ).run(orderData.table_id);

      const { lastInsertRowid: orderId } = this.db.prepare(`
        INSERT INTO orders (order_number, table_id, waiter_id, order_type, total_amount, tax_amount, status, shift_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderNumber,
        orderData.table_id,
        orderData.waiter_id || 1,
        orderData.order_type || "dine-in",
        orderData.total_amount || 0,
        orderData.tax_amount || 0,
        "pending",
        orderData.shift_id || null
      );

      const insertItem = this.db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of orderData.items || []) {
        insertItem.run(
          orderId,
          item.menu_item_id || item.id,
          item.quantity || 1,
          item.price,
          item.notes || null
        );
      }

      return { orderId, orderNumber };
    });

    return insertOrder();
  }

  processPayment(paymentData) {
    const transactionNumber = "TRX" + Date.now();

    const doPayment = this.db.transaction(() => {
      const { lastInsertRowid: transactionId } = this.db.prepare(`
        INSERT INTO transactions (order_id, transaction_number, payment_method, amount_paid, change_amount, cashier_id, shift_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentData.orderId,
        transactionNumber,
        paymentData.method,
        paymentData.amount,
        paymentData.change,
        paymentData.cashierId || 1,
        paymentData.shift_id || null
      );

      this.db.prepare(
        "UPDATE orders SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run("completed", paymentData.orderId);

      return { transactionId, transactionNumber };
    });

    return doPayment();
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

let dbManager;

async function initDatabase() {
  if (!dbManager) {
    dbManager = new DatabaseManager();
    dbManager.init();
  }
  return dbManager;
}

module.exports = { initDatabase };
