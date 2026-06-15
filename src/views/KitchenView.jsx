import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

// SQLite CURRENT_TIMESTAMP is UTC without 'Z'; append it so Date parses correctly
function parseUtc(str) {
    if (!str) return new Date();
    return new Date(str.includes('Z') || str.includes('+') ? str : str + 'Z');
}

function elapsed(printedAt) {
    const diff = Math.floor((Date.now() - parseUtc(printedAt).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}m ${s}s`;
}

function borderColor(printedAt) {
    const mins = (Date.now() - parseUtc(printedAt).getTime()) / 60000;
    if (mins < 5)  return 'border-green-500';
    if (mins < 15) return 'border-yellow-500';
    return 'border-red-500';
}

function headerBg(printedAt) {
    const mins = (Date.now() - parseUtc(printedAt).getTime()) / 60000;
    if (mins < 5)  return 'bg-green-500/10 text-green-400';
    if (mins < 15) return 'bg-yellow-500/10 text-yellow-400';
    return 'bg-red-500/10 text-red-400';
}

function TimerTick({ printedAt }) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);
    return <span>{elapsed(printedAt)}</span>;
}

export default function KitchenView({ onKotCountChange }) {
    const [kots, setKots] = useState([]);
    const [loading, setLoading] = useState(true);
    const onKotCountChangeRef = useRef(onKotCountChange);
    onKotCountChangeRef.current = onKotCountChange;

    const fetchKots = useCallback(async () => {
        try {
            const res = await window.electron.database({ action: 'getActiveKots', data: {} });
            if (res.success) {
                setKots(res.data);
                onKotCountChangeRef.current?.(res.data.length);
            }
        } catch (err) {
            console.error('Failed to fetch KOTs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchKots();
        const id = setInterval(fetchKots, 10000);
        return () => clearInterval(id);
    }, [fetchKots]);

    const markItemServed = async (kotItemId) => {
        try {
            const res = await window.electron.database({ action: 'markKotItemServed', data: { id: kotItemId } });
            if (res.success) {
                setKots(prev => prev.map(kot => ({
                    ...kot,
                    items: kot.items.map(item =>
                        item.id === kotItemId ? { ...item, qty_served: item.quantity } : item
                    ),
                })));
            } else {
                toast.error('Failed to mark item');
            }
        } catch {
            toast.error('Error marking item');
        }
    };

    const markKotDone = async (orderId, kotNumber) => {
        try {
            const res = await window.electron.database({ action: 'markKotServed', data: { orderId, kotNumber } });
            if (res.success) {
                setKots(prev => {
                    const updated = prev.filter(k => !(k.order_id === orderId && k.kot_number === kotNumber));
                    onKotCountChangeRef.current?.(updated.length);
                    return updated;
                });
                toast.success('KOT marked as done');
            } else {
                toast.error('Failed to mark KOT done');
            }
        } catch {
            toast.error('Error marking KOT done');
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-900">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" className="w-5 h-5">
                            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                            <line x1="6" y1="17" x2="18" y2="17"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-tight">Kitchen Queue</h1>
                        <p className="text-gray-500 text-xs leading-tight">
                            {kots.length === 0 ? 'No active orders' : `${kots.length} active KOT${kots.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Legend */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"/>&lt;5 min</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"/>5–15 min</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/>&gt;15 min</span>
                    </div>
                    <button
                        onClick={fetchKots}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M23 4v6h-6"/>
                            <path d="M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {kots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" className="w-8 h-8">
                                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                                <line x1="6" y1="17" x2="18" y2="17"/>
                            </svg>
                        </div>
                        <p className="text-gray-400 font-semibold">No active KOTs</p>
                        <p className="text-gray-600 text-sm mt-1">Orders will appear here when KOTs are printed</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                        {kots.map(kot => {
                            const allServed = kot.items.every(i => i.qty_served >= i.quantity);
                            const someServed = kot.items.some(i => i.qty_served > 0);
                            return (
                                <div
                                    key={`${kot.order_id}-${kot.kot_number}`}
                                    className={`bg-gray-800 border-2 ${borderColor(kot.printed_at)} rounded-2xl overflow-hidden flex flex-col`}
                                >
                                    {/* Card header */}
                                    <div className={`px-4 py-3 ${headerBg(kot.printed_at)} border-b border-gray-700/60`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-base leading-tight">
                                                    {kot.order_type === 'takeaway'
                                                        ? 'TAKEAWAY'
                                                        : `TABLE ${kot.table_number}`}
                                                </p>
                                                <p className="text-xs opacity-60 leading-tight mt-0.5">Order #{kot.order_number}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold opacity-80">KOT #{kot.kot_number}</p>
                                                <p className="text-xs opacity-60 font-mono">
                                                    <TimerTick printedAt={kot.printed_at} />
                                                </p>
                                            </div>
                                        </div>
                                        {someServed && !allServed && (
                                            <div className="mt-2">
                                                <div className="h-1 rounded-full bg-black/20 overflow-hidden">
                                                    <div
                                                        className="h-full bg-current rounded-full transition-all"
                                                        style={{ width: `${Math.round((kot.items.filter(i => i.qty_served >= i.quantity).length / kot.items.length) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items */}
                                    <div className="flex-1 px-3 py-2 space-y-1">
                                        {kot.items.map(item => {
                                            const served = item.qty_served >= item.quantity;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => !served && markItemServed(item.id)}
                                                    disabled={served}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
                                                        ${served
                                                            ? 'bg-gray-700/30 cursor-default'
                                                            : 'bg-gray-700/50 hover:bg-gray-700 active:scale-[0.98] cursor-pointer'
                                                        }`}
                                                >
                                                    {/* Checkbox */}
                                                    <span className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
                                                        ${served
                                                            ? 'bg-green-500 border-green-500'
                                                            : 'border-gray-500'
                                                        }`}>
                                                        {served && (
                                                            <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" className="w-3 h-3">
                                                                <path d="M2 6l3 3 5-5"/>
                                                            </svg>
                                                        )}
                                                    </span>

                                                    {/* Qty badge */}
                                                    <span className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center
                                                        ${served ? 'bg-gray-600 text-gray-400' : 'bg-orange-500 text-white'}`}>
                                                        {item.quantity}
                                                    </span>

                                                    {/* Name */}
                                                    <span className={`flex-1 text-sm font-medium truncate
                                                        ${served ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                                        {item.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Footer */}
                                    <div className="px-3 pb-3">
                                        <button
                                            onClick={() => markKotDone(kot.order_id, kot.kot_number)}
                                            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all
                                                ${allServed
                                                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30'
                                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                                }`}
                                        >
                                            {allServed ? '✓ Done — Remove' : 'Mark All Done'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
