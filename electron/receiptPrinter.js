const { BrowserWindow, ipcMain } = require('electron');
const { sendEscPosFeedAndCut } = require('./rawPrint');

async function printReceiptSilent(html, printerName) {
    return new Promise((resolve, reject) => {
        const win = new BrowserWindow({
            show: false,
            width: 400,
            height: 1200,
            webPreferences: { nodeIntegration: false, contextIsolation: true },
        });

        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        win.webContents.once('did-finish-load', () => {
            const printOptions = {
                silent: true,
                printBackground: true,
                margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
                pageSize: { width: 72000, height: 800000 }, // 72mm × 800mm thermal roll
            };
            if (printerName) printOptions.deviceName = printerName;

            setTimeout(() => {
                win.webContents.print(printOptions, async (success, reason) => {
                    win.destroy();
                    if (success) {
                        // After HTML content prints, feed paper past the cutter blade then cut
                        await sendEscPosFeedAndCut(printerName, 10);
                        resolve({ success: true });
                    } else {
                        reject(new Error(`Receipt print failed: ${reason}`));
                    }
                });
            }, 300);
        });

        win.webContents.once('did-fail-load', (e, code, desc) => {
            win.destroy();
            reject(new Error(`Receipt window failed to load: ${desc}`));
        });
    });
}

function setupReceiptPrinter() {
    ipcMain.handle('printer:receipt', async (event, { html, printerName }) => {
        try {
            await printReceiptSilent(html, printerName || undefined);
            return { success: true };
        } catch (err) {
            console.error('Receipt print error:', err);
            return { success: false, error: err.message };
        }
    });
}

module.exports = { setupReceiptPrinter };
