import React from 'react';

const TableGrid = ({ tables = [], onTableSelect, selectedTable }) => {
    const getStyle = (table) => {
        const sel = selectedTable?.id === table.id;
        const occ = table.status === 'occupied';
        if (sel && occ)  return { card: 'border-yellow-400 bg-red-900/60 ring-2 ring-yellow-400/50',  dot: 'bg-yellow-400', label: 'text-yellow-300' };
        if (sel)         return { card: 'border-blue-500 bg-blue-900/50 ring-2 ring-blue-500/40',      dot: 'bg-blue-400',   label: 'text-blue-300' };
        if (occ)         return { card: 'border-red-700/60 bg-red-900/30 hover:border-red-500',        dot: 'bg-red-400',    label: 'text-red-400' };
        return           { card: 'border-gray-700 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50', dot: 'bg-green-400', label: 'text-green-400' };
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            {tables.map(table => {
                const s = getStyle(table);
                const occ = table.status === 'occupied';
                return (
                    <button
                        key={table.id}
                        onClick={() => onTableSelect(table)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 active:scale-95 ${s.card}`}
                    >
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${s.dot}`} />
                        <span className="text-white font-bold text-lg leading-none">{table.number}</span>
                        <span className="text-gray-400 text-xs mt-1">{table.capacity}p</span>
                        <span className={`text-xs font-medium mt-0.5 ${s.label}`}>
                            {occ ? 'Busy' : 'Free'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default TableGrid;
