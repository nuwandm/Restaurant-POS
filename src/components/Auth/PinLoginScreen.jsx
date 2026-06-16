import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithPin, clearAuthError } from '../../store/slices/authSlice';
import dreamLabsLogo from '../../assets/DreamLabsLogoNew.png';
import ForgotPinModal from './ForgotPinModal';

/* ── Typewriter hook ── */
const PHRASES = [
    'Select your profile and enter your PIN.',
    'Fast, secure staff authentication.',
    'Role-based access for your team.',
    'Your shift starts here.',
];
function useTypewriter(phrases, typingSpeed = 60, deletingSpeed = 35, pauseMs = 1800) {
    const [display, setDisplay] = useState('');
    const [phraseIdx, setPhraseIdx] = useState(0);
    const [charIdx,   setCharIdx]   = useState(0);
    const [deleting,  setDeleting]  = useState(false);
    useEffect(() => {
        const full = phrases[phraseIdx];
        let delay;
        if (!deleting && charIdx < full.length) {
            delay = typingSpeed + Math.random() * 30;
            const t = setTimeout(() => { setDisplay(full.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, delay);
            return () => clearTimeout(t);
        } else if (!deleting && charIdx === full.length) {
            const t = setTimeout(() => setDeleting(true), pauseMs);
            return () => clearTimeout(t);
        } else if (deleting && charIdx > 0) {
            const t = setTimeout(() => { setDisplay(full.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }, deletingSpeed);
            return () => clearTimeout(t);
        } else if (deleting && charIdx === 0) {
            setDeleting(false);
            setPhraseIdx(p => (p + 1) % phrases.length);
        }
    }, [charIdx, deleting, phraseIdx]);
    return display;
}

const ROLE_COLORS = {
    admin:   { bg: 'bg-red-500',    pill: 'bg-red-500/20 text-red-300 border-red-500/30' },
    cashier: { bg: 'bg-blue-500',   pill: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    waiter:  { bg: 'bg-emerald-500',pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
};

const AVATAR_BG = [
    '#3b82f6','#8b5cf6','#10b981','#f59e0b',
    '#ec4899','#14b8a6','#6366f1','#ef4444',
];

export default function PinLoginScreen() {
    const dispatch = useDispatch();
    const { loading, error } = useSelector(s => s.auth);
    const [pin, setPin]             = useState('');
    const [shake, setShake]         = useState(false);
    const [localError, setLocalError] = useState('');
    const [staffList, setStaffList] = useState([]);
    const [selected, setSelected]   = useState(null);
    const [showForgot, setShowForgot] = useState(false);
    const containerRef = useRef(null);

    const hotelSettings = (() => {
        try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}'); }
        catch { return {}; }
    })();
    const hotelName = hotelSettings.hotelName || 'Hotel POS';
    const tagline   = hotelSettings.tagline   || 'Staff Login';
    const typewriterText = useTypewriter(PHRASES);

    useEffect(() => {
        window.electron.database({ action: 'getStaff' }).then(res => {
            if (res.success) setStaffList(res.data?.filter(s => s.is_active) || []);
        }).catch(() => {});
    }, []);

    useEffect(() => { containerRef.current?.focus(); }, []);

    useEffect(() => {
        if (error) {
            setShake(true); setPin('');
            const t = setTimeout(() => { setShake(false); dispatch(clearAuthError()); }, 700);
            return () => clearTimeout(t);
        }
    }, [error, dispatch]);

    const pinLength       = selected?.pin?.length || 4;
    const handleDigit     = (d) => { if (pin.length < pinLength) { setLocalError(''); setPin(p => p + d); } };
    const handleBackspace = ()  => { setLocalError(''); setPin(p => p.slice(0, -1)); };

    const triggerShake = (msg) => {
        setLocalError(msg); setShake(true); setPin('');
        setTimeout(() => setShake(false), 700);
    };

    const handleSubmit = () => {
        if (pin.length < pinLength) return;
        if (!selected) { triggerShake('Please select your name first'); return; }
        if (pin !== selected.pin) { triggerShake('Incorrect PIN'); return; }
        dispatch(loginWithPin({ pin, id: selected.id }));
    };

    const handleSelect = (staff) => {
        setSelected(staff); setPin(''); setLocalError('');
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
    const avatarBg = (idx)  => AVATAR_BG[idx % AVATAR_BG.length];

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            ref={containerRef}
        >
            {/* ── Title bar with window controls ── */}
            <div
                className="flex items-center justify-end h-8 shrink-0 select-none"
                style={{ WebkitAppRegion: 'drag', background: 'rgba(5,8,20,0.95)' }}
            >
                <div
                    className="flex items-center gap-1 pr-2"
                    style={{ WebkitAppRegion: 'no-drag' }}
                >
                    <button
                        onClick={() => window.electron.minimizeApp()}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="Minimize"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                            <path d="M5 12h14"/>
                        </svg>
                    </button>
                    <button
                        onClick={() => window.electron.maximizeApp()}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="Maximize"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                        </svg>
                    </button>
                    <button
                        onClick={() => window.electron.closeApp()}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-600 transition-colors"
                        title="Close"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Main content ── */}
            <div className="flex flex-1 min-h-0">

            {/* ── Left branding panel ── */}
            <div className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #0a0f1e 0%, #0d1535 50%, #0a1628 100%)' }}>

                {/* Geometric accent */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
                    <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                    {/* Diagonal accent line */}
                    <div className="absolute top-0 right-0 w-px h-full opacity-10"
                        style={{ background: 'linear-gradient(to bottom, transparent, #3b82f6, transparent)' }} />
                </div>

                {/* Top — Hotel brand */}
                <div className="relative z-10 p-10 pt-12 flex flex-col items-start">

                    {/* Hotel name chip */}
                    <div className="flex items-center gap-2.5 mb-10">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">{hotelName}</p>
                            <p className="text-blue-400/60 text-[10px]">POS System</p>
                        </div>
                    </div>

                    {/* Large centred logo */}
                    <div className="w-full flex justify-center mb-10">
                        <img src={dreamLabsLogo} alt="Logo"
                            className="w-32 h-32 object-contain drop-shadow-[0_0_32px_rgba(255,255,255,0.15)]" />
                    </div>

                    <h2 className="text-white text-4xl font-extrabold leading-tight tracking-tight mb-4">
                        Welcome<br/>Back
                    </h2>

                    {/* Typewriter subtitle */}
                    <p className="text-gray-400 text-sm leading-relaxed h-5 flex items-center gap-0.5">
                        {typewriterText}
                        <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-[blink_1s_step-end_infinite] rounded-full" />
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-col gap-3 mt-10">
                        {[
                            { icon: '⚡', label: 'Fast order processing' },
                            { icon: '🔒', label: 'Secure role-based access' },
                            { icon: '📊', label: 'Real-time reporting' },
                        ].map(f => (
                            <div key={f.label} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-xs shrink-0">
                                    {f.icon}
                                </div>
                                <span className="text-gray-500 text-xs">{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom — DreamLabs branding */}
                <div className="relative z-10 p-10 pb-10">
                    <div className="border-t border-white/5 pt-8">
                        <div className="flex items-center gap-3 mb-2">
                            <img src={dreamLabsLogo} alt="DreamLabs"
                                className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10" />
                            <div>
                                <p className="text-white text-xs font-bold leading-tight">DreamLabs POS</p>
                                <p className="text-gray-500 text-[10px] leading-tight">Powered by DreamLabs IT Solutions</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                            <span className="text-green-400 text-[11px] font-medium">📱 070 615 1051</span>
                            <span className="text-gray-700">·</span>
                            <button onClick={() => window.electron.openExternal('https://web.facebook.com/profile.php?id=61586957551290')}
                                className="text-blue-400/70 text-[11px] hover:text-blue-400 transition-colors">
                                Facebook
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right login panel ── */}
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-y-auto"
                style={{ background: 'linear-gradient(160deg, #0f1117 0%, #131620 100%)' }}>

                {/* Subtle grid */}
                <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="relative z-10 w-full max-w-[360px] px-6 py-10">

                    {/* Mobile-only hotel name */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </div>
                        <h1 className="text-white font-bold text-xl">{hotelName}</h1>
                    </div>

                    {/* ── Staff selector ── */}
                    {!selected && (
                        <>
                            <div className="mb-6">
                                <h3 className="text-white font-bold text-lg mb-1">Who are you?</h3>
                                <p className="text-gray-500 text-sm">Select your profile to continue</p>
                            </div>

                            {staffList.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" className="w-6 h-6">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                            <circle cx="9" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <p className="text-gray-600 text-sm">No staff accounts found</p>
                                </div>
                            ) : (
                                <div className={`grid gap-3 ${staffList.length <= 2 ? 'grid-cols-2' : staffList.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                    {staffList.map((s, i) => {
                                        const rc = ROLE_COLORS[s.role] || { bg: 'bg-gray-500', pill: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => handleSelect(s)}
                                                className="group relative flex flex-col items-center gap-2.5 py-4 px-3
                                                    rounded-2xl border transition-all duration-200 active:scale-95
                                                    bg-gray-800/50 border-gray-700/50
                                                    hover:bg-gray-750 hover:border-gray-500/80
                                                    hover:shadow-lg"
                                                style={{ '--hover-shadow': avatarBg(i) + '22' }}
                                            >
                                                {/* Avatar */}
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold shadow-lg"
                                                        style={{ background: `linear-gradient(135deg, ${avatarBg(i)}, ${avatarBg(i)}cc)` }}>
                                                        {initials(s.name)}
                                                    </div>
                                                    {/* Online dot */}
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${rc.bg}`} />
                                                </div>

                                                <div className="text-center w-full">
                                                    <p className="text-white text-xs font-semibold leading-tight truncate">{s.name}</p>
                                                    <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${rc.pill}`}>
                                                        {s.role}
                                                    </span>
                                                </div>

                                                {/* Hover arrow */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" className="w-3 h-3">
                                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                                    </svg>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── PIN entry ── */}
                    {selected && (
                        <div>
                            {/* User identity card */}
                            <div className="flex items-center gap-3 mb-7">
                                <button
                                    onClick={() => { setSelected(null); setPin(''); setLocalError(''); dispatch(clearAuthError()); }}
                                    className="w-8 h-8 rounded-xl bg-gray-800/80 hover:bg-gray-700 border border-gray-700/60 flex items-center justify-center transition-all shrink-0 hover:border-gray-500"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-gray-400">
                                        <path d="M19 12H5M12 5l-7 7 7 7"/>
                                    </svg>
                                </button>

                                {/* Avatar + name card */}
                                <div className="flex items-center gap-3 flex-1 bg-gray-800/50 border border-gray-700/40 rounded-2xl px-3 py-2.5">
                                    {/* Avatar with glow */}
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 rounded-xl blur-md opacity-40"
                                            style={{ background: avatarBg(staffList.findIndex(s => s.id === selected.id)) }} />
                                        <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg"
                                            style={{ background: `linear-gradient(135deg, ${avatarBg(staffList.findIndex(s => s.id === selected.id))}, ${avatarBg(staffList.findIndex(s => s.id === selected.id))}aa)` }}>
                                            {initials(selected.name)}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white text-sm font-bold leading-tight truncate">{selected.name}</p>
                                        <span className={`text-[10px] font-bold uppercase tracking-wide ${ROLE_COLORS[selected.role]?.pill?.split(' ')[1] || 'text-gray-400'}`}>
                                            {selected.role}
                                        </span>
                                    </div>
                                    {/* Verified tick */}
                                    <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3" className="w-2.5 h-2.5">
                                            <path d="M20 6L9 17l-5-5"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="mb-5">
                                <h3 className="text-white font-bold text-xl mb-1">Enter your PIN</h3>
                                <p className="text-gray-500 text-sm">{selected.pin?.length || 4}-digit security code</p>
                            </div>

                            {/* PIN dots */}
                            <div className={`flex justify-center gap-4 mb-5 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
                                {Array.from({ length: selected.pin?.length || 4 }).map((_, i) => (
                                    <div key={i} className="relative flex items-center justify-center">
                                        <div className={`rounded-full transition-all duration-200
                                            ${i < pin.length
                                                ? 'w-4 h-4 shadow-lg shadow-blue-500/40'
                                                : 'w-3 h-3 border-2 border-gray-600/80 bg-transparent'
                                            }`}
                                            style={i < pin.length ? {
                                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                boxShadow: '0 0 12px rgba(59,130,246,0.5)',
                                            } : {}}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Error */}
                            {(localError || error) && (
                                <div className="flex items-center gap-2.5 bg-red-950/50 border border-red-800/50 rounded-xl px-3.5 py-2.5 mb-4">
                                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" className="w-3 h-3">
                                            <path d="M18 6L6 18M6 6l12 12"/>
                                        </svg>
                                    </div>
                                    <p className="text-red-400 text-xs font-semibold">{localError || error}</p>
                                </div>
                            )}

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            if (d === '⌫') handleBackspace();
                                            else if (d !== '') handleDigit(String(d));
                                        }}
                                        disabled={d === '' || loading}
                                        className={`relative h-[52px] rounded-2xl font-bold transition-all duration-100 active:scale-[0.93] select-none
                                            ${d === '' ? 'invisible pointer-events-none' : ''}
                                            ${d === '⌫'
                                                ? 'bg-gray-800/60 hover:bg-gray-700/80 text-gray-400 border border-gray-700/40 hover:border-gray-600/60'
                                                : 'bg-gray-800/70 hover:bg-gray-700/90 text-white border border-gray-700/40 hover:border-gray-500/60'
                                            }`}
                                        style={d !== '' && d !== '⌫' ? {
                                            boxShadow: '0 2px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
                                        } : {}}
                                    >
                                        {d === '⌫' ? (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 mx-auto">
                                                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                                                <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                                            </svg>
                                        ) : (
                                            <span className="text-lg">{d}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Sign In button */}
                            <button
                                onClick={handleSubmit}
                                disabled={pin.length < pinLength || loading}
                                className="relative w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200
                                    text-white flex items-center justify-center gap-2 overflow-hidden"
                                style={pin.length >= pinLength && !loading ? {
                                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                    boxShadow: '0 4px 24px rgba(37,99,235,0.45), 0 1px 0 rgba(255,255,255,0.1) inset',
                                } : {
                                    background: 'rgba(31,41,55,0.8)',
                                    border: '1px solid rgba(55,65,81,0.6)',
                                    color: '#4b5563',
                                }}
                            >
                                {/* Shimmer when active */}
                                {pin.length >= pinLength && !loading && (
                                    <div className="absolute inset-0 opacity-20"
                                        style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)', backgroundSize: '200% 100%', animation: 'shimmer 2.5s infinite' }} />
                                )}
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                        Sign In
                                        {pin.length >= pinLength && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 ml-1">
                                                <path d="M5 12h14M12 5l7 7-7 7"/>
                                            </svg>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-800/60 flex items-center justify-between">
                        <button
                            onClick={() => setShowForgot(true)}
                            className="text-gray-600 hover:text-gray-400 text-[11px] transition-colors"
                        >
                            Admin forgot PIN?
                        </button>
                        <div className="flex items-center gap-1.5 opacity-50">
                            <img src={dreamLabsLogo} alt="DreamLabs" className="w-4 h-4 rounded object-cover" />
                            <span className="text-gray-500 text-[10px] font-medium">DreamLabs</span>
                        </div>
                    </div>
                </div>
            </div>

            </div>{/* end main content */}

            {/* PIN Recovery modal */}
            {showForgot && (
                <ForgotPinModal
                    onClose={() => setShowForgot(false)}
                    onRecovered={() => {
                        setShowForgot(false);
                        setSelected(null);
                        setPin('');
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
                @keyframes blink {
                    0%,100% { opacity: 1; }
                    50%     { opacity: 0; }
                }
                @keyframes shimmer {
                    0%   { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }
            `}</style>
        </div>
    );
}
