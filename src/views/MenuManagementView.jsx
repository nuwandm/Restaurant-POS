import React, { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';

/* ── Confirm dialog ──────────────────────────────────────── */
const ConfirmDialog = ({ open, title, message, confirmLabel = 'Delete', confirmColor = 'bg-red-600 hover:bg-red-500', onConfirm, onCancel }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="h-0.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="w-5 h-5">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base">{title}</h3>
                            <p className="text-gray-400 text-sm mt-1">{message}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition-colors ${confirmColor}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function useConfirm() {
    const [state, setState] = useState({ open: false, title: '', message: '', resolve: null, confirmLabel: 'Delete', confirmColor: undefined });
    const confirm = useCallback((title, message, opts = {}) => new Promise(resolve => {
        setState({ open: true, title, message, resolve, confirmLabel: opts.confirmLabel || 'Delete', confirmColor: opts.confirmColor });
    }), []);
    const handleConfirm = () => { state.resolve(true);  setState(s => ({ ...s, open: false })); };
    const handleCancel  = () => { state.resolve(false); setState(s => ({ ...s, open: false })); };
    const dialog = (
        <ConfirmDialog
            open={state.open}
            title={state.title}
            message={state.message}
            confirmLabel={state.confirmLabel}
            confirmColor={state.confirmColor}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );
    return [confirm, dialog];
}
import { lkr } from '../utils/currency';
import {
    addMenuItem, updateMenuItem, deleteMenuItem,
    addCategory, fetchMenuItems, fetchCategories,
} from '../store/slices/menuSlice';

/* ── Category colour palette ────────────────────────────── */
const CAT_COLORS = [
    '#3B82F6','#10B981','#F59E0B','#EC4899',
    '#8B5CF6','#EF4444','#06B6D4','#84CC16',
];

const EMPTY_FORM = {
    name: '', code: '', category: '', price: '', cost: '',
    description: '', preparation_time: 15, is_available: true, kot_required: true,
};

/* ── Tiny helpers ─────────────────────────────────────────── */
const Badge = ({ children, color = '#3B82F6' }) => (
    <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: color + '22', color }}
    >
        {children}
    </span>
);

const Field = ({ label, required, children }) => (
    <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const inp = "w-full bg-gray-700/60 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-gray-500";

/* ── Item card ───────────────────────────────────────────── */
const ItemCard = ({ item, catColor, onEdit, onDelete, onToggle }) => {
    const margin = item.cost > 0
        ? Math.round(((item.price - item.cost) / item.price) * 100)
        : null;

    return (
        <div className={`bg-gray-800 rounded-xl border transition-all duration-150 group
            ${item.is_available ? 'border-gray-700 hover:border-gray-500' : 'border-gray-700/40 opacity-60'}`}
        >
            {/* Colour bar */}
            <div className="h-1 rounded-t-xl" style={{ backgroundColor: catColor }} />

            <div className="p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                        <p className="text-white font-semibold text-sm leading-tight truncate">{item.name}</p>
                        {item.code && (
                            <p className="text-gray-500 text-xs mt-0.5 font-mono">{item.code}</p>
                        )}
                    </div>
                    {/* Availability dot toggle */}
                    <button
                        onClick={() => onToggle(item)}
                        title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                        className={`shrink-0 w-3 h-3 rounded-full mt-1 transition-colors ring-2 ring-offset-2 ring-offset-gray-800
                            ${item.is_available ? 'bg-green-400 ring-green-500/50' : 'bg-gray-600 ring-gray-600/50'}`}
                    />
                </div>

                {/* Description */}
                {item.description && (
                    <p className="text-gray-500 text-xs mb-2 line-clamp-2">{item.description}</p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    <Badge color={catColor}>{item.category}</Badge>
                    {item.preparation_time > 0 && (
                        <span className="text-gray-500 text-xs">⏱ {item.preparation_time}m</span>
                    )}
                    {/* KOT badge */}
                    {(item.kot_required === 1 || item.kot_required === true)
                        ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">KOT</span>
                        : <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ready</span>
                    }
                    {margin !== null && (
                        <span className="text-gray-500 text-xs ml-auto">{margin}% margin</span>
                    )}
                </div>

                {/* Price row */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-blue-400 font-bold text-base">{lkr(item.price)}</p>
                        {item.cost > 0 && (
                            <p className="text-gray-500 text-xs">Cost: {lkr(item.cost)}</p>
                        )}
                    </div>

                    {/* Actions (visible on hover) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(item)}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(item)}
                            className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            Del
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main view ───────────────────────────────────────────── */
const MenuManagementView = () => {
    const dispatch = useDispatch();
    const { items, categories } = useSelector(s => s.menu);
    const [confirm, confirmDialog] = useConfirm();

    const [catFilter, setCatFilter]   = useState('All');
    const [search, setSearch]         = useState('');
    const [showUnavail, setShowUnavail] = useState(true);
    const [form, setForm]             = useState(EMPTY_FORM);
    const [editingId, setEditingId]   = useState(null);
    const [showModal, setShowModal]   = useState(false);
    const [saving, setSaving]         = useState(false);

    /* category panel */
    const [newCatName, setNewCatName]   = useState('');
    const [newCatColor, setNewCatColor] = useState(CAT_COLORS[0]);
    const [showCatForm, setShowCatForm] = useState(false);

    /* colour lookup */
    const catColorMap = useMemo(() => {
        const map = {};
        categories.forEach((c, i) => { map[c.name] = c.color || CAT_COLORS[i % CAT_COLORS.length]; });
        return map;
    }, [categories]);

    /* filtered items */
    const filtered = useMemo(() => {
        let list = items;
        if (catFilter !== 'All') list = list.filter(i => i.category === catFilter);
        if (!showUnavail) list = list.filter(i => i.is_available);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(i =>
                i.name.toLowerCase().includes(q) ||
                (i.code || '').toLowerCase().includes(q) ||
                (i.description || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [items, catFilter, search, showUnavail]);

    /* stats */
    const stats = useMemo(() => ({
        total:      items.length,
        available:  items.filter(i => i.is_available).length,
        avgPrice:   items.length ? items.reduce((s, i) => s + i.price, 0) / items.length : 0,
        categories: categories.length,
    }), [items, categories]);

    /* open modal */
    const openAdd = () => {
        setForm({ ...EMPTY_FORM, category: catFilter !== 'All' ? catFilter : '' });
        setEditingId(null);
        setShowModal(true);
    };
    const openEdit = (item) => {
        setForm({
            name: item.name, code: item.code || '', category: item.category,
            price: item.price, cost: item.cost || '', description: item.description || '',
            preparation_time: item.preparation_time ?? 15,
            is_available: item.is_available === 1 || item.is_available === true,
            kot_required: item.kot_required === 1 || item.kot_required === true || item.kot_required === undefined,
        });
        setEditingId(item.id);
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM); };

    /* submit */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim())                              return toast.error('Name is required');
        if (!form.category)                                  return toast.error('Select a category');
        if (!form.price || Number(form.price) <= 0)          return toast.error('Enter a valid price');
        setSaving(true);
        try {
            const payload = {
                ...form,
                price: parseFloat(form.price),
                cost:  parseFloat(form.cost) || 0,
                preparation_time: parseInt(form.preparation_time) || 15,
            };
            if (editingId) {
                await dispatch(updateMenuItem({ ...payload, id: editingId })).unwrap();
                toast.success('Item updated');
            } else {
                await dispatch(addMenuItem(payload)).unwrap();
                await dispatch(fetchMenuItems());
                toast.success('Item added');
            }
            closeModal();
        } catch (err) {
            toast.error('Failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    /* delete */
    const handleDelete = async (item) => {
        const ok = await confirm('Remove Menu Item', `Remove "${item.name}" from the menu? This cannot be undone.`);
        if (!ok) return;
        try {
            await dispatch(deleteMenuItem(item.id)).unwrap();
            toast.success('Item removed');
        } catch (err) {
            toast.error('Failed: ' + err.message);
        }
    };

    /* availability toggle */
    const handleToggle = async (item) => {
        try {
            await dispatch(updateMenuItem({
                id: item.id, name: item.name, code: item.code, category: item.category,
                price: item.price, cost: item.cost, description: item.description,
                preparation_time: item.preparation_time,
                kot_required: item.kot_required === 1 || item.kot_required === true,
                is_available: !(item.is_available === 1 || item.is_available === true),
            })).unwrap();
        } catch {
            toast.error('Could not update availability');
        }
    };

    /* delete category */
    const handleDeleteCategory = async (cat) => {
        const count = items.filter(i => i.category === cat.name).length;
        if (count > 0) {
            toast.error(`Move or delete the ${count} item(s) in "${cat.name}" first — including unavailable ones`);
            return;
        }
        const ok = await confirm('Delete Category', `Delete "${cat.name}"? This cannot be undone.`);
        if (!ok) return;
        try {
            const res = await window.electron.database({ action: 'deleteCategory', data: { name: cat.name } });
            if (res.success) {
                await dispatch(fetchCategories());
                if (catFilter === cat.name) setCatFilter('All');
                toast.success(`"${cat.name}" deleted`);
            } else {
                toast.error(res.error || 'Delete failed');
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    /* add category */
    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        try {
            await dispatch(addCategory({ name: newCatName.trim(), color: newCatColor })).unwrap();
            await dispatch(fetchCategories());
            toast.success(`"${newCatName}" added`);
            setNewCatName('');
            setShowCatForm(false);
        } catch (err) {
            toast.error('Failed: ' + err.message);
        }
    };

    return (
        <div className="flex h-full bg-gray-900 overflow-hidden">

            {/* ── Left sidebar ────────────────────────────────── */}
            <div className="w-56 shrink-0 bg-gray-800/80 border-r border-gray-700 flex flex-col">
                <div className="px-4 py-4 border-b border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Categories</p>

                    <button
                        onClick={() => setCatFilter('All')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-1 transition-colors
                            ${catFilter === 'All' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                    >
                        <span>All Items</span>
                        <span className={`text-xs rounded-full px-1.5 ${catFilter === 'All' ? 'bg-blue-500' : 'bg-gray-700 text-gray-400'}`}>
                            {items.length}
                        </span>
                    </button>

                    {categories.map(cat => {
                        const color = cat.color || '#3B82F6';
                        const count = items.filter(i => i.category === cat.name).length;
                        const active = catFilter === cat.name;
                        return (
                            <div key={cat.id} className="group relative mb-1">
                                <button
                                    onClick={() => setCatFilter(cat.name)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                                        ${active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
                                >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className="flex-1 text-left truncate">{cat.name}</span>
                                    <span className="text-xs text-gray-500 group-hover:hidden">{count}</span>
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); handleDeleteCategory(cat); }}
                                    title="Delete category"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center w-5 h-5 rounded bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold transition-colors"
                                >×</button>
                            </div>
                        );
                    })}
                </div>

                {/* Add category */}
                <div className="px-4 py-3 mt-auto border-t border-gray-700">
                    {showCatForm ? (
                        <div className="space-y-2">
                            <input
                                className={inp}
                                placeholder="Category name"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                autoFocus
                            />
                            <div className="flex gap-1 flex-wrap">
                                {CAT_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setNewCatColor(c)}
                                        className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                                        style={{
                                            backgroundColor: c,
                                            outline: newCatColor === c ? `2px solid white` : 'none',
                                            outlineOffset: '1px',
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={handleAddCategory}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg py-1.5 font-medium">
                                    Add
                                </button>
                                <button onClick={() => setShowCatForm(false)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg py-1.5">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowCatForm(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                            <span className="text-lg leading-none">+</span>
                            <span>New Category</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main area ───────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Stats bar */}
                <div className="bg-gray-800/60 border-b border-gray-700 px-6 py-3 flex items-center gap-6">
                    {[
                        { label: 'Total Items',  value: stats.total,      color: 'text-white' },
                        { label: 'Available',    value: stats.available,  color: 'text-green-400' },
                        { label: 'Unavailable',  value: stats.total - stats.available, color: 'text-red-400' },
                        { label: 'Avg Price',    value: lkr(stats.avgPrice), color: 'text-blue-400' },
                        { label: 'Categories',   value: stats.categories, color: 'text-purple-400' },
                    ].map(s => (
                        <div key={s.label}>
                            <p className="text-xs text-gray-500">{s.label}</p>
                            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    ))}

                    <div className="ml-auto flex items-center gap-3">
                        <button
                            onClick={() => setShowUnavail(v => !v)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                ${showUnavail ? 'bg-gray-700 text-gray-300' : 'bg-yellow-700 text-yellow-200'}`}
                        >
                            {showUnavail ? 'Hide unavailable' : 'Show unavailable'}
                        </button>
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                            <span className="text-base leading-none">+</span> Add Item
                        </button>
                    </div>
                </div>

                {/* Search + heading */}
                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-700/50">
                    <p className="text-gray-300 text-sm">
                        <span className="font-semibold text-white">{catFilter}</span>
                        <span className="text-gray-500 ml-2">— {filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
                    </p>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
                        <input
                            className="bg-gray-700/60 border border-gray-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-52"
                            placeholder="Search name, code..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
                            <span className="text-4xl">🍽️</span>
                            <p className="text-sm">No items found</p>
                            <button onClick={openAdd}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                                Add first item
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filtered.map(item => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    catColor={catColorMap[item.category] || '#3B82F6'}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onToggle={handleToggle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add / Edit modal ─────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700">

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                            <h3 className="text-white font-bold text-base">
                                {editingId ? 'Edit Menu Item' : 'Add New Item'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                            {/* Name + Code */}
                            <div className="flex gap-3">
                                <Field label="Item Name" required>
                                    <input
                                        className={inp}
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Egg Fried Rice"
                                        autoFocus
                                    />
                                </Field>
                                <div className="w-28 shrink-0">
                                    <Field label="Code">
                                        <input
                                            className={inp}
                                            value={form.code}
                                            onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                            placeholder="R001"
                                        />
                                    </Field>
                                </div>
                            </div>

                            {/* Category */}
                            <Field label="Category" required>
                                <select
                                    className={inp}
                                    value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                >
                                    <option value="">Select category…</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </Field>

                            {/* Price + Cost + Prep */}
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="Price (LKR)" required>
                                    <input type="number" min="0" step="0.01" className={inp}
                                        value={form.price}
                                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                        placeholder="0.00" />
                                </Field>
                                <Field label="Cost (LKR)">
                                    <input type="number" min="0" step="0.01" className={inp}
                                        value={form.cost}
                                        onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                                        placeholder="0.00" />
                                </Field>
                                <Field label="Prep time (min)">
                                    <input type="number" min="0" className={inp}
                                        value={form.preparation_time}
                                        onChange={e => setForm(f => ({ ...f, preparation_time: e.target.value }))} />
                                </Field>
                            </div>

                            {/* Margin indicator */}
                            {form.price > 0 && form.cost > 0 && (
                                <div className="bg-gray-700/40 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Gross margin</span>
                                    <span className={`font-bold ${
                                        ((form.price - form.cost) / form.price) > 0.5 ? 'text-green-400' :
                                        ((form.price - form.cost) / form.price) > 0.2 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                        {Math.round(((form.price - form.cost) / form.price) * 100)}%
                                    </span>
                                </div>
                            )}

                            {/* Description */}
                            <Field label="Description">
                                <textarea rows={2} className={inp + ' resize-none'}
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Short description shown to staff…" />
                            </Field>

                            {/* Toggles row */}
                            <div className="space-y-3 bg-gray-700/30 rounded-xl p-3">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <div
                                        onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                                        className={`relative shrink-0 w-10 h-5 rounded-full transition-colors ${form.is_available ? 'bg-green-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-200 font-medium">Available for ordering</p>
                                        <p className="text-xs text-gray-500">Toggleable anytime from the menu grid</p>
                                    </div>
                                </label>
                                <div className="border-t border-gray-700/60" />
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <div
                                        onClick={() => setForm(f => ({ ...f, kot_required: !f.kot_required }))}
                                        className={`relative shrink-0 w-10 h-5 rounded-full transition-colors ${form.kot_required ? 'bg-orange-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.kot_required ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-200 font-medium">Needs kitchen (KOT)</p>
                                        <p className="text-xs text-gray-500">
                                            {form.kot_required
                                                ? 'Will appear on KOT — item is cooked to order'
                                                : 'Ready to serve — excluded from KOT (e.g. bottled drinks, packaged items)'}
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Footer buttons */}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={closeModal}
                                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl text-sm font-bold transition-colors">
                                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmDialog}
        </div>
    );
};

export default MenuManagementView;
