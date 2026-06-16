import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    loadItemShortcuts, saveItemShortcuts,
    loadAppShortcuts, saveAppShortcuts,
    APP_ACTION_LABELS, APP_ACTION_GROUPS, APP_ACTION_DEFAULTS,
    comboFromEvent,
} from '../utils/itemShortcuts';

const DEFAULTS = {
    hotelName: 'My Hotel',
    tagline: '',
    address: '',
    phone: '',
    taxRate: 10,
    serviceCharge: 0,
    receiptFooter: 'Thank you for dining with us!',
    currency: 'LKR',
    timezone: 'Asia/Colombo',
    tableCount: 8,
    printKitchenTicket: true,
    autoCompleteOnPayment: true,
    orderPrefix: 'ORD',
    tablePreparationTime: 30,   // minutes before reservation time to block the table
    // KOT
    kotEnabled: true,
    kitchenPrinterSeparate: false,  // false = print KOT on same cashier printer
    kitchenPrinterName: '',         // OS printer name for dedicated kitchen printer
    // Receipt appearance
    receiptBlackBands: true,        // black background on header + brand footer
};

const Field = ({ label, children, hint }) => (
    <div>
        <label className="block text-xs text-gray-400 mb-1 font-medium">{label}</label>
        {children}
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
);

const Input = ({ value, onChange, type = 'text', placeholder, min, max }) => (
    <input
        type={type}
        value={value}
        onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full bg-gray-700/60 border border-gray-600/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
    />
);

const Toggle = ({ value, onChange, label, hint }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-700/50 last:border-0">
        <div>
            <p className="text-sm text-gray-200 font-medium">{label}</p>
            {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
        </div>
        <div
            onClick={() => onChange(!value)}
            className={`relative shrink-0 w-11 h-6 rounded-full cursor-pointer transition-colors ${value ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
        </div>
    </div>
);

const TABS = [
    {
        id: 'hotel',
        label: 'Hotel Info',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
        ),
    },
    {
        id: 'pricing',
        label: 'Pricing & Tax',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
        ),
    },
    {
        id: 'pos',
        label: 'POS',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
            </svg>
        ),
    },
    {
        id: 'backup',
        label: 'Backup',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <polyline points="21 15 21 21 3 21 3 15"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
        ),
    },
    {
        id: 'receipt',
        label: 'Bill Printing',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
            </svg>
        ),
    },
    {
        id: 'shortcuts',
        label: 'Shortcuts',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
            </svg>
        ),
    },
    {
        id: 'danger',
        label: 'Danger Zone',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
        ),
    },
];

/* ── Discount Rules Panel ── */
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function DiscountRulesPanel() {
    const [rules, setRules] = useState(() => {
        try { return JSON.parse(localStorage.getItem('discountRules') || '[]'); } catch { return []; }
    });
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState({ name:'', pct:'', fromH:'00', fromM:'00', toH:'23', toM:'59', days:[0,1,2,3,4,5,6] });

    const save = (updated) => {
        setRules(updated);
        localStorage.setItem('discountRules', JSON.stringify(updated));
    };

    const addRule = () => {
        const pct = parseFloat(form.pct);
        if (!form.name.trim() || isNaN(pct) || pct <= 0 || pct > 100) return;
        save([...rules, { id: Date.now(), name: form.name.trim(), pct, fromH: parseInt(form.fromH), fromM: parseInt(form.fromM), toH: parseInt(form.toH), toM: parseInt(form.toM), days: form.days, active: true }]);
        setAdding(false);
        setForm({ name:'', pct:'', fromH:'00', fromM:'00', toH:'23', toM:'59', days:[0,1,2,3,4,5,6] });
    };

    const toggleDay = (d) => setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x=>x!==d) : [...f.days, d] }));
    const toggleRule = (id) => save(rules.map(r => r.id===id ? {...r, active:!r.active} : r));
    const deleteRule = (id) => save(rules.filter(r => r.id!==id));

    const pad = (n) => String(n).padStart(2,'0');
    const timeLabel = (r) => `${pad(r.fromH)}:${pad(r.fromM)} – ${pad(r.toH)}:${pad(r.toM)}`;
    const daysLabel = (r) => r.days.length===7 ? 'Every day' : r.days.map(d=>DAYS_SHORT[d]).join(', ');

    return (
        <div className="bg-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" />
                    Quick Discount Rules
                </h3>
                <button onClick={() => setAdding(a=>!a)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 text-yellow-400 text-xs font-bold rounded-lg transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add Rule
                </button>
            </div>

            <p className="text-gray-500 text-xs">Auto-apply discounts at checkout during specific hours. Staff can still remove them manually.</p>

            {/* Rule list */}
            {rules.length === 0 && !adding && (
                <p className="text-gray-600 text-xs py-2 text-center border border-dashed border-gray-700 rounded-xl">No rules yet. Add a happy hour or time-based discount.</p>
            )}
            <div className="space-y-2">
                {rules.map(r => (
                    <div key={r.id} className={`flex items-center gap-3 rounded-xl px-3 py-3 border transition-all ${r.active ? 'bg-yellow-950/20 border-yellow-800/30' : 'bg-gray-800/40 border-gray-700/30 opacity-60'}`}>
                        <button onClick={() => toggleRule(r.id)}
                            className={`w-9 h-5 rounded-full transition-all shrink-0 relative ${r.active ? 'bg-yellow-500' : 'bg-gray-700'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${r.active ? 'right-0.5' : 'left-0.5'}`}/>
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-200 text-sm font-semibold">{r.name} <span className="text-yellow-400 font-black">{r.pct}%</span></p>
                            <p className="text-gray-500 text-[10px]">{timeLabel(r)} · {daysLabel(r)}</p>
                        </div>
                        <button onClick={() => deleteRule(r.id)} className="text-gray-700 hover:text-red-400 transition-colors shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Add form */}
            {adding && (
                <div className="bg-gray-900/60 rounded-xl p-4 space-y-3 border border-gray-700/50">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">New Discount Rule</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider block mb-1">Rule Name</label>
                            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Happy Hour"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"/>
                        </div>
                        <div>
                            <label className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider block mb-1">Discount %</label>
                            <input type="number" value={form.pct} onChange={e=>setForm(f=>({...f,pct:e.target.value}))} placeholder="10" min={1} max={100}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider block mb-1">From</label>
                            <div className="flex items-center gap-1">
                                <input type="number" value={form.fromH} onChange={e=>setForm(f=>({...f,fromH:e.target.value.padStart(2,'0')}))} min={0} max={23} placeholder="00"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-yellow-500"/>
                                <span className="text-gray-600 font-bold">:</span>
                                <input type="number" value={form.fromM} onChange={e=>setForm(f=>({...f,fromM:e.target.value.padStart(2,'0')}))} min={0} max={59} placeholder="00"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-yellow-500"/>
                            </div>
                        </div>
                        <div>
                            <label className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider block mb-1">To</label>
                            <div className="flex items-center gap-1">
                                <input type="number" value={form.toH} onChange={e=>setForm(f=>({...f,toH:e.target.value.padStart(2,'0')}))} min={0} max={23} placeholder="23"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-yellow-500"/>
                                <span className="text-gray-600 font-bold">:</span>
                                <input type="number" value={form.toM} onChange={e=>setForm(f=>({...f,toM:e.target.value.padStart(2,'0')}))} min={0} max={59} placeholder="59"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-yellow-500"/>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider block mb-1.5">Days</label>
                        <div className="flex gap-1.5">
                            {DAYS_SHORT.map((d,i) => (
                                <button key={i} onClick={() => toggleDay(i)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${form.days.includes(i) ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-500 hover:bg-gray-600'}`}>
                                    {d[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => setAdding(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg text-sm transition-colors">Cancel</button>
                        <button onClick={addRule} className="flex-[2] py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg text-sm transition-colors">Save Rule</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const SettingsView = ({ onHotelNameChange }) => {
    const [activeTab, setActiveTab] = useState('hotel');
    const [settings, setSettings] = useState(() => {
        try {
            return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('hotelSettings') || '{}') };
        } catch {
            return { ...DEFAULTS };
        }
    });
    const [saved, setSaved] = useState(false);
    const [backupStatus, setBackupStatus] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);
    const [confirmClearAll, setConfirmClearAll] = useState(false);
    const todayLocal = new Date().toLocaleDateString('en-CA');
    const [exportFrom, setExportFrom] = useState(todayLocal);
    const [exportTo, setExportTo]     = useState(todayLocal);
    const [exportingOrders, setExportingOrders] = useState(false);

    // Shortcuts tab state
    const [shortcutSubTab, setShortcutSubTab] = useState('app'); // 'app' | 'items'
    const [menuItems, setMenuItems] = useState([]);
    const [itemShortcuts, setItemShortcuts] = useState(() => loadItemShortcuts());
    const [appShortcuts, setAppShortcuts] = useState(() => loadAppShortcuts());
    // recording: { type: 'item', id: number } | { type: 'app', actionId: string } | null
    const [recording, setRecording] = useState(null);

    useEffect(() => {
        if (activeTab === 'shortcuts') {
            window.electron?.database({ action: 'getMenuItems', data: {} })
                .then(r => { if (r.success) setMenuItems(r.data || []); });
        }
    }, [activeTab]);

    const handleRecordKey = useCallback((e) => {
        if (!recording) return;
        e.preventDefault();
        e.stopPropagation();
        const combo = comboFromEvent(e);
        if (!combo) return;
        if (combo === 'Escape') { setRecording(null); return; }

        if (recording.type === 'app') {
            const { actionId } = recording;
            // Start from current map, remove any other action already using this combo
            const next = Object.fromEntries(
                Object.entries(appShortcuts).filter(([k, v]) => k === actionId || v !== combo)
            );
            // Assign the new combo to this action
            next[actionId] = combo;
            setAppShortcuts(next);
            saveAppShortcuts(next);
        } else {
            const { id: itemId } = recording;
            const next = Object.fromEntries(
                Object.entries(itemShortcuts).filter(([k, v]) => k !== combo && v !== itemId)
            );
            next[combo] = itemId;
            setItemShortcuts(next);
            saveItemShortcuts(next);
        }
        setRecording(null);
        toast.success(`Shortcut ${combo} assigned`);
    }, [recording, appShortcuts, itemShortcuts]);

    const removeAppShortcut = (actionId) => {
        const next = { ...appShortcuts };
        delete next[actionId];
        setAppShortcuts(next);
        saveAppShortcuts(next);
    };

    const resetAppShortcuts = () => {
        setAppShortcuts({ ...APP_ACTION_DEFAULTS });
        saveAppShortcuts({ ...APP_ACTION_DEFAULTS });
        toast.success('App shortcuts reset to defaults');
    };

    const removeItemShortcut = (itemId) => {
        const next = Object.fromEntries(
            Object.entries(itemShortcuts).filter(([, v]) => v !== itemId)
        );
        setItemShortcuts(next);
        saveItemShortcuts(next);
    };

    // Attach key listener while recording
    useEffect(() => {
        if (recording !== null) {
            window.addEventListener('keydown', handleRecordKey, true);
            return () => window.removeEventListener('keydown', handleRecordKey, true);
        }
    }, [recording, handleRecordKey]);

    useEffect(() => {
        onHotelNameChange?.(settings.hotelName);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (key) => (val) => {
        setSettings(s => ({ ...s, [key]: val }));
        if (key === 'hotelName') onHotelNameChange?.(val);
    };

    const saveSettings = async () => {
        localStorage.setItem('hotelSettings', JSON.stringify(settings));
        onHotelNameChange?.(settings.hotelName);
        await window.electron.database({ action: 'syncTableCount', data: { count: settings.tableCount } });
        setSaved(true);
        toast.success('Settings saved');
        setTimeout(() => setSaved(false), 2000);
    };

    const handleExportBackup = async () => {
        setBackupStatus('exporting');
        try {
            const res = await window.electron.database({ action: 'exportBackup', data: {} });
            if (res.success) {
                const fullBackup = {
                    ...res.data,
                    settings,
                    itemShortcuts:  loadItemShortcuts(),
                    appShortcuts:   loadAppShortcuts(),
                    posZones:       JSON.parse(localStorage.getItem('posZones')       || '[]'),
                    discountRules:  JSON.parse(localStorage.getItem('discountRules')  || '[]'),
                    backupVersion: '3.3',
                    exportedAt: new Date().toISOString(),
                    exportedBy: settings.hotelName || 'Hotel POS',
                };
                const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${(settings.hotelName || 'hotel-pos').replace(/\s+/g, '-').toLowerCase()}-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Backup downloaded');
            }
        } catch {
            toast.error('Backup failed');
        } finally {
            setBackupStatus('');
        }
    };

    const handleImportBackup = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setBackupStatus('importing');
            try {
                const text = await file.text();
                const backupData = JSON.parse(text);
                const res = await window.electron.database({ action: 'importBackup', data: backupData });
                if (res.success) {
                    if (backupData.settings) {
                        localStorage.setItem('hotelSettings', JSON.stringify(backupData.settings));
                        setSettings({ ...DEFAULTS, ...backupData.settings });
                    }
                    if (backupData.itemShortcuts) {
                        saveItemShortcuts(backupData.itemShortcuts);
                        setItemShortcuts(backupData.itemShortcuts);
                    }
                    if (backupData.appShortcuts) {
                        saveAppShortcuts(backupData.appShortcuts);
                        setAppShortcuts(backupData.appShortcuts);
                    }
                    if (backupData.posZones && Array.isArray(backupData.posZones)) {
                        localStorage.setItem('posZones', JSON.stringify(backupData.posZones));
                    }
                    if (backupData.discountRules && Array.isArray(backupData.discountRules)) {
                        localStorage.setItem('discountRules', JSON.stringify(backupData.discountRules));
                    }
                    toast.success('Backup imported — please refresh the page');
                } else {
                    toast.error('Import failed: ' + (res.error || 'Unknown error'));
                }
            } catch {
                toast.error('Import failed: invalid or corrupt file');
            } finally {
                setBackupStatus('');
            }
        };
        input.click();
    };

    const handleExportOrders = async () => {
        setExportingOrders(true);
        try {
            const res = await window.electron.database({ action: 'exportOrdersJson', data: { from: exportFrom, to: exportTo } });
            if (res.success) {
                const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `orders-${exportFrom}-to-${exportTo}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(`Exported ${res.data.orders?.length ?? 0} orders`);
            } else {
                toast.error('Export failed: ' + (res.error || 'Unknown error'));
            }
        } catch {
            toast.error('Export failed');
        } finally {
            setExportingOrders(false);
        }
    };

    const handleClearOrders = async () => {
        const res = await window.electron.database({ action: 'clearOrderHistory', data: {} });
        if (res.success) { toast.success('Order history cleared'); setConfirmClear(false); }
        else toast.error('Failed to clear history');
    };

    const handleClearAllOrders = async () => {
        const res = await window.electron.database({ action: 'clearAllOrders', data: {} });
        if (res.success) { toast.success('All orders cleared'); setConfirmClearAll(false); }
        else toast.error('Failed to clear all orders');
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">

            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-white font-bold text-lg">Settings</h2>
                    <p className="text-gray-400 text-xs mt-0.5">Configure your hotel POS system</p>
                </div>
                <button
                    onClick={saveSettings}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                        saved
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                >
                    {saved ? '✓ Saved' : 'Save Changes'}
                </button>
            </div>

            {/* Tab bar */}
            <div className="bg-gray-800/50 border-b border-gray-700 px-6 shrink-0">
                <div className="flex gap-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                                } ${tab.id === 'danger' ? (activeTab === tab.id ? 'text-red-400 border-red-500' : 'hover:text-red-400') : ''}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">

                    {/* ── Hotel Info ── */}
                    {activeTab === 'hotel' && (
                        <div className="space-y-6">
                            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                    <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
                                    Business Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Hotel / Restaurant Name">
                                        <Input value={settings.hotelName} onChange={set('hotelName')} placeholder="My Hotel" />
                                    </Field>
                                    <Field label="Tagline">
                                        <Input value={settings.tagline} onChange={set('tagline')} placeholder="Fine dining experience..." />
                                    </Field>
                                    <Field label="Address">
                                        <Input value={settings.address} onChange={set('address')} placeholder="123 Main St, Colombo" />
                                    </Field>
                                    <Field label="Phone Number">
                                        <Input value={settings.phone} onChange={set('phone')} placeholder="+94 11 000 0000" />
                                    </Field>
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                    <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
                                    Receipt
                                </h3>
                                <Field label="Receipt Footer Message" hint="Printed at the bottom of every receipt">
                                    <Input value={settings.receiptFooter} onChange={set('receiptFooter')} placeholder="Thank you for dining with us!" />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ── Pricing & Tax ── */}
                    {activeTab === 'pricing' && (
                        <div className="space-y-6">
                            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                    <span className="w-1 h-4 bg-green-500 rounded-full inline-block" />
                                    Tax & Charges
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <Field label="Tax Rate (%)" hint="Applied to all orders">
                                        <Input type="number" value={settings.taxRate} onChange={set('taxRate')} min={0} max={100} />
                                    </Field>
                                    <Field label="Service Charge (%)" hint="Optional service fee">
                                        <Input type="number" value={settings.serviceCharge} onChange={set('serviceCharge')} min={0} max={50} />
                                    </Field>
                                    <Field label="Currency Code" hint="Display only">
                                        <Input value={settings.currency} onChange={set('currency')} placeholder="LKR" />
                                    </Field>
                                </div>
                            </div>
                            <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4">
                                <p className="text-blue-300 text-xs font-medium mb-1">How tax works</p>
                                <p className="text-blue-400/70 text-xs">Tax is calculated on the subtotal of every order. Set to 0 to disable tax completely. Changes take effect after clicking Save Changes.</p>
                            </div>

                            {/* ── Quick Discount Rules ── */}
                            <DiscountRulesPanel />
                        </div>
                    )}

                    {/* ── POS Behaviour ── */}
                    {activeTab === 'pos' && (
                        <div className="space-y-6">
                            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                    <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                                    Order Settings
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Order Number Prefix" hint="e.g. ORD → ORD1234">
                                        <Input value={settings.orderPrefix} onChange={set('orderPrefix')} placeholder="ORD" />
                                    </Field>
                                    <Field label="Number of Tables" hint="Syncs tables on Save">
                                        <Input type="number" value={settings.tableCount} onChange={set('tableCount')} min={1} max={100} />
                                    </Field>
                                    <Field label="Table Preparation Time (minutes)" hint="Block reserved tables this many minutes before the booking time — staff can override">
                                        <Input type="number" value={settings.tablePreparationTime ?? 30} onChange={set('tablePreparationTime')} min={0} max={120} />
                                    </Field>
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-xl p-5">
                                <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
                                    <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                                    Behaviour
                                </h3>
                                <Toggle
                                    value={settings.printKitchenTicket}
                                    onChange={set('printKitchenTicket')}
                                    label="Print kitchen ticket (KOT) on new order"
                                    hint="Automatically prints a KOT when an order is placed"
                                />
                                <Toggle
                                    value={settings.autoCompleteOnPayment}
                                    onChange={set('autoCompleteOnPayment')}
                                    label="Auto-mark table free after payment"
                                    hint="Table status changes to Available immediately after payment"
                                />
                            </div>
                            {/* KOT Printer config — only shown when KOT is enabled */}
                            {settings.printKitchenTicket && (
                                <div className="bg-gray-800 rounded-xl p-5 space-y-4 border border-amber-700/30">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                        <span className="w-1 h-4 bg-amber-500 rounded-full inline-block" />
                                        KOT Printer Setup
                                    </h3>
                                    <Toggle
                                        value={settings.kitchenPrinterSeparate}
                                        onChange={set('kitchenPrinterSeparate')}
                                        label="Dedicated kitchen printer"
                                        hint="OFF = KOT prints on the same cashier printer. ON = KOT goes to a separate kitchen printer."
                                    />
                                    {settings.kitchenPrinterSeparate && (
                                        <Field
                                            label="Kitchen Printer Name"
                                            hint="Must match the exact printer name in Windows. Leave blank to use the system default."
                                        >
                                            <Input
                                                value={settings.kitchenPrinterName}
                                                onChange={set('kitchenPrinterName')}
                                                placeholder="e.g. EPSON TM-T88V Kitchen"
                                            />
                                        </Field>
                                    )}
                                    {!settings.kitchenPrinterSeparate && (
                                        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                                            <p className="text-amber-400 text-xs font-medium">Single printer mode</p>
                                            <p className="text-amber-500/70 text-xs mt-0.5">
                                                KOT will print on the same printer as the customer bill. Kitchen staff will see it at the cashier.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Backup ── */}
                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                    <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" />
                                    Export Backup
                                </h3>
                                <p className="text-gray-400 text-sm">Download a complete JSON snapshot of everything. Use this to migrate to another machine or before a reset.</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        'Menu items & categories','Tables & layout',
                                        'Staff & PINs','All orders & items',
                                        'Payments & transactions','Shift history (with staff names)',
                                        'KOT history & void log','Order & KOT counters',
                                        'Settings & shortcuts','POS zones',
                                        'Quick discount rules','Keyboard shortcuts',
                                        'Table reservations & bookings','Table prep time setting',
                                    ].map(item => (
                                        <div key={item} className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" className="w-3 h-3 shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-gray-600 text-[10px]">Backup v3.3</p>
                                <button
                                    onClick={handleExportBackup}
                                    disabled={!!backupStatus}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <polyline points="21 15 21 21 3 21 3 15"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    {backupStatus === 'exporting' ? 'Exporting…' : 'Export Backup'}
                                </button>
                            </div>
                            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                    <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
                                    Import Backup
                                </h3>
                                <p className="text-gray-400 text-sm">Restore from a previously exported backup file. This will replace all current data with the backup contents.</p>
                                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
                                    <p className="text-yellow-400 text-xs font-medium">Warning: Import replaces all existing data</p>
                                    <p className="text-yellow-500/70 text-xs mt-0.5">Export a backup first before importing if you want to keep current data.</p>
                                </div>
                                <button
                                    onClick={handleImportBackup}
                                    disabled={!!backupStatus}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <polyline points="21 15 21 21 3 21 3 15"/><polyline points="7 14 12 9 17 14"/><line x1="12" y1="9" x2="12" y2="21"/>
                                    </svg>
                                    {backupStatus === 'importing' ? 'Importing…' : 'Import Backup'}
                                </button>
                            </div>

                            {/* Orders JSON export */}
                            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                    <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                                    Export Orders (JSON)
                                </h3>
                                <p className="text-gray-400 text-sm">Export completed orders for a specific date range including items and transactions.</p>
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">From</label>
                                        <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 block">To</label>
                                        <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors" />
                                    </div>
                                    <button onClick={handleExportOrders} disabled={exportingOrders}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                            <polyline points="21 15 21 21 3 21 3 15"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                        </svg>
                                        {exportingOrders ? 'Exporting…' : 'Export'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Bill Printing ── */}
                    {activeTab === 'receipt' && (
                        <div className="flex gap-6">
                            {/* Settings panel */}
                            <div className="flex-1 space-y-5">
                                <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                        <span className="w-1 h-4 bg-orange-500 rounded-full inline-block" />
                                        Receipt Header
                                    </h3>
                                    <Field label="Business Name" hint="Shown large at the top of the bill">
                                        <Input value={settings.hotelName} onChange={set('hotelName')} placeholder="My Hotel" />
                                    </Field>
                                    <Field label="Tagline" hint="Shown below the name">
                                        <Input value={settings.tagline} onChange={set('tagline')} placeholder="Fine dining experience..." />
                                    </Field>
                                    <Field label="Address">
                                        <Input value={settings.address} onChange={set('address')} placeholder="123 Main St, Colombo" />
                                    </Field>
                                    <Field label="Phone">
                                        <Input value={settings.phone} onChange={set('phone')} placeholder="+94 11 000 0000" />
                                    </Field>
                                    <Toggle
                                        value={settings.receiptBlackBands}
                                        onChange={set('receiptBlackBands')}
                                        label="Black header & footer bands"
                                        hint="Prints shop name and brand footer on a black background"
                                    />
                                </div>
                                <div className="bg-gray-800 rounded-xl p-5 space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                        <span className="w-1 h-4 bg-orange-500 rounded-full inline-block" />
                                        Receipt Footer
                                    </h3>
                                    <Field label="Footer Message" hint="Thank-you message at the bottom">
                                        <Input value={settings.receiptFooter} onChange={set('receiptFooter')} placeholder="Thank you for dining with us!" />
                                    </Field>
                                    <Field label="Tax Rate (%)" hint="Shown on bill breakdown">
                                        <Input type="number" value={settings.taxRate} onChange={set('taxRate')} min={0} max={100} />
                                    </Field>
                                </div>
                                <div className="bg-gray-800 rounded-xl p-5 space-y-3">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                        <span className="w-1 h-4 bg-orange-500 rounded-full inline-block" />
                                        KOT Options
                                    </h3>
                                    <Toggle
                                        value={settings.printKitchenTicket}
                                        onChange={set('printKitchenTicket')}
                                        label="Auto-print KOT on new order"
                                        hint="Sends a kitchen order ticket every time an order is placed"
                                    />
                                    {settings.printKitchenTicket && (
                                        <Toggle
                                            value={settings.kitchenPrinterSeparate}
                                            onChange={set('kitchenPrinterSeparate')}
                                            label="Dedicated kitchen printer"
                                            hint="ON = separate kitchen printer. OFF = KOT on cashier printer."
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Live receipt preview */}
                            <div className="w-72 shrink-0">
                                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Live Preview — 80mm</p>
                                {(() => {
                                    const blackBands = settings.receiptBlackBands !== false;
                                    const tax     = Number(settings.taxRate ?? 0);
                                    const sub     = 1450;
                                    const taxAmt  = Math.round(sub * tax) / 100;
                                    const total   = sub + taxAmt;
                                    const paid    = 2000;
                                    const change  = paid - total;
                                    const now     = new Date().toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' });
                                    const fmtN    = n => Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                    const ITEMS   = [
                                        { name: 'Grilled Chicken',  qty: 2, price: 350, total: 700 },
                                        { name: 'Fried Rice',       qty: 1, price: 350, total: 350 },
                                        { name: 'Soft Drink',       qty: 2, price: 200, total: 400 },
                                    ];
                                    const R = ({ label, val, bold, large, topBorder }) => (
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline',
                                            borderTop: topBorder ? '2px solid #000' : 'none',
                                            paddingTop: topBorder ? 4 : 0,
                                            marginTop: topBorder ? 3 : 1,
                                            fontWeight: bold ? 900 : 400,
                                            fontSize: large ? 14 : 11,
                                            color: bold ? '#000' : '#444',
                                        }}>
                                            <span>{label}</span><span>LKR {fmtN(val)}</span>
                                        </div>
                                    );
                                    return (
                                        <div style={{
                                            background: '#fff', color: '#000',
                                            fontFamily: "'Courier New', Courier, monospace",
                                            fontSize: 11, lineHeight: 1.45,
                                            width: '100%', padding: '10px 10px 16px',
                                            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                                            borderRadius: 4,
                                        }}>
                                            {/* Header */}
                                            <div style={{ textAlign:'center', background: blackBands ? '#000' : 'transparent', color: blackBands ? '#fff' : '#000', padding: blackBands ? '8px 4px 10px' : '0 4px 8px', margin: blackBands ? '0 -10px' : 0 }}>
                                                <div style={{ fontSize:16, fontWeight:900, letterSpacing:2, textTransform:'uppercase' }}>
                                                    {settings.hotelName || 'My Hotel'}
                                                </div>
                                                {settings.tagline && <div style={{ fontSize:10, color: blackBands ? '#ccc' : '#555', marginTop:1 }}>{settings.tagline}</div>}
                                                {settings.address  && <div style={{ fontSize:10, color: blackBands ? '#ccc' : '#555', marginTop:1 }}>{settings.address}</div>}
                                                {settings.phone    && <div style={{ fontSize:10, color: blackBands ? '#ccc' : '#555', marginTop:1 }}>Tel: {settings.phone}</div>}
                                            </div>

                                            {/* Thick rule */}
                                            <div style={{ borderTop:'2px solid #000', margin:'5px 0' }} />

                                            {/* Meta */}
                                            <div style={{ fontSize:10, color:'#555', marginBottom:1 }}>{now}</div>
                                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5 }}>
                                                <span style={{ color:'#555' }}>Order #</span>
                                                <span style={{ fontWeight:700 }}>ORD-SAMPLE</span>
                                            </div>
                                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5 }}>
                                                <span style={{ color:'#555' }}>Table</span>
                                                <span style={{ fontWeight:700 }}>5</span>
                                            </div>

                                            {/* Dash rule */}
                                            <div style={{ borderTop:'1px dashed #888', margin:'5px 0' }} />

                                            {/* Items table */}
                                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                                                <thead>
                                                    <tr style={{ borderBottom:'1px solid #000' }}>
                                                        <th style={{ textAlign:'left',   width:'48%', paddingBottom:3, fontSize:10, fontWeight:900, letterSpacing:0.5 }}>ITEM</th>
                                                        <th style={{ textAlign:'center', width:'8%',  paddingBottom:3, fontSize:10, fontWeight:900 }}>QTY</th>
                                                        <th style={{ textAlign:'right',  width:'20%', paddingBottom:3, fontSize:10, fontWeight:900 }}>PRICE</th>
                                                        <th style={{ textAlign:'right',  width:'24%', paddingBottom:3, fontSize:10, fontWeight:900 }}>TOTAL</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ITEMS.map((it, i) => (
                                                        <tr key={i} style={{ borderBottom:'1px dotted #ddd' }}>
                                                            <td style={{ paddingTop:3, paddingBottom:2 }}>{it.name}</td>
                                                            <td style={{ textAlign:'center' }}>{it.qty}</td>
                                                            <td style={{ textAlign:'right', whiteSpace:'nowrap' }}>{fmtN(it.price)}</td>
                                                            <td style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{fmtN(it.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* Dash rule */}
                                            <div style={{ borderTop:'1px dashed #888', margin:'5px 0' }} />

                                            {/* Totals */}
                                            <R label="Subtotal" val={sub} />
                                            {tax > 0 && <R label={`Tax (${tax}%)`} val={taxAmt} />}
                                            <R label="TOTAL" val={total} bold large topBorder />

                                            {/* Payment */}
                                            <div style={{ borderTop:'1px dashed #888', margin:'6px 0 3px' }} />
                                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#444', marginTop:1 }}>
                                                <span>Payment</span><span style={{ fontWeight:700 }}>Cash</span>
                                            </div>
                                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#444', marginTop:1 }}>
                                                <span>Amount Paid</span><span style={{ fontWeight:700 }}>LKR {fmtN(paid)}</span>
                                            </div>
                                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#444', marginTop:1 }}>
                                                <span>Change</span><span style={{ fontWeight:900, fontSize:12 }}>LKR {fmtN(change)}</span>
                                            </div>

                                            {/* Solid rule */}
                                            <div style={{ borderTop:'1px solid #000', margin:'8px 0 0' }} />

                                            {/* Footer */}
                                            <div style={{ textAlign:'center', marginTop:8 }}>
                                                <div style={{ fontSize:12, fontWeight:900 }}>{settings.receiptFooter || 'Thank you for dining with us!'}</div>
                                                <div style={{ fontSize:10, color:'#555', marginTop:2 }}>Please keep this receipt</div>
                                            </div>

                                            {/* Brand */}
                                            <div style={{ marginTop:10, padding:'6px 4px 8px', textAlign:'center', background: blackBands ? '#000' : 'transparent', marginLeft: blackBands ? -10 : 0, marginRight: blackBands ? -10 : 0, borderTop: blackBands ? 'none' : '1px dashed #bbb' }}>
                                                <div style={{ fontSize:8, color: blackBands ? '#aaa' : '#aaa', textTransform:'uppercase', letterSpacing:1 }}>Software by</div>
                                                <div style={{ fontSize:10, fontWeight:900, color: blackBands ? '#fff' : '#666', marginTop:2 }}>DreamLabs IT Solutions</div>
                                                <div style={{ fontSize:8, color: blackBands ? '#ccc' : '#aaa', marginTop:1 }}>Call / WhatsApp: 070 615 1051</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ── Shortcuts ── */}
                    {activeTab === 'shortcuts' && (
                        <div className="space-y-5">

                            {/* Recording overlay */}
                            {recording !== null && (
                                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setRecording(null)}>
                                    <div className="bg-gray-800 border border-blue-500 rounded-2xl p-8 text-center shadow-2xl min-w-[320px]" onClick={e => e.stopPropagation()}>
                                        <div className="w-14 h-14 rounded-full bg-blue-600 animate-pulse flex items-center justify-center mx-auto mb-4">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-7 h-7">
                                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01"/>
                                            </svg>
                                        </div>
                                        <p className="text-white font-bold text-lg mb-1">Press any key combination</p>
                                        <p className="text-gray-400 text-sm mb-4">
                                            for: <span className="text-blue-400 font-semibold">
                                                {recording?.type === 'app'
                                                    ? APP_ACTION_LABELS[recording.actionId]
                                                    : menuItems.find(i => i.id === recording?.id)?.name}
                                            </span>
                                        </p>
                                        <p className="text-gray-500 text-xs">Try: Alt+1, Ctrl+Q, F10, etc.</p>
                                        <p className="text-gray-600 text-xs mt-2">Press Escape to cancel</p>
                                    </div>
                                </div>
                            )}

                            {/* Sub-tab bar */}
                            <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
                                <button
                                    onClick={() => setShortcutSubTab('app')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors
                                        ${shortcutSubTab === 'app' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    </svg>
                                    App Shortcuts
                                </button>
                                <button
                                    onClick={() => setShortcutSubTab('items')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors
                                        ${shortcutSubTab === 'items' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                                    </svg>
                                    Menu Item Shortcuts
                                </button>
                            </div>

                            {/* ── App Shortcuts sub-tab ── */}
                            {shortcutSubTab === 'app' && (
                                <div className="space-y-4">
                                    <div className="bg-gray-800 rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                                <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
                                                App Action Shortcuts
                                            </h3>
                                            <button
                                                onClick={resetAppShortcuts}
                                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                Reset to Defaults
                                            </button>
                                        </div>
                                        <p className="text-gray-500 text-xs mb-5">
                                            Customize keyboard shortcuts for navigation, modes, and checkout. These work app-wide.
                                        </p>

                                        {APP_ACTION_GROUPS.map(group => (
                                            <div key={group.title} className="mb-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`w-2 h-2 rounded-full ${group.color}`} />
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{group.title}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    {group.actions.map(actionId => {
                                                        const combo = appShortcuts[actionId];
                                                        const defaultCombo = APP_ACTION_DEFAULTS[actionId];
                                                        const isRecording = recording?.type === 'app' && recording.actionId === actionId;
                                                        const isModified = combo !== defaultCombo;
                                                        return (
                                                            <div key={actionId}
                                                                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors
                                                                    ${isRecording ? 'bg-blue-900/40 border border-blue-500' : 'bg-gray-700/40 hover:bg-gray-700/60'}`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${combo ? 'bg-green-500' : 'bg-gray-600'}`} />
                                                                    <span className="text-sm text-white truncate">{APP_ACTION_LABELS[actionId]}</span>
                                                                    {isModified && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 bg-yellow-600/20 border border-yellow-600/30 text-yellow-400 rounded uppercase font-bold shrink-0">
                                                                            custom
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {combo && (
                                                                        <>
                                                                            <kbd className="px-2 py-0.5 bg-gray-800 border border-gray-500 rounded text-xs font-mono text-blue-300">
                                                                                {combo}
                                                                            </kbd>
                                                                            <button
                                                                                onClick={() => removeAppShortcut(actionId)}
                                                                                className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                                                                                title="Remove shortcut"
                                                                            >×</button>
                                                                        </>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setRecording({ type: 'app', actionId })}
                                                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors
                                                                            ${isRecording
                                                                                ? 'bg-blue-600 text-white animate-pulse'
                                                                                : combo
                                                                                    ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                                                                                    : 'bg-blue-700 hover:bg-blue-600 text-white'
                                                                            }`}
                                                                    >
                                                                        {isRecording ? '● Recording…' : combo ? 'Change' : 'Record'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 space-y-1">
                                        <p className="text-blue-300 text-xs font-semibold mb-2">Notes</p>
                                        <p className="text-blue-400/70 text-xs">• Changes take effect immediately — no save needed</p>
                                        <p className="text-blue-400/70 text-xs">• Each action can only have one shortcut; assigning a key used by another action will move it</p>
                                        <p className="text-blue-400/70 text-xs">• Avoid keys that your OS reserves (Win+D, Ctrl+Alt+Del, etc.)</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Menu Item Shortcuts sub-tab ── */}
                            {shortcutSubTab === 'items' && (
                                <div className="space-y-4">
                                    <div className="bg-gray-800 rounded-xl p-5">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-1">
                                            <span className="w-1 h-4 bg-orange-500 rounded-full inline-block" />
                                            Menu Item Shortcuts
                                        </h3>
                                        <p className="text-gray-500 text-xs mb-4">
                                            Assign a key combo to any menu item. In POS, pressing that combo instantly adds the item to the current order.
                                        </p>

                                        {/* Legend */}
                                        <div className="flex items-center gap-4 mb-4 p-3 bg-gray-700/40 rounded-lg">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                                Shortcut assigned
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />
                                                No shortcut
                                            </div>
                                            <p className="text-xs text-gray-500 ml-auto">Click "Record" to set a shortcut</p>
                                        </div>

                                        {/* Group by category */}
                                        {(() => {
                                            const byCategory = menuItems.reduce((acc, item) => {
                                                const cat = item.category || 'Uncategorized';
                                                if (!acc[cat]) acc[cat] = [];
                                                acc[cat].push(item);
                                                return acc;
                                            }, {});
                                            const itemToCombo = Object.fromEntries(
                                                Object.entries(itemShortcuts).map(([k, v]) => [v, k])
                                            );
                                            return Object.entries(byCategory).map(([cat, items]) => (
                                                <div key={cat} className="mb-5">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{cat}</p>
                                                    <div className="space-y-1">
                                                        {items.map(item => {
                                                            const combo = itemToCombo[item.id];
                                                            const isRecording = recording?.type === 'item' && recording.id === item.id;
                                                            return (
                                                                <div key={item.id}
                                                                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors
                                                                        ${isRecording ? 'bg-blue-900/40 border border-blue-500' : 'bg-gray-700/40 hover:bg-gray-700/60'}`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${combo ? 'bg-green-500' : 'bg-gray-600'}`} />
                                                                        <span className="text-sm text-white truncate">{item.name}</span>
                                                                        <span className="text-xs text-gray-500 shrink-0">LKR {item.price}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        {combo && (
                                                                            <>
                                                                                <kbd className="px-2 py-0.5 bg-gray-800 border border-gray-500 rounded text-xs font-mono text-orange-300">
                                                                                    {combo}
                                                                                </kbd>
                                                                                <button
                                                                                    onClick={() => removeItemShortcut(item.id)}
                                                                                    className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                                                                                    title="Remove shortcut"
                                                                                >×</button>
                                                                            </>
                                                                        )}
                                                                        <button
                                                                            onClick={() => setRecording({ type: 'item', id: item.id })}
                                                                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors
                                                                                ${isRecording
                                                                                    ? 'bg-blue-600 text-white animate-pulse'
                                                                                    : combo
                                                                                        ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                                                                                        : 'bg-orange-700 hover:bg-orange-600 text-white'
                                                                                }`}
                                                                        >
                                                                            {isRecording ? '● Recording…' : combo ? 'Change' : 'Record'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ));
                                        })()}

                                        {menuItems.length === 0 && (
                                            <p className="text-gray-500 text-sm text-center py-8">No menu items found. Add items in Menu Management first.</p>
                                        )}
                                    </div>

                                    <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-4 space-y-1">
                                        <p className="text-orange-300 text-xs font-semibold mb-2">Tips for good shortcuts</p>
                                        <p className="text-orange-400/70 text-xs">• Use <kbd className="px-1 bg-gray-700 rounded text-[10px]">Alt+1</kbd> through <kbd className="px-1 bg-gray-700 rounded text-[10px]">Alt+9</kbd> for your top 9 items</p>
                                        <p className="text-orange-400/70 text-xs">• Use <kbd className="px-1 bg-gray-700 rounded text-[10px]">F10</kbd>–<kbd className="px-1 bg-gray-700 rounded text-[10px]">F12</kbd> for frequently ordered specials</p>
                                        <p className="text-orange-400/70 text-xs">• Shortcuts are active only in the POS view when no input is focused</p>
                                        <p className="text-orange-400/70 text-xs">• Each shortcut can only be assigned to one item — reassigning removes the old binding</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Staff Management ── */}
                    {/* ── Danger Zone ── */}
                    {activeTab === 'danger' && (
                        <div className="space-y-6">
                            <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-5 space-y-4">
                                <h3 className="text-red-400 font-semibold text-sm flex items-center gap-2">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                    </svg>
                                    Danger Zone
                                </h3>
                                <p className="text-gray-400 text-sm">These actions are permanent and cannot be undone.</p>

                                <div className="border border-red-800/40 rounded-lg p-4 space-y-3">
                                    <div>
                                        <p className="text-white text-sm font-medium">Clear Order History</p>
                                        <p className="text-gray-500 text-xs mt-0.5">Permanently deletes all completed and cancelled orders from the database.</p>
                                    </div>
                                    {!confirmClear ? (
                                        <button
                                            onClick={() => setConfirmClear(true)}
                                            className="px-4 py-2 bg-red-900/60 hover:bg-red-800 border border-red-700/50 text-red-400 hover:text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Clear Order History
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <span className="text-red-400 text-xs font-medium">Are you sure?</span>
                                            <button onClick={handleClearOrders} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors">
                                                Yes, delete all
                                            </button>
                                            <button onClick={() => setConfirmClear(false)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="border border-red-800/60 rounded-lg p-4 space-y-3 bg-red-950/20">
                                    <div>
                                        <p className="text-white text-sm font-medium">Force Clear All Orders</p>
                                        <p className="text-gray-500 text-xs mt-0.5">Deletes every order including pending and preparing — use to remove orphaned/stuck orders left over from crashes or old test data.</p>
                                    </div>
                                    {!confirmClearAll ? (
                                        <button
                                            onClick={() => setConfirmClearAll(true)}
                                            className="px-4 py-2 bg-red-900/80 hover:bg-red-700 border border-red-600/60 text-red-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Force Clear All Orders
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <span className="text-red-300 text-xs font-medium">This deletes ALL orders. Sure?</span>
                                            <button onClick={handleClearAllOrders} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors">
                                                Yes, clear everything
                                            </button>
                                            <button onClick={() => setConfirmClearAll(false)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SettingsView;
