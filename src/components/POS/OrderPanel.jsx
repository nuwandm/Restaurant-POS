import React, { useState } from 'react';
import { lkr, getTaxRatePct, applyTax } from '../../utils/currency';
import VoidReasonModal from './VoidReasonModal';
import DiscountModal from './DiscountModal';

const OrderPanel = ({
    order, table, orderType = 'dine-in',
    onCheckout, onUpdateQuantity, onCancelOrder, onPrintKot, onVoidItem, onApplyDiscount, onRemoveDiscount,
    kotShortcut, canCheckout = true,
}) => {
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [voidTarget, setVoidTarget]       = useState(null);
    const [showDiscount, setShowDiscount]   = useState(false);
    const isTakeaway = orderType === 'takeaway';
    const taxRatePct = getTaxRatePct();

    // Separate active vs voided items
    const activeItems = order.items.filter(i => !i.voided);
    const voidedItems = order.items.filter(i => i.voided);

    const { subtotal, tax, total } = applyTax(
        activeItems.reduce((s, i) => s + i.price * i.quantity, 0)
    );

    const discountAmt   = parseFloat(order.discountAmount || 0);
    const finalTotal    = Math.max(0, total - discountAmt);

    const handleCancel = () => {
        if (order.items.length === 0) { onCancelOrder(); return; }
        setConfirmCancel(true);
    };

    const handleVoidConfirm = (reason) => {
        if (voidTarget && onVoidItem) {
            onVoidItem(voidTarget, reason);
        }
        setVoidTarget(null);
    };

    const handleDiscountConfirm = (discountData) => {
        if (onApplyDiscount) onApplyDiscount(discountData);
        setShowDiscount(false);
    };

    return (
        <div className="h-full flex flex-col bg-gray-850" style={{background:'#161b27'}}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700/80 flex items-center justify-between shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-gray-200 font-bold text-sm">
                            {isTakeaway ? 'Takeaway Order' : 'Current Order'}
                        </h2>
                        {isTakeaway && (
                            <span className="px-1.5 py-0.5 bg-orange-600/30 border border-orange-600/40 text-orange-400 text-[10px] font-bold rounded-md">TO-GO</span>
                        )}
                    </div>
                    {!isTakeaway && (table
                        ? <p className="text-blue-400 text-xs font-medium mt-0.5">Table {table.number}</p>
                        : <p className="text-gray-500 text-xs mt-0.5">No table selected</p>
                    )}
                </div>
                {(isTakeaway || table) && (
                    <button
                        onClick={handleCancel}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-900/40 hover:bg-red-700 text-red-400 hover:text-white border border-red-700/40 transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>

            {/* Cancel confirm */}
            {confirmCancel && (
                <div className="mx-3 mt-3 bg-red-950/60 border border-red-700/50 rounded-xl p-3 shrink-0">
                    <p className="text-white text-xs font-medium mb-2">
                        {isTakeaway ? 'Cancel this takeaway order?' : `Cancel order for Table ${table?.number}?`}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => { setConfirmCancel(false); onCancelOrder(); }}
                            className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold">
                            Yes, cancel
                        </button>
                        <button onClick={() => setConfirmCancel(false)}
                            className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">
                            Keep
                        </button>
                    </div>
                </div>
            )}

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
                {order.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-600 gap-2">
                        <span className="text-3xl">🛒</span>
                        <p className="text-xs">No items added</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {/* Active items */}
                        {activeItems.map(item => (
                            <div key={item.orderItemId}
                                className="bg-gray-700/25 border border-gray-700/40 rounded-xl px-3 py-2 flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-200 text-xs font-semibold leading-tight truncate">{item.name}</p>
                                    <p className="text-gray-500 text-xs">{lkr(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {/* Void button — only for items already sent to kitchen (have a db orderItemId) */}
                                    {item.dbOrderItemId && onVoidItem && (
                                        <button
                                            onClick={() => setVoidTarget(item)}
                                            title="Void this item"
                                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-900/20 hover:bg-red-600 text-red-400/60 hover:text-white transition-colors mr-0.5"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                                                <path d="M18 6L6 18M6 6l12 12"/>
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onUpdateQuantity(item.orderItemId, item.quantity - 1)}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-600/50 hover:bg-red-700 text-gray-300 hover:text-white text-sm font-bold transition-colors"
                                    >−</button>
                                    <span className="w-6 text-center text-gray-200 text-sm font-bold">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQuantity(item.orderItemId, item.quantity + 1)}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-600/50 hover:bg-green-700 text-gray-300 hover:text-white text-sm font-bold transition-colors"
                                    >+</button>
                                </div>
                            </div>
                        ))}

                        {/* Voided items — shown with strikethrough */}
                        {voidedItems.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700/50">
                                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-1.5 px-1">Voided</p>
                                {voidedItems.map(item => (
                                    <div key={item.orderItemId}
                                        className="bg-red-950/20 border border-red-900/30 rounded-xl px-3 py-2 flex items-center gap-2 opacity-60">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-red-400 text-xs font-semibold leading-tight truncate line-through">{item.name}</p>
                                            <p className="text-gray-600 text-xs">{item.void_reason || 'Voided'}</p>
                                        </div>
                                        <span className="text-red-500 text-xs font-bold shrink-0">×{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Totals + checkout */}
            <div className="px-4 py-3 border-t border-gray-700/80 shrink-0 space-y-2">
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-400">
                        <span>Subtotal</span><span>{lkr(subtotal)}</span>
                    </div>
                    {taxRatePct > 0 && (
                        <div className="flex justify-between text-gray-400">
                            <span>Tax ({taxRatePct}%)</span><span>{lkr(tax)}</span>
                        </div>
                    )}
                    {discountAmt > 0 && (
                        <div className="flex justify-between text-yellow-400 items-center">
                            <span className="flex items-center gap-1">
                                Discount
                                {onRemoveDiscount && (
                                    <button onClick={onRemoveDiscount}
                                        title="Remove discount"
                                        className="w-3.5 h-3.5 rounded-full bg-yellow-800/50 hover:bg-red-700 text-yellow-400 hover:text-white flex items-center justify-center transition-colors ml-0.5">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2 h-2">
                                            <path d="M18 6L6 18M6 6l12 12"/>
                                        </svg>
                                    </button>
                                )}
                            </span>
                            <span>- {lkr(discountAmt)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-200 border-t border-gray-700/50 pt-1.5">
                        <span>Total</span>
                        <span className="text-green-300 text-base">{lkr(finalTotal)}</span>
                    </div>
                </div>

                {/* Discount button */}
                {onApplyDiscount && activeItems.length > 0 && order.dbCreated && !discountAmt && (
                    <button
                        onClick={() => setShowDiscount(true)}
                        className="w-full py-1.5 bg-yellow-900/30 hover:bg-yellow-800/50 border border-yellow-700/30 text-yellow-400 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                        Apply Discount
                    </button>
                )}

                {onPrintKot && !isTakeaway && activeItems.length > 0 && (
                    <button
                        onClick={onPrintKot}
                        className="relative w-full py-2 bg-amber-700/60 hover:bg-amber-600 border border-amber-600/40 text-amber-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        Print KOT
                        {kotShortcut && (
                            <span className="absolute right-2.5 px-1.5 py-0.5 bg-amber-900/80 rounded text-[10px] font-mono text-amber-400 border border-amber-700/50">
                                {kotShortcut}
                            </span>
                        )}
                    </button>
                )}
                {canCheckout ? (
                    <button
                        onClick={onCheckout}
                        disabled={activeItems.length === 0}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                        {activeItems.length === 0 ? 'No items' : `Checkout — ${lkr(finalTotal)}`}
                    </button>
                ) : (
                    <div className="w-full py-2.5 bg-gray-800 border border-gray-700 text-gray-500 rounded-xl text-sm font-semibold text-center">
                        Checkout — Cashier required
                    </div>
                )}
            </div>

            {/* Void reason modal */}
            {voidTarget && (
                <VoidReasonModal
                    item={voidTarget}
                    onConfirm={handleVoidConfirm}
                    onCancel={() => setVoidTarget(null)}
                />
            )}

            {/* Discount modal */}
            {showDiscount && (
                <DiscountModal
                    order={order}
                    onConfirm={handleDiscountConfirm}
                    onCancel={() => setShowDiscount(false)}
                />
            )}
        </div>
    );
};

export default OrderPanel;
