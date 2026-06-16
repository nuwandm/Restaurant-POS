import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

const ZONE_COLORS = [
    '#3b82f6','#10b981','#f59e0b','#8b5cf6','#f97316','#06b6d4','#ec4899','#84cc16',
];

function minsUntil(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const resTime = new Date(`${dateStr}T${timeStr}`);
    return Math.round((resTime - Date.now()) / 60000);
}

function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function TableCard({ table, selected, onSelect, order, reservation, prepMins }) {
    const occ = table.status === 'occupied';
    const sel = selected;
    const hasOrder = order && order.items.length > 0;
    const res = reservation; // full reservation object or null

    // Compute how many minutes until reservation starts
    const minsAway = res ? minsUntil(res.reservation_date, res.reservation_time) : null;
    // Is the table in the prep-time window? (within prepMins minutes)
    const inPrepWindow = minsAway !== null && minsAway >= 0 && minsAway <= prepMins;
    // Is it past reservation time (guest should be here)?
    const overdue = minsAway !== null && minsAway < 0;

    let cardCls, numberCls, statusCls, stripCls;
    if (sel && occ) {
        cardCls   = 'border-yellow-400/80 bg-yellow-900/20 ring-2 ring-yellow-400/40 shadow-lg shadow-yellow-900/20';
        numberCls = 'text-yellow-300'; statusCls = 'text-yellow-400'; stripCls = 'bg-red-500/60';
    } else if (sel) {
        cardCls   = 'border-blue-500/80 bg-blue-900/20 ring-2 ring-blue-500/40 shadow-lg shadow-blue-900/20';
        numberCls = 'text-blue-300'; statusCls = 'text-blue-400';
        stripCls  = res ? (inPrepWindow || overdue ? 'bg-red-500/60' : 'bg-amber-500/60') : 'bg-green-500/40';
    } else if (occ) {
        cardCls   = 'border-red-700/60 bg-red-900/20 hover:border-red-500/70 hover:bg-red-900/30';
        numberCls = 'text-red-300'; statusCls = 'text-red-400'; stripCls = 'bg-red-500/60';
    } else if (res) {
        if (inPrepWindow || overdue) {
            // Prep window — table should be being set up
            cardCls   = 'border-red-600/60 bg-red-900/15 hover:border-red-500/70';
            numberCls = 'text-red-300'; statusCls = 'text-red-400'; stripCls = 'bg-red-500/70';
        } else {
            cardCls   = 'border-amber-600/60 bg-amber-900/20 hover:border-amber-500/70 hover:bg-amber-900/30';
            numberCls = 'text-amber-300'; statusCls = 'text-amber-400'; stripCls = 'bg-amber-500/60';
        }
    } else {
        cardCls   = 'border-gray-700/60 bg-gray-800/40 hover:border-gray-500 hover:bg-gray-700/40';
        numberCls = 'text-white'; statusCls = 'text-green-400'; stripCls = 'bg-green-500/40';
    }

    const subtotal = hasOrder ? order.items.reduce((s, i) => s + (!i.voided ? i.price * i.quantity : 0), 0) : 0;

    // Status label
    let statusLabel;
    if (occ) {
        statusLabel = null; // show amount instead
    } else if (res) {
        if (overdue) statusLabel = 'Due now';
        else if (inPrepWindow) statusLabel = 'Prep';
        else statusLabel = fmtTime(res.reservation_time);
    } else {
        statusLabel = 'Free';
    }

    return (
        <button
            onClick={() => onSelect(table)}
            className={`relative flex flex-col rounded-xl border transition-all duration-150 active:scale-95 overflow-hidden ${cardCls}`}
            style={{ aspectRatio: '1', padding: 0 }}
        >
            {/* Status strip at top */}
            <div className={`h-1 w-full shrink-0 ${stripCls}`} />

            <div className="flex-1 flex flex-col items-center justify-center px-1 py-2 gap-0.5 w-full">
                <span className={`font-black text-xl leading-none ${numberCls}`}>{table.number}</span>

                <div className="flex items-center gap-0.5 mt-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-gray-600">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span className="text-gray-500 text-[9px] font-medium">{table.capacity}</span>
                </div>

                {occ && hasOrder && subtotal > 0 ? (
                    <span className="text-[9px] font-bold text-yellow-400 leading-none mt-0.5">
                        Rs.{Math.round(subtotal).toLocaleString('en-LK')}
                    </span>
                ) : (
                    <span className={`text-[9px] font-semibold leading-none mt-0.5 ${statusCls}`}>
                        {statusLabel}
                    </span>
                )}

                {/* Party size for reserved */}
                {res && !occ && (
                    <span className="text-[8px] text-gray-600 leading-none mt-0.5">
                        {res.party_size}p
                    </span>
                )}
            </div>

            {/* Reserved calendar icon / prep warning */}
            {res && !occ && (
                <div className="absolute top-1.5 right-1.5">
                    {inPrepWindow || overdue ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" className="w-3 h-3">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="w-3 h-3">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                    )}
                </div>
            )}

            {/* Item count badge when occupied */}
            {occ && hasOrder && (
                <div className="absolute top-2 right-1.5 bg-red-500 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {order.items.filter(i => !i.voided).length}
                </div>
            )}

            {sel && (
                <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            )}
        </button>
    );
}

const TableGrid = ({ tables = [], onTableSelect, selectedTable, reservations = {}, prepMins = 30 }) => {
    const tableOrders = useSelector(s => s.orders.tableOrders);

    const zones = useMemo(() => {
        const map = {};
        tables.forEach(t => {
            const z = t.zone || 'Main';
            if (!map[z]) map[z] = [];
            map[z].push(t);
        });
        return Object.entries(map);
    }, [tables]);

    if (tables.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" className="w-8 h-8">
                    <rect x="3" y="7" width="18" height="3" rx="1"/><path d="M5 10v7M19 10v7"/>
                </svg>
                <p className="text-gray-600 text-xs">No tables configured</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {zones.map(([zone, zoneTables], zi) => (
                <div key={zone}>
                    {zones.length > 1 && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ZONE_COLORS[zi % ZONE_COLORS.length] }} />
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{zone}</span>
                            <div className="flex-1 h-px bg-gray-700/40" />
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-1.5">
                        {zoneTables.map(table => (
                            <TableCard
                                key={table.id}
                                table={table}
                                selected={selectedTable?.id === table.id}
                                onSelect={onTableSelect}
                                order={tableOrders[table.id]}
                                reservation={reservations[table.id] || null}
                                prepMins={prepMins}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Summary footer */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-700/40">
                <span className="text-[9px] text-gray-600">
                    {tables.filter(t => t.status === 'occupied').length} busy · {tables.filter(t => t.status !== 'occupied').length} free
                </span>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[9px] text-green-500"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>Free</span>
                    <span className="flex items-center gap-1 text-[9px] text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"/>Reserved</span>
                    <span className="flex items-center gap-1 text-[9px] text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>Busy</span>
                </div>
            </div>
        </div>
    );
};

export default TableGrid;
