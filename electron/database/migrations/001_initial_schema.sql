-- High-performance schema with proper indexing

-- Categories table
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

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2) DEFAULT 0,
  description TEXT,
  image_url TEXT,
  preparation_time INTEGER DEFAULT 15, -- minutes
  is_available BOOLEAN DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  tags TEXT, -- JSON array of tags
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER NOT NULL UNIQUE,
  capacity INTEGER NOT NULL,
  zone TEXT DEFAULT 'Main Hall',
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  shape TEXT DEFAULT 'square', -- square, round, rectangle
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- admin, manager, waiter, cashier, chef
  pin TEXT NOT NULL, -- hashed PIN for quick login
  email TEXT UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Orders (optimized for quick queries)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  table_id INTEGER,
  waiter_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  order_type TEXT DEFAULT 'dine-in', -- dine-in, takeaway, delivery
  status TEXT DEFAULT 'pending', -- pending, preparing, ready, served, completed, cancelled
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

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, preparing, ready, served, cancelled
  prepared_at DATETIME,
  served_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  transaction_number TEXT UNIQUE NOT NULL,
  payment_method TEXT NOT NULL, -- cash, card, mobile, online
  amount_paid DECIMAL(10, 2) NOT NULL,
  change_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'completed', -- completed, refunded, partial_refund
  cashier_id INTEGER,
  reference_number TEXT, -- For card/online payments
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (cashier_id) REFERENCES staff(id)
);

-- Inventory (simplified for Phase 1)
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL, -- kg, liter, piece, etc.
  quantity DECIMAL(10, 2) NOT NULL,
  min_quantity DECIMAL(10, 2) DEFAULT 0,
  last_restocked DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for critical operations
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id INTEGER,
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data
INSERT OR IGNORE INTO categories (name, color, display_order) VALUES
  ('Appetizers', '#F59E0B', 1),
  ('Main Course', '#10B981', 2),
  ('Desserts', '#EC4899', 3),
  ('Beverages', '#3B82F6', 4),
  ('Specials', '#8B5CF6', 5);

INSERT OR IGNORE INTO tables (number, capacity, zone) VALUES
  (1, 4, 'Main Hall'),
  (2, 4, 'Main Hall'),
  (3, 6, 'Main Hall'),
  (4, 2, 'Window Side'),
  (5, 8, 'Private');

INSERT OR IGNORE INTO staff (name, role, pin) VALUES
  ('Admin', 'admin', '0000'),
  ('John Cashier', 'cashier', '1111'),
  ('Jane Waiter', 'waiter', '2222');

-- Sample menu items
INSERT OR IGNORE INTO menu_items (name, code, category, price, preparation_time) VALUES
  ('Caesar Salad', 'APP001', 'Appetizers', 12.99, 10),
  ('Grilled Chicken', 'MAIN001', 'Main Course', 24.99, 20),
  ('Chocolate Cake', 'DES001', 'Desserts', 8.99, 5),
  ('Fresh Orange Juice', 'BEV001', 'Beverages', 5.99, 5);

-- Settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('restaurant_name', 'Hotel POS System'),
  ('tax_rate', '10'),
  ('currency', 'USD'),
  ('printer_type', 'thermal'),
  ('auto_print_kitchen', 'true'),
  ('auto_print_receipt', 'true');