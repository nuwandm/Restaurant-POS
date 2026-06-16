import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
    pending:   { label: 'Pending',   bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-300', dot: 'bg-yellow-400' },
    confirmed: { label: 'Confirmed', bg: 'bg-blue-500/10 border-blue-500/30',     text: 'text-blue-300',   dot: 'bg-blue-400' },
    seated:    { label: 'Seated',    bg: 'bg-green-500/10 border-green-500/30',    text: 'text-green-300',  dot: 'bg-green-400' },
    cancelled: { label: 'Cancelled', bg: 'bg-gray-700/30 border-gray-600/30',      text: 'text-gray-500',   dot: 'bg-gray-600' },
};

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20];

function todayStr() {
    return new Date().toLocaleDateString('en-CA');
}

function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d) {
    if (!d) return '';
    const [y, mo, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(mo)-1]} ${parseInt(day)}, ${y}`;
}

function ReservationForm({ initial, tables, onSave, onCancel }) {
    const [form, setForm] = useState({
        customer_name: initial?.customer_name || '',
        phone:         initial?.phone || '',
        party_size:    initial?.party_size || 2,
        table_id:      initial?.table_id || '',
        reservation_date: initial?.reservation_date || todayStr(),
        reservation_time: initial?.reservation_time || '19:00',
        status:        initial?.status || 'pending',
        notes:         initial?.notes || '',
    });
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        if (!form.customer_name.trim()) { toast.error('Customer name is required'); return; }
        if (!form.reservation_date)     { toast.error('Date is required'); return; }
        if (!form.reservation_time)     { toast.error('Time is required'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                customer_name: form.customer_name.trim(),
                table_id: form.table_id || null,
                party_size: parseInt(form.party_size) || 1,
            };
            if (initial?.id) {
                payload.id = initial.id;
                await window.electron.database({ action: 'updateReservation', data: payload });
            } else {
                await window.electron.database({ action: 'createReservation', data: payload });
            }
            onSave();
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        }
        setSaving(false);
    };

    const inputCls = "w-full bg-gray-800 border border-gray-600/60 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";
    const labelCls = "block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider";

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-700/60 flex items-center justify-between">
                    <h2 className="text-white font-bold text-base">
                        {initial?.id ? 'Edit Reservation' : 'New Reservation'}
                    </h2>
                    <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* Customer name */}
                    <div>
                        <label className={labelCls}>Customer Name *</label>
                        <input type="text" className={inputCls} placeholder="e.g. Nimal Perera"
                            value={form.customer_name} onChange={e => set('customer_name', e.target.value)} autoFocus />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className={labelCls}>Phone Number</label>
                        <input type="tel" className={inputCls} placeholder="e.g. 077 123 4567"
                            value={form.phone} onChange={e => set('phone', e.target.value)} />
                    </div>

                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Date *</label>
                            <input type="date" className={inputCls}
                                value={form.reservation_date}
                                onChange={e => set('reservation_date', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Time *</label>
                            <input type="time" className={inputCls}
                                value={form.reservation_time}
                                onChange={e => set('reservation_time', e.target.value)} />
                        </div>
                    </div>

                    {/* Party size + Table */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Party Size</label>
                            <select className={inputCls} value={form.party_size} onChange={e => set('party_size', e.target.value)}>
                                {PARTY_SIZES.map(n => (
                                    <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Table</label>
                            <select className={inputCls} value={form.table_id} onChange={e => set('table_id', e.target.value)}>
                                <option value="">No table assigned</option>
                                {tables.map(t => (
                                    <option key={t.id} value={t.id}>Table {t.number} ({t.capacity} seats)</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Status (edit only) */}
                    {initial?.id && (
                        <div>
                            <label className={labelCls}>Status</label>
                            <div className="flex gap-2 flex-wrap">
                                {Object.entries(STATUS_STYLES).map(([s, st]) => (
                                    <button key={s} onClick={() => set('status', s)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                                            ${form.status === s ? `${st.bg} ${st.text}` : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}>
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className={labelCls}>Notes</label>
                        <textarea className={`${inputCls} resize-none`} rows={2}
                            placeholder="Special requests, dietary requirements..."
                            value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>
                </div>

                <div className="px-6 pb-5 flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                        {saving
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            : (initial?.id ? 'Save Changes' : 'Create Booking')
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReservationCard({ res, onEdit, onCancel, onStatusChange }) {
    const st = STATUS_STYLES[res.status] || STATUS_STYLES.pending;
    const isActive = res.status !== 'cancelled';

    return (
        <div className={`bg-gray-800/50 border rounded-xl p-4 transition-colors ${res.status === 'cancelled' ? 'opacity-50' : 'border-gray-700/60 hover:border-gray-600'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-sm">{res.customer_name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                            {st.label}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                            </svg>
                            {fmtDate(res.reservation_date)} · {fmtTime(res.reservation_time)}
                        </span>
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            </svg>
                            {res.party_size} {res.party_size === 1 ? 'person' : 'people'}
                        </span>
                        {res.table_number && (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                                    <rect x="3" y="7" width="18" height="3" rx="1"/><path d="M5 10v7M19 10v7"/>
                                </svg>
                                Table {res.table_number}
                            </span>
                        )}
                        {res.phone && (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                                {res.phone}
                            </span>
                        )}
                    </div>
                    {res.notes && (
                        <p className="text-gray-500 text-xs mt-1.5 italic">"{res.notes}"</p>
                    )}
                </div>

                {/* Action buttons */}
                {isActive && (
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Quick status: Confirm */}
                        {res.status === 'pending' && (
                            <button onClick={() => onStatusChange(res.id, 'confirmed')}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[10px] font-bold transition-colors border border-blue-600/30">
                                Confirm
                            </button>
                        )}
                        {/* Quick status: Seat */}
                        {(res.status === 'pending' || res.status === 'confirmed') && (
                            <button onClick={() => onStatusChange(res.id, 'seated')}
                                className="px-2.5 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-400 text-[10px] font-bold transition-colors border border-green-600/30">
                                Seat
                            </button>
                        )}
                        {/* Edit */}
                        <button onClick={() => onEdit(res)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        {/* Cancel */}
                        <button onClick={() => onCancel(res.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ReservationsView() {
    const { tables } = useSelector(s => s.tables);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewDate, setViewDate] = useState(todayStr());
    const [showAll, setShowAll] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editRes, setEditRes] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const action = showAll ? 'getAllReservations' : 'getReservations';
            const res = await window.electron.database({ action, data: { date: viewDate } });
            if (res.success) {
                setReservations(Array.isArray(res.data) ? res.data : []);
            } else {
                toast.error('Could not load reservations');
            }
        } catch (err) {
            toast.error('Failed to load reservations');
            console.error('getReservations error:', err);
        }
        setLoading(false);
    }, [viewDate, showAll]);

    useEffect(() => { load(); }, [load]);

    const handleStatusChange = async (id, status) => {
        const res = reservations.find(r => r.id === id);
        if (!res) return;
        try {
            await window.electron.database({
                action: 'updateReservation',
                data: { ...res, id, status },
            });
            toast.success(`Marked as ${STATUS_STYLES[status]?.label || status}`);
            load();
        } catch { toast.error('Could not update status'); }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this reservation?')) return;
        try {
            await window.electron.database({ action: 'cancelReservation', data: { id } });
            toast.success('Reservation cancelled');
            load();
        } catch { toast.error('Could not cancel'); }
    };

    const handleSaved = () => {
        setShowForm(false);
        setEditRes(null);
        load();
        toast.success('Reservation saved');
    };

    const filtered = reservations.filter(r => filterStatus === 'all' || r.status === filterStatus);

    const counts = { all: reservations.length };
    for (const r of reservations) counts[r.status] = (counts[r.status] || 0) + 1;

    const navDate = (delta) => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() + delta);
        setViewDate(d.toLocaleDateString('en-CA'));
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-gray-700/60 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-white font-bold text-lg leading-tight">Reservations</h1>
                    <p className="text-gray-500 text-xs mt-0.5">Manage table bookings</p>
                </div>
                <button
                    onClick={() => { setEditRes(null); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/40"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    New Booking
                </button>
            </div>

            {/* Date nav */}
            <div className="shrink-0 px-6 py-3 border-b border-gray-700/40 flex items-center gap-3">
                {/* All dates toggle */}
                <button onClick={() => setShowAll(v => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showAll
                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'}`}>
                    All dates
                </button>

                {!showAll && <>
                    <button onClick={() => navDate(-1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <input type="date" value={viewDate}
                            onChange={e => setViewDate(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                        {viewDate !== todayStr() && (
                            <button onClick={() => setViewDate(todayStr())}
                                className="px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-colors">
                                Today
                            </button>
                        )}
                    </div>
                    <button onClick={() => navDate(1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </button>
                    <span className="text-gray-300 text-sm font-medium">{fmtDate(viewDate)}</span>
                </>}

                <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="text-yellow-400 font-bold">{counts.pending || 0}</span> pending ·
                    <span className="text-blue-400 font-bold">{counts.confirmed || 0}</span> confirmed ·
                    <span className="text-green-400 font-bold">{counts.seated || 0}</span> seated
                </div>
            </div>

            {/* Status filter tabs */}
            <div className="shrink-0 px-6 pt-3 pb-0 flex gap-1">
                {[
                    { key: 'all', label: `All (${counts.all || 0})` },
                    { key: 'pending',   label: `Pending (${counts.pending || 0})` },
                    { key: 'confirmed', label: `Confirmed (${counts.confirmed || 0})` },
                    { key: 'seated',    label: `Seated (${counts.seated || 0})` },
                    { key: 'cancelled', label: `Cancelled (${counts.cancelled || 0})` },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                            ${filterStatus === tab.key
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/50'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" className="w-7 h-7">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                                <path d="M8 14h2M14 14h2M8 18h2M14 18h2"/>
                            </svg>
                        </div>
                        <div>
                            <p className="text-gray-400 font-semibold text-sm">
                                {filterStatus === 'all'
                                    ? showAll ? 'No reservations found' : 'No reservations for this date'
                                    : `No ${filterStatus} reservations`}
                            </p>
                            <p className="text-gray-600 text-xs mt-0.5">Click "New Booking" to add one</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filtered.map(res => (
                            <ReservationCard
                                key={res.id}
                                res={res}
                                onEdit={r => { setEditRes(r); setShowForm(true); }}
                                onCancel={handleCancel}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Summary footer */}
            {reservations.length > 0 && (
                <div className="shrink-0 px-6 py-3 border-t border-gray-700/40 flex items-center gap-6 text-xs text-gray-500">
                    <span>Total guests: <span className="text-white font-semibold">
                        {reservations.filter(r => r.status !== 'cancelled').reduce((s, r) => s + r.party_size, 0)}
                    </span></span>
                    <span>Tables assigned: <span className="text-white font-semibold">
                        {reservations.filter(r => r.table_id && r.status !== 'cancelled').length}
                    </span></span>
                    <button onClick={load} className="ml-auto flex items-center gap-1.5 text-gray-600 hover:text-gray-300 transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                        </svg>
                        Refresh
                    </button>
                </div>
            )}

            {/* Form modal */}
            {showForm && (
                <ReservationForm
                    initial={editRes}
                    tables={tables}
                    onSave={handleSaved}
                    onCancel={() => { setShowForm(false); setEditRes(null); }}
                />
            )}
        </div>
    );
}
