import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = ['admin', 'cashier', 'waiter'];
const ROLE_COLORS  = {
    admin:   'text-red-400 bg-red-900/20 border-red-700/40',
    cashier: 'text-blue-400 bg-blue-900/20 border-blue-700/40',
    waiter:  'text-green-400 bg-green-900/20 border-green-700/40',
};

const PinInput = ({ label, value, onChange, placeholder, autoFocus }) => (
    <div>
        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">{label}</label>
        <input
            type="password"
            inputMode="numeric"
            value={value}
            onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
            maxLength={6}
            placeholder={placeholder || '••••'}
            autoFocus={autoFocus}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest"
        />
    </div>
);

export default function StaffTab() {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading]     = useState(false);
    const [form, setForm]           = useState(null);
    const [saving, setSaving]       = useState(false);
    const [deleteId, setDeleteId]   = useState(null);
    // PIN reset modal (admin resets someone else's PIN)
    const [resetTarget, setResetTarget] = useState(null); // staff record
    const [tempPin, setTempPin]         = useState('');
    const [resetting, setResetting]     = useState(false);
    // Add-mode PIN confirm
    const [confirmPin, setConfirmPin] = useState('');

    const load = async () => {
        setLoading(true);
        const res = await window.electron.database({ action: 'getStaff' });
        if (res.success) setStaffList(res.data || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => {
        setForm({ name: '', role: 'cashier', pin: '', email: '', phone: '' });
        setConfirmPin('');
    };

    const openEdit = (s) => {
        setForm({ id: s.id, name: s.name, role: s.role, pin: s.pin, email: s.email || '', phone: s.phone || '' });
        setConfirmPin('');
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        if (!form.id) {
            // Add mode — require PIN + confirm
            if (!/^\d{4,6}$/.test(form.pin)) { toast.error('PIN must be 4–6 digits'); return; }
            if (form.pin !== confirmPin) { toast.error('PINs do not match'); return; }
        }
        setSaving(true);
        try {
            const action = form.id ? 'updateStaff' : 'addStaff';
            const res = await window.electron.database({ action, data: form });
            if (res.success) { toast.success(form.id ? 'Staff updated' : 'Staff added'); setForm(null); load(); }
            else toast.error(res.error || 'Failed');
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        const res = await window.electron.database({ action: 'deleteStaff', data: { id } });
        if (res.success) { toast.success('Staff removed'); setDeleteId(null); load(); }
        else toast.error(res.error || 'Failed to remove');
    };

    const handleResetPin = async () => {
        if (!/^\d{4,6}$/.test(tempPin)) { toast.error('Temporary PIN must be 4–6 digits'); return; }
        setResetting(true);
        try {
            const res = await window.electron.database({
                action: 'resetStaffPin',
                data: { id: resetTarget.id, tempPin },
            });
            if (res.success) {
                toast.success(`PIN reset for ${resetTarget.name}. They'll be asked to set a new PIN on next login.`);
                setResetTarget(null);
                setTempPin('');
                load();
            } else {
                toast.error(res.error || 'Failed');
            }
        } catch (e) { toast.error(e.message); }
        setResetting(false);
    };

    const active = staffList.filter(s => s.is_active);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Staff Accounts</h3>
                <button onClick={openAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add Staff
                </button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {ROLE_OPTIONS.map(r => (
                    <span key={r} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${ROLE_COLORS[r]}`}>{r}</span>
                ))}
                <span className="text-gray-600 text-[10px] self-center ml-1">— Admin: full access · Cashier: POS + payments + reports · Waiter: POS only</span>
            </div>

            {loading ? (
                <div className="text-gray-500 text-sm">Loading...</div>
            ) : (
                <div className="space-y-2">
                    {active.map(s => (
                        <div key={s.id} className="bg-gray-800 border border-gray-700/50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-white text-sm font-semibold">{s.name}</p>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${ROLE_COLORS[s.role] || 'text-gray-400 border-gray-600'}`}>{s.role}</span>
                                    {s.pin_reset_required ? (
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase border text-yellow-400 border-yellow-700/50 bg-yellow-900/20">PIN reset pending</span>
                                    ) : null}
                                </div>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    {s.phone ? `${s.phone} · ` : ''}
                                    {s.last_login ? `Last login: ${new Date(s.last_login + 'Z').toLocaleDateString('en-LK')}` : 'Never logged in'}
                                </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                {/* Reset PIN button */}
                                <button onClick={() => { setResetTarget(s); setTempPin(''); }}
                                    title="Reset PIN"
                                    className="px-2.5 py-1 text-xs text-yellow-400 bg-yellow-900/20 hover:bg-yellow-900/40 border border-yellow-700/30 rounded-lg transition-colors">
                                    Reset PIN
                                </button>
                                <button onClick={() => openEdit(s)}
                                    className="px-2.5 py-1 text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Edit</button>
                                {deleteId === s.id ? (
                                    <div className="flex gap-1">
                                        <button onClick={() => handleDelete(s.id)}
                                            className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg">Confirm</button>
                                        <button onClick={() => setDeleteId(null)}
                                            className="px-2 py-1 text-xs text-gray-400 bg-gray-700 rounded-lg">Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setDeleteId(s.id)}
                                        className="px-2.5 py-1 text-xs text-red-400 bg-red-900/20 hover:bg-red-900/40 rounded-lg transition-colors">Remove</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {active.length === 0 && <p className="text-gray-600 text-sm">No active staff accounts.</p>}
                </div>
            )}

            {/* Add / Edit modal */}
            {form && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-white font-bold text-base">{form.id ? 'Edit Staff' : 'Add Staff'}</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">Name *</label>
                                <input type="text" value={form.name}
                                    onChange={e => setForm(f => ({...f, name: e.target.value}))}
                                    maxLength={50} autoFocus
                                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">Role *</label>
                                <div className="flex gap-2">
                                    {ROLE_OPTIONS.map(r => (
                                        <button key={r} onClick={() => setForm(f => ({...f, role: r}))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-colors
                                                ${form.role === r ? ROLE_COLORS[r] : 'text-gray-500 border-gray-700 hover:border-gray-600'}`}>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* PIN fields only for Add mode — edit mode uses Reset PIN button */}
                            {!form.id && (
                                <>
                                    <PinInput label="PIN * (4-6 digits)" value={form.pin}
                                        onChange={v => setForm(f => ({...f, pin: v}))} placeholder="Set PIN" />
                                    <PinInput label="Confirm PIN *" value={confirmPin}
                                        onChange={setConfirmPin} placeholder="Repeat PIN" />
                                </>
                            )}

                            <div>
                                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">Phone (optional)</label>
                                <input type="tel" value={form.phone}
                                    onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setForm(null)}
                                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin PIN reset modal */}
            {resetTarget && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xs shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-white font-bold text-base">Reset PIN</h2>
                            <button onClick={() => setResetTarget(null)} className="text-gray-500 hover:text-white">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <p className="text-gray-400 text-xs">
                            Set a temporary PIN for <span className="text-white font-semibold">{resetTarget.name}</span>.
                            They will be required to set their own PIN on next login.
                        </p>

                        <PinInput
                            label="Temporary PIN * (4-6 digits)"
                            value={tempPin}
                            onChange={setTempPin}
                            placeholder="Set temp PIN"
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button onClick={() => setResetTarget(null)}
                                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors">Cancel</button>
                            <button onClick={handleResetPin} disabled={resetting}
                                className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                                {resetting ? 'Resetting…' : 'Reset PIN'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
