import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithPin, clearAuthError } from '../../store/slices/authSlice';
import dreamLabsLogo from '../../assets/DreamLabsLogoNew.png';
import ForgotPinModal from './ForgotPinModal';

const ROLE_COLORS = {
    admin:   'bg-red-900/40 border-red-600/60 text-red-300',
    cashier: 'bg-blue-900/40 border-blue-600/60 text-blue-300',
    waiter:  'bg-green-900/40 border-green-600/60 text-green-300',
};

const AVATAR_COLORS = [
    'bg-blue-600', 'bg-purple-600', 'bg-green-600',
    'bg-orange-600', 'bg-pink-600', 'bg-teal-600',
    'bg-indigo-600', 'bg-red-600',
];

export default function PinLoginScreen() {
    const dispatch = useDispatch();
    const { loading, error } = useSelector(s => s.auth);
    const [pin, setPin]           = useState('');
    const [shake, setShake]       = useState(false);
    const [localError, setLocalError] = useState('');
    const [staffList, setStaffList] = useState([]);
    const [selected, setSelected] = useState(null); // { id, name, role }
    const [showForgot, setShowForgot] = useState(false);
    const containerRef = useRef(null);

    const hotelName = (() => {
        try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}').hotelName || 'Hotel POS'; }
        catch { return 'Hotel POS'; }
    })();

    // Load active staff on mount
    useEffect(() => {
        window.electron.database({ action: 'getStaff' }).then(res => {
            if (res.success) setStaffList(res.data?.filter(s => s.is_active) || []);
        }).catch(() => {});
    }, []);

    useEffect(() => { containerRef.current?.focus(); }, []);

    useEffect(() => {
        if (error) {
            setShake(true);
            setPin('');
            const t = setTimeout(() => { setShake(false); dispatch(clearAuthError()); }, 700);
            return () => clearTimeout(t);
        }
    }, [error, dispatch]);

    const handleDigit = (d) => { if (pin.length < 6) { setLocalError(''); setPin(p => p + d); } };
    const handleBackspace = () => { setLocalError(''); setPin(p => p.slice(0, -1)); };

    const triggerShake = (msg) => {
        setLocalError(msg);
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 700);
    };

    const handleSubmit = () => {
        if (pin.length < 4) return;
        // Must have selected a user — PIN is validated against their stored PIN client-side
        if (!selected) { triggerShake('Please select your name first'); return; }
        if (pin !== selected.pin) { triggerShake('Incorrect PIN'); return; }
        dispatch(loginWithPin({ pin, id: selected.id }));
    };

    const handleSelect = (staff) => {
        setSelected(staff);
        setPin('');
        setLocalError('');
        dispatch(clearAuthError());
        containerRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
        else if (e.key === 'Backspace') handleBackspace();
        else if (e.key === 'Enter') handleSubmit();
        else if (e.key === 'Escape') { setSelected(null); setPin(''); setLocalError(''); }
    };

    const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    return (
        <div
            className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            ref={containerRef}
        >
            {/* Background dots */}
            <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            <div className="relative z-10 w-full max-w-sm px-5">
                {/* Logo + hotel name */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-blue-900/60">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-7 h-7">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                    </div>
                    <h1 className="text-white text-xl font-bold">{hotelName}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {selected ? `Welcome, ${selected.name}` : 'Select your name to continue'}
                    </p>
                </div>

                {/* Staff selector */}
                {!selected && (
                    <div className="mb-5">
                        {staffList.length === 0 ? (
                            <p className="text-gray-600 text-xs text-center py-4">No staff accounts found</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-2.5">
                                {staffList.map((s, i) => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleSelect(s)}
                                        className="flex flex-col items-center gap-2 py-3 px-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 hover:border-gray-500 rounded-2xl transition-all active:scale-95"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                                            {initials(s.name)}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white text-xs font-semibold leading-tight truncate max-w-[72px]">{s.name}</p>
                                            <span className={`mt-0.5 inline-block px-1.5 py-0 rounded text-[9px] font-bold uppercase border ${ROLE_COLORS[s.role] || 'text-gray-400 border-gray-600'}`}>
                                                {s.role}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PIN entry — shown after selecting a name */}
                {selected && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        {/* Selected user chip + change */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${AVATAR_COLORS[staffList.findIndex(s => s.id === selected.id) % AVATAR_COLORS.length]}`}>
                                    {initials(selected.name)}
                                </div>
                                <div>
                                    <p className="text-white text-sm font-semibold leading-none">{selected.name}</p>
                                    <span className={`text-[9px] font-bold uppercase ${ROLE_COLORS[selected.role]?.split(' ')[2] || 'text-gray-400'}`}>{selected.role}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelected(null); setPin(''); setLocalError(''); dispatch(clearAuthError()); }}
                                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Change
                            </button>
                        </div>

                        {/* PIN dots */}
                        <div className={`flex justify-center gap-3.5 mb-4 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i}
                                    className={`w-3 h-3 rounded-full border-2 transition-all duration-150
                                        ${i < pin.length
                                            ? 'bg-blue-500 border-blue-400 scale-110'
                                            : 'bg-transparent border-gray-600'
                                        }`}
                                />
                            ))}
                        </div>

                        {(localError || error) && (
                            <p className="text-red-400 text-xs text-center font-semibold mb-3">{localError || error}</p>
                        )}

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-2">
                            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        if (d === '⌫') handleBackspace();
                                        else if (d !== '') handleDigit(String(d));
                                    }}
                                    disabled={d === '' || loading}
                                    className={`h-13 py-3 rounded-xl text-lg font-bold transition-all active:scale-95
                                        ${d === '' ? 'invisible' : ''}
                                        ${d === '⌫'
                                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'
                                            : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white border border-gray-700/60'
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={pin.length < 4 || loading}
                            className="mt-3 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600
                                text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                    Sign In
                                  </>
                            }
                        </button>
                    </div>
                )}

                {/* Forgot PIN link */}
                <div className="text-center mt-4">
                    <button
                        onClick={() => setShowForgot(true)}
                        className="text-gray-600 hover:text-gray-400 text-[11px] transition-colors"
                    >
                        Admin forgot PIN?
                    </button>
                </div>

                {/* DreamLabs footer */}
                <div className="flex items-center justify-center gap-2 mt-4 opacity-40">
                    <img src={dreamLabsLogo} alt="DreamLabs" className="w-4 h-4 rounded-full object-cover" />
                    <span className="text-gray-500 text-xs">DreamLabs IT Solutions</span>
                </div>
            </div>

            {/* PIN Recovery modal */}
            {showForgot && (
                <ForgotPinModal
                    onClose={() => setShowForgot(false)}
                    onRecovered={() => {
                        setShowForgot(false);
                        setSelected(null);
                        setPin('');
                        // Reload staff list to reflect reset
                        window.electron.database({ action: 'getStaff' }).then(res => {
                            if (res.success) setStaffList(res.data?.filter(s => s.is_active) || []);
                        });
                    }}
                />
            )}

            <style>{`
                @keyframes shake {
                    0%,100% { transform: translateX(0); }
                    20%     { transform: translateX(-8px); }
                    40%     { transform: translateX(8px); }
                    60%     { transform: translateX(-6px); }
                    80%     { transform: translateX(6px); }
                }
            `}</style>
        </div>
    );
}
