import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeShift, loadShiftSummary, clearShiftSummary, loadOpenShift } from '../store/slices/shiftSlice';
import toast from 'react-hot-toast';

function fmt(n) { return Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green:  'bg-green-500/10 border-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    red:    'bg-red-500/10 border-red-500/20 text-red-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">Rs. {value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ShiftView() {
  const dispatch = useDispatch();
  const { currentShift, summary, loading } = useSelector(s => s.shift);
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes]             = useState('');
  const [step, setStep]               = useState('summary'); // 'summary' | 'close'
  const [shiftHistory, setShiftHistory] = useState([]);
  const [histLoading, setHistLoading]   = useState(false);

  useEffect(() => {
    if (currentShift?.id) {
      dispatch(loadShiftSummary(currentShift.id));
    }
    loadHistory();
    return () => { dispatch(clearShiftSummary()); };
  }, [currentShift?.id]);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res = await window.electron.database({ action: 'getShiftHistory' });
      if (res.success) setShiftHistory(res.data || []);
    } catch { /* ignore */ }
    setHistLoading(false);
  };

  const handleClose = async () => {
    if (!currentShift) return;
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) {
      toast.error('Enter a valid closing cash amount');
      return;
    }
    try {
      await dispatch(closeShift({ shiftId: currentShift.id, closingCashCount: amount, notes })).unwrap();
      await dispatch(loadOpenShift()).unwrap();
      toast.success('Shift closed successfully');
      setStep('summary');
      setClosingCash('');
      setNotes('');
      loadHistory();
    } catch (err) {
      toast.error(err.message || 'Failed to close shift');
    }
  };

  const shift    = summary?.shift;
  const topItems = summary?.topItems || [];

  const openedAt = currentShift?.opened_at
    ? new Date(currentShift.opened_at + 'Z').toLocaleString('en-LK', { hour12: true })
    : '—';

  const expectedCash = shift
    ? (parseFloat(shift.opening_float || 0) + parseFloat(shift.total_cash_sales || 0))
    : (parseFloat(currentShift?.opening_float || 0));

  const closingNum  = parseFloat(closingCash) || 0;
  const cashDiff    = closingNum - expectedCash;

  return (
    <div className="h-full overflow-auto bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Shift Management</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {currentShift ? `Active since ${openedAt}` : 'No shift currently open'}
            </p>
          </div>
          {currentShift && step === 'summary' && (
            <button
              onClick={() => setStep('close')}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Close Shift
            </button>
          )}
        </div>

        {/* ── Current shift stats ── */}
        {currentShift && step === 'summary' && (
          <div className="space-y-4">
            <h2 className="text-gray-300 font-semibold text-sm uppercase tracking-wider">Current Shift</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard label="Opening Float"  value={fmt(currentShift.opening_float)}       color="blue"   />
              <StatCard label="Cash Sales"     value={fmt(shift?.total_cash_sales)}           color="green"  />
              <StatCard label="Card Sales"     value={fmt(shift?.total_card_sales)}           color="purple" />
              <StatCard label="Mobile Sales"   value={fmt(shift?.total_mobile_sales)}         color="purple" />
              <StatCard label="Discounts Given"value={fmt(shift?.total_discounts)}            color="yellow" />
              <StatCard label="Orders"         value={shift?.order_count ?? '—'}              color="blue"   sub="completed orders" />
            </div>

            {topItems.length > 0 && (
              <div className="bg-gray-800/60 border border-gray-700/40 rounded-2xl p-4">
                <h3 className="text-gray-300 font-semibold text-sm mb-3">Top Items This Shift</h3>
                <div className="space-y-2">
                  {topItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{item.name}</span>
                      <div className="flex gap-4 text-right">
                        <span className="text-gray-500">{item.qty} sold</span>
                        <span className="text-green-400 font-semibold w-24">Rs. {fmt(item.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Close Shift form ── */}
        {currentShift && step === 'close' && (
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-2xl p-6 space-y-5 max-w-md">
            <h2 className="text-white font-bold text-lg">Close Shift</h2>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Opening float</span>
                <span className="font-semibold text-white">Rs. {fmt(currentShift.opening_float)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Cash sales</span>
                <span className="font-semibold text-green-400">+ Rs. {fmt(shift?.total_cash_sales)}</span>
              </div>
              <div className="flex justify-between text-gray-400 border-t border-gray-700 pt-1 mt-1">
                <span>Expected cash in till</span>
                <span className="font-bold text-white">Rs. {fmt(expectedCash)}</span>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Actual Cash Count
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={closingCash}
                  onChange={e => setClosingCash(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white text-lg font-semibold
                    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
                  autoFocus
                />
              </div>
              {closingCash !== '' && (
                <p className={`text-xs mt-1.5 font-semibold ${cashDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {cashDiff >= 0 ? 'Surplus' : 'Shortage'}: Rs. {fmt(Math.abs(cashDiff))}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Any notes about this shift..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm
                  focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('summary')}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                disabled={loading || closingCash === ''}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:text-red-400
                  text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
                Confirm Close
              </button>
            </div>
          </div>
        )}

        {/* No shift open */}
        {!currentShift && (
          <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" className="w-6 h-6">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No shift is currently open.</p>
            <p className="text-gray-600 text-xs mt-1">Open a new shift from the main POS screen.</p>
          </div>
        )}

        {/* ── Shift History ── */}
        <div>
          <h2 className="text-gray-300 font-semibold text-sm uppercase tracking-wider mb-3">Shift History</h2>
          {histLoading ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : shiftHistory.filter(s => s.status === 'closed').length === 0 ? (
            <div className="text-gray-600 text-sm">No closed shifts yet.</div>
          ) : (
            <div className="space-y-2">
              {shiftHistory.filter(s => s.status === 'closed').map(sh => {
                const opened = new Date(sh.opened_at + 'Z').toLocaleString('en-LK', { hour12: true });
                const closed = sh.closed_at ? new Date(sh.closed_at + 'Z').toLocaleString('en-LK', { hour12: true }) : '—';
                const diff   = parseFloat(sh.cash_difference || 0);
                return (
                  <div key={sh.id} className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold">Shift #{sh.id}</p>
                        <p className="text-gray-500 text-xs">{opened} → {closed}</p>
                        {sh.notes && <p className="text-gray-400 text-xs mt-1 italic">{sh.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-green-400 text-sm font-bold">
                          Rs. {fmt((parseFloat(sh.total_cash_sales||0)+parseFloat(sh.total_card_sales||0)+parseFloat(sh.total_mobile_sales||0)))}
                        </p>
                        <p className={`text-xs font-semibold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {diff >= 0 ? '+' : ''}Rs. {fmt(diff)} cash
                        </p>
                        <p className="text-gray-600 text-xs">{sh.order_count} orders</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
