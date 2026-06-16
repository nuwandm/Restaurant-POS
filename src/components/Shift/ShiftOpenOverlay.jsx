import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { openShift, loadOpenShift } from '../../store/slices/shiftSlice';
import toast from 'react-hot-toast';

const QUICK_FLOATS = [1000, 2000, 5000, 10000];

export default function ShiftOpenOverlay() {
  const dispatch    = useDispatch();
  const { loading } = useSelector(s => s.shift);
  const currentUser = useSelector(s => s.auth.currentUser);
  const [float, setFloat] = useState('');

  const hotelName = (() => {
    try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}').hotelName || 'Hotel POS'; }
    catch { return 'Hotel POS'; }
  })();

  const handleOpen = async () => {
    const amount = parseFloat(float) || 0;
    try {
      await dispatch(openShift({
        openingFloat:  amount,
        openedById:    currentUser?.id   || null,
        openedByName:  currentUser?.name || null,
      })).unwrap();
      await dispatch(loadOpenShift()).unwrap();
      toast.success('Shift opened');
    } catch (err) {
      toast.error(err.message || 'Failed to open shift');
    }
  };

  const fmt = (n) => Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-LK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #080c18 0%, #0a1020 100%)' }}>

      {/* Dot grid background */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Glow accent */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3b82f6, #6366f1)' }} />

      <div className="relative z-10 w-full max-w-md px-6">

        {/* Top — Hotel + time */}
        <div className="text-center mb-8">
          <p className="text-blue-400/70 text-xs font-semibold uppercase tracking-widest mb-1">{hotelName}</p>
          <p className="text-white text-sm font-medium">{dateStr}</p>
          <p className="text-gray-400 text-xs mt-0.5">{timeStr}</p>
        </div>

        {/* Main card */}
        <div className="bg-gray-900/80 border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">

          {/* Card header */}
          <div className="px-6 pt-6 pb-5 border-b border-gray-800/60">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <circle cx="12" cy="14" r="2" fill="white" stroke="none"/>
                </svg>
              </div>
              <div>
                <h1 className="text-white text-lg font-bold leading-tight">Open New Shift</h1>
                <p className="text-gray-500 text-xs mt-0.5">
                  {currentUser ? `Starting as ${currentUser.name} · ${currentUser.role}` : 'Enter opening float to begin'}
                </p>
              </div>
            </div>
          </div>

          {/* Float input */}
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-2 block">
                Opening Cash Float
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm select-none">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={float}
                  onChange={e => setFloat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleOpen()}
                  className="w-full bg-gray-800/80 border border-gray-700/60 rounded-2xl pl-12 pr-4 py-4 text-white text-2xl font-bold
                    focus:outline-none focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
              </div>
              <p className="text-gray-600 text-[11px] mt-1.5">Count and enter the cash already in the register</p>
            </div>

            {/* Quick select amounts */}
            <div>
              <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest mb-2">Quick select</p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_FLOATS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setFloat(String(amt))}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border
                      ${parseFloat(float) === amt
                        ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                        : 'bg-gray-800/60 border-gray-700/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'}`}
                  >
                    {amt >= 1000 ? `${amt/1000}K` : amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Float summary */}
            {parseFloat(float) > 0 && (
              <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-gray-400 text-xs">Opening float</span>
                <span className="text-blue-300 font-bold text-sm">Rs. {fmt(parseFloat(float))}</span>
              </div>
            )}
          </div>

          {/* Action */}
          <div className="px-6 pb-6">
            <button
              onClick={handleOpen}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                boxShadow: '0 4px 24px rgba(37,99,235,0.4)',
              }}
            >
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Opening shift…</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  Open Shift
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-gray-700 text-[11px] text-center mt-5">
          All sales, payments and KOTs will be tracked under this shift
        </p>
      </div>
    </div>
  );
}
