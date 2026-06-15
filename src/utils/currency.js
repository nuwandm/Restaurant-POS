export const lkr = (amount) =>
  `LKR ${parseFloat(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function getTaxRatePct() {
  try { return parseFloat(JSON.parse(localStorage.getItem('hotelSettings') || '{}').taxRate) || 0; }
  catch { return 0; }
}

export function applyTax(subtotal) {
  const rate = getTaxRatePct() / 100;
  const tax = subtotal * rate;
  return { subtotal, tax, total: subtotal + tax };
}
