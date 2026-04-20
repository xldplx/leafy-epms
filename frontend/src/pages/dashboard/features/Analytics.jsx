import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import { dummyProjects, dummyPlanTasks, dummyProjectsEvm } from '../../../data/dummyData';
import { calculateCPM, generateSCurveData } from '../../../utils/cpmHelpers';
import { formatCurrency } from '../../../utils/evmHelpers';
import { ZoomIn, ZoomOut, Maximize2, MoveHorizontal, ChevronRight, ChevronLeft } from 'lucide-react';

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = ['Cost S-Curve', 'Manpower S-Curve', 'Progress S-Curve', 'Gantt Chart', 'CPM Analysis'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtIDR  = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
const fmtHrs  = (v) => `${Math.round(v)} hrs`;
const fmtPct  = (v) => `${v.toFixed(1)}%`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
function CurveTooltip({ active, payload, label, mode }) {
    if (!active || !payload?.length) return null;
    const labels = { PV: 'Planned Value', EV: 'Earned Value', AC: 'Actual Cost' };
    const fmts   = { cost: fmtIDR, hours: fmtHrs, pct: fmtPct };
    const f = fmts[mode] || ((v) => v);
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-44 ring-1 ring-slate-900/5">
            <p className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {label}
            </p>
            <div className="space-y-1.5">
                {payload.map(p => (
                    <div key={p.dataKey} className="flex justify-between items-center gap-4">
                        <span style={{ color: p.color }} className="font-semibold text-[10px] uppercase tracking-wider">{labels[p.dataKey]}</span>
                        <span className="text-slate-700 font-mono font-bold">{f(p.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── GANTT CHART COMPONENT ───────────────────────────────────────────────────
function GanttChart({ tasks, cpmResults }) {
    const [zoom, setZoom] = useState(1); // 1 = monthly, 2 = bi-weekly, 4 = weekly
    const containerRef = useRef(null);
    const today = new Date('2026-04-07');

    const allDates = tasks.flatMap(t => [new Date(t.planned_start), new Date(t.planned_end)]);
    const minDate  = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate  = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Buffer dates for better visualization
    minDate.setDate(minDate.getDate() - 15);
    maxDate.setDate(maxDate.getDate() + 15);
    
    const totalMs  = maxDate - minDate;
    const baseWidth = 1000 * zoom;

    const getX = (dateStr) => ((new Date(dateStr) - minDate) / totalMs) * baseWidth;
    const getWidth = (s, e) => Math.max(((new Date(e) - new Date(s)) / totalMs) * baseWidth, 5);
    const todayX = getX(today);

    // Grid markers (months)
    const months = [];
    let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cur <= maxDate) {
        months.push({ label: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), x: getX(cur) });
        cur.setMonth(cur.getMonth() + 1);
    }

    const cpmMap = Object.fromEntries(cpmResults.map(c => [c.id, c]));

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="p-1.5 hover:bg-white rounded-lg border border-slate-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-600 px-2 min-w-20 text-center">{Math.round(zoom * 100)}% Zoom</span>
                    <button onClick={() => setZoom(Math.min(5, zoom + 0.5))} className="p-1.5 hover:bg-white rounded-lg border border-slate-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400" /> Critical Path</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500" /> On Track</div>
                </div>
            </div>

            <div className="relative flex-1 flex overflow-hidden">
                {/* Fixed Task List */}
                <div className="w-56 border-r border-slate-100 bg-white z-20 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                    <div className="h-10 border-b border-slate-50 bg-slate-50/30 flex items-center px-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks & WBS</span>
                    </div>
                    {tasks.map(t => (
                        <div key={t.id} className="h-14 border-b border-slate-50 flex flex-col justify-center px-4 group hover:bg-slate-50 transition-colors cursor-default">
                            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-emerald-700">{t.task_name}</p>
                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">{t.wbs_code}</p>
                        </div>
                    ))}
                </div>

                {/* Scrollable Timeline */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-slate-50/20" ref={containerRef}>
                    <div style={{ width: `${baseWidth}px`, height: '100%' }} className="relative">
                        
                        {/* Month Columns */}
                        {months.map((m, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200/50" style={{ left: `${m.x}px` }}>
                                <span className="absolute top-2 left-2 text-[9px] font-bold text-slate-400 uppercase">{m.label}</span>
                            </div>
                        ))}

                        {/* Today Marker */}
                        <div className="absolute top-0 bottom-0 w-px bg-red-500/40 z-10" style={{ left: `${todayX}px` }}>
                            <div className="absolute top-0 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-b">TODAY</div>
                        </div>

                        {/* Dependency Lines (Simplified SVG) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                            {tasks.map(t => (t.predecessors || []).map(predId => {
                                const pred = tasks.find(pt => pt.id === predId);
                                if (!pred) return null;
                                const x1 = getX(pred.planned_end);
                                const y1 = tasks.indexOf(pred) * 56 + 28 + 40; // 40 is header offset, 56 is row height
                                const x2 = getX(t.planned_start);
                                const y2 = tasks.indexOf(t) * 56 + 28 + 40;
                                return (
                                    <path key={`${predId}-${t.id}`} d={`M ${x1} ${y1} L ${x1 + 10} ${y1} L ${x1 + 10} ${y2} L ${x2} ${y2}`} 
                                          fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
                                );
                            }))}
                        </svg>

                        {/* Task Bars */}
                        <div className="pt-10">
                            {tasks.map((t, idx) => {
                                const cpm = cpmMap[t.id];
                                const x = getX(t.planned_start);
                                const w = getWidth(t.planned_start, t.planned_end);
                                const isCrit = cpm?.isCritical;

                                return (
                                    <div key={t.id} className="h-14 relative flex items-center group">
                                        <div 
                                            className={`h-7 rounded-lg relative transition-all duration-300 group-hover:ring-2 group-hover:ring-offset-1 shadow-sm overflow-hidden ${
                                                isCrit ? 'bg-red-50 border border-red-200 group-hover:ring-red-300' : 'bg-white border border-slate-200 group-hover:ring-emerald-300'
                                            }`}
                                            style={{ left: `${x}px`, width: `${w}px` }}
                                        >
                                            {/* Progress Fill */}
                                            <div 
                                                className={`h-full opacity-80 transition-all duration-700 ${isCrit ? 'bg-red-400' : 'bg-emerald-500'}`}
                                                style={{ width: `${t.pct_complete}%` }}
                                            />
                                            {/* Labels */}
                                            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                                                <span className={`text-[9px] font-bold ${t.pct_complete > 40 ? 'text-white' : 'text-slate-500'}`}>
                                                    {t.pct_complete}%
                                                </span>
                                            </div>
                                        </div>
                                        {/* Float Bar */}
                                        {cpm?.float > 0 && (
                                            <div className="absolute h-1 bg-slate-300/30 rounded-full"
                                                 style={{ left: `${x + w}px`, width: `${(cpm.float / totalMs) * baseWidth}px`, top: '50%' }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Analytics() {
    const [activeTab, setActiveTab] = useState('Cost S-Curve');
    const project = dummyProjects[0]; // Focus on project 1 for analytics demo

    // Calculate Analytics Data
    const cpmResults = useMemo(() => calculateCPM(dummyPlanTasks), []);
    
    const costData = useMemo(() => generateSCurveData(dummyPlanTasks, project.planned_start, project.planned_end), []);
    
    const manpowerData = useMemo(() => {
        // Map tasks to include hours for S-Curve logic
        const tasksWithHours = dummyPlanTasks.map(t => ({
            ...t,
            planned_cost: t.planned_hours,
            actual_cost: t.actual_hours || 0
        }));
        return generateSCurveData(tasksWithHours, project.planned_start, project.planned_end);
    }, []);

    const progressData = useMemo(() => {
        // Map tasks to include progress weights
        const tasksWithWeights = dummyPlanTasks.map(t => ({
            ...t,
            planned_cost: t.weight * 100,
            actual_cost: (t.pct_complete / 100) * (t.weight * 100)
        }));
        return generateSCurveData(tasksWithWeights, project.planned_start, project.planned_end);
    }, []);

    const curveConfig = {
        'Cost S-Curve': { 
            data: costData, 
            mode: 'cost', 
            yLabel: 'IDR (Cumulative)', 
            desc: 'Real-time monitoring of Planned Value (PV), Earned Value (EV), and Actual Cost (AC) in IDR.',
            formatter: fmtIDR
        },
        'Manpower S-Curve': { 
            data: manpowerData, 
            mode: 'hours', 
            yLabel: 'Hours (Cumulative)', 
            desc: 'Comparison of planned vs. actual man-hours to monitor labor productivity and allocation.',
            formatter: fmtHrs
        },
        'Progress S-Curve': { 
            data: progressData, 
            mode: 'pct', 
            yLabel: 'Progress % (Cumulative)', 
            desc: 'Physical project completion percentage against the baseline project schedule.',
            formatter: fmtPct
        }
    };

    const activeConfig = curveConfig[activeTab];
    const isCurveTab = !!activeConfig;
    const criticalPath = cpmResults.filter(t => t.isCritical);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">Analytics Center</h2>
                    <p className="text-slate-500 mt-2 font-medium">Strategic project intelligence, S-Curves, and Critical Path analysis</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Maximize2 className="w-5 h-5" />
                    </div>
                    <div className="pr-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Project</p>
                        <p className="text-sm font-bold text-slate-700">{project.project_code}</p>
                    </div>
                </div>
            </div>

            {/* TAB STRIP */}
            <div className="flex gap-2 bg-slate-100/80 p-1.5 rounded-2xl backdrop-blur-sm sticky top-0 z-30 border border-slate-200/50 overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                            activeTab === tab 
                            ? 'bg-white text-emerald-700 shadow-md ring-1 ring-slate-200 translate-y-[-1px]' 
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── S-CURVE TABS ── */}
            {isCurveTab && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Metrics Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Summary</h4>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1">Status</p>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold ring-1 ring-emerald-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        On Schedule
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-1">Latest Update</p>
                                    <p className="text-lg font-black text-slate-800 font-mono">
                                        {activeConfig.formatter(activeConfig.data[activeConfig.data.length - 1]?.EV || 0)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">Earned Value (To Date)</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-900 p-6 rounded-3xl shadow-xl shadow-emerald-900/10 text-white">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Analysis Insight</p>
                            <p className="text-xs leading-relaxed text-emerald-50/80 italic font-medium">
                                "{activeConfig.desc}"
                            </p>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{activeTab}</h3>
                                <p className="text-xs text-slate-400 font-medium">Monthly Cumulative Projection</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-1 rounded-full bg-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-400">PV</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-1 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-400">EV</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-1 rounded-full bg-amber-400" />
                                    <span className="text-[10px] font-bold text-slate-400">AC</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activeConfig.data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                    <defs>
                                        <filter id="shadow" height="200%">
                                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                            <feOffset dx="0" dy="4" result="offsetblur" />
                                            <feComponentTransfer><feFuncA type="linear" slope="0.1"/></feComponentTransfer>
                                            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                                        </filter>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                                        tickLine={false} 
                                        axisLine={false}
                                        minTickGap={30}
                                        tickFormatter={v => new Date(v).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={v => {
                                            if (activeTab === 'Cost S-Curve') return `${(v / 1e6).toFixed(0)}M`;
                                            return v;
                                        }}
                                    />
                                    <Tooltip content={<CurveTooltip mode={activeConfig.mode} />} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="PV" 
                                        stroke="#cbd5e1" 
                                        strokeWidth={3} 
                                        dot={false} 
                                        strokeDasharray="8 6" 
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="EV" 
                                        stroke="#10b981" 
                                        strokeWidth={4} 
                                        dot={false} 
                                        filter="url(#shadow)"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="AC" 
                                        stroke="#f59e0b" 
                                        strokeWidth={3} 
                                        dot={false} 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* ── GANTT CHART TAB ── */}
            {activeTab === 'Gantt Chart' && (
                <div className="h-[calc(100vh-300px)] min-h-[500px]">
                    <GanttChart tasks={dummyPlanTasks} cpmResults={cpmResults} />
                </div>
            )}

            {/* ── CPM ANALYSIS TAB ── */}
            {activeTab === 'CPM Analysis' && (
                <div className="space-y-6">
                    {/* Critical Path Hero */}
                    <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-[2rem] p-8 text-white shadow-xl shadow-red-200/50">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                <MoveHorizontal className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Critical Path Detected</h3>
                                <p className="text-red-100 text-sm font-medium">These {criticalPath.length} tasks have ZERO float. Any delay will impact project completion.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {criticalPath.map((t, i) => (
                                <React.Fragment key={t.id}>
                                    <div className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center gap-3">
                                        <span className="text-[10px] font-black opacity-60 font-mono">{t.wbs_code}</span>
                                        <span className="text-xs font-bold">{t.task_name}</span>
                                    </div>
                                    {i < criticalPath.length - 1 && <ChevronRight className="w-4 h-4 mt-2.5 opacity-40" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Full Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-450px)] min-h-[400px]">
                        <div className="p-8 border-b border-slate-50 shrink-0">
                            <h3 className="text-lg font-bold text-slate-800">Forward & Backward Pass Calculations</h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">Detailed breakdown of ES, EF, LS, LF, and Float per task node</p>
                        </div>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left relative border-separate border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm">
                                    <tr className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black">
                                        <th className="px-8 py-5 border-b border-slate-100">WBS & Task Name</th>
                                        <th className="px-4 py-5 border-b border-slate-100">Duration</th>
                                        <th className="px-4 py-5 border-b border-slate-100 text-emerald-600">Early (S/F)</th>
                                        <th className="px-4 py-5 border-b border-slate-100 text-amber-600">Late (S/F)</th>
                                        <th className="px-4 py-5 border-b border-slate-100">Total Float</th>
                                        <th className="px-8 py-5 border-b border-slate-100 text-right">Impact</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-50">
                                    {cpmResults.map(t => (
                                        <tr key={t.id} className={`group transition-all hover:bg-slate-50/50 ${t.isCritical ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${t.isCritical ? 'bg-red-500' : 'bg-slate-300'}`} />
                                                    <div>
                                                        <p className="font-bold text-slate-700">{t.task_name}</p>
                                                        <p className="text-[10px] font-mono font-bold text-slate-400">{t.wbs_code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{t.planned_duration}d</span>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-xs">
                                                <span className="text-emerald-600 font-bold">{t.es}</span>
                                                <span className="mx-1 text-slate-300">→</span>
                                                <span className="text-emerald-700 font-bold">{t.ef}</span>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-xs">
                                                <span className="text-amber-600 font-bold">{t.ls}</span>
                                                <span className="mx-1 text-slate-300">→</span>
                                                <span className="text-amber-700 font-bold">{t.lf}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${
                                                    t.float === 0 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {t.float} DAYS
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                {t.isCritical ? (
                                                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">High Risk</span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Normal</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
