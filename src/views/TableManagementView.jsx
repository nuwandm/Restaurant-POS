import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { fetchTables } from '../store/slices/tableSlice';
import { loadPendingOrders } from '../store/slices/orderSlice';
import toast from 'react-hot-toast';

const BUILT_IN_ZONES = ['Main Hall', 'Window Side', 'Private', 'Bar Area', 'Outdoor', 'VIP'];
const SHAPES = ['square', 'round', 'rectangle'];
const EMPTY_FORM = { number: '', capacity: 4, zone: 'Main Hall', shape: 'square', is_active: true };

const ZONE_PALETTE = [
    { bg: 'bg-blue-900/30',   border: 'border-blue-700/50',   text: 'text-blue-300',   dot: 'bg-blue-400',   bar: 'bg-blue-500' },
    { bg: 'bg-cyan-900/30',   border: 'border-cyan-700/50',   text: 'text-cyan-300',   dot: 'bg-cyan-400',   bar: 'bg-cyan-500' },
    { bg: 'bg-purple-900/30', border: 'border-purple-700/50', text: 'text-purple-300', dot: 'bg-purple-400', bar: 'bg-purple-500' },
    { bg: 'bg-orange-900/30', border: 'border-orange-700/50', text: 'text-orange-300', dot: 'bg-orange-400', bar: 'bg-orange-500' },
    { bg: 'bg-green-900/30',  border: 'border-green-700/50',  text: 'text-green-300',  dot: 'bg-green-400',  bar: 'bg-green-500' },
    { bg: 'bg-yellow-900/30', border: 'border-yellow-700/50', text: 'text-yellow-300', dot: 'bg-yellow-400', bar: 'bg-yellow-500' },
    { bg: 'bg-pink-900/30',   border: 'border-pink-700/50',   text: 'text-pink-300',   dot: 'bg-pink-400',   bar: 'bg-pink-500' },
    { bg: 'bg-teal-900/30',   border: 'border-teal-700/50',   text: 'text-teal-300',   dot: 'bg-teal-400',   bar: 'bg-teal-500' },
];
const DEFAULT_ZONE = { bg: 'bg-gray-800', border: 'border-gray-700', text: 'text-gray-400', dot: 'bg-gray-500', bar: 'bg-gray-500' };

const zoneStyle = (zoneName, allZones) => {
    const idx = allZones.indexOf(zoneName);
    return idx >= 0 ? ZONE_PALETTE[idx % ZONE_PALETTE.length] : DEFAULT_ZONE;
};

/* ── Sub-components ──────────────────────────────────── */

const TableShape = ({ shape, occupied, size = 'md' }) => {
    const s = size === 'sm' ? 'w-7 h-7' : 'w-11 h-11';
    const c = occupied ? 'bg-red-500/20 border-red-500/60' : 'bg-gray-600/30 border-gray-500/60';
    if (shape === 'round')      return <div className={`${s} rounded-full border-2 ${c}`} />;
    if (shape === 'rectangle')  return <div className={`w-14 h-7 rounded-md border-2 ${c}`} />;
    return <div className={`${s} rounded-lg border-2 ${c}`} />;
};

const StatCard = ({ label, value, color }) => (
    <div className="bg-gray-800 rounded-xl border border-gray-700/80 px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
);

const ConfirmDialog = ({ open, icon, title, message, detail, confirmLabel, variant = 'danger', onConfirm, onCancel }) => {
    if (!open) return null;
    const variantMap = {
        danger:  { bar: 'bg-red-500',    btn: 'bg-red-600 hover:bg-red-500' },
        warning: { bar: 'bg-yellow-500', btn: 'bg-yellow-600 hover:bg-yellow-500' },
    };
    const v = variantMap[variant] || variantMap.danger;
    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[70] p-4">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-sm overflow-hidden">
                <div className={`h-1 ${v.bar}`} />
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-700/60 flex items-center justify-center text-2xl shrink-0">
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base leading-tight">{title}</h3>
                            <p className="text-gray-400 text-xs mt-0.5">{message}</p>
                        </div>
                    </div>
                    {detail && (
                        <div className="bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3 mb-5 text-sm text-gray-300 leading-relaxed">
                            {detail}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={onCancel}
                            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium transition-colors">
                            Cancel
                        </button>
                        <button onClick={onConfirm}
                            className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition-colors ${v.btn}`}>
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const inp = "w-full bg-gray-700/60 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-gray-500";

/* ── Main view ───────────────────────────────────────── */

const TableManagementView = () => {
    const dispatch = useDispatch();
    const [tables, setTables]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [form, setForm]                   = useState(EMPTY_FORM);
    const [editingId, setEditingId]         = useState(null);
    const [showModal, setShowModal]         = useState(false);
    const [saving, setSaving]               = useState(false);
    const [zoneFilter, setZoneFilter]       = useState('All');
    const [confirmRelease, setConfirmRelease] = useState(null);
    const [confirmDelete, setConfirmDelete]   = useState(null);

    // Zone management
    const [zones, setZones]                 = useState(() => {
        try { return JSON.parse(localStorage.getItem('posZones') || 'null') || [...BUILT_IN_ZONES]; }
        catch { return [...BUILT_IN_ZONES]; }
    });
    const [showZonePanel, setShowZonePanel] = useState(false);
    const [newZoneName, setNewZoneName]     = useState('');
    const [editZoneIdx, setEditZoneIdx]     = useState(null);
    const [editZoneVal, setEditZoneVal]     = useState('');

    const saveZones = (updated) => {
        setZones(updated);
        localStorage.setItem('posZones', JSON.stringify(updated));
    };

    const loadTables = useCallback(async () => {
        setLoading(true);
        try {
            const res = await window.electron.database({ action: 'getTablesAdmin', data: {} });
            if (res.success) setTables(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadTables(); }, [loadTables]);

    const allZoneNames = useMemo(() => Array.from(new Set([...zones, ...tables.map(t => t.zone).filter(Boolean)])), [zones, tables]);
    const filterZones  = ['All', ...allZoneNames];
    const filtered     = zoneFilter === 'All' ? tables : tables.filter(t => t.zone === zoneFilter);

    const stats = {
        total:    tables.length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        free:     tables.filter(t => t.status !== 'occupied').length,
        capacity: tables.reduce((s, t) => s + t.capacity, 0),
        zones:    allZoneNames.length,
    };

    /* ── Table modal ── */
    const openAdd = () => {
        const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
        setForm({ ...EMPTY_FORM, number: nextNum, zone: zoneFilter !== 'All' ? zoneFilter : (zones[0] || 'Main Hall') });
        setEditingId(null);
        setShowModal(true);
    };
    const openEdit = (table) => {
        setForm({
            number: table.number, capacity: table.capacity,
            zone: table.zone || zones[0] || 'Main Hall',
            shape: table.shape || 'square',
            is_active: table.is_active === 1 || table.is_active === true,
        });
        setEditingId(table.id);
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.number || isNaN(form.number) || Number(form.number) < 1) return toast.error('Enter a valid table number');
        if (!form.capacity || Number(form.capacity) < 1) return toast.error('Enter a valid capacity');
        if (!editingId && tables.find(t => t.number === Number(form.number))) return toast.error(`Table ${form.number} already exists`);
        setSaving(true);
        try {
            const payload = { ...form, number: Number(form.number), capacity: Number(form.capacity) };
            if (editingId) {
                const res = await window.electron.database({ action: 'updateTable', data: { ...payload, id: editingId } });
                if (res.success === false) throw new Error(res.error || 'Update failed');
                toast.success(`Table ${form.number} updated`);
            } else {
                const res = await window.electron.database({ action: 'addTable', data: payload });
                if (res.success === false) throw new Error(res.error || 'Insert failed');
                toast.success(`Table ${form.number} added`);
            }
            closeModal();
            // Re-fetch fresh list from DB
            const fresh = await window.electron.database({ action: 'getTablesAdmin', data: {} });
            if (fresh.success && Array.isArray(fresh.data)) setTables(fresh.data);
            dispatch(fetchTables());
        } catch (err) {
            toast.error('Failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    /* ── Delete / release ── */
    const handleDelete = (table) => {
        if (table.status === 'occupied') return toast.error(`Table ${table.number} is occupied — release it first`);
        setConfirmDelete(table);
    };
    const doDelete = async () => {
        const table = confirmDelete;
        setConfirmDelete(null);
        await window.electron.database({ action: 'deleteTable', data: { id: table.id } });
        toast.success(`Table ${table.number} removed`);
        await loadTables();
        dispatch(fetchTables());
    };

    const handleForceRelease = async (table) => {
        setConfirmRelease(null);
        await window.electron.database({ action: 'forceReleaseTable', data: { tableId: table.id } });
        dispatch(loadPendingOrders());
        dispatch(fetchTables());
        toast.success(`Table ${table.number} released`);
        await loadTables();
    };

    /* ── Zone management ── */
    const addZone = () => {
        const name = newZoneName.trim();
        if (!name) return;
        if (zones.includes(name)) return toast.error('Zone already exists');
        saveZones([...zones, name]);
        setNewZoneName('');
        toast.success(`Zone "${name}" added`);
    };
    const renameZone = (idx) => {
        const name = editZoneVal.trim();
        if (!name) return;
        if (zones.includes(name) && zones[idx] !== name) return toast.error('Zone name taken');
        const updated = [...zones];
        updated[idx] = name;
        saveZones(updated);
        setEditZoneIdx(null);
        toast.success('Zone renamed');
    };
    const deleteZone = (idx) => {
        const name = zones[idx];
        if (tables.some(t => t.zone === name)) return toast.error(`"${name}" has tables — reassign them first`);
        const updated = zones.filter((_, i) => i !== idx);
        saveZones(updated);
        if (zoneFilter === name) setZoneFilter('All');
        toast.success(`Zone "${name}" removed`);
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 overflow-hidden">

            {/* ── Header ── */}
            <div className="bg-gray-800/80 border-b border-gray-700 px-6 py-4 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-white font-bold text-lg">Table Management</h2>
                        <p className="text-gray-500 text-xs mt-0.5">Add, edit, and monitor all dining tables</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowZonePanel(true)}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">
                            Manage Zones
                        </button>
                        <button onClick={loadTables}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">
                            ↻ Refresh
                        </button>
                        <button onClick={openAdd}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                            + Add Table
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-3">
                    <StatCard label="Total Tables"  value={stats.total}    color="text-white" />
                    <StatCard label="Occupied"       value={stats.occupied} color="text-red-400" />
                    <StatCard label="Available"      value={stats.free}     color="text-green-400" />
                    <StatCard label="Total Capacity" value={stats.capacity} color="text-blue-400" />
                    <StatCard label="Zones"          value={stats.zones}    color="text-purple-400" />
                </div>
            </div>

            {/* ── Zone filter tabs ── */}
            <div className="bg-gray-800/50 border-b border-gray-700 px-6 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
                {filterZones.map(z => {
                    const zs = z !== 'All' ? zoneStyle(z, allZoneNames) : null;
                    return (
                        <button key={z} onClick={() => setZoneFilter(z)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                                ${zoneFilter === z ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'}`}>
                            {z !== 'All' && zs && (
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${zs.dot} mr-1.5 align-middle`} />
                            )}
                            {z}{z !== 'All' && ` (${tables.filter(t => t.zone === z).length})`}
                        </button>
                    );
                })}
            </div>

            {/* ── Table grid ── */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-3">
                        <span className="text-4xl">🪑</span>
                        <p className="text-sm">No tables in this zone</p>
                        <button onClick={openAdd}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                            Add first table
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filtered.map(table => {
                            const occ = table.status === 'occupied';
                            const zs  = zoneStyle(table.zone, allZoneNames);
                            return (
                                <div key={table.id}
                                    className={`rounded-xl border flex flex-col overflow-hidden transition-all group
                                        ${occ ? 'bg-red-900/20 border-red-700/50' : `${zs.bg} ${zs.border}`}`}>
                                    {/* Top accent bar */}
                                    <div className={`h-0.5 w-full ${occ ? 'bg-red-500' : zs.bar}`} />

                                    <div className="p-4 flex flex-col gap-3">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-white font-bold text-xl leading-none">T{table.number}</p>
                                                <p className="text-gray-500 text-xs mt-1">{table.capacity} seats</p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                                                ${occ ? 'bg-red-900/60 text-red-300' : 'bg-green-900/40 text-green-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${occ ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
                                                {occ ? 'Occupied' : 'Free'}
                                            </span>
                                        </div>

                                        {/* Shape visual */}
                                        <div className="flex justify-center py-1">
                                            <TableShape shape={table.shape || 'square'} occupied={occ} />
                                        </div>

                                        {/* Zone */}
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${occ ? 'bg-red-400' : zs.dot}`} />
                                            <span className={`text-xs truncate ${occ ? 'text-red-400' : zs.text}`}>{table.zone}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1.5 pt-1 border-t border-gray-700/40">
                                            <button onClick={() => openEdit(table)}
                                                className="flex-1 py-1.5 bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-medium transition-colors">
                                                Edit
                                            </button>
                                            {occ ? (
                                                <button onClick={() => setConfirmRelease(table)}
                                                    className="flex-1 py-1.5 bg-yellow-600/15 hover:bg-yellow-600 text-yellow-400 hover:text-white rounded-lg text-xs font-medium transition-colors">
                                                    Release
                                                </button>
                                            ) : (
                                                <button onClick={() => handleDelete(table)}
                                                    className="flex-1 py-1.5 bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-medium transition-colors">
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Confirm: Delete table ── */}
            <ConfirmDialog
                open={!!confirmDelete}
                icon="🗑️"
                variant="danger"
                title={`Remove Table ${confirmDelete?.number}?`}
                message="This action cannot be undone."
                detail={`Table ${confirmDelete?.number} · ${confirmDelete?.capacity} seats · ${confirmDelete?.zone}`}
                confirmLabel="Yes, Delete"
                onConfirm={doDelete}
                onCancel={() => setConfirmDelete(null)}
            />

            {/* ── Confirm: Force release ── */}
            <ConfirmDialog
                open={!!confirmRelease}
                icon="⚡"
                variant="warning"
                title={`Release Table ${confirmRelease?.number}?`}
                message="The active order will be cancelled and the table freed."
                detail={`Table ${confirmRelease?.number} · ${confirmRelease?.zone} · currently occupied`}
                confirmLabel="Yes, Release"
                onConfirm={() => handleForceRelease(confirmRelease)}
                onCancel={() => setConfirmRelease(null)}
            />

            {/* ── Zone Management Panel ── */}
            {showZonePanel && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                            <div>
                                <h3 className="text-white font-bold">Manage Zones</h3>
                                <p className="text-gray-500 text-xs mt-0.5">Add, rename, or remove dining zones</p>
                            </div>
                            <button onClick={() => setShowZonePanel(false)}
                                className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
                        </div>

                        <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
                            {zones.map((z, idx) => {
                                const zs = zoneStyle(z, allZoneNames);
                                const tableCount = tables.filter(t => t.zone === z).length;
                                return (
                                    <div key={z} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${zs.border} ${zs.bg}`}>
                                        <span className={`w-3 h-3 rounded-full shrink-0 ${zs.dot}`} />
                                        {editZoneIdx === idx ? (
                                            <input
                                                className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-2 py-1 border border-gray-500 focus:outline-none focus:border-blue-500"
                                                value={editZoneVal}
                                                onChange={e => setEditZoneVal(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') renameZone(idx); if (e.key === 'Escape') setEditZoneIdx(null); }}
                                                autoFocus
                                            />
                                        ) : (
                                            <span className={`flex-1 text-sm font-medium ${zs.text}`}>{z}</span>
                                        )}
                                        <span className="text-gray-600 text-xs">{tableCount} table{tableCount !== 1 ? 's' : ''}</span>
                                        {editZoneIdx === idx ? (
                                            <div className="flex gap-1">
                                                <button onClick={() => renameZone(idx)}
                                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">Save</button>
                                                <button onClick={() => setEditZoneIdx(null)}
                                                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-lg text-xs">✕</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1">
                                                <button onClick={() => { setEditZoneIdx(idx); setEditZoneVal(z); }}
                                                    className="px-2 py-1 bg-gray-600/60 hover:bg-gray-600 text-gray-400 hover:text-white rounded-lg text-xs transition-colors">
                                                    Rename
                                                </button>
                                                <button onClick={() => deleteZone(idx)}
                                                    className="px-2 py-1 bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs transition-colors">
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add new zone */}
                        <div className="px-6 py-4 border-t border-gray-700">
                            <p className="text-xs text-gray-400 font-medium mb-2">Add New Zone</p>
                            <div className="flex gap-2">
                                <input
                                    className={inp + ' flex-1'}
                                    placeholder="e.g. Rooftop"
                                    value={newZoneName}
                                    onChange={e => setNewZoneName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addZone()}
                                />
                                <button onClick={addZone}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add / Edit Table Modal ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 overflow-hidden">
                        <div className="h-0.5 bg-blue-600" />
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                            <h3 className="text-white font-bold">{editingId ? `Edit Table ${form.number}` : 'Add New Table'}</h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-medium">Table Number <span className="text-red-400">*</span></label>
                                    <input type="number" min="1" className={inp} value={form.number}
                                        onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                                        placeholder="e.g. 9" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-medium">Seats <span className="text-red-400">*</span></label>
                                    <input type="number" min="1" max="50" className={inp} value={form.capacity}
                                        onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-medium">Zone</label>
                                <select className={inp} value={form.zone}
                                    onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
                                    {zones.map(z => <option key={z} value={z}>{z}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-2 font-medium">Shape</label>
                                <div className="flex gap-3">
                                    {SHAPES.map(s => (
                                        <button type="button" key={s} onClick={() => setForm(f => ({ ...f, shape: s }))}
                                            className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border transition-all
                                                ${form.shape === s ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 bg-gray-700/40 hover:border-gray-500'}`}>
                                            <TableShape shape={s} occupied={false} size="sm" />
                                            <span className="text-xs capitalize text-gray-300">{s}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-green-600' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                                <span className="text-sm text-gray-300">Table is active</span>
                            </label>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={closeModal}
                                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl text-sm font-bold transition-colors">
                                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Table'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableManagementView;
