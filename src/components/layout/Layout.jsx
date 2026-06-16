import React, { useState, useRef, useCallback } from 'react';
import dreamLabsLogo from '../../assets/DreamLabsLogoNew.png';
import { canViewPage } from '../../utils/permissions';
import ChangePinModal from '../Auth/ChangePinModal';

const NAV_ITEMS = [
    {
        id: 'pos',
        label: 'POS',
        desc: 'Point of Sale',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
                <path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01"/>
            </svg>
        ),
    },
    {
        id: 'orders',
        label: 'Orders',
        desc: 'Order history',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
            </svg>
        ),
    },
    {
        id: 'kitchen',
        label: 'Kitchen',
        desc: 'Active KOTs',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                <line x1="6" y1="17" x2="18" y2="17"/>
            </svg>
        ),
    },
    {
        id: 'reports',
        label: 'Reports',
        desc: 'Analytics',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path d="M3 3v18h18"/>
                <path d="M18 9l-5 5-3-3-4 4"/>
            </svg>
        ),
    },
    {
        id: 'eod',
        label: 'EOD',
        desc: 'End-of-Day Report',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
            </svg>
        ),
    },
    {
        id: 'reservations',
        label: 'Bookings',
        desc: 'Reservations',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h2M14 14h2M8 18h2M14 18h2"/>
            </svg>
        ),
    },
    {
        id: 'menu',
        label: 'Menu',
        desc: 'Food & drinks',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
            </svg>
        ),
    },
    {
        id: 'tables',
        label: 'Tables',
        desc: 'Table management',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <rect x="3" y="7" width="18" height="3" rx="1"/>
                <path d="M5 10v7M19 10v7M8 10v7M16 10v7"/>
                <path d="M5 17h4M15 17h4"/>
            </svg>
        ),
    },
    {
        id: 'shift',
        label: 'Shift',
        desc: 'Cash management',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <circle cx="12" cy="14" r="2"/>
            </svg>
        ),
    },
    {
        id: 'staff',
        label: 'Staff',
        desc: 'Staff management',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
        ),
    },
    {
        id: 'settings',
        label: 'Settings',
        desc: 'Configuration',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
        ),
    },
];

const WinControls = () => (
    <div className="flex items-center shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Minimize */}
        <button
            onClick={() => window.electron?.minimizeApp?.()}
            title="Minimize"
            className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
            <svg viewBox="0 0 10 1" width="10" height="1" fill="currentColor">
                <rect width="10" height="1"/>
            </svg>
        </button>
        {/* Maximize */}
        <button
            onClick={() => window.electron?.maximizeApp?.()}
            title="Maximize"
            className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="0.5" y="0.5" width="9" height="9"/>
            </svg>
        </button>
        {/* Close */}
        <button
            onClick={() => window.electron?.closeApp?.()}
            title="Close"
            className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
        >
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="1" y1="1" x2="9" y2="9"/>
                <line x1="9" y1="1" x2="1" y2="9"/>
            </svg>
        </button>
    </div>
);

const ROLE_LABELS = { admin: 'Admin', cashier: 'Cashier', waiter: 'Waiter' };
const ROLE_COLORS = { admin: 'text-red-400', cashier: 'text-blue-400', waiter: 'text-green-400' };

const Layout = ({ children, currentView, onViewChange, hotelName = 'Hotel POS', kotCount = 0, hasOpenShift = false, currentUser = null, onLogout, userRole }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [brandPopup, setBrandPopup] = useState(false);
    const [showChangePin, setShowChangePin] = useState(false);
    const closeTimer = useRef(null);

    const openWhatsApp = () => {
        window.electron.openExternal('https://wa.me/94706151051');
    };

    const openPopup  = useCallback(() => {
        clearTimeout(closeTimer.current);
        setBrandPopup(true);
    }, []);

    const closePopup = useCallback(() => {
        closeTimer.current = setTimeout(() => setBrandPopup(false), 3000);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">

            {/* ── Windows-style title bar ── */}
            <div
                className="flex items-center justify-between h-8 shrink-0 bg-gray-950 border-b border-gray-800/60 z-50"
                style={{ WebkitAppRegion: 'drag' }}
            >
                <div className="flex items-center gap-2 px-3" style={{ WebkitAppRegion: 'no-drag' }}>
                    <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-2.5 h-2.5">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        </svg>
                    </div>
                    <span className="text-gray-400 text-[11px] font-medium select-none">Hotel POS System</span>
                </div>
                <WinControls />
            </div>

            {/* ── Body (sidebar + content) ── */}
            <div className="flex flex-1 overflow-hidden">

            {/* ── Sidebar ── */}
            <aside
                className={`relative flex flex-col shrink-0 transition-all duration-300 ease-in-out
                    ${collapsed ? 'w-[64px]' : 'w-[220px]'}`}
                style={{ background: 'linear-gradient(180deg, #0f1117 0%, #131620 100%)' }}
            >
                {/* Subtle right border */}
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gray-700/40 to-transparent" />

                {/* ── Brand / logo ── */}
                <div className={`flex items-center border-b border-gray-800/60 ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'}`}
                    style={{ minHeight: 56 }}>
                    {!collapsed ? (
                        <>
                            <div className="min-w-0 flex-1">
                                <p className="text-white font-bold text-sm truncate leading-tight">{hotelName}</p>
                                <p className="text-gray-500 text-[11px] tracking-wide">POS System</p>
                            </div>
                            <button
                                onClick={() => setCollapsed(c => !c)}
                                title="Collapse sidebar"
                                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-all duration-150"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <path d="M15 18l-6-6 6-6"/>
                                </svg>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            title="Expand sidebar"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-150"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 rotate-180">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                    )}
                </div>

                {/* ── Nav items ── */}
                <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
                    {!collapsed && (
                        <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest px-3 pb-2 pt-1">
                            Navigation
                        </p>
                    )}
                    {NAV_ITEMS.filter(item => !userRole || canViewPage(userRole, item.id)).map(item => {
                        const active = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id)}
                                title={collapsed ? item.label : undefined}
                                className={`relative w-full flex items-center rounded-xl text-sm font-medium
                                    transition-all duration-150 group
                                    ${collapsed ? 'justify-center px-0 py-3' : 'justify-start gap-2 px-3 py-2.5'}
                                    ${active
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {/* Active indicator bar */}
                                {active && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-300 rounded-r-full" />
                                )}

                                {/* Icon */}
                                <span className={`shrink-0 transition-colors
                                    ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                    {item.icon}
                                </span>

                                {/* Label + badges */}
                                {!collapsed && (
                                    <>
                                        <span className="truncate">{item.label}</span>
                                        {item.id === 'kitchen' && kotCount > 0 && (
                                            <span className={`ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                                                ${active ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>
                                                {kotCount > 99 ? '99+' : kotCount}
                                            </span>
                                        )}
                                        {item.id === 'shift' && (
                                            <span className={`ml-auto shrink-0 w-2 h-2 rounded-full
                                                ${hasOpenShift ? 'bg-green-400' : 'bg-red-500'}`} title={hasOpenShift ? 'Shift open' : 'No shift'} />
                                        )}
                                    </>
                                )}

                                {/* Tooltip when collapsed */}
                                {collapsed && (
                                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 border border-gray-700 text-white text-xs rounded-lg
                                        opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                                        {item.label}{item.id === 'kitchen' && kotCount > 0 ? ` (${kotCount})` : ''}
                                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* ── Bottom section ── */}
                <div className="px-2 py-3 border-t border-gray-800/60 space-y-0.5">
                    {/* Logged-in user + logout */}
                    {currentUser && (
                        <div className={`mb-2 ${collapsed ? 'flex justify-center' : 'mx-1 px-3 py-2 rounded-xl bg-gray-800/40 border border-gray-700/30'}`}>
                            {!collapsed ? (
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[currentUser.role] || 'text-gray-400'}`}>
                                            {ROLE_LABELS[currentUser.role] || currentUser.role}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => setShowChangePin(true)} title="Change PIN"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-900/30 transition-colors">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                                <rect x="3" y="11" width="18" height="11" rx="2"/>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                        </button>
                                        <button onClick={onLogout} title="Log out"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                                <polyline points="16 17 21 12 16 7"/>
                                                <line x1="21" y1="12" x2="9" y2="12"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={onLogout} title={`Log out (${currentUser.name})`}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                        <polyline points="16 17 21 12 16 7"/>
                                        <line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                    {/* DreamLabs branding */}
                    {!collapsed ? (
                        <div className="mx-1 mt-2 relative" onMouseEnter={openPopup} onMouseLeave={closePopup} style={{paddingBottom: brandPopup ? '8px' : '0'}}>
                            <div className="px-3 py-3 rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/40 cursor-default">
                                <div className="flex items-center gap-3">
                                    <img src={dreamLabsLogo} alt="DreamLabs" className="w-9 h-9 rounded-full shrink-0 object-cover ring-1 ring-gray-600" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-200 leading-tight">DreamLabs POS</p>
                                        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Powered by</p>
                                        <p className="text-[11px] text-gray-400 font-medium leading-tight">DreamLabs IT Solutions</p>
                                    </div>
                                </div>
                            </div>

                            {/* Hover contact popup */}
                            <div
                                onMouseEnter={() => setBrandPopup(true)}
                                onMouseLeave={() => setBrandPopup(false)}
                                className={`absolute bottom-full left-0 mb-2 w-60 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out z-50 ${brandPopup ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                                {/* Header */}
                                <div className="bg-gradient-to-r from-gray-800 to-gray-850 px-4 py-3 border-b border-gray-700/60 flex items-center gap-3">
                                    <img src={dreamLabsLogo} alt="DreamLabs" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-600" />
                                    <div>
                                        <p className="text-xs font-semibold text-white leading-tight">DreamLabs IT Solutions</p>
                                        <p className="text-[10px] text-gray-400 leading-tight">Contact for Inquiries</p>
                                    </div>
                                </div>
                                {/* Contact rows */}
                                <div className="px-3 py-2.5 space-y-1">
                                    {/* WhatsApp */}
                                    <button
                                        onClick={openWhatsApp}
                                        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-800/60 transition-colors text-left"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                                            <svg viewBox="0 0 24 24" fill="#4ade80" className="w-3.5 h-3.5">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.562 4.14 1.541 5.878L.057 23.428a.5.5 0 0 0 .606.61l5.703-1.49A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.13-1.424l-.36-.214-3.733.976.998-3.645-.235-.375A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-gray-500 uppercase tracking-wider leading-tight">Call / WhatsApp</p>
                                            <p className="text-xs text-green-400 font-semibold leading-tight">070 615 1051</p>
                                        </div>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-600 ml-auto shrink-0">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                        </svg>
                                    </button>
                                    {/* Facebook */}
                                    <button
                                        onClick={() => window.electron.openExternal('https://web.facebook.com/profile.php?id=61586957551290')}
                                        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-800/60 transition-colors text-left"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                            <svg viewBox="0 0 24 24" fill="#60a5fa" className="w-3.5 h-3.5">
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-gray-500 uppercase tracking-wider leading-tight">Facebook</p>
                                            <p className="text-xs text-blue-400 font-semibold leading-tight">DreamLabs IT Solutions</p>
                                        </div>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-600 ml-auto shrink-0">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                        </svg>
                                    </button>
                                </div>
                                {/* Arrow */}
                                <div className="absolute bottom-[-6px] left-5 w-3 h-3 bg-gray-900 border-r border-b border-gray-700 rotate-45" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center mt-1 relative" onMouseEnter={openPopup} onMouseLeave={closePopup}>
                            <div className="w-6 h-6 rounded-full overflow-hidden cursor-default ring-1 ring-gray-600">
                                <img src={dreamLabsLogo} alt="DreamLabs" className="w-full h-full object-cover" />
                            </div>
                            {/* Collapsed tooltip */}
                            <div
                                onMouseEnter={() => setBrandPopup(true)}
                                onMouseLeave={() => setBrandPopup(false)}
                                className={`absolute bottom-full left-full ml-3 mb-[-8px] w-60 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out z-50 ${brandPopup ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                                <div className="bg-gradient-to-r from-gray-800 to-gray-850 px-4 py-3 border-b border-gray-700/60 flex items-center gap-3">
                                    <img src={dreamLabsLogo} alt="DreamLabs" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-600" />
                                    <div>
                                        <p className="text-xs font-semibold text-white leading-tight">DreamLabs IT Solutions</p>
                                        <p className="text-[10px] text-gray-400 leading-tight">Contact for Inquiries</p>
                                    </div>
                                </div>
                                <div className="px-3 py-2.5 space-y-1">
                                    <button
                                        onClick={openWhatsApp}
                                        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-800/60 transition-colors text-left"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                                            <svg viewBox="0 0 24 24" fill="#4ade80" className="w-3.5 h-3.5">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.562 4.14 1.541 5.878L.057 23.428a.5.5 0 0 0 .606.61l5.703-1.49A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.13-1.424l-.36-.214-3.733.976.998-3.645-.235-.375A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-gray-500 uppercase tracking-wider leading-tight">Call / WhatsApp</p>
                                            <p className="text-xs text-green-400 font-semibold leading-tight">070 615 1051</p>
                                        </div>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-600 ml-auto shrink-0">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => window.electron.openExternal('https://web.facebook.com/profile.php?id=61586957551290')}
                                        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-800/60 transition-colors text-left"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                            <svg viewBox="0 0 24 24" fill="#60a5fa" className="w-3.5 h-3.5">
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-gray-500 uppercase tracking-wider leading-tight">Facebook</p>
                                            <p className="text-xs text-blue-400 font-semibold leading-tight">DreamLabs IT Solutions</p>
                                        </div>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-600 ml-auto shrink-0">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Main content ── */}
            <main className="flex-1 overflow-hidden bg-gray-900">
                {children}
            </main>

            </div>{/* end body */}

            {/* Change PIN modal */}
            {showChangePin && currentUser && (
                <ChangePinModal user={currentUser} onClose={() => setShowChangePin(false)} />
            )}
        </div>
    );
};

export default Layout;
