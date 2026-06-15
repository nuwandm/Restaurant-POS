import { useEffect } from 'react';

/**
 * Registers keyboard shortcuts.
 * handlers: { 'F1': fn, 'Ctrl+P': fn, 'Escape': fn, ... }
 * Set active=false to pause all shortcuts (e.g. while a modal is open).
 */
export function useKeyboardShortcuts(handlers, active = true) {
    useEffect(() => {
        if (!active) return;
        const onKeyDown = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

            const combo = [
                e.ctrlKey  && 'Ctrl',
                e.altKey   && 'Alt',
                e.shiftKey && 'Shift',
                e.key,
            ].filter(Boolean).join('+');

            if (handlers[combo]) {
                e.preventDefault();
                handlers[combo](e);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handlers, active]);
}

export default useKeyboardShortcuts;
