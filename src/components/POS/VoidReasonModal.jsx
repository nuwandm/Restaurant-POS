import React, { useState } from 'react';

const QUICK_REASONS = [
  'Customer changed mind',
  'Wrong item ordered',
  'Item unavailable',
  'Duplicate entry',
  'Other',
];

export default function VoidReasonModal({ item, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');

  const finalReason = reason === 'Other' ? custom.trim() : reason;
  const canSubmit   = finalReason.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="w-4 h-4">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Void Item</h2>
              <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[220px]">
                {item.quantity}× {item.name}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Select Reason</p>
          <div className="space-y-1.5">
            {QUICK_REASONS.map(r => (
              <button
                key={r}
                onClick={() => { setReason(r); if (r !== 'Other') setCustom(''); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors
                  ${reason === r
                    ? 'bg-red-600/20 border border-red-500/50 text-red-300'
                    : 'bg-gray-800/60 border border-gray-700/40 text-gray-300 hover:border-gray-600'
                  }`}
              >
                {r}
              </button>
            ))}
          </div>

          {reason === 'Other' && (
            <input
              type="text"
              autoFocus
              placeholder="Describe the reason..."
              value={custom}
              onChange={e => setCustom(e.target.value)}
              maxLength={80}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm
                focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-colors"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onConfirm(finalReason)}
            disabled={!canSubmit}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-900/50 disabled:text-red-400/50
              text-white font-bold rounded-xl text-sm transition-colors"
          >
            Void Item
          </button>
        </div>
      </div>
    </div>
  );
}
