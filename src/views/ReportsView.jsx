import React, { useState, useEffect, useCallback, useRef } from 'react';
import { lkr } from '../utils/currency';

// ─── Date helpers ────────────────────────────────────────────────────────────
function toISO(d) { return d.toISOString().slice(0, 10); }
function today() { return new Date().toLocaleDateString('en-CA'); } // YYYY-MM-DD in local tz
function addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString('en-CA'); // local YYYY-MM-DD, avoids UTC date shift
}
function monthStart(iso) {
    return iso.slice(0, 8) + '01';
}
function fmtDisplay(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtHour(h) {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
}
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function firstWeekday(year, month) { return new Date(year, month, 1).getDay(); }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const PRESETS = [
    { label: 'Today',        from: () => today(),             to: () => today() },
    { label: 'Yesterday',    from: () => addDays(today(),-1), to: () => addDays(today(),-1) },
    { label: 'Last 7 days',  from: () => addDays(today(),-6), to: () => today() },
    { label: 'Last 30 days', from: () => addDays(today(),-29),to: () => today() },
    { label: 'This Month',   from: () => monthStart(today()), to: () => today() },
];

// ─── Mini Calendar ────────────────────────────────────────────────────────────
const MiniCalendar = ({ value, rangeFrom, rangeTo, onSelect, selecting }) => {
    const [viewYear, setViewYear]   = useState(() => {
        const d = new Date((value || today()) + 'T00:00:00');
        return d.getFullYear();
    });
    const [viewMonth, setViewMonth] = useState(() => {
        const d = new Date((value || today()) + 'T00:00:00');
        return d.getMonth();
    });

    const days = daysInMonth(viewYear, viewMonth);
    const startWd = firstWeekday(viewYear, viewMonth);
    const cells = [];
    for (let i = 0; i < startWd; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const isoOf = (d) => `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const todayIso = today();

    return (
        <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-4 w-64 shadow-2xl">
            {/* Nav */}
            <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span className="text-white font-bold text-sm">{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(w => (
                    <div key={w} className="text-center text-[10px] font-bold text-gray-600 py-1">{w}</div>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const iso = isoOf(d);
                    const isFrom  = iso === rangeFrom;
                    const isTo    = iso === rangeTo;
                    const inRange = rangeFrom && rangeTo && iso > rangeFrom && iso < rangeTo;
                    const isToday = iso === todayIso;
                    const isFuture = iso > todayIso;
                    const isSelected = iso === value;

                    return (
                        <button
                            key={i}
                            onClick={() => !isFuture && onSelect(iso)}
                            disabled={isFuture}
                            className={`
                                relative text-xs font-semibold h-8 rounded-lg transition-all
                                ${isFuture ? 'text-gray-800 cursor-not-allowed' : 'cursor-pointer'}
                                ${isFrom || isTo || isSelected
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                    : inRange
                                        ? 'bg-blue-500/15 text-blue-300'
                                        : isFuture ? '' : 'text-gray-300 hover:bg-white/10 hover:text-white'}
                            `}
                        >
                            {d}
                            {isToday && !isFrom && !isTo && !isSelected && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selecting hint */}
            {selecting && (
                <p className="text-center text-[10px] text-blue-400 mt-3 font-medium">
                    {selecting === 'from' ? 'Select start date' : 'Select end date'}
                </p>
            )}
        </div>
    );
};

// ─── Date Range Picker ───────────────────────────────────────────────────────
const DateRangePicker = ({ from, to, onChange }) => {
    const [open, setOpen]   = useState(false);
    const [step, setStep]   = useState('from'); // 'from' | 'to'
    const [draft, setDraft] = useState({ from, to });
    const ref = useRef(null);

    useEffect(() => { setDraft({ from, to }); }, [from, to]);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleFromSelect = (iso) => {
        // clamp to so it's never before from
        const newTo = draft.to >= iso ? draft.to : iso;
        setDraft({ from: iso, to: newTo });
        setStep('to');
    };

    const handleToSelect = (iso) => {
        // clamp from so it's never after to
        const newFrom = draft.from <= iso ? draft.from : iso;
        setDraft(d => ({ from: newFrom, to: iso }));
        onChange(newFrom, iso);
        setStep('from');
        setOpen(false);
    };

    const sameDay = from === to;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => { setOpen(o => !o); setStep('from'); setDraft({ from, to }); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0f1117] border border-white/[0.08] hover:border-blue-500/50 rounded-xl text-sm text-white font-medium transition-all min-w-[220px]"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" className="w-4 h-4 shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="flex-1 text-left">
                    {sameDay ? fmtDisplay(from) : `${fmtDisplay(from)} — ${fmtDisplay(to)}`}
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>

            {open && (
                <div className="absolute top-full mt-2 right-0 z-50 flex gap-4 bg-[#0c0e14] border border-white/[0.08] rounded-2xl p-4 shadow-2xl">
                    {/* From calendar */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 pl-1">
                            <span className={`w-2 h-2 rounded-full ${step === 'from' ? 'bg-blue-400' : 'bg-gray-600'}`} />
                            <p className={`text-[11px] font-bold uppercase tracking-widest ${step === 'from' ? 'text-blue-400' : 'text-gray-500'}`}>
                                From
                            </p>
                            <span className="ml-1 text-xs text-gray-400 font-medium">{fmtDisplay(draft.from)}</span>
                        </div>
                        <MiniCalendar
                            value={draft.from}
                            rangeFrom={draft.from}
                            rangeTo={draft.to}
                            onSelect={handleFromSelect}
                            selecting={step === 'from' ? 'from' : null}
                        />
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-white/[0.06] self-stretch" />

                    {/* To calendar */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 pl-1">
                            <span className={`w-2 h-2 rounded-full ${step === 'to' ? 'bg-blue-400' : 'bg-gray-600'}`} />
                            <p className={`text-[11px] font-bold uppercase tracking-widest ${step === 'to' ? 'text-blue-400' : 'text-gray-500'}`}>
                                To
                            </p>
                            <span className="ml-1 text-xs text-gray-400 font-medium">{fmtDisplay(draft.to)}</span>
                        </div>
                        <MiniCalendar
                            value={draft.to}
                            rangeFrom={draft.from}
                            rangeTo={draft.to}
                            onSelect={handleToSelect}
                            selecting={step === 'to' ? 'to' : null}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent, icon }) => (
    <div className="bg-[#0f1117] border border-white/[0.05] rounded-2xl p-5 flex items-start gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${accent}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</p>
            <p className="text-white font-black text-xl mt-1 truncate tabular-nums">{value}</p>
            {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
        </div>
    </div>
);

const HBarChart = ({ data, valueKey, labelKey, colorClass = 'bg-blue-500', formatValue }) => {
    const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
    return (
        <div className="space-y-2.5">
            {data.map((row, i) => {
                const pct = ((row[valueKey] || 0) / max) * 100;
                return (
                    <div key={i} className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs w-24 shrink-0 truncate text-right">{row[labelKey]}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                            <div
                                className={`h-full ${colorClass} rounded-full transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="text-gray-300 text-xs w-28 shrink-0 text-right tabular-nums">
                            {formatValue ? formatValue(row[valueKey]) : row[valueKey]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main View ────────────────────────────────────────────────────────────────
const ReportsView = () => {
    const [from, setFrom]     = useState(today());
    const [to, setTo]         = useState(today());
    const [preset, setPreset] = useState(0);
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');

    const load = useCallback(async (f, t) => {
        setLoading(true);
        setError('');
        try {
            const res = await window.electron.database({ action: 'getReportSummary', data: { from: f, to: t } });
            if (res.success) setData(res.data);
            else setError(res.error || 'Failed to load report');
        } catch (e) {
            setError(e.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(from, to); }, []); // eslint-disable-line

    const applyPreset = (idx) => {
        setPreset(idx);
        const p = PRESETS[idx];
        const f = p.from(), t = p.to();
        setFrom(f); setTo(t);
        load(f, t);
    };

    const handleRangeChange = (f, t) => {
        setPreset(-1);
        setFrom(f); setTo(t);
        load(f, t);
    };

    const totals    = data?.totals   || {};
    const revenue   = totals.revenue     || 0;
    const orderCount= totals.order_count || 0;
    const avgOrder  = totals.avg_order   || 0;
    const tax       = totals.tax         || 0;
    const topItems  = data?.topItems  || [];
    const byMethod  = data?.byMethod  || [];
    const byType    = data?.byType    || [];
    const byDay     = data?.byDay     || [];
    const hourly    = data?.hourly    || [];
    const maxHour   = Math.max(...hourly.map(h => h.revenue || 0), 1);

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* ── Header ── */}
            <div className="bg-[#0c0e14] border-b border-white/[0.05] px-6 py-4 shrink-0 flex items-center justify-between">
                <div>
                    <h2 className="text-white font-bold text-lg">Reports</h2>
                    <p className="text-gray-600 text-xs mt-0.5">
                        {from === to ? fmtDisplay(from) : `${fmtDisplay(from)} — ${fmtDisplay(to)}`}
                    </p>
                </div>
                <button
                    onClick={() => load(from, to)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Refresh
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* ── Controls ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Preset pills */}
                    <div className="flex gap-1.5 flex-wrap">
                        {PRESETS.map((p, i) => (
                            <button
                                key={p.label}
                                onClick={() => applyPreset(i)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all
                                    ${preset === i
                                        ? 'bg-blue-600 text-white shadow shadow-blue-900/40'
                                        : 'bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.08]'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom calendar picker */}
                    <div className="ml-auto">
                        <DateRangePicker from={from} to={to} onChange={handleRangeChange} />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-4 text-red-400 text-sm">{error}</div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* ── KPI cards ── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                label="Total Revenue"
                                value={lkr(revenue)}
                                sub={`Tax collected: ${lkr(tax)}`}
                                accent="bg-emerald-500/10 border border-emerald-500/20"
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" className="w-5 h-5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                            />
                            <StatCard
                                label="Orders Completed"
                                value={orderCount.toLocaleString()}
                                sub={byType.map(t => `${t.order_type}: ${t.count}`).join(' · ') || '—'}
                                accent="bg-blue-500/10 border border-blue-500/20"
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" className="w-5 h-5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>}
                            />
                            <StatCard
                                label="Average Order"
                                value={lkr(avgOrder)}
                                sub="Per completed order"
                                accent="bg-purple-500/10 border border-purple-500/20"
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                            />
                            <StatCard
                                label="Net Revenue"
                                value={lkr(revenue - tax)}
                                sub="After tax deducted"
                                accent="bg-amber-500/10 border border-amber-500/20"
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* ── Top Items ── */}
                            <div className="bg-[#0f1117] border border-white/[0.05] rounded-2xl p-5">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-5">
                                    <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
                                    Top Selling Items
                                </h3>
                                {topItems.length === 0 ? (
                                    <p className="text-gray-600 text-sm text-center py-8">No data for this period</p>
                                ) : (
                                    <div className="space-y-3">
                                        {topItems.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className={`text-xs font-black w-5 text-right shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-700'}`}>
                                                    #{i + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-white text-sm font-medium truncate">{item.name}</span>
                                                        <span className="text-gray-500 text-xs shrink-0 ml-2">{item.qty}×</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                                                            <div
                                                                className="h-full bg-amber-500 rounded-full transition-all duration-700"
                                                                style={{ width: `${(item.qty / (topItems[0]?.qty || 1)) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-gray-600 text-xs w-24 text-right shrink-0 tabular-nums">{lkr(item.revenue)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Payment Methods ── */}
                            <div className="bg-[#0f1117] border border-white/[0.05] rounded-2xl p-5">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-5">
                                    <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                    Payment Methods
                                </h3>
                                {byMethod.length === 0 ? (
                                    <p className="text-gray-600 text-sm text-center py-8">No data for this period</p>
                                ) : (
                                    <div className="space-y-5">
                                        <HBarChart
                                            data={byMethod.map(m => ({ ...m, label: m.payment_method ? m.payment_method.charAt(0).toUpperCase() + m.payment_method.slice(1) : 'Unknown' }))}
                                            valueKey="total"
                                            labelKey="label"
                                            colorClass="bg-blue-500"
                                            formatValue={v => lkr(v)}
                                        />
                                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.05]">
                                            {byMethod.map((m, i) => (
                                                <div key={i} className="text-center bg-white/[0.02] rounded-xl py-2.5">
                                                    <p className="text-white font-black text-lg tabular-nums">{m.count}</p>
                                                    <p className="text-gray-600 text-xs capitalize mt-0.5">{m.payment_method || 'Unknown'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Daily Revenue (multi-day only) ── */}
                        {byDay.length > 1 && (
                            <div className="bg-[#0f1117] border border-white/[0.05] rounded-2xl p-5">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-5">
                                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                    Daily Revenue
                                </h3>
                                <HBarChart
                                    data={byDay.map(d => ({ ...d, label: fmtDisplay(d.day) }))}
                                    valueKey="revenue"
                                    labelKey="label"
                                    colorClass="bg-emerald-500"
                                    formatValue={v => lkr(v)}
                                />
                            </div>
                        )}

                        {/* ── Hourly heatmap ── */}
                        <div className="bg-[#0f1117] border border-white/[0.05] rounded-2xl p-5">
                            <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-5">
                                <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
                                Busiest Hours
                            </h3>
                            {hourly.length === 0 ? (
                                <p className="text-gray-600 text-sm text-center py-8">No data for this period</p>
                            ) : (
                                <div className="flex gap-1 items-end h-32">
                                    {Array.from({ length: 24 }, (_, h) => {
                                        const row = hourly.find(r => r.hour === h);
                                        const rev = row?.revenue || 0;
                                        const pct = rev / maxHour;
                                        const opacity = pct > 0 ? 0.25 + pct * 0.75 : 0.06;
                                        return (
                                            <div key={h} className="flex-1 flex flex-col items-center gap-1" title={`${fmtHour(h)}: ${lkr(rev)}`}>
                                                <div className="w-full rounded-t-md bg-gray-800 relative overflow-hidden" style={{ height: 96 }}>
                                                    <div
                                                        className="absolute bottom-0 w-full bg-purple-500 rounded-t-md transition-all duration-700"
                                                        style={{ height: `${Math.max(pct * 100, rev > 0 ? 3 : 0)}%`, opacity }}
                                                    />
                                                </div>
                                                {h % 6 === 0 && (
                                                    <span className="text-gray-700 text-[9px] font-medium">{fmtHour(h)}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ── Order Type Split ── */}
                        {byType.length > 0 && (
                            <div className="bg-[#0f1117] border border-white/[0.05] rounded-2xl p-5">
                                <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-5">
                                    <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
                                    Order Type Split
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {byType.map((t, i) => {
                                        const pct = orderCount > 0 ? ((t.count / orderCount) * 100).toFixed(1) : 0;
                                        const cols = [
                                            { bar: 'bg-blue-500', ring: 'border-blue-500/30', bg: 'bg-blue-500/5' },
                                            { bar: 'bg-amber-500', ring: 'border-amber-500/30', bg: 'bg-amber-500/5' },
                                        ];
                                        const c = cols[i % cols.length];
                                        return (
                                            <div key={i} className={`${c.bg} border ${c.ring} rounded-2xl p-5 text-center`}>
                                                <p className="text-white font-black text-3xl tabular-nums">{t.count}</p>
                                                <p className="text-gray-400 text-sm capitalize font-medium mt-1">{t.order_type}</p>
                                                <p className="text-gray-600 text-xs mt-0.5">{pct}% of orders</p>
                                                <div className="mt-3 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-full ${c.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <p className="text-white font-bold text-sm mt-2 tabular-nums">{lkr(t.revenue)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {orderCount === 0 && (
                            <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-12 text-center">
                                <p className="text-gray-500 text-sm">No completed orders found for this period.</p>
                                <p className="text-gray-700 text-xs mt-1">Try a different date range or check back after processing some orders.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ReportsView;
