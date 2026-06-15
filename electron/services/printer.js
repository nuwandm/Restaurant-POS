const escpos = require("escpos");
const USB = require("escpos-usb");
const { ipcMain } = require("electron");

class PrinterService {
  constructor() {
    this.device = null;
    this.printer = null;
    this.initPrinter();
  }

  initPrinter() {
    try {
      // Find USB printer
      const devices = USB.findPrinter();
      if (devices && devices.length > 0) {
        this.device = new USB(devices[0]);
        this.printer = new escpos.Printer(this.device);
        console.log("Printer initialized successfully");
      } else {
        console.log("No USB printer found, using mock printer");
        this.useMockPrinter();
      }
    } catch (error) {
      console.error("Printer initialization error:", error);
      this.useMockPrinter();
    }
  }

  useMockPrinter() {
    // Mock printer for development
    this.printer = {
      print: (content) => {
        console.log("=== PRINT OUTPUT ===");
        console.log(content);
        console.log("==================");
        return this;
      },
      cut: () => this,
      close: () => this,
      font: () => this,
      align: () => this,
      style: () => this,
      size: () => this,
      text: (text) => {
        console.log(text);
        return this;
      },
      feed: () => this,
      qrimage: () => this,
    };
  }

  async printReceipt(order, payment) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.device) {
          // Mock printing
          console.log("Printing receipt for order:", order.id);
          resolve();
          return;
        }

        this.device.open(() => {
          this.printer
            .font("a")
            .align("ct")
            .style("bu")
            .size(2, 2)
            .text("HOTEL POS SYSTEM")
            .size(1, 1)
            .text("------------------------")
            .align("lt")
            .text(`Date: ${new Date().toLocaleString()}`)
            .text(`Order #: ${order.orderNumber}`)
            .text(`Table: ${order.tableName || "Takeaway"}`)
            .text(`Waiter: ${order.waiterName}`)
            .text("------------------------")
            .style("b")
            .text("ITEMS:")
            .style("normal");

          // Print items
          order.items.forEach((item) => {
            const line =
              `${item.quantity}x ${item.name}`.padEnd(20) +
              `$${(item.price * item.quantity).toFixed(2)}`;
            this.printer.text(line);
            if (item.notes) {
              this.printer.text(`  Note: ${item.notes}`);
            }
          });

          this.printer
            .text("------------------------")
            .align("rt")
            .text(`Subtotal: $${order.subtotal.toFixed(2)}`)
            .text(`Tax: $${order.tax.toFixed(2)}`)
            .style("b")
            .size(1, 2)
            .text(`TOTAL: $${order.total.toFixed(2)}`)
            .size(1, 1)
            .style("normal")
            .text("------------------------")
            .text(`Payment: ${payment.method}`)
            .text(`Paid: $${payment.amount.toFixed(2)}`)
            .text(`Change: $${payment.change.toFixed(2)}`)
            .text("------------------------")
            .align("ct")
            .text("Thank you for your visit!")
            .text("Please come again")
            .cut()
            .close();

          resolve();
        });
      } catch (error) {
        console.error("Print error:", error);
        reject(error);
      }
    });
  }

  async printKitchenOrder(order) {
    // Similar implementation for kitchen printer
    // This would typically go to a different printer
    console.log("Printing kitchen order:", order);
    return Promise.resolve();
  }
}

let printerService;

function setupPrinter() {
  printerService = new PrinterService();

  // IPC handlers
  ipcMain.handle("printer:receipt", async (event, { order, payment }) => {
    return await printerService.printReceipt(order, payment);
  });

  ipcMain.handle("printer:kitchen", async (event, order) => {
    return await printerService.printKitchenOrder(order);
  });
}

module.exports = { setupPrinter };
