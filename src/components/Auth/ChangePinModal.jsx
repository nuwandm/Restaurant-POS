import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function ChangePinModal({ user, onClose }) {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin]         = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState('');

    const pinInput = (val, setter) => {
        if (/^\d{0,6}$/.test(val)) { setError(''); setter(val); }
    };

    const handleSave = async () => {
        if (!currentPin) { setError('Enter your current PIN'); return; }
        if (!/^\d{4,6}$/.test(newPin)) { setError('New PIN must be 4–6 digits'); return; }
        if (newPin !== confirmPin) { setError('New PINs do not match'); return; }

        setSaving(true);
        try {
            // Verify current PIN against this user's stored record
            const verify = await window.electron.database({
                action: 'loginWithPin',
                data: { pin: currentPin, id: user.id },
            });
            // IPC wraps result in { success, data } — the actual loginWithPin result is in verify.data
            if (!verify.success || !verify.data?.success) { setError('Current PIN is incorrect'); setSaving(false); return; }

            // Update the PIN
            const res = await window.electron.database({
                action: 'updateStaff',
                data: { id: user.id, name: user.name, role: user.role, pin: newPin, email: user.email || '', phone: user.phone || '' },
            });
            if (res.success) {
                toast.success('PIN changed successfully');
                onClose();
            } else {
                setError(res.error || 'Failed to update PIN');
            }
        } catch (e) {
            setError(e.message);
        }
        setSaving(false);
    };

    const field = (label, value, setter, placeholder) => (
        <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">{label}</label>
            <input
                type="password"
                inputMode="numeric"
                value={value}
                onChange={e => pinInput(e.target.value, setter)}
                maxLength={6}
                placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest"
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[9998] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xs shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-base">Change PIN</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <p className="text-gray-500 text-xs">Changing PIN for <span className="text-white font-semibold">{user.name}</span></p>

                <div className="space-y-3">
                    {field('Current PIN *', currentPin, setCurrentPin, 'Enter current PIN')}
                    {field('New PIN * (4-6 digits)', newPin, setNewPin, 'Enter new PIN')}
                    {field('Confirm New PIN *', confirmPin, setConfirmPin, 'Repeat new PIN')}
                </div>

                {error && (
                    <p className="text-red-400 text-xs font-semibold bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-3 pt-1">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
