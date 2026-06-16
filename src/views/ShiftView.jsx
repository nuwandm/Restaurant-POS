import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeShift, loadShiftSummary, clearShiftSummary, loadOpenShift } from '../store/slices/shiftSlice';
import toast from 'react-hot-toast';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt  = (n) => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function elapsed(startISO) {
  if (!startISO) return '—';
  const ms = Date.now() - new Date(startISO + 'Z').getTime();
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function duration(startISO, endISO) {
  if (!startISO || !endISO) return '—';
  const ms = new Date(endISO + 'Z').getTime() - new Date(startISO + 'Z').getTime();
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function timeStr(iso) {
  if (!iso) return '—';
  return new Date(iso + 'Z').toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function dateStr(iso) {
  if (!iso) return '—';
  return new Date(iso + 'Z').toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fullDateStr(iso) {
  if (!iso) return '—';
  return new Date(iso + 'Z').toLocaleDateString('en-LK', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

const METHOD_COLOR = { cash: '#22c55e', card: '#8b5cf6', mobile: '#3b82f6' };
const METHOD_LABEL = { cash: 'Cash', card: 'Card', mobile: 'Mobile' };
const TYPE_LABEL   = { dine_in: 'Dine-In', takeaway: 'Takeaway', delivery: 'Delivery' };

// ── Sub-components ────────────────────────────────────────────────────────────
function StatBadge({ label, value, color = '#3b82f6', icon }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/40 rounded-2xl p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
        style={{ background: color + '20', border: `1px solid ${color}30` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-white text-lg font-bold leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div className="h-1.5 rounded-full bg-gray-700/60 overflow-hidden mt-1.5">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 0)}%`, background: color }} />
    </div>
  );
}

function HourBar({ hour, revenue, maxRevenue, orders }) {
  const pct    = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  const isPeak = revenue === maxRevenue && revenue > 0;
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0 group relative">
      <div className="w-full flex flex-col justify-end" style={{ height: 48 }}>
        <div className="w-full rounded-t-sm transition-all" style={{
          height: `${Math.max(pct, orders > 0 ? 5 : 0)}%`,
          background: isPeak ? '#22c55e' : pct > 50 ? '#3b82f6' : '#374151',
          minHeight: orders > 0 ? 3 : 0,
        }} />
      </div>
      <span className="text-gray-700 text-[8px] font-mono">{String(hour).padStart(2,'0')}</span>
      {orders > 0 && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap text-[10px]">
          <p className="text-white font-semibold">{hour}:00 — Rs. {fmt(revenue)}</p>
          <p className="text-gray-400">{orders} order{orders !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest">{children}</h2>
      {action}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-800/60" />;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ShiftView() {
  const dispatch    = useDispatch();
  const { currentShift, summary, loading } = useSelector(s => s.shift);
  const currentUser = useSelector(s => s.auth.currentUser);

  const [tab,          setTab]          = useState('overview'); // 'overview' | 'close' | 'history'
  const [closingCash,  setClosingCash]  = useState('');
  const [notes,        setNotes]        = useState('');
  const [history,      setHistory]      = useState([]);
  const [histLoading,  setHistLoading]  = useState(false);
  const [hourly,       setHourly]       = useState([]);
  const [expanded,     setExpanded]     = useState(null);
  const [tick,         setTick]         = useState(0);

  // Live clock tick every minute
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Load/refresh summary + hourly every 30s
  useEffect(() => {
    if (!currentShift?.id) return;
    dispatch(loadShiftSummary(currentShift.id));
    loadHourly(currentShift.id);
    const id = setInterval(() => {
      dispatch(loadShiftSummary(currentShift.id));
      loadHourly(currentShift.id);
    }, 30000);
    return () => { clearInterval(id); dispatch(clearShiftSummary()); };
  }, [currentShift?.id]);

  // Load history when switching to history tab
  useEffect(() => {
    if (tab === 'history' && history.length === 0) loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res = await window.electron.database({ action: 'getShiftHistory' });
      if (res.success) setHistory(res.data || []);
    } catch { /**/ }
    setHistLoading(false);
  };

  const loadHourly = async (shiftId) => {
    try {
      const res = await window.electron.database({ action: 'getShiftHourlyBreakdown', data: { shiftId } });
      if (res.success) setHourly(res.data || []);
    } catch { /**/ }
  };

  const handleClose = async () => {
    if (!currentShift) return;
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) { toast.error('Enter a valid closing cash amount'); return; }
    try {
      await dispatch(closeShift({
        shiftId:          currentShift.id,
        closingCashCount: amount,
        notes,
        closedByName:     currentUser?.name || null,
      })).unwrap();
      await dispatch(loadOpenShift()).unwrap();
      toast.success('Shift closed successfully');
      setTab('overview');
      setClosingCash('');
      setNotes('');
      loadHistory();
    } catch (err) {
      toast.error(err.message || 'Failed to close shift');
    }
  };

  // Derived values
  const shift        = summary?.shift;
  const topItems     = summary?.topItems || [];
  const byMethod     = summary?.byMethod || [];
  const byType       = summary?.byType   || [];
  const voidCount    = summary?.voidCount?.count || 0;

  const totalRevenue  = parseFloat(shift?.total_cash_sales || 0)
                      + parseFloat(shift?.total_card_sales || 0)
                      + parseFloat(shift?.total_mobile_sales || 0);
  const expectedCash  = parseFloat(currentShift?.opening_float || 0)
                      + parseFloat(shift?.total_cash_sales || 0);
  const closingNum    = parseFloat(closingCash) || 0;
  const cashDiff      = closingNum - expectedCash;
  const orderCount    = shift?.order_count ?? 0;
  const avgOrder      = orderCount > 0 ? totalRevenue / orderCount : 0;
  const maxHourly     = hourly.reduce((m, r) => Math.max(m, r.revenue), 0);
  const closedHistory = history.filter(s => s.status === 'closed');

  // Hourly chart fill (fill gaps between first and last hour)
  const hourlyFilled = (() => {
    if (!hourly.length) return [];
    const map = Object.fromEntries(hourly.map(r => [r.hour, r]));
    const min = parseInt(hourly[0].hour, 10);
    const max = parseInt(hourly[hourly.length - 1].hour, 10);
    return Array.from({ length: max - min + 1 }, (_, i) => {
      const h = String(min + i).padStart(2, '0');
      return map[h] || { hour: h, orders: 0, revenue: 0 };
    });
  })();

  const peakHour = hourly.length
    ? hourly.reduce((a, b) => b.revenue > a.revenue ? b : a, hourly[0])
    : null;

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview', label: 'Overview' },
    ...(currentShift ? [{ id: 'close', label: 'Close Shift' }] : []),
    { id: 'history',  label: `History${closedHistory.length ? ` (${closedHistory.length})` : ''}` },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900">

      {/* ── Page header ── */}
      <div className="shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-white text-xl font-bold">Shift Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {currentShift
                ? `Shift #${currentShift.id} · Running ${elapsed(currentShift.opened_at)} · Started ${timeStr(currentShift.opened_at)}${currentShift.opened_by_name ? ` by ${currentShift.opened_by_name}` : ''}`
                : 'No active shift'}
            </p>
          </div>

          {/* Status pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            currentShift
              ? 'bg-green-900/30 border-green-700/40 text-green-400'
              : 'bg-gray-800/60 border-gray-700/40 text-gray-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${currentShift ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            {currentShift ? 'SHIFT OPEN' : 'NO SHIFT'}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-800">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-white border-blue-500'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              } ${t.id === 'close' ? 'text-red-400 hover:text-red-300' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto px-6 py-5">

        {/* ═══════════════════════════════ OVERVIEW ═══════════════════════════════ */}
        {tab === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-5">

            {!currentShift ? (
              <div className="bg-gray-800/30 border border-gray-700/20 rounded-2xl p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" className="w-7 h-7">
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                </div>
                <p className="text-gray-300 font-semibold">No shift currently open</p>
                <p className="text-gray-600 text-sm mt-1">Return to the POS screen to open a new shift.</p>
              </div>
            ) : (
              <>
                {/* ── 4 KPI tiles ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatBadge icon="💰" label="Total Revenue"   value={`Rs. ${fmt(totalRevenue)}`}   color="#22c55e" />
                  <StatBadge icon="🧾" label="Orders"          value={`${fmtN(orderCount)} orders`}  color="#3b82f6" />
                  <StatBadge icon="📊" label="Avg Order"       value={`Rs. ${fmt(avgOrder)}`}        color="#8b5cf6" />
                  <StatBadge icon="⏱"  label="Duration"        value={elapsed(currentShift.opened_at)} color="#f59e0b" />
                </div>

                {/* ── Payment methods + Order types ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Payment methods */}
                  <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                    <SectionTitle>Payment Breakdown</SectionTitle>
                    {byMethod.length === 0 ? (
                      <p className="text-gray-600 text-xs py-4 text-center">No payments yet</p>
                    ) : (
                      <div className="space-y-3">
                        {byMethod.map(m => {
                          const pct   = totalRevenue > 0 ? (m.total / totalRevenue) * 100 : 0;
                          const color = METHOD_COLOR[m.payment_method] || '#6b7280';
                          return (
                            <div key={m.payment_method}>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                  <span className="text-gray-300 text-sm">{METHOD_LABEL[m.payment_method] || m.payment_method}</span>
                                  <span className="text-gray-600 text-xs">{m.count}×</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-white text-sm font-bold">Rs. {fmt(m.total)}</span>
                                  <span className="text-gray-600 text-xs ml-1.5">{pct.toFixed(0)}%</span>
                                </div>
                              </div>
                              <ProgressBar pct={pct} color={color} />
                            </div>
                          );
                        })}
                        <Divider />
                        <div className="flex justify-between text-xs pt-0.5">
                          <span className="text-gray-500">Total collected</span>
                          <span className="text-green-400 font-bold">Rs. {fmt(totalRevenue)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order types + quick stats */}
                  <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                    <SectionTitle>Order Types</SectionTitle>
                    {byType.length === 0 ? (
                      <p className="text-gray-600 text-xs py-4 text-center">No orders yet</p>
                    ) : (
                      <div className="space-y-3">
                        {byType.map(t => {
                          const pct = totalRevenue > 0 ? (t.revenue / totalRevenue) * 100 : 0;
                          return (
                            <div key={t.order_type}>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-300 text-sm">{TYPE_LABEL[t.order_type] || t.order_type}</span>
                                  <span className="text-gray-600 text-xs">{t.count} orders</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-white text-sm font-bold">Rs. {fmt(t.revenue)}</span>
                                  <span className="text-gray-600 text-xs ml-1.5">{pct.toFixed(0)}%</span>
                                </div>
                              </div>
                              <ProgressBar pct={pct} color="#6366f1" />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Divider />
                    <div className="space-y-1.5 mt-3">
                      {[
                        { label: 'Opening Float',    value: `Rs. ${fmt(currentShift.opening_float)}`,  color: 'text-blue-400' },
                        { label: 'Expected in Till', value: `Rs. ${fmt(expectedCash)}`,                color: 'text-white' },
                        { label: 'Discounts Given',  value: `Rs. ${fmt(shift?.total_discounts)}`,      color: 'text-yellow-400' },
                        ...(voidCount > 0 ? [{ label: 'Voided Items', value: `${voidCount}`, color: 'text-red-400' }] : []),
                      ].map(r => (
                        <div key={r.label} className="flex justify-between text-xs">
                          <span className="text-gray-500">{r.label}</span>
                          <span className={`font-semibold ${r.color}`}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Hourly chart + Top items ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* Hourly */}
                  <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                    <SectionTitle action={
                      peakHour && <span className="text-gray-600 text-[10px]">Peak {peakHour.hour}:00 · Rs. {fmt(peakHour.revenue)}</span>
                    }>
                      Hourly Sales
                    </SectionTitle>
                    {hourlyFilled.length === 0 ? (
                      <div className="h-16 flex items-center justify-center text-gray-600 text-xs">No sales yet</div>
                    ) : (
                      <div className="flex items-end gap-1" style={{ height: 64 }}>
                        {hourlyFilled.map((r, i) => (
                          <HourBar key={i} hour={parseInt(r.hour, 10)} revenue={r.revenue} orders={r.orders} maxRevenue={maxHourly} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top items */}
                  <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                    <SectionTitle>Top Selling Items</SectionTitle>
                    {topItems.length === 0 ? (
                      <div className="h-16 flex items-center justify-center text-gray-600 text-xs">No items sold yet</div>
                    ) : (
                      <div className="space-y-2.5">
                        {topItems.map((item, i) => {
                          const pct    = topItems[0]?.revenue > 0 ? (item.revenue / topItems[0].revenue) * 100 : 0;
                          const medals = ['🥇','🥈','🥉'];
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-sm w-5 text-center shrink-0">{medals[i] || <span className="text-gray-600 text-xs">{i+1}</span>}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                  <span className="text-gray-200 text-xs font-medium truncate">{item.name}</span>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-gray-500 text-[10px]">{fmtN(item.qty)}×</span>
                                    <span className="text-green-400 text-xs font-bold">Rs. {fmt(item.revenue)}</span>
                                  </div>
                                </div>
                                <ProgressBar pct={pct} color="#22c55e" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Bottom info bar ── */}
                <div className="bg-gray-800/30 border border-gray-700/20 rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 text-xs">
                  {[
                    { label: 'Shift', value: `#${currentShift.id}` },
                    { label: 'Started', value: `${fullDateStr(currentShift.opened_at)}, ${timeStr(currentShift.opened_at)}` },
                    ...(currentShift.opened_by_name ? [{ label: 'Opened by', value: currentShift.opened_by_name }] : []),
                    { label: 'Running', value: elapsed(currentShift.opened_at) },
                  ].map((item, i) => (
                    <React.Fragment key={item.label}>
                      {i > 0 && <div className="w-px h-3 bg-gray-700" />}
                      <div>
                        <span className="text-gray-600">{item.label}: </span>
                        <span className="text-gray-300 font-semibold">{item.value}</span>
                      </div>
                    </React.Fragment>
                  ))}
                  <div className="ml-auto">
                    <button
                      onClick={() => setTab('close')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/50 border border-red-800/50 text-red-400 hover:text-red-300 rounded-lg font-semibold transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Close Shift
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════ CLOSE SHIFT ═══════════════════════════════ */}
        {tab === 'close' && currentShift && (
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Left: Reconciliation summary */}
              <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" className="w-4 h-4">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <h2 className="text-white font-bold text-sm">Cash Reconciliation</h2>
                </div>

                <div className="space-y-0 rounded-xl bg-gray-900/50 overflow-hidden divide-y divide-gray-800/60">
                  {[
                    { label: 'Opening Float',    value: `Rs. ${fmt(currentShift.opening_float)}`,   style: 'text-blue-400' },
                    { label: 'Cash Sales',        value: `+ Rs. ${fmt(shift?.total_cash_sales)}`,    style: 'text-green-400' },
                    { label: 'Expected in Till',  value: `Rs. ${fmt(expectedCash)}`,                 style: 'text-white font-bold', highlight: true },
                  ].map(r => (
                    <div key={r.label} className={`flex justify-between items-center px-3 py-2.5 ${r.highlight ? 'bg-blue-950/20' : ''}`}>
                      <span className="text-gray-400 text-sm">{r.label}</span>
                      <span className={`text-sm font-semibold ${r.style}`}>{r.value}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-0 rounded-xl bg-gray-900/50 overflow-hidden divide-y divide-gray-800/60">
                  {[
                    { label: 'Card Sales',    value: `Rs. ${fmt(shift?.total_card_sales)}`,   style: 'text-purple-400' },
                    { label: 'Mobile Sales',  value: `Rs. ${fmt(shift?.total_mobile_sales)}`, style: 'text-blue-400' },
                    { label: 'Total Revenue', value: `Rs. ${fmt(totalRevenue)}`,               style: 'text-green-400 font-bold', highlight: true },
                  ].map(r => (
                    <div key={r.label} className={`flex justify-between items-center px-3 py-2.5 ${r.highlight ? 'bg-green-950/20' : ''}`}>
                      <span className="text-gray-400 text-sm">{r.label}</span>
                      <span className={`text-sm font-semibold ${r.style}`}>{r.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-900/50 rounded-xl p-3">
                    <p className="text-gray-600 mb-0.5">Orders</p>
                    <p className="text-white font-bold text-sm">{fmtN(orderCount)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3">
                    <p className="text-gray-600 mb-0.5">Discounts</p>
                    <p className="text-yellow-400 font-bold text-sm">Rs. {fmt(shift?.total_discounts)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3">
                    <p className="text-gray-600 mb-0.5">Duration</p>
                    <p className="text-white font-bold text-sm">{elapsed(currentShift.opened_at)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3">
                    <p className="text-gray-600 mb-0.5">Cashier</p>
                    <p className="text-white font-bold text-sm truncate">{currentUser?.name || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Right: Till count + confirm */}
              <div className="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="w-4 h-4">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h2 className="text-white font-bold text-sm">Count the Till</h2>
                </div>

                <p className="text-gray-500 text-xs">Count all notes and coins in the register, then enter the total below.</p>

                <div>
                  <label className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 block">Actual Cash in Till</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm select-none z-10">Rs.</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={closingCash}
                      onChange={e => setClosingCash(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-2xl pl-12 pr-14 py-4 text-white text-2xl font-bold
                        focus:outline-none focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20 transition-all
                        [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      autoFocus
                    />
                    {/* Custom spin buttons */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setClosingCash(v => String((parseFloat(v) || 0) + 100)); }}
                        className="w-8 h-7 rounded-lg bg-gray-700/80 hover:bg-gray-600 active:bg-gray-500 border border-gray-600/60 flex items-center justify-center transition-colors group"
                      >
                        <svg viewBox="0 0 10 6" fill="none" className="w-2.5 h-2.5">
                          <path d="M1 5L5 1L9 5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white transition-colors"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setClosingCash(v => String(Math.max(0, (parseFloat(v) || 0) - 100))); }}
                        className="w-8 h-7 rounded-lg bg-gray-700/80 hover:bg-gray-600 active:bg-gray-500 border border-gray-600/60 flex items-center justify-center transition-colors group"
                      >
                        <svg viewBox="0 0 10 6" fill="none" className="w-2.5 h-2.5">
                          <path d="M1 1L5 5L9 1" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white transition-colors"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Variance indicator */}
                  {closingCash !== '' && (
                    <div className={`mt-3 rounded-xl p-3 flex items-center gap-3 ${cashDiff >= 0 ? 'bg-green-950/40 border border-green-800/40' : 'bg-red-950/40 border border-red-800/40'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${cashDiff >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {cashDiff >= 0 ? '✓' : '!'}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${cashDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {cashDiff >= 0 ? 'Surplus' : 'Shortage'}: Rs. {fmt(Math.abs(cashDiff))}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Expected Rs. {fmt(expectedCash)} · Counted Rs. {fmt(closingNum)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 block">Handover Notes <span className="text-gray-600 font-normal normal-case">optional</span></label>
                  <textarea
                    rows={3}
                    placeholder="Any issues, pending orders, or notes for the next shift..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm
                      focus:outline-none focus:border-blue-500/80 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setTab('overview')}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={loading || closingCash === ''}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                    Confirm Close Shift
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ HISTORY ═══════════════════════════════ */}
        {tab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 text-xs">{closedHistory.length} closed shifts</p>
              <button onClick={loadHistory} className="text-gray-600 hover:text-gray-400 text-xs transition-colors flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 ${histLoading ? 'animate-spin' : ''}`}>
                  <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                Refresh
              </button>
            </div>

            {histLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin"/>
              </div>
            ) : closedHistory.length === 0 ? (
              <div className="bg-gray-800/30 border border-gray-700/20 rounded-2xl p-10 text-center text-gray-600 text-sm">
                No closed shifts yet
              </div>
            ) : (
              closedHistory.map(sh => {
                const rev  = parseFloat(sh.total_cash_sales||0) + parseFloat(sh.total_card_sales||0) + parseFloat(sh.total_mobile_sales||0);
                const diff = parseFloat(sh.cash_difference||0);
                const dur  = duration(sh.opened_at, sh.closed_at);
                const isEx = expanded === sh.id;
                const avgO = sh.order_count > 0 ? rev / sh.order_count : 0;

                return (
                  <div key={sh.id} className="bg-gray-800/40 border border-gray-700/30 rounded-2xl overflow-hidden">
                    {/* Row */}
                    <button
                      className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors focus:outline-none"
                      onClick={() => setExpanded(isEx ? null : sh.id)}
                    >
                      <div className="flex items-center gap-4 min-w-0 text-left">
                        {/* Shift # */}
                        <div className="w-10 h-10 rounded-xl bg-gray-900/60 border border-gray-700/40 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">#{sh.id}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-semibold">
                              {fullDateStr(sh.opened_at)}
                            </span>
                            {Math.abs(diff) > 0.5 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diff >= 0 ? 'bg-green-900/60 text-green-400' : 'bg-red-900/60 text-red-400'}`}>
                                {diff >= 0 ? `+Rs.${fmt(diff)}` : `-Rs.${fmt(Math.abs(diff))}`}
                              </span>
                            )}
                            {sh.status === 'open' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/30">OPEN</span>
                            )}
                          </div>
                          <p className="text-gray-500 text-[11px] mt-0.5">
                            {timeStr(sh.opened_at)} → {sh.closed_at ? timeStr(sh.closed_at) : 'ongoing'}
                            {dur !== '—' ? ` · ${dur}` : ''}
                            {sh.opened_by_name ? ` · ${sh.opened_by_name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 shrink-0 ml-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-green-400 text-sm font-bold">Rs. {fmt(rev)}</p>
                          <p className="text-gray-500 text-[11px]">{sh.order_count} orders</p>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`w-4 h-4 text-gray-600 transition-transform ${isEx ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isEx && (
                      <div className="border-t border-gray-700/40 px-4 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
                          {[
                            { label: 'Total Revenue',  value: `Rs. ${fmt(rev)}`,                  color: 'text-green-400' },
                            { label: 'Opening Float',  value: `Rs. ${fmt(sh.opening_float)}`,     color: 'text-blue-400' },
                            { label: 'Cash Sales',     value: `Rs. ${fmt(sh.total_cash_sales)}`,  color: 'text-green-400' },
                            { label: 'Card + Mobile',  value: `Rs. ${fmt(parseFloat(sh.total_card_sales||0)+parseFloat(sh.total_mobile_sales||0))}`, color: 'text-purple-400' },
                            { label: 'Avg Order',      value: `Rs. ${fmt(avgO)}`,                 color: 'text-white' },
                            { label: 'Discounts',      value: `Rs. ${fmt(sh.total_discounts)}`,   color: 'text-yellow-400' },
                            { label: 'Duration',       value: dur,                                color: 'text-white' },
                            { label: 'Orders',         value: `${fmtN(sh.order_count)}`,          color: 'text-white' },
                          ].map(c => (
                            <div key={c.label} className="bg-gray-900/50 rounded-xl p-3">
                              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">{c.label}</p>
                              <p className={`font-bold text-sm ${c.color}`}>{c.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Cash reconciliation row */}
                        {sh.status === 'closed' && (
                          <div className="grid grid-cols-3 gap-2.5 mb-3">
                            <div className="bg-gray-900/50 rounded-xl p-3">
                              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Expected Cash</p>
                              <p className="font-bold text-sm text-white">Rs. {fmt(sh.expected_cash)}</p>
                            </div>
                            <div className="bg-gray-900/50 rounded-xl p-3">
                              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Closing Count</p>
                              <p className="font-bold text-sm text-white">Rs. {fmt(sh.closing_cash_count)}</p>
                            </div>
                            <div className={`rounded-xl p-3 ${diff >= 0 ? 'bg-green-950/30' : 'bg-red-950/30'}`}>
                              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Variance</p>
                              <p className={`font-bold text-sm ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {diff >= 0 ? '+' : ''}Rs. {fmt(diff)}
                                <span className="text-xs font-normal ml-1">{diff >= 0 ? 'surplus' : 'shortage'}</span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Staff + notes */}
                        <div className="flex flex-wrap gap-2">
                          {sh.opened_by_name && (
                            <div className="bg-gray-900/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                              <span className="text-gray-600 text-[10px]">Opened by</span>
                              <span className="text-gray-300 text-xs font-semibold">{sh.opened_by_name}</span>
                            </div>
                          )}
                          {sh.closed_by_name && (
                            <div className="bg-gray-900/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                              <span className="text-gray-600 text-[10px]">Closed by</span>
                              <span className="text-gray-300 text-xs font-semibold">{sh.closed_by_name}</span>
                            </div>
                          )}
                        </div>
                        {sh.notes && sh.notes.trim() && sh.notes.trim() !== '0' && (
                          <div className="mt-2 bg-gray-900/40 rounded-xl px-3 py-2.5">
                            <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Handover Notes</p>
                            <p className="text-gray-300 text-xs italic">"{sh.notes}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
