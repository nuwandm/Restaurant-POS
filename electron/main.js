const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const path = require("path");
const { initDatabase } = require("./database/init");
const { checkLicense, activateLicense, getMachineId } = require("./license");
const { setupKotPrinter } = require("./kotPrinter");
const { setupReceiptPrinter } = require("./receiptPrinter");

let mainWindow;
let db;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    fullscreen: false,
    autoHideMenuBar: true,
    frame: false,          // frameless — custom title bar
    icon: path.join(__dirname, "../public/DreamLabsLogoNew.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    backgroundColor: "#1a1a1a",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize();
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
  });

  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    const loadWithRetry = (retries = 10) => {
      mainWindow.loadURL("http://localhost:5173").catch(() => {
        if (retries > 0) setTimeout(() => loadWithRetry(retries - 1), 500);
      });
    };
    loadWithRetry();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  try {
    // Initialize database
    db = await initDatabase();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Continue with app even if DB fails
    db = null;
  }

  // Remove the native menu bar always (File/Edit/View/Window/Help)
  Menu.setApplicationMenu(null);

  setupKotPrinter();
  setupReceiptPrinter();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) db.close();
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for database operations
ipcMain.handle("db:query", async (event, { action, data }) => {
  if (!db) {
    console.error("Database not initialized");
    throw new Error("Database not initialized");
  }

  try {
    console.log("Database query:", action, data); // Add logging
    const result = await db.query(action, data);
    console.log("Query result:", result); // Add logging
    return { success: true, data: result };
  } catch (error) {
    console.error("Database query error:", error); // Better error logging
    console.error("Error details:", error.stack); // Stack trace
    return { success: false, error: error.message };
  }
});

// Payment processing
ipcMain.handle("payment:process", async (event, paymentData) => {
  if (!db) throw new Error("Database not initialized");

  try {
    let orderId   = paymentData.order?.orderId;
    let orderNumber = paymentData.order?.orderNumber;

    // If order was already created in DB (normal flow), just process payment directly
    if (!orderId) {
      // Fallback: create order now (should rarely happen)
      const orderResult = await db.query("createOrder", {
        table_id:     paymentData.table?.id || null,
        waiter_id:    1,
        order_type:   paymentData.order?.order_type || "dine-in",
        total_amount: paymentData.order?.total || 0,
        tax_amount:   paymentData.order?.tax   || 0,
        items:        paymentData.order?.items || [],
        shift_id:     paymentData.payment?.shift_id || null,
      });
      orderId     = orderResult.orderId;
      orderNumber = orderResult.orderNumber;
    }

    const paymentResult = await db.query("processPayment", {
      orderId,
      method:    paymentData.payment.method,
      amount:    paymentData.payment.amount,
      change:    paymentData.payment.change,
      cashierId: 1,
      shift_id:  paymentData.payment.shift_id || null,
    });

    return {
      success: true,
      orderNumber,
      transactionNumber: paymentResult.transactionNumber,
    };
  } catch (error) {
    console.error("Payment processing error:", error);
    return { success: false, error: error.message };
  }
});


// Window controls
ipcMain.handle("app:openExternal", (_, url) => { shell.openExternal(url); });
ipcMain.handle("app:close",    () => { mainWindow?.close(); });
ipcMain.handle("app:minimize", () => { mainWindow?.minimize(); });
ipcMain.handle("app:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
  } else if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

// License handlers
ipcMain.handle("license:check", async () => {
  try { return checkLicense(); }
  catch (e) { return { status: 'error', error: e.message, machineId: getMachineId() }; }
});

ipcMain.handle("license:activate", async (event, { key }) => {
  try { return activateLicense(key); }
  catch (e) { return { success: false, error: e.message }; }
});
