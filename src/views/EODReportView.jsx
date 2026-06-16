import React, { useState, useEffect, useCallback, useRef } from 'react';
import { lkr } from '../utils/currency';
import toast from 'react-hot-toast';

const fmt  = (n) => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const today = () => new Date().toLocaleDateString('en-CA');
const displayDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-LK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};
const timeStr = (iso) => {
    if (!iso) return '—';
    return new Date(iso + 'Z').toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const METHOD_LABELS = { cash: 'Cash', card: 'Card', mobile: 'Mobile' };
const METHOD_COLORS = { cash: '#22c55e', card: '#8b5cf6', mobile: '#3b82f6' };
const TYPE_LABELS   = { dine_in: 'Dine In', takeaway: 'Takeaway', delivery: 'Delivery' };

/* ── Thin bar ── */
function MiniBar({ pct, color }) {
    return (
        <div className="h-1.5 rounded-full bg-gray-700/60 overflow-hidden flex-1">
            <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pct, 0)}%`, background: color }} />
        </div>
    );
}

/* ── Hourly sparkline ── */
function HourBars({ hourly }) {
    const max = Math.max(...hourly.map(h => h.revenue), 1);
    const filled = (() => {
        if (!hourly.length) return [];
        const map = Object.fromEntries(hourly.map(r => [r.hour, r]));
        const minH = Math.min(...hourly.map(r => r.hour));
        const maxH = Math.max(...hourly.map(r => r.hour));
        return Array.from({ length: maxH - minH + 1 }, (_, i) => {
            const h = minH + i;
            return map[h] || { hour: h, orders: 0, revenue: 0 };
        });
    })();
    if (!filled.length) return (
        <div className="h-16 flex items-center justify-center text-gray-600 text-xs">No orders recorded</div>
    );
    return (
        <div className="flex items-end gap-1" style={{ height: 56 }}>
            {filled.map((r, i) => {
                const pct = (r.revenue / max) * 100;
                const isPeak = r.revenue === max && r.revenue > 0;
                return (
                    <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0 group relative">
                        <div className="w-full flex flex-col justify-end" style={{ height: 48 }}>
                            <div className="w-full rounded-t-sm transition-all"
                                style={{
                                    height: `${Math.max(pct, r.orders > 0 ? 6 : 0)}%`,
                                    background: isPeak ? '#22c55e' : pct > 50 ? '#3b82f6' : '#374151',
                                    minHeight: r.orders > 0 ? 3 : 0,
                                }} />
                        </div>
                        <span className="text-gray-700 text-[8px] font-mono leading-none">
                            {r.hour < 10 ? `0${r.hour}` : r.hour}
                        </span>
                        {/* tooltip */}
                        {r.orders > 0 && (
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <p className="text-white font-semibold">{r.hour}:00 — Rs. {fmt(r.revenue)}</p>
                                <p className="text-gray-400">{r.orders} orders</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ── Custom DatePicker ── */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function DatePicker({ value, onChange, max }) {
  const [open,    setOpen]    = useState(false);
  const [viewY,   setViewY]   = useState(() => new Date(value + 'T00:00:00').getFullYear());
  const [viewM,   setViewM]   = useState(() => new Date(value + 'T00:00:00').getMonth());
  const ref = useRef(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // sync view when value changes externally
  useEffect(() => {
    const d = new Date(value + 'T00:00:00');
    setViewY(d.getFullYear()); setViewM(d.getMonth());
  }, [value]);

  const maxDate = max ? new Date(max + 'T00:00:00') : null;
  const selDate = new Date(value + 'T00:00:00');

  const prevMonth = () => { if (viewM === 0) { setViewM(11); setViewY(y => y - 1); } else setViewM(m => m - 1); };
  const nextMonth = () => { if (viewM === 11) { setViewM(0);  setViewY(y => y + 1); } else setViewM(m => m + 1); };

  // build calendar grid
  const firstDay = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pick = (day) => {
    if (!day) return;
    const d = new Date(viewY, viewM, day);
    if (maxDate && d > maxDate) return;
    const iso = d.toLocaleDateString('en-CA');
    onChange(iso);
    setOpen(false);
  };

  const isSel = (day) => day && selDate.getFullYear() === viewY && selDate.getMonth() === viewM && selDate.getDate() === day;
  const isDisabled = (day) => day && maxDate && new Date(viewY, viewM, day) > maxDate;
  const isToday = (day) => {
    const now = new Date();
    return day && now.getFullYear() === viewY && now.getMonth() === viewM && now.getDate() === day;
  };

  // display label
  const label = selDate.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all
          ${open ? 'bg-gray-700 border-blue-500/60 text-white' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-200'}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 text-blue-400 shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        {label}
        <svg viewBox="0 0 10 6" fill="none" className={`w-2.5 h-2.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>

          {/* Month nav */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button onClick={prevMonth}
              className="w-8 h-8 rounded-lg hover:bg-gray-800 flex items-center justify-center transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-gray-400"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-white text-sm font-semibold">{MONTHS[viewM]} {viewY}</span>
            <button onClick={nextMonth}
              disabled={maxDate && new Date(viewY, viewM + 1, 1) > maxDate}
              className="w-8 h-8 rounded-lg hover:bg-gray-800 disabled:opacity-20 flex items-center justify-center transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-gray-400"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-gray-600 text-[10px] font-bold uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((day, i) => {
              const sel  = isSel(day);
              const dis  = isDisabled(day);
              const tod  = isToday(day);
              return (
                <button key={i} onClick={() => pick(day)} disabled={!day || dis}
                  className={`w-full aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center
                    ${!day ? 'invisible' : ''}
                    ${dis ? 'text-gray-700 cursor-not-allowed' : ''}
                    ${sel ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-bold' : ''}
                    ${!sel && !dis && tod ? 'text-blue-400 font-bold ring-1 ring-blue-500/40' : ''}
                    ${!sel && !dis && !tod ? 'text-gray-300 hover:bg-gray-800' : ''}
                  `}>
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 px-4 py-2.5 flex justify-between">
            <button onClick={() => { onChange(new Date().toLocaleDateString('en-CA')); setOpen(false); }}
              className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Generate print HTML ── */
function buildPrintHTML(data, hotelName, date) {
    const { totals, byMethod, topItems, byType, shiftInfo, voidCount } = data;
    const totalRevenue = parseFloat(totals?.revenue || 0);

    const methodRows = byMethod.map(m => `
        <tr>
            <td>${METHOD_LABELS[m.payment_method] || m.payment_method}</td>
            <td style="text-align:right">${m.count} txns</td>
            <td style="text-align:right">Rs. ${fmt(m.total)}</td>
        </tr>`).join('');

    const itemRows = topItems.slice(0, 8).map((item, i) => `
        <tr>
            <td>${i + 1}. ${item.name}</td>
            <td style="text-align:right">${item.qty}x</td>
            <td style="text-align:right">Rs. ${fmt(item.revenue)}</td>
        </tr>`).join('');

    const typeRows = byType.map(t => `
        <tr>
            <td>${TYPE_LABELS[t.order_type] || t.order_type}</td>
            <td style="text-align:right">${t.count}</td>
            <td style="text-align:right">Rs. ${fmt(t.revenue)}</td>
        </tr>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; padding: 4mm; color: #000; }
        .center { text-align: center; }
        .bold   { font-weight: bold; }
        .big    { font-size: 16px; }
        .xlg    { font-size: 20px; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .divider2 { border-top: 2px solid #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 1px 0; vertical-align: top; }
        .section-title { font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin: 6px 0 3px; }
        .kpi { display: flex; justify-content: space-between; padding: 2px 0; }
        .kv-label { color: #555; }
        .highlight { font-size: 14px; font-weight: bold; }
    </style></head><body>
    <div class="center bold" style="font-size:13px; margin-bottom:2px">${hotelName}</div>
    <div class="center" style="font-size:10px; margin-bottom:2px">END OF DAY REPORT</div>
    <div class="center" style="font-size:10px">${displayDate(date)}</div>
    <div class="center" style="font-size:9px; color:#555">Printed: ${new Date().toLocaleString('en-LK')}</div>
    <div class="divider2"></div>

    <div class="section-title">Summary</div>
    <div class="kpi"><span class="kv-label">Total Revenue</span><span class="bold highlight">Rs. ${fmt(totals?.revenue)}</span></div>
    <div class="kpi"><span class="kv-label">Orders Completed</span><span class="bold">${fmtN(totals?.order_count)}</span></div>
    <div class="kpi"><span class="kv-label">Average Order</span><span>Rs. ${fmt(totals?.avg_order)}</span></div>
    <div class="kpi"><span class="kv-label">Discounts Given</span><span>Rs. ${fmt(totals?.total_discounts)}</span></div>
    <div class="kpi"><span class="kv-label">Tax Collected</span><span>Rs. ${fmt(totals?.tax)}</span></div>
    <div class="kpi"><span class="kv-label">Net (Ex-Tax)</span><span>Rs. ${fmt(totals?.subtotal)}</span></div>
    ${voidCount?.count > 0 ? `<div class="kpi"><span class="kv-label">Voided Items</span><span>${voidCount.count}</span></div>` : ''}
    <div class="divider"></div>

    ${byMethod.length ? `
    <div class="section-title">Payment Methods</div>
    <table>${methodRows}</table>
    <div class="divider"></div>` : ''}

    ${byType.length ? `
    <div class="section-title">Order Types</div>
    <table>${typeRows}</table>
    <div class="divider"></div>` : ''}

    ${topItems.length ? `
    <div class="section-title">Top Items</div>
    <table>${itemRows}</table>
    <div class="divider"></div>` : ''}

    ${shiftInfo ? `
    <div class="section-title">Shift Info</div>
    <div class="kpi"><span class="kv-label">Shift #</span><span>${shiftInfo.id}</span></div>
    <div class="kpi"><span class="kv-label">Status</span><span class="bold">${shiftInfo.status === 'open' ? 'STILL OPEN' : 'CLOSED'}</span></div>
    <div class="kpi"><span class="kv-label">Opening Float</span><span>Rs. ${fmt(shiftInfo.opening_float)}</span></div>
    ${shiftInfo.status === 'closed' ? `
    <div class="kpi"><span class="kv-label">Closing Cash</span><span>Rs. ${fmt(shiftInfo.closing_cash_count)}</span></div>
    <div class="kpi"><span class="kv-label">Expected Cash</span><span>Rs. ${fmt(shiftInfo.expected_cash)}</span></div>
    <div class="kpi"><span class="kv-label">Variance</span><span class="bold">${parseFloat(shiftInfo.cash_difference || 0) >= 0 ? '+' : ''}Rs. ${fmt(shiftInfo.cash_difference)}</span></div>
    ` : ''}
    <div class="divider"></div>` : ''}

    <div class="center" style="margin-top:6px; font-size:9px; color:#777">— DreamLabs POS —</div>
    </body></html>`;
}

export default function EODReportView() {
    const [date,    setDate]    = useState(today());
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);

    const hotelName = (() => {
        try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}').hotelName || 'Hotel POS'; }
        catch { return 'Hotel POS'; }
    })();
    const printerName = (() => {
        try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}').receiptPrinter || ''; }
        catch { return ''; }
    })();

    const load = useCallback(async (d) => {
        setLoading(true);
        try {
            const res = await window.electron.database({ action: 'getDailySalesReport', data: { date: d } });
            if (res.success) setData(res.data);
            else toast.error('Failed to load report');
        } catch { toast.error('Failed to load report'); }
        setLoading(false);
    }, []);

    useEffect(() => { load(date); }, [date]);

    const handlePrint = async () => {
        if (!data) return;
        setPrinting(true);
        try {
            const html = buildPrintHTML(data, hotelName, date);
            const res  = await window.electron.printReceipt({ html, printerName });
            if (res?.success) toast.success('Report printed');
            else toast.error('Print failed: ' + (res?.error || 'Unknown error'));
        } catch (e) { toast.error('Print failed: ' + e.message); }
        setPrinting(false);
    };

    const totalRevenue = parseFloat(data?.totals?.revenue || 0);
    const maxMethod    = Math.max(...(data?.byMethod || []).map(m => m.total), 1);
    const maxItem      = Math.max(...(data?.topItems || []).map(i => i.revenue), 1);
    const isToday      = date === today();

    return (
        <div className="h-full overflow-auto bg-gray-900">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

                {/* ── Header ── */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-white text-xl font-bold">End-of-Day Report</h1>
                        <p className="text-gray-500 text-sm mt-0.5">{displayDate(date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Date nav */}
                        <button
                            onClick={() => {
                                const d = new Date(date + 'T00:00:00');
                                d.setDate(d.getDate() - 1);
                                setDate(d.toLocaleDateString('en-CA'));
                            }}
                            className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 flex items-center justify-center transition-colors"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-gray-400">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                        <DatePicker value={date} max={today()} onChange={setDate} />
                        <button
                            onClick={() => {
                                if (date >= today()) return;
                                const d = new Date(date + 'T00:00:00');
                                d.setDate(d.getDate() + 1);
                                setDate(d.toLocaleDateString('en-CA'));
                            }}
                            disabled={date >= today()}
                            className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-30 flex items-center justify-center transition-colors"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-gray-400">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                        {!isToday && (
                            <button
                                onClick={() => setDate(today())}
                                className="px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Today
                            </button>
                        )}
                        <button
                            onClick={() => load(date)}
                            disabled={loading}
                            className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 flex items-center justify-center transition-colors"
                            title="Refresh"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`}>
                                <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                            </svg>
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={printing || !data || (data?.totals?.order_count === 0)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-colors"
                        >
                            {printing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                                </svg>
                            )}
                            Print Report
                        </button>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/>
                    </div>
                )}

                {/* No data */}
                {!loading && data?.totals?.order_count === 0 && (
                    <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-12 text-center">
                        <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" className="w-7 h-7">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/>
                            </svg>
                        </div>
                        <p className="text-gray-300 font-semibold">No orders for this date</p>
                        <p className="text-gray-600 text-sm mt-1">Try selecting a different date</p>
                    </div>
                )}

                {/* ── Report content ── */}
                {!loading && data && data.totals?.order_count > 0 && (
                    <div className="space-y-4">

                        {/* ── 4 KPI cards ── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { label: 'Total Revenue',    value: `Rs. ${fmt(data.totals?.revenue)}`,     color: '#22c55e', icon: '💰', sub: `${fmtN(data.totals?.order_count)} orders` },
                                { label: 'Avg Order Value',  value: `Rs. ${fmt(data.totals?.avg_order)}`,   color: '#3b82f6', icon: '🧾', sub: 'per completed order' },
                                { label: 'Discounts Given',  value: `Rs. ${fmt(data.totals?.total_discounts)}`, color: '#f59e0b', icon: '🏷', sub: 'total savings' },
                                { label: 'Tax Collected',    value: `Rs. ${fmt(data.totals?.tax)}`,         color: '#8b5cf6', icon: '🏛', sub: `Net Rs. ${fmt(data.totals?.subtotal)}` },
                            ].map(k => (
                                <div key={k.label} className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4 flex gap-3 items-start">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                                        style={{ background: k.color + '20', border: `1px solid ${k.color}30` }}>
                                        {k.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">{k.label}</p>
                                        <p className="text-white text-base font-bold leading-tight mt-0.5" style={{ color: k.color }}>{k.value}</p>
                                        <p className="text-gray-500 text-[11px] mt-0.5">{k.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Payment methods + Order types ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Payment methods */}
                            <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                                <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-4">Payment Methods</h3>
                                {data.byMethod.length === 0 ? (
                                    <p className="text-gray-600 text-xs">No payment data</p>
                                ) : (
                                    <div className="space-y-3">
                                        {data.byMethod.map(m => {
                                            const pct = totalRevenue > 0 ? (m.total / totalRevenue) * 100 : 0;
                                            const color = METHOD_COLORS[m.payment_method] || '#6b7280';
                                            return (
                                                <div key={m.payment_method}>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }}/>
                                                            <span className="text-gray-300 text-sm font-medium">{METHOD_LABELS[m.payment_method] || m.payment_method}</span>
                                                            <span className="text-gray-600 text-xs">{m.count} txns</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-white text-sm font-bold">Rs. {fmt(m.total)}</span>
                                                            <span className="text-gray-500 text-xs ml-2">{pct.toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                    <MiniBar pct={pct} color={color} />
                                                </div>
                                            );
                                        })}
                                        <div className="pt-2 border-t border-gray-700/50 flex justify-between text-xs">
                                            <span className="text-gray-500">Total collected</span>
                                            <span className="text-green-400 font-bold">Rs. {fmt(totalRevenue)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Order types + extras */}
                            <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                                <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-4">Order Types</h3>
                                <div className="space-y-3">
                                    {data.byType.map(t => {
                                        const pct = totalRevenue > 0 ? (t.revenue / totalRevenue) * 100 : 0;
                                        return (
                                            <div key={t.order_type}>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-300 text-sm font-medium">{TYPE_LABELS[t.order_type] || t.order_type}</span>
                                                        <span className="text-gray-600 text-xs">{t.count} orders</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-white text-sm font-bold">Rs. {fmt(t.revenue)}</span>
                                                        <span className="text-gray-500 text-xs ml-2">{pct.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                                <MiniBar pct={pct} color="#6366f1" />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Extra metrics */}
                                <div className="mt-4 pt-3 border-t border-gray-700/50 space-y-2">
                                    {data.voidCount?.count > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Voided items</span>
                                            <span className="text-red-400 font-semibold">{data.voidCount.count}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Orders completed</span>
                                        <span className="text-white font-semibold">{fmtN(data.totals?.order_count)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Revenue per order</span>
                                        <span className="text-white font-semibold">Rs. {fmt(data.totals?.avg_order)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Hourly chart ── */}
                        <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest">Hourly Revenue</h3>
                                {data.hourly.length > 0 && (
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>Peak: Rs. {fmt(Math.max(...data.hourly.map(h => h.revenue)))}</span>
                                        <span>•</span>
                                        <span>Busiest: {(() => {
                                            const peak = data.hourly.reduce((a, b) => b.revenue > a.revenue ? b : a, data.hourly[0]);
                                            const h = peak.hour;
                                            return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
                                        })()}</span>
                                    </div>
                                )}
                            </div>
                            <HourBars hourly={data.hourly} />
                        </div>

                        {/* ── Top items ── */}
                        {data.topItems.length > 0 && (
                            <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                                <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-4">Top Selling Items</h3>
                                <div className="space-y-2.5">
                                    {data.topItems.map((item, i) => {
                                        const pct = (item.revenue / maxItem) * 100;
                                        const medals = ['🥇', '🥈', '🥉'];
                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="text-sm w-6 shrink-0 text-center">
                                                    {medals[i] || <span className="text-gray-600 text-xs font-bold">{i + 1}</span>}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="min-w-0">
                                                            <span className="text-gray-200 text-sm font-medium truncate block">{item.name}</span>
                                                            <span className="text-gray-600 text-[10px]">{item.category}</span>
                                                        </div>
                                                        <div className="text-right shrink-0 ml-2">
                                                            <span className="text-green-400 text-sm font-bold">Rs. {fmt(item.revenue)}</span>
                                                            <span className="text-gray-500 text-xs block">{fmtN(item.qty)} sold</span>
                                                        </div>
                                                    </div>
                                                    <MiniBar pct={pct} color="#22c55e" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Shift info ── */}
                        {data.shiftInfo && (
                            <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest">Shift Summary</h3>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${data.shiftInfo.status === 'open' ? 'bg-green-900/50 text-green-400 border border-green-800/40' : 'bg-gray-700 text-gray-400 border border-gray-600/40'}`}>
                                        {data.shiftInfo.status === 'open' ? 'SHIFT OPEN' : 'SHIFT CLOSED'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Shift #',        value: `#${data.shiftInfo.id}`,                          color: 'text-gray-300' },
                                        { label: 'Opening Float',  value: `Rs. ${fmt(data.shiftInfo.opening_float)}`,        color: 'text-blue-400' },
                                        { label: 'Opened At',      value: timeStr(data.shiftInfo.opened_at),                 color: 'text-gray-300' },
                                        { label: 'Closed At',      value: data.shiftInfo.closed_at ? timeStr(data.shiftInfo.closed_at) : '—',  color: 'text-gray-300' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-gray-900/50 rounded-xl p-3">
                                            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{s.label}</p>
                                            <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                                        </div>
                                    ))}
                                    {data.shiftInfo.status === 'closed' && (
                                        <>
                                            <div className="bg-gray-900/50 rounded-xl p-3">
                                                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Expected Cash</p>
                                                <p className="font-bold text-sm text-white">Rs. {fmt(data.shiftInfo.expected_cash)}</p>
                                            </div>
                                            <div className="bg-gray-900/50 rounded-xl p-3">
                                                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Closing Count</p>
                                                <p className="font-bold text-sm text-white">Rs. {fmt(data.shiftInfo.closing_cash_count)}</p>
                                            </div>
                                            <div className="col-span-2 bg-gray-900/50 rounded-xl p-3">
                                                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Cash Variance</p>
                                                <p className={`font-bold text-sm ${parseFloat(data.shiftInfo.cash_difference || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {parseFloat(data.shiftInfo.cash_difference || 0) >= 0 ? '+' : ''}Rs. {fmt(data.shiftInfo.cash_difference)}
                                                    <span className="text-gray-500 font-normal text-xs ml-2">
                                                        {parseFloat(data.shiftInfo.cash_difference || 0) >= 0 ? 'surplus' : 'shortage'}
                                                    </span>
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}
