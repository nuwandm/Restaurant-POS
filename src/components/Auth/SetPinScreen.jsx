import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearPinResetRequired } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

export default function SetPinScreen() {
    const dispatch = useDispatch();
    const currentUser = useSelector(s => s.auth.currentUser);
    const [newPin, setNewPin]       = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');

    const pinInput = (val, setter) => {
        if (/^\d{0,6}$/.test(val)) { setError(''); setter(val); }
    };

    const handleSave = async () => {
        if (!/^\d{4,6}$/.test(newPin)) { setError('PIN must be 4–6 digits'); return; }
        if (newPin !== confirmPin) { setError('PINs do not match'); return; }
        setSaving(true);
        try {
            const res = await window.electron.database({
                action: 'setOwnPin',
                data: { id: currentUser.id, pin: newPin },
            });
            if (res.success) {
                toast.success('PIN set successfully — welcome!');
                dispatch(clearPinResetRequired());
            } else {
                setError(res.error || 'Failed to set PIN');
            }
        } catch (e) { setError(e.message); }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[9990] bg-gray-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            <div className="relative z-10 w-full max-w-xs bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-5">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" className="w-6 h-6">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-white font-bold text-lg">Set Your PIN</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Welcome, <span className="text-white font-semibold">{currentUser?.name}</span>!
                        Your admin has reset your PIN. Please set a new one to continue.
                    </p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">New PIN * (4–6 digits)</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            value={newPin}
                            onChange={e => pinInput(e.target.value, setNewPin)}
                            maxLength={6}
                            placeholder="Enter new PIN"
                            autoFocus
                            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">Confirm PIN *</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            value={confirmPin}
                            onChange={e => pinInput(e.target.value, setConfirmPin)}
                            maxLength={6}
                            placeholder="Repeat new PIN"
                            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-red-400 text-xs font-semibold bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving || newPin.length < 4}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl text-sm transition-colors"
                >
                    {saving ? 'Saving…' : 'Set PIN & Continue →'}
                </button>
            </div>
        </div>
    );
}
