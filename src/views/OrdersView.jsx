import React, { useState, useEffect, useCallback } from 'react';
import { lkr } from '../utils/currency';
import { printReceiptFromHistory } from '../utils/printReceipt';

const STATUS_COLORS = {
    pending:   'bg-yellow-600 text-yellow-100',
    preparing: 'bg-blue-600 text-blue-100',
    completed: 'bg-green-700 text-green-100',
    cancelled: 'bg-red-700 text-red-100',
};

const OrdersView = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await window.electron.database({
                action: 'getOrdersHistory',
                data: filter !== 'all' ? { status: filter } : {},
            });
            if (res.success) setOrders(res.data);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const openOrder = async (order) => {
        setSelected(order);
        const res = await window.electron.database({ action: 'getOrderItems', data: { orderId: order.id } });
        if (res.success) setItems(res.data);
    };

    const filtered = orders.filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            String(o.order_number).toLowerCase().includes(q) ||
            (o.table_number && String(o.table_number).includes(q)) ||
            (o.order_type === 'takeaway' && 'takeaway'.includes(q))
        );
    });

    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total_amount, 0);
    const todayOrders = orders.filter(o => o.status === 'completed').length;

    return (
        <div className="flex h-full bg-gray-900">
            {/* Left — Orders list */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Stats bar */}
                <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex gap-6">
                    <div>
                        <p className="text-xs text-gray-400">Total Orders</p>
                        <p className="text-xl font-bold text-white">{orders.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Completed</p>
                        <p className="text-xl font-bold text-green-400">{todayOrders}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Revenue</p>
                        <p className="text-xl font-bold text-blue-400">{lkr(totalRevenue)}</p>
                    </div>
                    <div className="ml-auto flex items-center">
                        <button onClick={loadOrders}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded">
                            ↻ Refresh
                        </button>
                    </div>
                </div>

                {/* Filters + search */}
                <div className="bg-gray-800 border-b border-gray-700 px-6 py-2 flex items-center gap-3">
                    <div className="flex gap-1">
                        {[['all','All'],['pending','Pending'],['preparing','Preparing'],['completed','Completed'],['cancelled','Cancelled']].map(([val, label]) => (
                            <button key={val} onClick={() => setFilter(val)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filter === val ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <input
                        className="ml-auto bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500 w-48"
                        placeholder="Search order / table..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Orders table */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-gray-500">No orders found</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-800 border-b border-gray-700">
                                <tr className="text-gray-400 text-left">
                                    <th className="px-4 py-3">Order #</th>
                                    <th className="px-4 py-3">Table</th>
                                    <th className="px-4 py-3">Items</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(order => (
                                    <tr key={order.id}
                                        onClick={() => openOrder(order)}
                                        className={`border-b border-gray-700/50 cursor-pointer transition-colors ${selected?.id === order.id ? 'bg-blue-900/30' : 'hover:bg-gray-800/80'}`}>
                                        <td className="px-4 py-3 text-white font-mono font-medium">{order.order_number}</td>
                                        <td className="px-4 py-3 text-gray-300">
                                            {order.order_type === 'takeaway'
                                                ? <span className="px-2 py-0.5 bg-orange-900/40 text-orange-400 text-xs rounded-md font-medium">Takeaway</span>
                                                : `Table ${order.table_number}`}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">{order.item_count} items</td>
                                        <td className="px-4 py-3 text-green-400 font-semibold">{lkr(order.total_amount)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-600 text-gray-100'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {new Date(order.created_at).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Right — Order detail */}
            <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
                {!selected ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                        Select an order to view details
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-white font-bold text-sm">{selected.order_number}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                                    {selected.status}
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs">
                                {selected.order_type === 'takeaway' ? 'Takeaway' : `Table ${selected.table_number}`}
                            </p>
                            <p className="text-gray-400 text-xs mb-3">{new Date(selected.created_at).toLocaleString('en-LK')}</p>
                            <button
                                onClick={() => printReceiptFromHistory({ order: selected, items })}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                    <rect x="6" y="14" width="12" height="8"/>
                                </svg>
                                Print Receipt
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3">
                            <p className="text-gray-400 text-xs uppercase mb-2">Items</p>
                            <div className="space-y-1">
                                {items.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span className="text-gray-300">{item.name} <span className="text-gray-500">×{item.quantity}</span></span>
                                        <span className="text-white">{lkr(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 border-t border-gray-700 space-y-1 text-sm">
                            <div className="flex justify-between text-gray-400">
                                <span>Subtotal</span>
                                <span>{lkr(selected.total_amount - selected.tax_amount)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Tax</span>
                                <span>{lkr(selected.tax_amount)}</span>
                            </div>
                            <div className="flex justify-between text-white font-bold text-base border-t border-gray-600 pt-1">
                                <span>Total</span>
                                <span className="text-green-400">{lkr(selected.total_amount)}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrdersView;
