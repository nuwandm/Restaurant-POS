const ITEM_KEY = 'itemShortcuts';
const APP_KEY  = 'appShortcuts';

// ── Menu item shortcuts ─────────────────────────────────
// { [combo]: menuItemId }  e.g. { 'Alt+1': 3 }
export function loadItemShortcuts() {
    try { return JSON.parse(localStorage.getItem(ITEM_KEY) || '{}'); }
    catch { return {}; }
}
export function saveItemShortcuts(map) {
    localStorage.setItem(ITEM_KEY, JSON.stringify(map));
}

// ── App action shortcuts ────────────────────────────────
// Default key combos for each action id
export const APP_ACTION_DEFAULTS = {
    'nav-pos':      'F2',
    'nav-orders':   'F3',
    'nav-reports':  'F4',
    'nav-menu':     'F5',
    'nav-tables':   'F6',
    'nav-settings': 'F7',
    'pos-dinein':   'D',
    'pos-takeaway': 'T',
    'pos-checkout': 'F9',
    'pos-kot':      'F8',
    'pos-kot-pay':  'F10',
    'help':         'F1',
};

// Human-readable labels for each action
export const APP_ACTION_LABELS = {
    'nav-pos':      'Go to POS',
    'nav-orders':   'Go to Orders',
    'nav-reports':  'Go to Reports',
    'nav-menu':     'Go to Menu Management',
    'nav-tables':   'Go to Tables',
    'nav-settings': 'Go to Settings',
    'pos-dinein':   'Switch to Dine-in mode',
    'pos-takeaway': 'Switch to Takeaway mode',
    'pos-checkout': 'Checkout / open payment',
    'pos-kot':      'Print KOT',
    'pos-kot-pay':  'KOT + Pay (takeaway)',
    'help':         'Show / hide shortcuts help',
};

export const APP_ACTION_GROUPS = [
    {
        title: 'Navigation',
        color: 'bg-blue-500',
        actions: ['nav-pos','nav-orders','nav-reports','nav-menu','nav-tables','nav-settings'],
    },
    {
        title: 'POS',
        color: 'bg-green-500',
        actions: ['pos-dinein','pos-takeaway','pos-checkout','pos-kot','pos-kot-pay','help'],
    },
];

// Returns { [actionId]: combo }  e.g. { 'nav-pos': 'F2', 'pos-checkout': 'F9' }
export function loadAppShortcuts() {
    try {
        const saved = JSON.parse(localStorage.getItem(APP_KEY) || '{}');
        return { ...APP_ACTION_DEFAULTS, ...saved };
    } catch { return { ...APP_ACTION_DEFAULTS }; }
}
export function saveAppShortcuts(map) {
    localStorage.setItem(APP_KEY, JSON.stringify(map));
}

// ── Shared util ─────────────────────────────────────────
export function comboFromEvent(e) {
    const parts = [];
    if (e.ctrlKey)  parts.push('Ctrl');
    if (e.altKey)   parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    const k = e.key;
    if (['Control','Alt','Shift','Meta'].includes(k)) return null;
    parts.push(k);
    return parts.join('+');
}
