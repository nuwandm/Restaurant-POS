import React from 'react';
import { lkr } from '../../utils/currency';

const CAT_COLORS = {
    Appetizers: '#F59E0B', 'Main Course': '#10B981', Desserts: '#EC4899',
    Beverages: '#3B82F6', Specials: '#8B5CF6',
};

const MenuGrid = ({ items = [], onItemClick, highlightedIndex = -1 }) => (
    <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((item, idx) => {
            const accent = CAT_COLORS[item.category] || '#6B7280';
            const isHighlighted = idx === highlightedIndex;
            return (
                <button
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className={`group relative rounded-xl border p-3 text-left transition-all duration-150 active:scale-95 overflow-hidden
                        ${isHighlighted
                            ? 'border-blue-500/70 ring-2 ring-blue-500/30 scale-[1.02]'
                            : 'border-gray-700/40 hover:border-gray-600/60'}`}
                    style={{ background: isHighlighted ? '#1a2235' : '#161d2a' }}
                >
                    {/* accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-50"
                        style={{ backgroundColor: accent }} />

                    <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-gray-300 font-semibold text-sm leading-tight line-clamp-2 flex-1">{item.name}</p>
                        {!(item.kot_required === 1 || item.kot_required === true) && (
                            <span className="shrink-0 px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 leading-tight">
                                Ready
                            </span>
                        )}
                    </div>
                    <p className="text-xs mb-2" style={{ color: accent + 'cc' }}>{item.category}</p>
                    <div className="flex items-center justify-between gap-1">
                        <p className="text-base font-bold text-blue-300/90 group-hover:text-blue-300 transition-colors">
                            {lkr(item.price)}
                        </p>
                        {item.code && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-gray-600/50 text-gray-300 border border-gray-500/40 leading-tight">
                                {item.code}
                            </span>
                        )}
                    </div>

                    {/* add indicator */}
                    <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150
                        ${isHighlighted ? 'bg-blue-600/80' : 'bg-blue-600/0 group-hover:bg-blue-600/80'}`}>
                        <span className={`text-white text-xs font-bold transition-opacity ${isHighlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>+</span>
                    </div>
                </button>
            );
        })}
    </div>
);

export default MenuGrid;
