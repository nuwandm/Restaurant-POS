import React, { useState, useRef, useEffect } from 'react';
import { applyTax } from '../../utils/currency';

const PRESET_REASONS = ['Staff discount', 'Loyal customer', 'Promotional offer', 'Management approval', 'Other'];

export default function DiscountModal({ order, onConfirm, onCancel }) {
  const [step, setStep]       = useState('discount'); // 'discount' | 'pin'
  const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'flat'
  const [discountValue, setDiscountValue] = useState('');
  const [reason, setReason]   = useState('');
  const [customReason, setCustomReason] = useState('');
  const [pin, setPin]         = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const pinRef = useRef(null);

  const subtotal = order.items
    .filter(i => !i.voided)
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const { total } = applyTax(subtotal);

  const discountNum = parseFloat(discountValue) || 0;
  const discountAmt = discountType === 'percent'
    ? Math.min(total, total * discountNum / 100)
    : Math.min(total, discountNum);
  const finalTotal = Math.max(0, total - discountAmt);

  const finalReason = reason === 'Other' ? customReason.trim() : reason;
  const canProceed  = discountNum > 0 && finalReason.length > 0;

  useEffect(() => {
    if (step === 'pin') pinRef.current?.focus();
  }, [step]);

  const handlePinSubmit = async () => {
    if (pin.length < 4) { setPinError('Enter a valid PIN'); return; }
    setPinLoading(true);
    setPinError('');
    try {
      const res = await window.electron.database({ action: 'verifyManagerPin', data: { pin } });
      if (res.success && res.data?.valid) {
        onConfirm({
          discountAmount: discountAmt,
          discountType:   `${discountType}:${discountNum}`,
          discountReason: finalReason,
        });
      } else {
        setPinError('Invalid PIN — manager access required');
        setPin('');
      }
    } catch {
      setPinError('Could not verify PIN');
    }
    setPinLoading(false);
  };

  const handlePinKey = (digit) => {
    if (pin.length < 6) setPin(p => p + digit);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">

        {step === 'discount' && (
          <>
            <div className="px-5 py-4 border-b border-gray-700/60">
              <h2 className="text-white font-bold text-base">Apply Discount</h2>
              <p className="text-gray-400 text-xs mt-0.5">Order total: Rs. {total.toFixed(2)}</p>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Type toggle */}
              <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
                {['percent', 'flat'].map(t => (
                  <button key={t} onClick={() => setDiscountType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
                      ${discountType === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    {t === 'percent' ? '% Percent' : 'Rs. Flat'}
                  </button>
                ))}
              </div>

              {/* Value */}
              <div>
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                  Discount {discountType === 'percent' ? 'Percentage' : 'Amount'}
                </label>
                <div className="relative flex items-center bg-gray-800 border border-gray-600 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40 transition-colors overflow-hidden">
                  <span className="pl-3.5 text-gray-400 text-sm font-semibold shrink-0">
                    {discountType === 'percent' ? '%' : 'Rs.'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percent' ? 100 : undefined}
                    step="0.01"
                    placeholder="0"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent pl-2 pr-2 py-3 text-white text-lg font-semibold focus:outline-none
                      [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <div className="flex flex-col border-l border-gray-700 shrink-0">
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); setDiscountValue(v => { const n = Math.min(discountType==='percent'?100:999999, (parseFloat(v)||0)+1); return String(n); }); }}
                      className="px-2.5 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 border-b border-gray-700 transition-colors">
                      <svg viewBox="0 0 10 6" fill="none" className="w-2.5 h-2.5"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); setDiscountValue(v => { const n = Math.max(0, (parseFloat(v)||0)-1); return String(n); }); }}
                      className="px-2.5 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                      <svg viewBox="0 0 10 6" fill="none" className="w-2.5 h-2.5"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                {discountNum > 0 && (
                  <p className="text-xs text-green-400 mt-1 font-semibold">
                    Discount: Rs. {discountAmt.toFixed(2)} → New total: Rs. {finalTotal.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Reason</label>
                <div className="space-y-1.5">
                  {PRESET_REASONS.map(r => (
                    <button key={r} onClick={() => { setReason(r); if (r !== 'Other') setCustomReason(''); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors
                        ${reason === r
                          ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                          : 'bg-gray-800/60 border border-gray-700/40 text-gray-300 hover:border-gray-600'
                        }`}>
                      {r}
                    </button>
                  ))}
                </div>
                {reason === 'Other' && (
                  <input type="text" placeholder="Custom reason..." value={customReason}
                    onChange={e => setCustomReason(e.target.value)} maxLength={80}
                    className="mt-2 w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm
                      focus:outline-none focus:border-blue-500 transition-colors" />
                )}
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button onClick={onCancel}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors">
                Cancel
              </button>
              <button onClick={() => canProceed && setStep('pin')} disabled={!canProceed}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 disabled:text-blue-400/50
                  text-white font-bold rounded-xl text-sm transition-colors">
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 'pin' && (
          <>
            <div className="px-5 py-4 border-b border-gray-700/60">
              <h2 className="text-white font-bold text-base">Manager PIN Required</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                Discount: Rs. {discountAmt.toFixed(2)} — {finalReason}
              </p>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full transition-colors
                    ${i < pin.length ? 'bg-blue-500' : 'bg-gray-600'}`} />
                ))}
              </div>

              {/* Hidden real input for keyboard */}
              <input ref={pinRef} type="password" value={pin}
                onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setPin(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') handlePinSubmit(); }}
                className="absolute opacity-0 w-0 h-0" />

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
                  <button key={i}
                    onClick={() => {
                      if (d === '⌫') setPin(p => p.slice(0, -1));
                      else if (d !== '') handlePinKey(String(d));
                    }}
                    disabled={d === ''}
                    className={`h-12 rounded-xl text-base font-bold transition-colors
                      ${d === '' ? 'invisible' : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white border border-gray-700'}`}>
                    {d}
                  </button>
                ))}
              </div>

              {pinError && <p className="text-red-400 text-xs text-center font-semibold">{pinError}</p>}
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => { setStep('discount'); setPin(''); setPinError(''); }}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors">
                Back
              </button>
              <button onClick={handlePinSubmit} disabled={pin.length < 4 || pinLoading}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-900/50 disabled:text-green-400/50
                  text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                {pinLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : 'Confirm'
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
