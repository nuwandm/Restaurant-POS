import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function ForgotPinModal({ onClose, onRecovered }) {
    const [machineId, setMachineId] = useState('');
    const [code, setCode]           = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [copied, setCopied]       = useState(false);

    useEffect(() => {
        window.electron.recovery.getMachineId().then(id => setMachineId(id || 'UNKNOWN'));
    }, []);

    const today = new Date().toISOString().slice(0, 10);

    const copyMachineId = () => {
        navigator.clipboard.writeText(machineId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async () => {
        if (!code.trim()) { setError('Enter the recovery code'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await window.electron.recovery.resetAdminPin(machineId, code.trim());
            if (res.success) {
                toast.success('Admin PIN reset to 0000. Set a new PIN after login.');
                onRecovered();
            } else {
                setError(res.error || 'Invalid recovery code');
            }
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 max-h-[95vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-orange-600/20 border border-orange-600/30 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" className="w-4 h-4">
                                <rect x="3" y="11" width="18" height="11" rx="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                        <h2 className="text-white font-bold text-base">Admin PIN Recovery</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {/* Step 1 — Machine ID */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
                    <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Step 1 — Share your Machine ID</p>

                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Machine ID</p>
                        <div className="flex items-center gap-2">
                            <p className="text-blue-400 font-mono text-sm font-bold tracking-wide flex-1 select-all">{machineId || '...'}</p>
                            <button
                                onClick={copyMachineId}
                                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all
                                    ${copied ? 'bg-green-900/40 border border-green-700/50 text-green-400' : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300'}`}
                            >
                                {copied ? (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M20 6L9 17l-5-5"/></svg>
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Today's Date</p>
                        <p className="text-gray-300 font-mono text-sm">{today}</p>
                    </div>
                </div>

                {/* Step 2 — Contact DreamLabs */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2.5">
                    <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Step 2 — Contact DreamLabs</p>
                    <p className="text-gray-500 text-xs">Send your Machine ID and today's date to receive a recovery code.</p>

                    {/* WhatsApp */}
                    <div className="flex items-center gap-3 bg-gray-900/60 rounded-xl px-3 py-2.5 border border-gray-700/40">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" fill="#4ade80" className="w-4 h-4">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.562 4.14 1.541 5.878L.057 23.428a.5.5 0 0 0 .606.61l5.703-1.49A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.13-1.424l-.36-.214-3.733.976.998-3.645-.235-.375A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-tight">WhatsApp</p>
                            <p className="text-green-400 text-sm font-bold leading-tight">070 615 1051</p>
                        </div>
                        <button
                            onClick={() => window.electron.openExternal('https://wa.me/94706151051')}
                            className="shrink-0 px-2.5 py-1.5 bg-green-900/30 hover:bg-green-800/50 border border-green-700/30 text-green-400 text-[11px] font-semibold rounded-lg transition-colors"
                        >
                            Open
                        </button>
                    </div>

                    {/* Facebook */}
                    <div className="flex items-center gap-3 bg-gray-900/60 rounded-xl px-3 py-2.5 border border-gray-700/40">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" fill="#60a5fa" className="w-4 h-4">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-tight">Facebook</p>
                            <p className="text-blue-400 text-sm font-bold leading-tight truncate">DreamLabs IT Solutions</p>
                        </div>
                        <button
                            onClick={() => window.electron.openExternal('https://web.facebook.com/profile.php?id=61586957551290')}
                            className="shrink-0 px-2.5 py-1.5 bg-blue-900/30 hover:bg-blue-800/50 border border-blue-700/30 text-blue-400 text-[11px] font-semibold rounded-lg transition-colors"
                        >
                            Open
                        </button>
                    </div>
                </div>

                {/* Step 3 — Enter code */}
                <div>
                    <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mb-2">Step 3 — Enter Recovery Code</p>
                    <input
                        type="text"
                        value={code}
                        onChange={e => { setError(''); setCode(e.target.value.toUpperCase()); }}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        maxLength={19}
                        autoFocus
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors font-mono tracking-widest uppercase"
                    />
                    <p className="text-yellow-600/70 text-[10px] mt-1.5">⚠ Code expires at midnight UTC — get a fresh one each day.</p>
                </div>

                {error && (
                    <p className="text-red-400 text-xs font-semibold bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-3 pt-1">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading || !code.trim()}
                        className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                        {loading ? 'Verifying…' : 'Recover Access'}
                    </button>
                </div>
            </div>
        </div>
    );
}
