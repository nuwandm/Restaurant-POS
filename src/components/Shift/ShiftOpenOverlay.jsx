import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { openShift, loadOpenShift } from '../../store/slices/shiftSlice';
import toast from 'react-hot-toast';

export default function ShiftOpenOverlay() {
  const dispatch = useDispatch();
  const { loading } = useSelector(s => s.shift);
  const [float, setFloat] = useState('');

  const handleOpen = async () => {
    const amount = parseFloat(float) || 0;
    try {
      await dispatch(openShift(amount)).unwrap();
      await dispatch(loadOpenShift()).unwrap();
      toast.success('Shift opened successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to open shift');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-900/60">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-8 h-8">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              <line x1="12" y1="12" x2="12" y2="16"/>
              <circle cx="12" cy="12" r="1" fill="white"/>
            </svg>
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold text-center mb-1">Open New Shift</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Enter the opening cash float to start the shift</p>

        <div className="bg-gray-900 border border-gray-700/60 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Opening Cash Float
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rs.</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={float}
                onChange={e => setFloat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOpen()}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white text-lg font-semibold
                  focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
                autoFocus
              />
            </div>
            <p className="text-gray-600 text-xs mt-1.5">Leave at 0 if no cash was pre-loaded into the till</p>
          </div>

          <button
            onClick={handleOpen}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-blue-400
              text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Opening...</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>Open Shift</>
            )}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          All transactions will be tracked under this shift
        </p>
      </div>
    </div>
  );
}
