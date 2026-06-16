import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import TableGrid from '../components/POS/TableGrid';
import MenuGrid from '../components/POS/MenuGrid';
import OrderPanel from '../components/POS/OrderPanel';
import PaymentModal from '../components/POS/PaymentModal';
import { selectTable, clearTable, fetchTables } from '../store/slices/tableSlice';
import {
    addToOrder, updateItemQuantity, markOrderCreated,
    clearTableOrder, voidItem, setDiscount, clearDiscount, fetchActiveOrders,
} from '../store/slices/orderSlice';
import { applyTax } from '../utils/currency';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { loadItemShortcuts, loadAppShortcuts } from '../utils/itemShortcuts';
import { printReceipt } from '../utils/printReceipt';
import { can } from '../utils/permissions';

function loadKotSettings() {
    try {
        const s = JSON.parse(localStorage.getItem('hotelSettings') || '{}');
        return {
            enabled:   s.printKitchenTicket !== false,
            separate:  !!s.kitchenPrinterSeparate,
            printer:   s.kitchenPrinterName || '',
        };
    } catch { return { enabled: true, separate: false, printer: '' }; }
}

async function fireKotPrint({ orderId, orderNumber, orderType, tableName, items, customerName }) {
    const { enabled, separate, printer } = loadKotSettings();
    if (!enabled) return;
    // Can't track snapshot without a real DB order ID — abort silently
    if (!orderId) return 'no-order-id';
    try {
        // Fetch what was already sent to kitchen for this order
        const snapshotRes = await window.electron.database({ action: 'getKotSnapshot', data: { orderId } });
        // IPC wraps result as { success, data } — data is the raw { menu_item_id: qty_sent } object
        const snapshot = (snapshotRes?.success && snapshotRes.data && typeof snapshotRes.data === 'object') ? snapshotRes.data : {};
        const isAdditional = Object.keys(snapshot).length > 0;

        // Diff: only send items that are new or have increased qty since last KOT
        const diffItems = [];
        for (const item of items) {
            const sentQty = snapshot[String(item.id)] ?? snapshot[item.id] ?? 0;
            const newQty  = item.quantity - sentQty;
            if (newQty > 0) {
                diffItems.push({ ...item, quantity: newQty });
            }
        }

        if (diffItems.length === 0) return 'no-new-items';

        const kotRes = await window.electron.database({ action: 'getNextKotNumber', data: {} });
        if (!kotRes.success && kotRes.data == null) return;
        const { kotNumber, date } = kotRes.data;
        const now = new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });

        await window.electron.printKot({
            kotData: {
                kotNumber, date, orderNumber, orderType, tableName,
                items: diffItems.map(i => ({ name: i.name, quantity: i.quantity, notes: i.notes || null })),
                time: now,
                customerName: customerName || null,
                isAdditional,
            },
            printerName: separate && printer ? printer : undefined,
        });

        // Save cumulative sent qty to snapshot
        const updatedSnapshot = items.map(i => ({
            menu_item_id: i.id,
            qty_sent: (snapshot[String(i.id)] ?? snapshot[i.id] ?? 0) + (diffItems.find(d => d.id === i.id)?.quantity ?? 0),
        })).filter(i => i.qty_sent > 0);
        await window.electron.database({ action: 'saveKotSnapshot', data: { orderId, items: updatedSnapshot } });

        // Record each diff item in kot_items for kitchen queue tracking
        await window.electron.database({
            action: 'addKotItems',
            data: {
                orderId,
                kotNumber,
                items: diffItems.map(i => ({
                    menu_item_id: i.id,
                    name:         i.name,
                    quantity:     i.quantity,
                    notes:        i.notes || null,
                })),
            },
        });

        await window.electron.database({ action: 'markKotPrinted', data: { orderId, kotNumber } });
        return kotNumber;
    } catch (err) {
        console.error('KOT print error:', err);
        toast('KOT could not print — check printer', { icon: '⚠️' });
    }
}

const CATEGORY_COLORS = [
    '#f59e0b', '#10b981', '#3b82f6', '#f97316', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#6366f1',
];

const EMPTY_ORDER = { items: [], subtotal: 0, tax: 0, total: 0, orderId: null, dbCreated: false };
const TAKEAWAY_ID = 'takeaway'; // special key for takeaway orders (no table)

const POSView = () => {
    const dispatch = useDispatch();
    const [showPayment, setShowPayment]       = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [searchQuery, setSearchQuery]       = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [mode, setMode]                     = useState('dine-in'); // 'dine-in' | 'takeaway'
    const [customerName, setCustomerName]     = useState('');
    const [takeawayKots, setTakeawayKots]     = useState([]);

    const creatingRef = useRef({});
    const tableOrdersRef = useRef({});
    const takeawayKotTimerRef = useRef(null);

    const [dashStats, setDashStats] = useState(null);
    const loadDashStats = useCallback(async () => {
        try {
            const res = await window.electron.database({ action: 'getDashboardStats' });
            if (res.success) setDashStats(res.data);
        } catch { /* silent */ }
    }, []);
    useEffect(() => {
        loadDashStats();
        const id = setInterval(loadDashStats, 60000);
        return () => clearInterval(id);
    }, [loadDashStats]);

    const [reservedTableIds, setReservedTableIds] = useState(new Set());
    const loadTodayReservations = useCallback(async () => {
        try {
            const res = await window.electron.database({ action: 'getTodayReservations' });
            if (res.success && Array.isArray(res.data)) {
                setReservedTableIds(new Set(res.data.map(r => r.table_id).filter(Boolean)));
            }
        } catch { /* silent */ }
    }, []);
    useEffect(() => {
        loadTodayReservations();
        const id = setInterval(loadTodayReservations, 60000);
        return () => clearInterval(id);
    }, [loadTodayReservations]);

    const { selectedTable, tables } = useSelector(state => state.tables);
    const tableOrders = useSelector(state => state.orders.tableOrders);
    tableOrdersRef.current = tableOrders;
    const { items: menuItems, categories } = useSelector(state => state.menu);
    const currentShift  = useSelector(state => state.shift.currentShift);
    const currentUser   = useSelector(state => state.auth.currentUser);

    // For takeaway mode use a fixed key; for dine-in use the selected table id
    const activeKey   = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
    const currentOrder = activeKey ? (tableOrders[activeKey] ?? EMPTY_ORDER) : EMPTY_ORDER;

    const filteredItems = useMemo(() => {
        setHighlightedIndex(-1);
        const q = searchQuery.trim().toLowerCase();
        return menuItems.filter(i => {
            const available = i.is_available === 1 || i.is_available === true;
            if (!available) return false;
            if (q) return i.name.toLowerCase().includes(q) || (i.code && i.code.toLowerCase().includes(q));
            if (categoryFilter === 'All') return true;
            return i.category === categoryFilter;
        });
    }, [menuItems, categoryFilter, searchQuery]);

    const switchMode = (newMode) => {
        setMode(newMode);
    };

    const handleTableSelect = useCallback((table) => {
        if (mode !== 'dine-in') setMode('dine-in');
        if (selectedTable?.id === table.id) return;
        dispatch(selectTable(table));
    }, [dispatch, selectedTable, mode]);

    /* ── Add item ─────────────────────────────────────── */
    const handleAddItem = useCallback(async (item) => {
        if (mode === 'dine-in' && !selectedTable) {
            toast.error('Select a table or switch to Takeaway');
            return false;
        }

        const key      = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable.id;
        const order    = tableOrders[key] ?? EMPTY_ORDER;
        const isTakeaway = mode === 'takeaway';

        dispatch(addToOrder({ tableId: key, item }));

        if (order.dbCreated && order.orderId) {
            const alreadyExists = order.items.some(i => i.id === item.id);
            const finalItems = alreadyExists
                ? order.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
                : [...order.items, { ...item, quantity: 1 }];
            const { subtotal: fSub, tax: fTax, total: fTotal } = applyTax(finalItems.reduce((s, i) => s + i.price * i.quantity, 0));
            await window.electron.database({
                action: 'updateOrderItems',
                data: {
                    orderId: order.orderId,
                    total_amount: fTotal,
                    tax_amount:   fTax,
                    items: finalItems,
                },
            });
            return;
        }

        if (!order.dbCreated && !creatingRef.current[key]) {
            creatingRef.current[key] = true;
            try {
                const result = await window.electron.database({
                    action: 'createOrder',
                    data: {
                        table_id:     isTakeaway ? null : selectedTable.id,
                        waiter_id:    1,
                        order_type:   isTakeaway ? 'takeaway' : 'dine-in',
                        total_amount: applyTax(item.price).total,
                        tax_amount:   applyTax(item.price).tax,
                        items: [{ id: item.id, menu_item_id: item.id, quantity: 1, price: item.price, notes: null }],
                        orderPrefix:  (() => { try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}').orderPrefix || 'ORD'; } catch { return 'ORD'; } })(),
                        shift_id:     currentShift?.id || null,
                    },
                });
                if (result.success) {
                    dispatch(markOrderCreated({ tableId: key, orderId: result.data.orderId, orderNumber: result.data.orderNumber }));
                    if (!isTakeaway) dispatch(fetchTables());
                } else {
                    creatingRef.current[key] = false;
                    toast.error('Failed to create order: ' + result.error);
                }
            } catch (err) {
                creatingRef.current[key] = false;
                toast.error('Failed: ' + err.message);
            }
        }
    }, [dispatch, selectedTable, tableOrders, mode]);

    /* ── Update quantity ──────────────────────────────── */
    const handleUpdateQuantity = useCallback(async (itemId, quantity) => {
        const key   = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
        if (!key) return;
        dispatch(updateItemQuantity({ tableId: key, itemId, quantity }));
        const order = tableOrders[key];
        if (order?.dbCreated && order?.orderId) {
            const updatedItems = quantity <= 0
                ? order.items.filter(i => i.orderItemId !== itemId)
                : order.items.map(i => i.orderItemId === itemId ? { ...i, quantity } : i);
            const { tax: uTax, total: uTotal } = applyTax(updatedItems.reduce((s, i) => s + i.price * i.quantity, 0));
            await window.electron.database({
                action: 'updateOrderItems',
                data: {
                    orderId:      order.orderId,
                    total_amount: uTotal,
                    tax_amount:   uTax,
                    items: updatedItems,
                },
            });
        }
    }, [dispatch, selectedTable, tableOrders, mode]);

    /* ── Cancel order ─────────────────────────────────── */
    const handleCancelOrder = useCallback(async () => {
        const key      = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
        if (!key) return;
        const order    = tableOrders[key];
        const orderId  = order?.orderId || selectedTable?.active_order_id;
        if (orderId) {
            await window.electron.database({ action: 'cancelOrder', data: { orderId } });
            await window.electron.database({ action: 'clearKotSnapshot', data: { orderId } });
        }
        delete creatingRef.current[key];
        dispatch(clearTableOrder(key));
        if (mode === 'dine-in' && selectedTable) {
            dispatch(clearTable(selectedTable.id));
            dispatch(fetchTables());
            toast.success(`Order cancelled — Table ${selectedTable.number} is now free`);
        } else {
            setCustomerName('');
            toast.success('Takeaway order cancelled');
        }
    }, [dispatch, selectedTable, tableOrders, mode]);

    /* ── Takeaway kitchen queue ──────────────────────── */
    const fetchTakeawayKots = useCallback(async () => {
        try {
            const res = await window.electron.database({ action: 'getActiveKots', data: {} });
            if (res.success) {
                setTakeawayKots((res.data || []).filter(k => k.order_type === 'takeaway'));
            }
        } catch { /* silent */ }
    }, []);

    /* ── Manual KOT re-print ─────────────────────────── */
    const handlePrintKot = useCallback(async () => {
        const key = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
        if (!key || currentOrder.items.length === 0) return;

        // Only include items that need kitchen (kot_required)
        const kotItems = currentOrder.items.filter(orderItem => {
            const menuItem = menuItems.find(m => m.id === orderItem.id);
            // Default to true (needs KOT) if flag missing — safe fallback
            return menuItem ? (menuItem.kot_required === 1 || menuItem.kot_required === true) : true;
        });

        if (kotItems.length === 0) {
            toast('All items are ready to serve — no KOT needed', { icon: 'ℹ️', duration: 2000 });
            return;
        }

        // If order is still being saved to DB, wait up to 3 seconds for orderId
        let orderId = currentOrder.orderId;
        if (!orderId) {
            orderId = await new Promise(resolve => {
                let attempts = 0;
                const check = () => {
                    const id = tableOrdersRef.current[key]?.orderId;
                    if (id) { resolve(id); return; }
                    if (++attempts >= 15) { resolve(null); return; } // give up after ~3s
                    setTimeout(check, 200);
                };
                check();
            });
        }

        if (!orderId) {
            toast('Order is still saving — wait a moment and try again', { icon: '⚠️', duration: 2500 });
            return;
        }

        const result = await fireKotPrint({
            orderId,
            orderNumber:  currentOrder.orderNumber,
            orderType:    mode === 'takeaway' ? 'takeaway' : 'dine-in',
            tableName:    mode === 'takeaway' ? null : String(selectedTable?.number ?? ''),
            items:        kotItems.map(i => ({ ...i, notes: i.notes || null })),
            customerName: mode === 'takeaway' ? customerName : null,
        });
        if (result === 'no-new-items') {
            toast('All items already sent to kitchen', { icon: 'ℹ️', duration: 2500 });
        } else {
            toast('KOT sent to printer', { icon: '🖨️', duration: 1500 });
        }
        return typeof result === 'number' ? result : null; // return kotNumber if available
    }, [currentOrder, selectedTable, mode, menuItems]);

    /* ── Void item ───────────────────────────────────────── */
    const handleVoidItem = useCallback(async (item, reason) => {
        if (!item.dbOrderItemId) return;
        const key = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
        if (!key) return;

        try {
            const taxRatePct = (() => { try { return parseFloat(JSON.parse(localStorage.getItem('hotelSettings') || '{}').taxRate || '0'); } catch { return 0; } })();
            const res = await window.electron.database({
                action: 'voidOrderItem',
                data: { orderItemId: item.dbOrderItemId, reason, taxRate: taxRatePct },
            });
            if (!res.success) { toast.error(res.error || 'Failed to void item'); return; }

            // Record in void_kots audit table
            if (currentOrder.orderId) {
                await window.electron.database({
                    action: 'addVoidKot',
                    data: { orderId: currentOrder.orderId, orderItemId: item.dbOrderItemId, itemName: item.name, quantity: item.quantity, reason },
                });
            }

            // Print void KOT slip
            try {
                const { separate, printer } = loadKotSettings();
                const now = new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });
                await window.electron.printVoidKot({
                    voidData: {
                        orderNumber: currentOrder.orderNumber,
                        tableName:   mode === 'takeaway' ? null : String(selectedTable?.number ?? ''),
                        orderType:   mode === 'takeaway' ? 'takeaway' : 'dine-in',
                        itemName:    item.name,
                        quantity:    item.quantity,
                        reason,
                        time:        now,
                    },
                    printerName: separate && printer ? printer : undefined,
                });
            } catch (printErr) {
                console.warn('Void KOT print failed:', printErr);
            }

            // Mark item as voided in Redux state
            dispatch(voidItem({ tableId: key, orderItemId: item.orderItemId, reason }));

            toast.success(`${item.name} voided`);
        } catch (err) {
            toast.error('Void failed: ' + err.message);
        }
    }, [currentOrder, selectedTable, mode, dispatch]);

    /* ── Discount ────────────────────────────────────────── */
    const handleApplyDiscount = useCallback(async ({ discountAmount, discountType, discountReason }) => {
        const key = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
        if (!key || !currentOrder.orderId) return;
        try {
            await window.electron.database({
                action: 'applyDiscount',
                data: { orderId: currentOrder.orderId, discountAmount, discountType, discountReason },
            });
            dispatch(setDiscount({ tableId: key, discountAmount, discountType, discountReason }));
            toast.success(`Discount applied: Rs. ${discountAmount.toFixed(2)}`);
        } catch (err) {
            toast.error('Failed to apply discount: ' + err.message);
        }
    }, [currentOrder.orderId, selectedTable, mode, dispatch]);

    const handleRemoveDiscount = useCallback(async () => {
        const key = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
        if (!key || !currentOrder.orderId) return;
        try {
            await window.electron.database({ action: 'removeDiscount', data: { orderId: currentOrder.orderId } });
            dispatch(clearDiscount(key));
            toast.success('Discount removed');
        } catch (err) {
            toast.error('Failed to remove discount: ' + err.message);
        }
    }, [currentOrder.orderId, selectedTable, mode, dispatch]);

    /* ── Checkout / payment ───────────────────────────── */
    const handleCheckout = useCallback(async () => {
        if (currentOrder.items.length === 0) { toast.error('No items in order'); return; }

        // Auto-apply active discount rules if no discount already set
        if (!currentOrder.discountAmount && currentOrder.orderId) {
            try {
                const rules = JSON.parse(localStorage.getItem('discountRules') || '[]');
                const now = new Date();
                const h = now.getHours(), m = now.getMinutes(), day = now.getDay();
                const active = rules.find(r => {
                    if (!r.active) return false;
                    if (!r.days.includes(day)) return false;
                    const nowMin = h * 60 + m;
                    const fromMin = r.fromH * 60 + r.fromM;
                    const toMin   = r.toH   * 60 + r.toM;
                    return nowMin >= fromMin && nowMin <= toMin;
                });
                if (active) {
                    const subtotal = currentOrder.subtotal || 0;
                    const discountAmount = parseFloat((subtotal * active.pct / 100).toFixed(2));
                    await window.electron.database({
                        action: 'applyDiscount',
                        data: { orderId: currentOrder.orderId, discountAmount, discountType: 'percent', discountReason: active.name },
                    });
                    const key = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
                    if (key) dispatch(setDiscount({ tableId: key, discountAmount, discountType: 'percent', discountReason: active.name }));
                    toast(`"${active.name}" discount applied — ${active.pct}% off`, { icon: '🏷️', duration: 2500 });
                }
            } catch { /* silent — don't block checkout */ }
        }

        setShowPayment(true);
    }, [currentOrder, mode, selectedTable, dispatch]);

    const handlePaymentComplete = useCallback(async (paymentData) => {
        try {
            const key          = mode === 'takeaway' ? TAKEAWAY_ID : selectedTable?.id;
            const isTakeaway   = mode === 'takeaway';
            const freshTable   = isTakeaway ? null : (tables.find(t => t.id === selectedTable?.id) || selectedTable);
            const resolvedOrderId = currentOrder.orderId || freshTable?.active_order_id || null;

            const { tax: pTax, total: pTotal } = applyTax(currentOrder.subtotal ?? 0);
            const discountAmt = parseFloat(currentOrder.discountAmount || 0);
            const finalTotal  = Math.max(0, pTotal - discountAmt);
            const result = await window.electron.processPayment({
                order:   { ...currentOrder, orderId: resolvedOrderId, order_type: isTakeaway ? 'takeaway' : 'dine-in', tax: pTax, total: finalTotal, discountAmount: discountAmt },
                payment: { ...paymentData, shift_id: currentShift?.id || null },
                table:   freshTable || { id: null },
            });

            if (result.success) {
                if (resolvedOrderId) {
                    await window.electron.database({ action: 'clearKotSnapshot', data: { orderId: resolvedOrderId, orderType: isTakeaway ? 'takeaway' : 'dine-in' } });
                }

                // For takeaway: print KOT first, capture kotNumber for receipt cross-reference
                let printedKotNumber = null;
                if (isTakeaway && loadKotSettings().enabled) {
                    printedKotNumber = await handlePrintKot();
                }

                // Auto-print receipt
                printReceipt({
                    order:     { ...currentOrder, orderNumber: result.orderNumber || currentOrder.orderNumber, tax: pTax, total: finalTotal, discountAmount: discountAmt },
                    payment:   paymentData,
                    table:     freshTable,
                    orderType: isTakeaway ? 'takeaway' : 'dine-in',
                    kotNumber: isTakeaway ? printedKotNumber : null,
                });

                dispatch(clearTableOrder(key));
                delete creatingRef.current[key];
                if (!isTakeaway) {
                    dispatch(clearTable(selectedTable.id));
                    dispatch(fetchTables());
                    toast.success(`Payment complete — Table ${selectedTable.number} is now free`);
                } else {
                    setCustomerName('');
                    toast.success(`Takeaway order ${result.orderNumber} paid`);
                    fetchTakeawayKots();
                }
                dispatch(fetchActiveOrders());
                setShowPayment(false);
            } else {
                toast.error('Payment failed: ' + result.error);
            }
        } catch (err) {
            toast.error('Payment failed: ' + err.message);
        }
    }, [currentOrder, selectedTable, tables, dispatch, mode, handlePrintKot, fetchTakeawayKots]);

    const takeawayOrder = tableOrders[TAKEAWAY_ID];
    const takeawayCount = takeawayOrder?.items?.reduce((s, i) => s + i.quantity, 0) || 0;

    // Fetch on mount and poll every 10s
    useEffect(() => {
        fetchTakeawayKots();
        takeawayKotTimerRef.current = setInterval(fetchTakeawayKots, 10000);
        return () => clearInterval(takeawayKotTimerRef.current);
    }, [fetchTakeawayKots]);

    const markTakeawayKotDone = useCallback(async (orderId, kotNumber) => {
        try {
            const res = await window.electron.database({ action: 'markKotServed', data: { orderId, kotNumber } });
            if (res.success) {
                setTakeawayKots(prev => prev.filter(k => !(k.order_id === orderId && k.kot_number === kotNumber)));
                toast.success('Marked as done');
            } else {
                toast.error('Failed to mark done');
            }
        } catch {
            toast.error('Error marking done');
        }
    }, []);

    const markTakeawayItemServed = useCallback(async (kotItemId, orderId, kotNumber) => {
        try {
            const res = await window.electron.database({ action: 'markKotItemServed', data: { id: kotItemId } });
            if (res.success) {
                setTakeawayKots(prev => prev.map(k =>
                    k.order_id === orderId && k.kot_number === kotNumber
                        ? { ...k, items: k.items.map(i => i.id === kotItemId ? { ...i, qty_served: i.quantity } : i) }
                        : k
                ));
            }
        } catch { /* silent */ }
    }, []);

    // POS-level shortcuts — read app shortcuts fresh on every keydown
    const posActions = useMemo(() => ({
        'pos-dinein':   () => switchMode('dine-in'),
        'pos-takeaway': () => switchMode('takeaway'),
        'pos-checkout': () => handleCheckout(),
        'pos-kot':      () => handlePrintKot(),
    }), [handleCheckout, handlePrintKot]);

    useEffect(() => {
        if (showPayment) return;
        const onKeyDown = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
            const combo = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.key]
                .filter(Boolean).join('+');
            if (combo === 'Escape') { setShowPayment(false); return; }

            // Check item shortcuts
            const itemMap = loadItemShortcuts();
            if (itemMap[combo]) {
                const item = menuItems.find(i => i.id === itemMap[combo]);
                if (item) {
                    e.preventDefault();
                    handleAddItem(item).then(ok => {
                        if (ok !== false) toast.success(`Added: ${item.name}`, { duration: 1200, icon: '⚡' });
                    });
                    return;
                }
            }

            // Check app action shortcuts (fresh read)
            const sc = loadAppShortcuts();
            const actionId = Object.keys(sc).find(k => sc[k] === combo);
            if (actionId && posActions[actionId]) {
                e.preventDefault();
                posActions[actionId]();
            }
            // Also accept lowercase single-letter combos for single-key actions
            if (combo.length === 1) {
                const lower = combo.toLowerCase();
                const actionIdLower = Object.keys(sc).find(k => sc[k]?.toLowerCase() === lower && sc[k].length === 1);
                if (actionIdLower && posActions[actionIdLower]) {
                    e.preventDefault();
                    posActions[actionIdLower]();
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showPayment, posActions, menuItems, handleAddItem]);

    return (
        <div className="flex h-full bg-gray-900">

            {/* ── Left: mode switch + tables ── */}
            <div className="w-60 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">

                {/* Mode switcher */}
                <div className="p-3 border-b border-gray-700 shrink-0">
                    <div className="flex bg-gray-900 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => switchMode('dine-in')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
                                ${mode === 'dine-in' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                <rect x="3" y="7" width="18" height="3" rx="1"/>
                                <path d="M5 10v7M19 10v7"/>
                            </svg>
                            Dine-in
                        </button>
                        <button
                            onClick={() => switchMode('takeaway')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all relative
                                ${mode === 'takeaway' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                                <line x1="3" y1="6" x2="21" y2="6"/>
                                <path d="M16 10a4 4 0 0 1-8 0"/>
                            </svg>
                            Takeaway
                        </button>
                    </div>
                </div>

                {/* Tables (dine-in) or takeaway panel */}
                {mode === 'takeaway' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Customer name — fixed at top */}
                        <div className="px-3 pt-3 pb-2 shrink-0">
                            <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
                                Customer Name <span className="text-gray-600 normal-case tracking-normal font-normal">(optional)</span>
                            </label>
                            <div className="relative">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="Customer name..."
                                    maxLength={40}
                                    className="w-full bg-gray-700/50 border border-gray-600/50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 text-white text-xs rounded-lg pl-8 pr-7 py-2 outline-none transition-colors placeholder-gray-500"
                                />
                                {customerName && (
                                    <button onClick={() => setCustomerName('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                            <path d="M18 6L6 18M6 6l12 12"/>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Kitchen queue section — scrollable */}
                        <div className="flex-1 overflow-y-auto px-3 pb-3">
                            {/* Section header */}
                            <div className="flex items-center justify-between mb-2 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
                                        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                                        <line x1="6" y1="17" x2="18" y2="17"/>
                                    </svg>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Kitchen Queue</span>
                                    {takeawayKots.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded-full leading-none">
                                            {takeawayKots.length}
                                        </span>
                                    )}
                                </div>
                                <button onClick={fetchTakeawayKots} className="text-gray-600 hover:text-gray-400 transition-colors" title="Refresh">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                        <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                    </svg>
                                </button>
                            </div>

                            {takeawayKots.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-gray-700/40 flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" className="w-5 h-5">
                                            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                                            <line x1="6" y1="17" x2="18" y2="17"/>
                                        </svg>
                                    </div>
                                    <p className="text-gray-600 text-xs">No active orders</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {takeawayKots.map(kot => {
                                        const allServed = kot.items.every(i => i.qty_served >= i.quantity);
                                        return (
                                            <div key={`${kot.order_id}-${kot.kot_number}`}
                                                className={`rounded-xl border overflow-hidden ${allServed ? 'border-green-700/50 bg-green-900/10' : 'border-orange-700/40 bg-gray-700/30'}`}>
                                                {/* KOT header */}
                                                <div className="flex items-center justify-between px-3 py-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[10px] font-black tabular-nums ${allServed ? 'text-green-500' : 'text-orange-400'}`}>
                                                                KOT #{String(kot.kot_number).padStart(3, '0')}
                                                            </span>
                                                            <span className="text-gray-600 text-[10px]">·</span>
                                                            <span className="text-gray-400 text-[10px] truncate">{kot.order_number}</span>
                                                        </div>
                                                        {kot.customer_name && (
                                                            <p className="text-[10px] text-gray-500 truncate">{kot.customer_name}</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => markTakeawayKotDone(kot.order_id, kot.kot_number)}
                                                        className={`shrink-0 ml-2 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                                            allServed
                                                                ? 'bg-green-600 hover:bg-green-500 text-white'
                                                                : 'bg-gray-600 hover:bg-green-700 text-gray-300 hover:text-white'
                                                        }`}
                                                    >
                                                        {allServed ? '✓ Done' : 'Done'}
                                                    </button>
                                                </div>
                                                {/* Items */}
                                                <div className="px-2 pb-2 space-y-0.5">
                                                    {kot.items.map(item => {
                                                        const served = item.qty_served >= item.quantity;
                                                        return (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => !served && markTakeawayItemServed(item.id, kot.order_id, kot.kot_number)}
                                                                disabled={served}
                                                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors
                                                                    ${served ? 'opacity-40 cursor-default' : 'hover:bg-gray-700/60 cursor-pointer'}`}
                                                            >
                                                                <span className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                                                                    ${served ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                                                    {served && (
                                                                        <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" className="w-2.5 h-2.5">
                                                                            <path d="M2 6l3 3 5-5"/>
                                                                        </svg>
                                                                    )}
                                                                </span>
                                                                <span className={`shrink-0 text-[10px] font-bold w-4 text-center ${served ? 'text-gray-600' : 'text-orange-400'}`}>
                                                                    {item.quantity}×
                                                                </span>
                                                                <span className={`flex-1 text-xs truncate ${served ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                                                                    {item.name}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-3">
                        <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider px-1 mb-2">Select Table</p>
                        <TableGrid
                            tables={tables}
                            onTableSelect={handleTableSelect}
                            selectedTable={selectedTable}
                            reservedTableIds={reservedTableIds}
                        />
                    </div>
                )}
            </div>

            {/* ── Center: menu ── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* ── Dashboard stats bar ── */}
                {dashStats && (
                    <div className="shrink-0 flex items-center gap-0 border-b border-gray-700/60 bg-gray-850 divide-x divide-gray-700/60" style={{background:'#111827'}}>
                        {[
                            { label: "Today's Revenue", value: `Rs. ${Number(dashStats.revenue||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: 'text-green-400', icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            )},
                            { label: 'Orders', value: dashStats.orderCount, color: 'text-blue-400', icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                            )},
                            { label: 'Avg Order', value: `Rs. ${Number(dashStats.avgOrder||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: 'text-purple-400', icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                            )},
                            { label: 'Tables', value: `${dashStats.tables.occupied} / ${dashStats.tables.total} busy`, color: dashStats.tables.occupied > 0 ? 'text-orange-400' : 'text-gray-500', icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="7" width="18" height="3" rx="1"/><path d="M5 10v7M19 10v7"/></svg>
                            )},
                        ].map(stat => (
                            <div key={stat.label} className="flex items-center gap-2 px-4 py-2 flex-1">
                                <span className="text-gray-600 shrink-0">{stat.icon}</span>
                                <div className="min-w-0">
                                    <p className="text-gray-600 text-[9px] font-semibold uppercase tracking-wider leading-none">{stat.label}</p>
                                    <p className={`text-sm font-bold leading-tight mt-0.5 ${stat.color}`}>{stat.value}</p>
                                </div>
                            </div>
                        ))}
                        <button onClick={loadDashStats} className="px-3 shrink-0 text-gray-700 hover:text-gray-400 transition-colors" title="Refresh stats">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                        </button>
                    </div>
                )}

                {/* Category tabs + Search */}
                <div className="bg-gray-800 px-3 pt-2 pb-2 border-b border-gray-700/60 shrink-0 space-y-2">
                    {/* Search bar */}
                    <div className="relative">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setCategoryFilter('All'); }}
                            placeholder="Search menu items by name or code..."
                            className="w-full bg-gray-700/60 border border-gray-600/60 focus:border-blue-500 focus:bg-gray-700 text-white text-xs rounded-lg pl-8 pr-8 py-2 outline-none transition-colors placeholder-gray-500"
                            onKeyDown={e => {
                                if (!searchQuery || filteredItems.length === 0) return;
                                const cols = window.innerWidth >= 1280 ? 4 : 3; // matches xl:grid-cols-4
                                const total = filteredItems.length;
                                if (e.key === 'ArrowRight') {
                                    e.preventDefault();
                                    setHighlightedIndex(i => i < total - 1 ? i + 1 : 0);
                                } else if (e.key === 'ArrowLeft') {
                                    e.preventDefault();
                                    setHighlightedIndex(i => i > 0 ? i - 1 : total - 1);
                                } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setHighlightedIndex(i => {
                                        const next = i + cols;
                                        return next < total ? next : i === -1 ? 0 : i;
                                    });
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setHighlightedIndex(i => {
                                        const prev = i - cols;
                                        return prev >= 0 ? prev : i === -1 ? 0 : i;
                                    });
                                } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const idx = highlightedIndex >= 0 ? highlightedIndex : (total === 1 ? 0 : -1);
                                    if (idx >= 0 && filteredItems[idx]) {
                                        handleAddItem(filteredItems[idx]).then(ok => {
                                            if (ok !== false) {
                                                toast.success(`Added: ${filteredItems[idx].name}`, { duration: 1200, icon: '⚡' });
                                                setSearchQuery('');
                                            }
                                        });
                                    }
                                } else if (e.key === 'Escape') {
                                    setSearchQuery('');
                                    setHighlightedIndex(-1);
                                }
                            }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        )}
                    </div>
                    {/* Category tabs */}
                    {!searchQuery && (
                        <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setCategoryFilter('All')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                                    ${categoryFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                All Items
                            </button>
                            {categories.map((cat, idx) => {
                                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                                const isActive = categoryFilter === cat.name;
                                return (
                                    <button key={cat.name} onClick={() => setCategoryFilter(cat.name)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                                            ${isActive ? 'text-white' : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'}`}
                                        style={isActive ? { backgroundColor: color } : {}}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {/* Search results count + keyboard hint */}
                    {searchQuery && (
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] text-gray-400">
                                {filteredItems.length === 0 ? 'No items found' : `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''} found`}
                            </span>
                            <div className="flex items-center gap-2">
                                {filteredItems.length > 0 && (
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <kbd className="bg-gray-700 text-gray-300 px-1 rounded text-[9px]">↑↓←→</kbd> navigate
                                        <kbd className="bg-gray-700 text-gray-300 px-1 rounded text-[9px] ml-1">↵</kbd> add
                                    </span>
                                )}
                                <button onClick={() => { setSearchQuery(''); setHighlightedIndex(-1); }} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Prompt if no context */}
                {mode === 'dine-in' && !selectedTable && (
                    <div className="flex items-center justify-center gap-2 bg-blue-900/20 border-b border-blue-800/30 px-4 py-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" className="w-4 h-4 shrink-0">
                            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                        </svg>
                        <p className="text-blue-300 text-xs">Select a table on the left, or switch to Takeaway mode</p>
                    </div>
                )}

                <div className="flex-1 p-4 overflow-y-auto">
                    <MenuGrid items={filteredItems} onItemClick={handleAddItem} highlightedIndex={highlightedIndex} />
                </div>
            </div>

            {/* ── Right: order panel ── */}
            <div className="w-72 bg-gray-800 border-l border-gray-700 shrink-0">
                <OrderPanel
                    order={currentOrder}
                    table={mode === 'dine-in' ? selectedTable : null}
                    orderType={mode}
                    onCheckout={handleCheckout}
                    onUpdateQuantity={handleUpdateQuantity}
                    onCancelOrder={handleCancelOrder}
                    onPrintKot={loadKotSettings().enabled ? handlePrintKot : undefined}
                    onVoidItem={currentOrder.dbCreated && can(currentUser?.role, 'void') ? handleVoidItem : undefined}
                    onApplyDiscount={currentOrder.dbCreated && can(currentUser?.role, 'discount') ? handleApplyDiscount : undefined}
                    onRemoveDiscount={currentOrder.discountAmount > 0 && can(currentUser?.role, 'discount') ? handleRemoveDiscount : undefined}
                    canCheckout={can(currentUser?.role, 'checkout')}
                    kotShortcut={(() => { const sc = loadAppShortcuts(); return sc['pos-kot'] || 'F8'; })()}
                />
            </div>

            {showPayment && (
                <PaymentModal
                    order={currentOrder}
                    orderType={mode}
                    onComplete={handlePaymentComplete}
                    onCancel={() => setShowPayment(false)}
                />
            )}

        </div>
    );
};

export default POSView;
