import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { lkr, getTaxRatePct, applyTax } from '../../utils/currency';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const STEP = 10; // arrow key increment
const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const METHODS = [
    {
        id: 'cash',
        label: 'Cash',
        key: '1',
        color: 'emerald',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M6 12h.01M18 12h.01"/>
            </svg>
        ),
    },
    {
        id: 'card',
        label: 'Card',
        key: '2',
        color: 'blue',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
                <path d="M6 15h4M15 15h3"/>
            </svg>
        ),
    },
    {
        id: 'mobile',
        label: 'Mobile',
        key: '3',
        color: 'purple',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                <rect x="5" y="2" width="14" height="20" rx="2"/>
                <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
        ),
    },
];

const METHOD_COLORS = {
    emerald: { active: 'bg-emerald-600 border-emerald-500 shadow-emerald-900/40', dot: 'bg-emerald-300', text: 'text-emerald-200', icon: 'text-white' },
    blue:    { active: 'bg-blue-600 border-blue-500 shadow-blue-900/40',         dot: 'bg-blue-300',    text: 'text-blue-200',    icon: 'text-white' },
    purple:  { active: 'bg-purple-600 border-purple-500 shadow-purple-900/40',   dot: 'bg-purple-300',  text: 'text-purple-200',  icon: 'text-white' },
};

const PaymentModal = ({ order, orderType = 'dine-in', onComplete, onCancel }) => {
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountStr, setAmountStr] = useState(''); // raw numeric string, no commas
    const [focused, setFocused] = useState(false);
    const inputRef = useRef(null);
    const taxRatePct = getTaxRatePct();
    const { subtotal, tax, total: orderTotal } = applyTax(order.subtotal ?? 0);

    useEffect(() => {
        if (paymentMethod !== 'cash') setAmountStr('');
        else setTimeout(() => inputRef.current?.focus(), 60);
    }, [paymentMethod]);

    const amount   = parseFloat(amountStr.replace(/,/g, '')) || 0;
    const change   = amount - orderTotal;
    const isValid  = paymentMethod !== 'cash' || amount >= orderTotal;
    const shortage = !isValid && amount > 0 ? orderTotal - amount : 0;

    // Format with thousand separators for display
    const fmtAmount = (raw) => {
        if (!raw) return '';
        const clean = raw.replace(/,/g, '');
        const [int, dec] = clean.split('.');
        const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return dec !== undefined ? `${formatted}.${dec}` : formatted;
    };

    const handlePayment = useCallback(() => {
        if (!isValid) return;
        onComplete({
            method: paymentMethod,
            amount: paymentMethod === 'cash' ? amount : orderTotal,
            change: Math.max(0, change),
        });
    }, [isValid, paymentMethod, amount, orderTotal, change, onComplete]);

    const nudge = useCallback((dir) => {
        const cur = parseFloat(amountStr.replace(/,/g, '')) || 0;
        const next = Math.max(0, cur + dir * STEP);
        const raw = next % 1 === 0 ? String(next) : next.toFixed(2);
        setAmountStr(fmtAmount(raw));
        inputRef.current?.focus();
    }, [amountStr]);

    const handleInputKeyDown = useCallback((e) => {
        if (e.key === 'Enter')  { e.preventDefault(); handlePayment(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); nudge(1); }
        if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1); }
    }, [handlePayment, onCancel, nudge]);

    const paymentShortcuts = useMemo(() => ({
        '1': () => setPaymentMethod('cash'),
        '2': () => setPaymentMethod('card'),
        '3': () => setPaymentMethod('mobile'),
        'e': () => { setAmountStr(fmtAmount(orderTotal.toFixed(2))); inputRef.current?.focus(); },
        'E': () => { setAmountStr(fmtAmount(orderTotal.toFixed(2))); inputRef.current?.focus(); },
        'Escape': () => onCancel(),
    }), [orderTotal, onCancel]);

    useKeyboardShortcuts(paymentShortcuts);

    const activeMethod = METHODS.find(m => m.id === paymentMethod);
    const colors = METHOD_COLORS[activeMethod?.color] || METHOD_COLORS.emerald;

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div
                className="bg-[#0f1117] rounded-3xl shadow-2xl w-full max-w-[420px] border border-white/[0.06] overflow-hidden"
                onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'INPUT') handlePayment(); }}
            >
                {/* ── Accent bar ── */}
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />

                {/* ── Header ── */}
                <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" className="w-5 h-5">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-white font-bold text-base">Process Payment</h2>
                                {orderType === 'takeaway' && (
                                    <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold rounded-full tracking-widest uppercase">Takeaway</span>
                                )}
                            </div>
                            {order.orderNumber && (
                                <p className="text-gray-600 text-[11px] font-mono mt-0.5">{order.orderNumber}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white transition-all"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <div className="px-6 pb-6 space-y-4">

                    {/* ── Total Due ── */}
                    <div className="rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-800/40 border border-white/[0.05] p-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total Due</p>
                                {taxRatePct > 0 && (
                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-600">
                                        <span>Subtotal <span className="text-gray-500">{lkr(subtotal)}</span></span>
                                        <span className="text-gray-700">·</span>
                                        <span>Tax {taxRatePct}% <span className="text-gray-500">{lkr(tax)}</span></span>
                                    </div>
                                )}
                            </div>
                            <p className="text-3xl font-black text-emerald-400 tracking-tight tabular-nums">{lkr(orderTotal)}</p>
                        </div>
                    </div>

                    {/* ── Payment method pills ── */}
                    <div className="grid grid-cols-3 gap-2">
                        {METHODS.map(m => {
                            const active = paymentMethod === m.id;
                            const c = METHOD_COLORS[m.color];
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setPaymentMethod(m.id)}
                                    className={`relative flex flex-col items-center gap-2 py-4 rounded-2xl font-medium transition-all duration-200 border
                                        ${active
                                            ? `${c.active} text-white shadow-lg`
                                            : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:bg-white/[0.07] hover:text-gray-300'}`}
                                >
                                    {active && (
                                        <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                    )}
                                    <span className={active ? c.icon : ''}>{m.icon}</span>
                                    <div className="text-center">
                                        <p className="text-sm font-bold leading-none">{m.label}</p>
                                        <p className={`text-[10px] mt-1 ${active ? c.text : 'text-gray-700'}`}>Press {m.key}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Cash input ── */}
                    {paymentMethod === 'cash' && (
                        <div className="space-y-3">
                            {/* Amount input with arrow controls */}
                            <div className={`flex items-center rounded-2xl border-2 transition-all duration-200 overflow-hidden
                                ${focused ? 'border-emerald-500 bg-gray-800/80' : 'border-white/[0.08] bg-gray-800/50'}`}
                            >
                                {/* Currency label */}
                                <span className="px-4 text-gray-500 text-sm font-semibold shrink-0 select-none">LKR</span>

                                {/* Input */}
                                <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="decimal"
                                    value={amountStr}
                                    onChange={e => {
                                        const raw = e.target.value.replace(/,/g, '');
                                        if (raw === '' || /^\d*\.?\d*$/.test(raw)) setAmountStr(fmtAmount(raw));
                                    }}
                                    onKeyDown={handleInputKeyDown}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                    placeholder="0.00"
                                    autoFocus
                                    className="flex-1 bg-transparent py-4 text-white text-3xl font-black text-right focus:outline-none tabular-nums placeholder:text-gray-700 min-w-0"
                                />

                                {/* Up/Down arrow controls */}
                                <div className="flex flex-col border-l border-white/[0.06] shrink-0">
                                    <button
                                        onMouseDown={e => { e.preventDefault(); nudge(1); }}
                                        className="px-3 py-2.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors border-b border-white/[0.06] group"
                                        tabIndex={-1}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                            <polyline points="18 15 12 9 6 15"/>
                                        </svg>
                                    </button>
                                    <button
                                        onMouseDown={e => { e.preventDefault(); nudge(-1); }}
                                        className="px-3 py-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors group"
                                        tabIndex={-1}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                            <polyline points="6 9 12 15 18 9"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Exact + quick amounts */}
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={() => { setAmountStr(fmtAmount(orderTotal.toFixed(2))); inputRef.current?.focus(); }}
                                    className="col-span-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-2"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    Exact — {lkr(orderTotal)}
                                    <kbd className="px-1.5 py-0.5 bg-emerald-900/60 rounded text-[10px] font-mono">E</kbd>
                                </button>
                                {QUICK_AMOUNTS.map(v => {
                                    const active = amount === v;
                                    return (
                                        <button
                                            key={v}
                                            onClick={() => { setAmountStr(fmtAmount(String(v))); inputRef.current?.focus(); }}
                                            className={`py-2.5 rounded-xl text-sm font-bold transition-all border
                                                ${active
                                                    ? 'bg-gray-600 border-gray-500 text-white'
                                                    : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.07] hover:text-white hover:border-white/10'}`}
                                        >
                                            {v >= 1000 ? `${v / 1000}K` : v}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Arrow key hint */}
                            <p className="text-center text-gray-700 text-[10px]">
                                Use <kbd className="px-1 bg-gray-800 border border-gray-700 rounded text-[9px]">↑</kbd> / <kbd className="px-1 bg-gray-800 border border-gray-700 rounded text-[9px]">↓</kbd> to adjust by {STEP}
                            </p>

                            {/* Change / shortage panel */}
                            {amount > 0 && (
                                <div className={`rounded-2xl p-4 flex items-center justify-between border transition-all
                                    ${isValid
                                        ? 'bg-emerald-950/40 border-emerald-700/30'
                                        : 'bg-red-950/40 border-red-700/30'}`}
                                >
                                    <div>
                                        <p className={`text-xs font-semibold uppercase tracking-wider ${isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {isValid ? 'Change to Return' : 'Short By'}
                                        </p>
                                        <p className={`text-3xl font-black mt-1 tabular-nums ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {lkr(Math.abs(isValid ? change : shortage))}
                                        </p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isValid ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                        {isValid
                                            ? <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" className="w-6 h-6"><polyline points="20 6 9 17 4 12"/></svg>
                                            : <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" className="w-6 h-6"><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="#f87171"/><circle cx="12" cy="12" r="10"/></svg>
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Card / Mobile panel ── */}
                    {paymentMethod !== 'cash' && (
                        <div className={`rounded-2xl border p-6 text-center space-y-3
                            ${paymentMethod === 'card'
                                ? 'bg-blue-950/20 border-blue-700/20'
                                : 'bg-purple-950/20 border-purple-700/20'}`}
                        >
                            <p className={`text-xs uppercase tracking-widest font-semibold ${paymentMethod === 'card' ? 'text-blue-600' : 'text-purple-600'}`}>
                                {paymentMethod === 'card' ? 'Swipe · Tap · Insert' : 'Scan QR · Bank Transfer'}
                            </p>
                            <p className={`text-4xl font-black tabular-nums ${paymentMethod === 'card' ? 'text-blue-300' : 'text-purple-300'}`}>
                                {lkr(orderTotal)}
                            </p>
                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold
                                ${paymentMethod === 'card'
                                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                    : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'}`}
                            >
                                {activeMethod?.icon}
                                {paymentMethod === 'card' ? 'Card Payment' : 'Mobile Payment'}
                            </div>
                        </div>
                    )}

                    {/* ── Action buttons ── */}
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white font-semibold text-sm transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePayment}
                            disabled={!isValid}
                            className={`flex-[2] py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                ${isValid
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/40'
                                    : 'bg-white/[0.03] border border-white/[0.06] text-gray-700 cursor-not-allowed'}`}
                        >
                            {isValid && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            )}
                            Complete Payment
                            {isValid && (
                                <kbd className="ml-1 px-1.5 py-0.5 bg-emerald-700/50 rounded-lg text-[10px] font-mono font-normal">↵</kbd>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
