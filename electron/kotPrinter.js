const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

/**
 * Prints a KOT (Kitchen Order Ticket) using a hidden Electron BrowserWindow.
 * Works with any printer installed on Windows — no extra native deps.
 *
 * @param {object} kotData
 *   { kotNumber, date, orderNumber, orderType, tableName, items[], time, printerName? }
 * @param {string|undefined} printerName  OS printer name; undefined = system default
 */
async function printKot(kotData, printerName) {
    return new Promise((resolve, reject) => {
        const win = new BrowserWindow({
            show: false,
            width: 380,
            height: 600,
            webPreferences: { nodeIntegration: false, contextIsolation: true },
        });

        const html = buildKotHtml(kotData);
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        win.webContents.once('did-finish-load', () => {
            const printOptions = {
                silent: true,
                printBackground: true,
                margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
                pageSize: { width: 76000, height: 200000 }, // 76mm wide (XP-80T prints 72mm)
            };
            if (printerName) {
                printOptions.deviceName = printerName;
            }

            setTimeout(() => {
                win.webContents.print(printOptions, (success, reason) => {
                    win.destroy();
                    if (success) resolve({ success: true });
                    else reject(new Error(`KOT print failed: ${reason}`));
                });
            }, 300);
        });

        win.webContents.once('did-fail-load', (e, code, desc) => {
            win.destroy();
            reject(new Error(`KOT window failed to load: ${desc}`));
        });
    });
}

function buildKotHtml({ kotNumber, date, orderNumber, orderType, tableName, items, time, customerName, isAdditional }) {
    const isTakeaway = orderType === 'takeaway';

    const rows = items.map(item => `
        <div class="item-row">
            <div class="item-main">
                <span class="item-name">${escHtml(item.name)}</span>
                <span class="qty-badge">${item.quantity}</span>
            </div>
            ${item.notes ? `<div class="item-note">&#8627; ${escHtml(item.notes)}</div>` : ''}
        </div>
    `).join('');

    const customerBlock = customerName ? `
        <div class="customer-block">
            <div class="customer-label">CUSTOMER</div>
            <div class="customer-name">${escHtml(customerName)}</div>
        </div>
    ` : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    width: 72mm;
    padding: 3mm 1mm 0;
    background: #fff;
    color: #000;
  }

  /* ── ADD ORDER banner ── */
  .add-order-banner {
    background: #000;
    color: #fff;
    text-align: center;
    padding: 5px 4px;
    margin-bottom: 5px;
    letter-spacing: 3px;
    font-size: 13px;
    font-weight: bold;
    border-radius: 2px;
  }
  .add-order-ref {
    text-align: center;
    font-size: 9px;
    color: #555;
    margin-bottom: 5px;
    letter-spacing: 1px;
  }

  /* ── KOT Header ── */
  .kot-header {
    text-align: center;
    padding-bottom: 5px;
    border-bottom: 3px solid #000;
    margin-bottom: 5px;
  }
  .kot-title {
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 4px;
    color: #000;
    text-transform: uppercase;
  }
  .kot-number {
    font-size: 48px;
    font-weight: bold;
    line-height: 1;
    letter-spacing: -1px;
  }
  .kot-number-label {
    font-size: 12px;
    color: #000;
    letter-spacing: 2px;
    margin-top: 1px;
  }

  /* ── Table / Takeaway block ── */
  .destination-block {
    background: #000;
    color: #fff;
    text-align: center;
    padding: 6px 4px;
    margin: 6px 0;
    border-radius: 2px;
  }
  .destination-value {
    font-size: 26px;
    font-weight: bold;
    letter-spacing: 1px;
    line-height: 1.1;
  }
  .destination-block.takeaway {
    background: #000;
    border: 2px dashed #000;
    background: repeating-linear-gradient(
      45deg,
      #111,
      #111 4px,
      #222 4px,
      #222 8px
    );
  }

  /* ── Meta row ── */
  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #000;
    margin-bottom: 3px;
  }
  .meta-row strong { color: #000; }

  /* ── Customer block ── */
  .customer-block {
    border: 1px solid #000;
    border-radius: 2px;
    padding: 3px 6px;
    margin: 5px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .customer-label {
    font-size: 8px;
    letter-spacing: 2px;
    color: #888;
    white-space: nowrap;
  }
  .customer-name {
    font-size: 13px;
    font-weight: bold;
  }

  /* ── Divider ── */
  .divider { border-top: 1px solid #000; margin: 5px 0; }
  .divider-dash { border-top: 1px dashed #000; margin: 5px 0; }

  /* ── Items ── */
  .items-header {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    letter-spacing: 2px;
    color: #000;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .item-row {
    margin-bottom: 6px;
  }
  .item-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }
  .item-name {
    font-size: 15px;
    font-weight: bold;
    line-height: 1.2;
    flex: 1;
  }
  .qty-badge {
    background: #000;
    color: #fff;
    font-size: 14px;
    font-weight: bold;
    min-width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    text-align: center;
  }
  .item-note {
    font-size: 10px;
    color: #555;
    font-style: italic;
    margin-top: 1px;
    padding-left: 4px;
  }

  /* ── Footer ── */
  .kot-footer {
    text-align: center;
    font-size: 11px;
    color: #000;
    margin-top: 6px;
    padding-bottom: 4px;
  }
  .cut-line {
    border: none;
    border-top: 1px dashed #aaa;
    margin: 8px 0 0;
    position: relative;
  }
  .cut-line::after {
    content: '✂';
    position: absolute;
    top: -8px;
    right: 0;
    font-size: 10px;
    color: #aaa;
    background: #fff;
    padding-left: 2px;
  }

  @media print {
    body { width: 72mm; }
    @page { size: 76mm auto; margin: 0; }
  }
</style>
</head>
<body>

  ${isAdditional ? `
  <div class="add-order-banner">&#8635; ADD ORDER</div>
  <div class="add-order-ref">Additional items for ${isTakeaway ? 'Takeaway' : `Table ${escHtml(tableName || '—')}`} &bull; Ref: ${escHtml(orderNumber || '—')}</div>
  ` : ''}

  <div class="kot-header">
    <div class="kot-title">Kitchen Order</div>
    <div class="kot-number">#${String(kotNumber).padStart(3, '0')}</div>
    <div class="kot-number-label">KOT NUMBER</div>
  </div>

  <div class="destination-block ${isTakeaway ? 'takeaway' : ''}">
    <div class="destination-value">${isTakeaway ? 'TAKEAWAY' : `TABLE ${escHtml(tableName || '—')}`}</div>
  </div>

  <div class="meta-row">
    <span><strong>${escHtml(time)}</strong></span>
    <span>${escHtml(date)}</span>
  </div>
  ${isTakeaway && orderNumber ? `
  <div class="meta-row" style="font-size:11px; margin-top:2px;">
    <span style="color:#555;">Order #</span>
    <span style="font-weight:900; font-size:13px;">${escHtml(orderNumber)}</span>
  </div>` : ''}

  ${customerBlock}

  <div class="divider"></div>

  <div class="items-header">
    <span>Item</span>
    <span>Qty</span>
  </div>

  ${rows}

  <div class="divider-dash"></div>

  <div class="kot-footer">
    ${items.length} item type${items.length !== 1 ? 's' : ''} &bull; ${isTakeaway ? 'Takeaway' : 'Dine-in'}
  </div>

  <hr class="cut-line"/>

</body>
</html>`;
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Prints a VOID KOT slip for one cancelled item.
 */
async function printVoidKot({ orderNumber, tableName, orderType, itemName, quantity, reason, time, printerName }) {
    const isTakeaway = orderType === 'takeaway';
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; font-size:12px; width:72mm; padding:3mm 2mm 0; background:#fff; color:#000; }
  .banner { background:#000; color:#fff; text-align:center; padding:5px 4px; letter-spacing:3px; font-size:13px; font-weight:bold; border-radius:2px; margin-bottom:6px; }
  .dest { text-align:center; font-size:14px; font-weight:bold; margin-bottom:4px; }
  .meta { display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px; }
  .divider { border-top:2px solid #000; margin:5px 0; }
  .item-name { font-size:17px; font-weight:900; margin:4px 0 2px; }
  .reason { font-size:11px; color:#555; font-style:italic; }
  .qty { font-size:13px; font-weight:bold; }
  .cut { border:none; border-top:1px dashed #aaa; margin:8px 0 0; }
  @media print { body { width:72mm; } @page { size:76mm auto; margin:0; } }
</style></head><body>
  <div class="banner">&#x2715; VOID / CANCEL</div>
  <div class="dest">${isTakeaway ? 'TAKEAWAY' : `TABLE ${tableName || '—'}`}</div>
  <div class="meta"><span>${time}</span><span>Ref: ${orderNumber || '—'}</span></div>
  <div class="divider"></div>
  <div class="item-name">${itemName}</div>
  <div class="qty">Qty: ${quantity}</div>
  <div class="reason">Reason: ${reason}</div>
  <div class="divider"></div>
  <hr class="cut"/>
</body></html>`;

    return new Promise((resolve, reject) => {
        const win = new BrowserWindow({
            show: false, width: 380, height: 400,
            webPreferences: { nodeIntegration: false, contextIsolation: true },
        });
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        win.webContents.once('did-finish-load', () => {
            const opts = {
                silent: true, printBackground: true,
                margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
                pageSize: { width: 76000, height: 200000 },
            };
            if (printerName) opts.deviceName = printerName;
            setTimeout(() => {
                win.webContents.print(opts, (success, reason) => {
                    win.destroy();
                    if (success) resolve({ success: true });
                    else reject(new Error(`Void KOT print failed: ${reason}`));
                });
            }, 300);
        });
        win.webContents.once('did-fail-load', (e, code, desc) => { win.destroy(); reject(new Error(desc)); });
    });
}

/**
 * Registers the 'printer:kot' IPC handler.
 * Called once from main.js after app is ready.
 */
function setupKotPrinter() {
    ipcMain.handle('printer:kot', async (event, { kotData, printerName }) => {
        try {
            await printKot(kotData, printerName || undefined);
            return { success: true };
        } catch (err) {
            console.error('KOT print error:', err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('printer:voidKot', async (event, { voidData, printerName }) => {
        try {
            await printVoidKot(voidData, printerName || undefined);
            return { success: true };
        } catch (err) {
            console.error('Void KOT print error:', err);
            return { success: false, error: err.message };
        }
    });
}

module.exports = { setupKotPrinter };
