import React, { useState, useEffect } from 'react';

const LicenseGate = ({ children }) => {
    const [licenseStatus, setLicenseStatus] = useState(null); // null = loading
    const [machineId, setMachineId] = useState('');
    const [keyInput, setKeyInput] = useState('');
    const [activating, setActivating] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const checkLicense = async () => {
        // In browser mode (no electron.license) skip the gate
        if (!window.electron?.license) {
            setLicenseStatus('activated');
            return;
        }
        const result = await window.electron.license.check();
        setMachineId(result.machineId || '');
        setLicenseStatus(result.status);
    };

    useEffect(() => { checkLicense(); }, []);

    const handleActivate = async () => {
        if (!keyInput.trim()) { setError('Please enter a license key'); return; }
        setActivating(true);
        setError('');
        const result = await window.electron.license.activate(keyInput.trim());
        setActivating(false);
        if (result.success) {
            setLicenseStatus('activated');
        } else {
            setError(result.error || 'Invalid license key');
        }
    };

    const copyMachineId = () => {
        navigator.clipboard.writeText(machineId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Loading
    if (licenseStatus === null) {
        return (
            <div className="h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-gray-400 text-sm">Checking license...</div>
            </div>
        );
    }

    // Valid — show the app
    if (licenseStatus === 'activated') return children;

    // Trial or expired — show gate
    const isExpired = licenseStatus === 'expired' || licenseStatus === 'invalid';

    return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg, #0f1117 0%, #131620 100%)' }}>

            {/* Logo / brand */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-900/50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-lg leading-tight">Hotel POS System</p>
                    <p className="text-gray-500 text-xs">by DreamLabs IT Solutions</p>
                </div>
            </div>

            {/* Main card */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* Status banner */}
                <div className={`px-6 py-4 ${isExpired ? 'bg-red-900/40 border-b border-red-700/50' : 'bg-blue-900/30 border-b border-blue-700/30'}`}>
                    <div className="flex items-center gap-3">
                        {isExpired ? (
                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="w-4 h-4">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" className="w-4 h-4">
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                            </div>
                        )}
                        <div>
                            {isExpired ? (
                                <>
                                    <p className="text-red-400 font-bold text-sm">Trial Expired</p>
                                    <p className="text-red-500/70 text-xs">Your 14-day trial has ended. Please activate to continue.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-blue-300 font-bold text-sm">Trial Mode — {licenseStatus === 'trial' ? `Days remaining` : ''}</p>
                                    <p className="text-blue-400/70 text-xs">Activate with a license key to use permanently</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5">

                    {/* Machine ID */}
                    <div>
                        <p className="text-xs text-gray-400 font-medium mb-2">Your Machine ID</p>
                        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
                            <span className="flex-1 text-white font-mono font-bold text-lg tracking-widest">{machineId}</span>
                            <button
                                onClick={copyMachineId}
                                className="shrink-0 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs rounded-lg transition-colors font-medium"
                            >
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-gray-500 text-xs mt-2">
                            Send this Machine ID to <span className="text-blue-400 font-medium">DreamLabs IT Solutions</span> via WhatsApp or email to get your license key.
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-700" />
                        <span className="text-gray-600 text-xs">Enter License Key</span>
                        <div className="flex-1 h-px bg-gray-700" />
                    </div>

                    {/* Key input */}
                    <div className="space-y-3">
                        <input
                            value={keyInput}
                            onChange={e => { setKeyInput(e.target.value.toUpperCase()); setError(''); }}
                            placeholder="HOTEL-XXXX-XXXX-XXXX-XXXX"
                            className="w-full bg-gray-900 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-4 py-3 text-white font-mono text-sm tracking-wider text-center focus:outline-none transition-colors"
                            onKeyDown={e => e.key === 'Enter' && handleActivate()}
                        />
                        {error && (
                            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
                                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                                <p className="text-red-400 text-xs">{error}</p>
                            </div>
                        )}
                        <button
                            onClick={handleActivate}
                            disabled={activating}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-bold text-sm transition-colors"
                        >
                            {activating ? 'Activating...' : 'Activate License'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
                <p className="text-gray-600 text-xs">DreamLabs IT Solutions</p>
                <p className="text-gray-700 text-xs mt-0.5">Hotel POS System v1.1.0</p>
            </div>
        </div>
    );
};

export default LicenseGate;
