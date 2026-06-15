import React, { useMemo } from 'react';
import { loadItemShortcuts } from '../utils/itemShortcuts';
import { useSelector } from 'react-redux';

const STATIC_SECTIONS = [
    {
        title: 'Navigation',
        color: 'bg-blue-500',
        shortcuts: [
            { keys: ['F1'],     desc: 'Show / hide this shortcuts panel' },
            { keys: ['F2'],     desc: 'Go to POS' },
            { keys: ['F3'],     desc: 'Go to Orders' },
            { keys: ['F4'],     desc: 'Go to Reports' },
            { keys: ['F5'],     desc: 'Go to Menu Management' },
            { keys: ['F6'],     desc: 'Go to Tables' },
            { keys: ['F7'],     desc: 'Go to Settings' },
        ],
    },
    {
        title: 'POS — Order',
        color: 'bg-green-500',
        shortcuts: [
            { keys: ['D'],       desc: 'Switch to Dine-in mode' },
            { keys: ['T'],       desc: 'Switch to Takeaway mode' },
            { keys: ['F9'],      desc: 'Open checkout / payment' },
            { keys: ['Escape'],  desc: 'Cancel / close any modal' },
        ],
    },
    {
        title: 'POS — Payment',
        color: 'bg-purple-500',
        shortcuts: [
            { keys: ['1'],      desc: 'Select Cash payment' },
            { keys: ['2'],      desc: 'Select Card payment' },
            { keys: ['3'],      desc: 'Select Mobile payment' },
            { keys: ['E'],      desc: 'Fill exact amount (cash)' },
            { keys: ['Enter'],  desc: 'Complete payment' },
            { keys: ['Escape'], desc: 'Cancel payment' },
        ],
    },
];

const Key = ({ children }) => (
    <kbd className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 bg-gray-700 border border-gray-500 rounded-lg text-xs font-mono text-gray-200 shadow-sm whitespace-nowrap">
        {children}
    </kbd>
);

const ShortcutRow = ({ keys, desc, badge }) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-300 text-sm truncate">{desc}</span>
            {badge && <span className="px-1.5 py-0.5 bg-orange-600/20 border border-orange-600/30 text-orange-400 text-[9px] font-bold rounded uppercase">{badge}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
            {keys.map((k, i) => (
                <React.Fragment key={k}>
                    {i > 0 && <span className="text-gray-600 text-[10px]">+</span>}
                    <Key>{k}</Key>
                </React.Fragment>
            ))}
        </div>
    </div>
);

const ShortcutsHelp = ({ onClose }) => {
    const menuItems = useSelector(state => state.menu.items);

    const itemShortcutSection = useMemo(() => {
        const map = loadItemShortcuts(); // { combo: itemId }
        const entries = Object.entries(map);
        if (entries.length === 0) return null;

        const shortcuts = entries.map(([combo, itemId]) => {
            const item = menuItems.find(i => i.id === itemId);
            const keys = combo.split('+');
            return {
                keys,
                desc: item ? `Add "${item.name}" to order` : `Item #${itemId} (deleted)`,
                price: item ? `LKR ${item.price}` : null,
            };
        });

        return { title: 'Menu Item Shortcuts', color: 'bg-orange-500', shortcuts };
    }, [menuItems]);

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div
                className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base">Keyboard Shortcuts</h2>
                            <p className="text-gray-500 text-xs">Press <kbd className="px-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-gray-300">F1</kbd> anytime to toggle</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-white transition-colors">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {STATIC_SECTIONS.map(section => (
                            <div key={section.title}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`w-1.5 h-4 rounded-full ${section.color}`} />
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{section.title}</p>
                                </div>
                                <div className="divide-y divide-gray-800">
                                    {section.shortcuts.map(s => (
                                        <ShortcutRow key={s.desc} {...s} />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Dynamic item shortcuts */}
                        {itemShortcutSection && (
                            <div className="md:col-span-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`w-1.5 h-4 rounded-full ${itemShortcutSection.color}`} />
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{itemShortcutSection.title}</p>
                                    <span className="ml-auto text-[10px] text-gray-600">Manage in Settings → Shortcuts</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y divide-gray-800 md:divide-y-0">
                                    {itemShortcutSection.shortcuts.map(s => (
                                        <ShortcutRow key={s.desc} keys={s.keys} desc={s.desc} badge={s.price} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!itemShortcutSection && (
                            <div className="md:col-span-2 bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-4 text-center">
                                <p className="text-gray-500 text-sm">No menu item shortcuts assigned yet.</p>
                                <p className="text-gray-600 text-xs mt-1">Go to <span className="text-blue-400">Settings → Shortcuts</span> to assign keys to your menu items.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-gray-800 shrink-0">
                    <p className="text-gray-600 text-xs text-center">Shortcuts are inactive while typing in input fields</p>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsHelp;
