import { lkr } from './currency';

function getSettings() {
    try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}'); }
    catch { return {}; }
}

// Shared CSS for 80mm thermal receipt
function buildReceiptCss(blackBands) {
    const hdrBg    = blackBands ? 'background:#000;color:#fff;padding:8px 6px 10px;' : 'padding-bottom:6px;';
    const hdrName  = blackBands ? 'color:#fff;' : 'color:#000;';
    const hdrSub   = blackBands ? 'color:#ccc;' : 'color:#000;';
    const brandBg  = blackBands ? 'background:#000;color:#fff;padding:6px 6px 8px;' : 'border-top:1px dashed #000;padding-top:6px;';
    const brandBy  = blackBands ? 'color:#ccc;' : 'color:#000;';
    const brandName= blackBands ? 'color:#fff;' : 'color:#000;';
    const brandTel = blackBands ? 'color:#ddd;' : 'color:#000;';
    return RECEIPT_CSS_BASE
        .replace('/*HDR_BG*/', hdrBg)
        .replace('/*HDR_NAME*/', hdrName)
        .replace('/*HDR_SUB*/', hdrSub)
        .replace('/*BRAND_BG*/', brandBg)
        .replace('/*BRAND_BY*/', brandBy)
        .replace('/*BRAND_NAME*/', brandName)
        .replace('/*BRAND_TEL*/', brandTel);
}

const RECEIPT_CSS_BASE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    width: 68mm;
    margin: 0 auto;
    padding: 2mm 2mm 4mm;
    color: #000;
    background: #fff;
    line-height: 1.5;
  }

  /* ── Header ── */
  .hdr { text-align: center; /*HDR_BG*/ }
  .hdr-name { font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; /*HDR_NAME*/ }
  .hdr-sub  { font-size: 13px; margin-top: 3px; /*HDR_SUB*/ }
  .hdr-badge {
    display: inline-block;
    background: #000;
    color: #fff;
    border: 1.5px solid #000;
    padding: 1px 10px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 2px;
    margin-top: 5px;
  }

  /* ── Dividers ── */
  .div-solid { border-top: 1px solid #000; margin: 5px 0; }
  .div-dash  { border-top: 1px dashed #000; margin: 5px 0; }
  .div-thick { border-top: 2px solid #000; margin: 5px 0; }

  /* ── Meta row ── */
  .meta { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; gap: 4px; }
  .meta-label { color: #000; white-space: nowrap; }
  .meta-val   { font-weight: bold; text-align: right; word-break: break-all; }

  /* ── Reprint banner ── */
  .reprint { text-align: center; font-size: 11px; letter-spacing: 1.5px; color: #000; padding-bottom: 4px; }

  /* ── Items table ── */
  .items { width: 100%; border-collapse: collapse; margin: 3px 0; }
  .items thead th {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 3px 0 4px;
    border-bottom: 2px solid #000;
  }
  .items thead th.c-name  { text-align: left; width: 46%; }
  .items thead th.c-qty   { text-align: center; width: 8%; }
  .items thead th.c-price { text-align: right; width: 20%; }
  .items thead th.c-total { text-align: right; width: 26%; }

  .items tbody td {
    font-size: 11px;
    padding: 4px 0 3px;
    vertical-align: top;
    border-bottom: 1px dashed #000;
  }
  .items tbody tr:last-child td { border-bottom: none; }
  .c-name  { text-align: left; }
  .c-qty   { text-align: center; }
  .c-price { text-align: right; white-space: nowrap; }
  .c-total { text-align: right; font-weight: bold; white-space: nowrap; }

  /* ── Totals block ── */
  .totals { width: 100%; border-collapse: collapse; margin-top: 2px; }
  .totals td { padding: 2px 0; font-size: 11px; }
  .totals .lbl { color: #000; }
  .totals .amt { text-align: right; font-weight: bold; white-space: nowrap; }

  .total-grand td {
    font-size: 16px;
    font-weight: 900;
    padding-top: 5px;
    border-top: 2px solid #000;
  }

  /* ── Payment block ── */
  .pay-block { margin-top: 6px; }
  .pay-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
  .pay-label { color: #000; }
  .pay-val   { font-weight: bold; }
  .pay-method { text-transform: capitalize; }
  .change-val { font-size: 13px; font-weight: 900; }

  /* ── Footer ── */
  .footer { text-align: center; margin-top: 10px; }
  .footer-msg  { font-size: 13px; font-weight: 900; }
  .footer-sub  { font-size: 11px; color: #000; margin-top: 2px; }

  /* ── Brand ── */
  .brand { text-align: center; margin-top: 10px; /*BRAND_BG*/ }
  .brand-by   { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; /*BRAND_BY*/ }
  .brand-name { font-size: 14px; font-weight: 900; margin: 3px 0 2px; /*BRAND_NAME*/ }
  .brand-tel  { font-size: 12px; /*BRAND_TEL*/ }

  @media print {
    body { width: 68mm; }
    @page { size: 76mm auto; margin: 0; }
  }
`;

function buildItemRows(items) {
    return items.map(item => {
        const total = item.price * item.quantity;
        return `<tr>
          <td class="c-name">${escHtml(item.name)}</td>
          <td class="c-qty">${item.quantity}</td>
          <td class="c-price">${fmt(item.price)}</td>
          <td class="c-total">${fmt(total)}</td>
        </tr>`;
    }).join('');
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Compact number formatter — strip "LKR " prefix for table cells, keep bold LKR label outside
function fmt(n) {
    const v = Number(n || 0).toFixed(2);
    return v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtLkr(n) { return `LKR&nbsp;${fmt(n)}`; }

export function printReceipt({ order, payment, table, orderType = 'dine-in', kotNumber = null }) {
    const s           = getSettings();
    const printerName = s.receiptPrinterName || undefined;
    const hotelName   = s.hotelName    || 'My Hotel';
    const address     = s.address      || '';
    const phone       = s.phone        || '';
    const taxRate     = Number(s.taxRate ?? 0);
    const footer      = s.receiptFooter || 'Thank you for dining with us!';
    const blackBands  = s.receiptBlackBands !== false;
    const isTakeaway  = orderType === 'takeaway';
    const now         = new Date().toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' });

    const subtotal    = Number(order.subtotal ?? 0);
    const tax         = Number(order.tax ?? 0);
    const discountAmt = Number(order.discountAmount ?? 0);
    const total       = Number(order.total ?? subtotal);

    const changeAmt = payment.method === 'cash' ? Math.max(0, Number(payment.amount) - total) : 0;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt ${escHtml(order.orderNumber || '')}</title>
<style>${buildReceiptCss(blackBands)}</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-name">${escHtml(hotelName)}</div>
  ${address ? `<div class="hdr-sub">${escHtml(address)}</div>` : ''}
  ${phone   ? `<div class="hdr-sub">Tel: ${escHtml(phone)}</div>` : ''}
  ${isTakeaway ? '<div><span class="hdr-badge">TAKEAWAY</span></div>' : ''}
</div>

<div class="div-thick"></div>

<div class="meta"><span class="meta-label">${now}</span></div>
<div class="meta">
  <span class="meta-label">Order #</span>
  <span class="meta-val">${escHtml(order.orderNumber || '—')}</span>
</div>
${!isTakeaway && table ? `<div class="meta"><span class="meta-label">Table</span><span class="meta-val">${table.number}</span></div>` : ''}
${isTakeaway && kotNumber ? `<div class="meta"><span class="meta-label">KOT #</span><span class="meta-val" style="font-size:13px;font-weight:900;">${String(kotNumber).padStart(3,'0')}</span></div>` : ''}

<div class="div-dash"></div>

<table class="items">
  <thead>
    <tr>
      <th class="c-name">Item</th>
      <th class="c-qty">Qty</th>
      <th class="c-price">Price</th>
      <th class="c-total">Total</th>
    </tr>
  </thead>
  <tbody>
    ${buildItemRows(order.items.filter(i => !i.voided))}
  </tbody>
</table>

<div class="div-dash"></div>

<table class="totals">
  <tr>
    <td class="lbl">Subtotal</td>
    <td class="amt">${fmtLkr(subtotal)}</td>
  </tr>
  ${taxRate > 0 ? `<tr>
    <td class="lbl">Tax (${taxRate}%)</td>
    <td class="amt">${fmtLkr(tax)}</td>
  </tr>` : ''}
  ${discountAmt > 0 ? `<tr>
    <td class="lbl">Discount</td>
    <td class="amt" style="color:#000;">- ${fmtLkr(discountAmt)}</td>
  </tr>` : ''}
  <tr class="total-grand">
    <td class="lbl">TOTAL</td>
    <td class="amt">${fmtLkr(total)}</td>
  </tr>
</table>

<div class="pay-block">
  <div class="div-dash"></div>
  <div class="pay-row">
    <span class="pay-label">Payment</span>
    <span class="pay-val pay-method">${escHtml(payment.method)}</span>
  </div>
  <div class="pay-row">
    <span class="pay-label">Amount Paid</span>
    <span class="pay-val">${fmtLkr(payment.amount)}</span>
  </div>
  ${changeAmt > 0 ? `<div class="pay-row">
    <span class="pay-label">Change</span>
    <span class="pay-val change-val">${fmtLkr(changeAmt)}</span>
  </div>` : ''}
</div>

<div class="div-solid" style="margin-top:8px"></div>

<div class="footer">
  <div class="footer-msg">${escHtml(footer)}</div>
  <div class="footer-sub">Please keep this receipt</div>
</div>

<div class="brand">
  <div class="brand-by">Software by</div>
  <div class="brand-name">DreamLabs IT Solutions</div>
  <div class="brand-tel">Call / WhatsApp: 070 615 1051</div>
</div>

<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>

</body>
</html>`;

    window.electron.printReceipt({ html, printerName });
}

export function printReceiptFromHistory({ order, items }) {
    const s           = getSettings();
    const printerName = s.receiptPrinterName || undefined;
    const hotelName   = s.hotelName     || 'My Hotel';
    const address     = s.address       || '';
    const phone       = s.phone         || '';
    const taxRate     = Number(s.taxRate ?? 0);
    const footer      = s.receiptFooter || 'Thank you for dining with us!';
    const blackBands  = s.receiptBlackBands !== false;
    const isTakeaway  = order.order_type === 'takeaway';
    const printedAt   = new Date().toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' });
    const orderedAt   = new Date(order.created_at + 'Z').toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' });

    const discountHist = Number(order.discount_amount ?? 0);
    const subtotal = Number(order.total_amount) - Number(order.tax_amount) + discountHist;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt ${escHtml(order.order_number)}</title>
<style>${buildReceiptCss(blackBands)}</style>
</head>
<body>

<div class="reprint">*** REPRINT ***</div>

<div class="hdr">
  <div class="hdr-name">${escHtml(hotelName)}</div>
  ${address ? `<div class="hdr-sub">${escHtml(address)}</div>` : ''}
  ${phone   ? `<div class="hdr-sub">Tel: ${escHtml(phone)}</div>` : ''}
  ${isTakeaway ? '<div><span class="hdr-badge">TAKEAWAY</span></div>' : ''}
</div>

<div class="div-thick"></div>

<div class="meta"><span class="meta-label">Ordered</span><span class="meta-val">${orderedAt}</span></div>
<div class="meta"><span class="meta-label">Printed</span><span class="meta-val">${printedAt}</span></div>
<div class="meta"><span class="meta-label">Order #</span><span class="meta-val">${escHtml(order.order_number)}</span></div>
${!isTakeaway && order.table_number ? `<div class="meta"><span class="meta-label">Table</span><span class="meta-val">${order.table_number}</span></div>` : ''}

<div class="div-dash"></div>

<table class="items">
  <thead>
    <tr>
      <th class="c-name">Item</th>
      <th class="c-qty">Qty</th>
      <th class="c-price">Price</th>
      <th class="c-total">Total</th>
    </tr>
  </thead>
  <tbody>
    ${buildItemRows(items)}
  </tbody>
</table>

<div class="div-dash"></div>

<table class="totals">
  <tr>
    <td class="lbl">Subtotal</td>
    <td class="amt">${fmtLkr(subtotal)}</td>
  </tr>
  ${taxRate > 0 ? `<tr>
    <td class="lbl">Tax (${taxRate}%)</td>
    <td class="amt">${fmtLkr(order.tax_amount)}</td>
  </tr>` : ''}
  ${discountHist > 0 ? `<tr>
    <td class="lbl">Discount</td>
    <td class="amt" style="color:#000;">- ${fmtLkr(discountHist)}</td>
  </tr>` : ''}
  <tr class="total-grand">
    <td class="lbl">TOTAL</td>
    <td class="amt">${fmtLkr(order.total_amount)}</td>
  </tr>
</table>

<div class="div-solid" style="margin-top:8px"></div>

<div class="footer">
  <div class="footer-msg">${escHtml(footer)}</div>
  <div class="footer-sub">Please keep this receipt</div>
</div>

<div class="brand">
  <div class="brand-by">Software by</div>
  <div class="brand-name">DreamLabs IT Solutions</div>
  <div class="brand-tel">Call / WhatsApp: 070 615 1051</div>
</div>

<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>
<div style="height:80mm;">&nbsp;</div>

</body>
</html>`;

    window.electron.printReceipt({ html, printerName });
}

export function printKitchenTicket({ order, table, orderType = 'dine-in' }) {
    const now        = new Date().toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' });
    const isTakeaway = orderType === 'takeaway';

    const itemRows = order.items.map(item => `
        <tr>
            <td class="qty">${item.quantity}x</td>
            <td class="name">${escHtml(item.name)}${item.notes ? `<div class="note">⚠ ${escHtml(item.notes)}</div>` : ''}</td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Kitchen - ${escHtml(order.orderNumber || '')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 13px; width: 72mm; margin: 0 auto; padding: 4mm; color: #000; background: #fff; }
  .header  { text-align: center; margin-bottom: 6px; }
  .title   { font-size: 20px; font-weight: bold; }
  .badge   { display: inline-block; border: 2px solid #000; padding: 2px 8px; font-size: 12px; font-weight: bold; letter-spacing: 2px; margin-top: 4px; }
  .meta    { font-size: 12px; margin: 3px 0; display: flex; justify-content: space-between; }
  .divider { border-top: 2px solid #000; margin: 6px 0; }
  table    { width: 100%; border-collapse: collapse; }
  .qty     { width: 15%; font-size: 16px; font-weight: bold; vertical-align: top; padding: 4px 0; }
  .name    { font-size: 15px; font-weight: bold; padding: 4px 0; }
  .note    { font-size: 11px; font-weight: normal; font-style: italic; margin-top: 2px; }
  @media print { body { width: 72mm; } @page { size: 80mm auto; margin: 0; } }
</style>
</head>
<body>
<div class="header">
  <div class="title">KITCHEN ORDER</div>
  <div class="badge">${isTakeaway ? 'TAKEAWAY' : `TABLE ${table?.number}`}</div>
</div>
<div class="divider"></div>
<div class="meta"><span>${now}</span></div>
<div class="meta"><span>Order#</span><span><b>${escHtml(order.orderNumber || '—')}</b></span></div>
<div class="divider"></div>
<table>${itemRows}</table>
<div class="divider"></div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=400,height=500,scrollbars=yes');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 500); }, 400);
}
