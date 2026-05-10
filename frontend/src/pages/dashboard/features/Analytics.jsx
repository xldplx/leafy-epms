import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import { calculateCPM, generateSCurveData } from '../../../utils/cpmHelpers';
import { computeEvm, indexColor } from '../../../utils/evmHelpers';
import { apiFetch } from '../../../utils/api';
import {
    ZoomIn, ZoomOut, MoveHorizontal, ChevronRight,
    Filter, Calendar, Target,
    Info, AlertCircle, CheckCircle2, Clock, Loader2
} from 'lucide-react';

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = ['Cost S-Curve', 'Manpower S-Curve', 'Progress S-Curve', 'Gantt Chart', 'CPM Analysis'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtIDR  = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);
const fmtHrs  = (v) => `${Math.round(v || 0)} hrs`;
const fmtPct  = (v) => `${(v || 0).toFixed(1)}%`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
function CurveTooltip({ active, payload, label, mode }) {
    if (!active || !payload?.length) return null;
    const labels = { PV: 'Planned Value', EV: 'Earned Value', AC: 'Actual Cost' };
    const fmts   = { cost: fmtIDR, hours: fmtHrs, pct: fmtPct };
    const f = fmts[mode] || ((v) => v);
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl p-4 text-xs min-w-52 ring-1 ring-slate-900/5 animate-in fade-in zoom-in duration-200">
            <p className="font-black text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                {label}
            </p>
            <div className="space-y-2.5">
                {payload.map(p => (
                    <div key={p.dataKey} className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">{labels[p.dataKey]}</span>
                        </div>
                        <span className="text-slate-800 font-mono font-black">{f(p.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── GANTT CHART COMPONENT ───────────────────────────────────────────────────
function GanttChart({ tasks = [], cpmResults = [] }) {
    const [zoom, setZoom] = useState(1.5);
    const containerRef = useRef(null);
    const today = new Date();

    if (!tasks || tasks.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
            <AlertCircle className="w-12 h-12 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">No schedule data available for this project</p>
        </div>
    );

    const allDates = tasks.flatMap(t => [new Date(t.planned_start), new Date(t.planned_end)]).filter(d => !isNaN(d.getTime()));
    
    if (allDates.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
            <AlertCircle className="w-12 h-12 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">Invalid task dates in schedule</p>
        </div>
    );

    const minDate  = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate  = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    minDate.setDate(minDate.getDate() - 10);
    maxDate.setDate(maxDate.getDate() + 20);
    
    const totalMs  = maxDate - minDate;
    const baseWidth = 1200 * zoom;

    const getX = (dateStr) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 0;
        return ((d - minDate) / totalMs) * baseWidth;
    };
    
    const getWidth = (s, e) => {
        const start = new Date(s);
        const end = new Date(e);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 8;
        return Math.max(((end - start) / totalMs) * baseWidth, 8);
    };
    
    const todayX = getX(today);

    const months = [];
    let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cur <= maxDate) {
        months.push({ label: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), x: getX(cur) });
        cur.setMonth(cur.getMonth() + 1);
    }

    const cpmMap = Object.fromEntries(cpmResults.map(c => [c.id, c]));

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] overflow-hidden border border-slate-200/60 shadow-xl shadow-slate-200/20">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setZoom(Math.max(1, zoom - 0.25))} className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all active:scale-90 shadow-sm">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-black text-slate-600 px-3 min-w-[80px] text-center uppercase tracking-tighter">Zoom {Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all active:scale-90 shadow-sm">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 group">
                        <div className="w-3 h-3 rounded-sm bg-red-500 shadow-sm shadow-red-200" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-red-500 transition-colors">Critical</span>
                    </div>
                    <div className="flex items-center gap-2 group">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500 shadow-sm shadow-emerald-200" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Standard</span>
                    </div>
                </div>
            </div>

            <div className="relative flex-1 flex overflow-hidden">
                <div className="w-64 border-r border-slate-100 bg-white z-20 shadow-[10px_0_20px_-10px_rgba(0,0,0,0.03)] shrink-0">
                    <div className="h-12 border-b border-slate-100 bg-slate-50/50 flex items-center px-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Work Breakdown</span>
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-48px)] [scrollbar-width:none]">
                        {tasks.map(t => (
                            <div key={t.id} className="h-16 border-b border-slate-50 flex flex-col justify-center px-6 group hover:bg-emerald-50/30 transition-all cursor-default">
                                <p className="text-xs font-black text-slate-700 truncate group-hover:text-emerald-700 transition-colors leading-tight">{t.task_name}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[9px] font-mono font-bold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{t.wbs_code}</span>
                                    <span className="text-[9px] font-bold text-slate-400">{t.planned_duration}d</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-auto relative bg-slate-50/30 [scrollbar-width:thin]" ref={containerRef}>
                    <div style={{ width: `${baseWidth}px`, height: '100%' }} className="relative">
                        {months.map((m, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200/40" style={{ left: `${m.x}px` }}>
                                <div className="h-12 border-b border-slate-100 flex items-center px-3 bg-white/50">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
                                </div>
                            </div>
                        ))}

                        <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-10 shadow-[0_0_8px_rgba(239,68,68,0.3)]" style={{ left: `${todayX}px` }}>
                            <div className="absolute top-12 -translate-x-1/2 px-2.5 py-1 bg-red-500 text-white text-[9px] font-black rounded-full shadow-lg shadow-red-200 tracking-tighter">TODAY</div>
                        </div>

                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                            {tasks.map(t => (t.predecessors || []).map(predId => {
                                const pred = tasks.find(pt => pt.id === predId);
                                if (!pred) return null;
                                const x1 = getX(pred.planned_end);
                                const y1 = tasks.indexOf(pred) * 64 + 32 + 48;
                                const x2 = getX(t.planned_start);
                                const y2 = tasks.indexOf(t) * 64 + 32 + 48;
                                return (
                                    <path key={`${predId}-${t.id}`} d={`M ${x1} ${y1} L ${x1 + 15} ${y1} L ${x1 + 15} ${y2} L ${x2} ${y2}`} 
                                          fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
                                );
                            }))}
                        </svg>

                        <div className="pt-12">
                            {tasks.map((t, idx) => {
                                const cpm = cpmMap[t.id];
                                const x = getX(t.planned_start);
                                const w = getWidth(t.planned_start, t.planned_end);
                                const isCrit = cpm?.isCritical;

                                return (
                                    <div key={t.id} className="h-16 relative flex items-center group">
                                        <div 
                                            className={`h-8 rounded-xl relative transition-all duration-300 group-hover:scale-[1.02] shadow-sm overflow-hidden border-2 ${
                                                isCrit ? 'bg-red-50 border-red-200/50 shadow-red-100' : 'bg-emerald-50 border-emerald-200/50 shadow-emerald-100'
                                            }`}
                                            style={{ left: `${x}px`, width: `${w}px` }}
                                        >
                                            <div 
                                                className={`h-full opacity-90 transition-all duration-1000 ease-out ${isCrit ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                                                style={{ width: `${t.pct_complete}%` }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                                                <span className={`text-[10px] font-black tracking-tighter ${t.pct_complete > 30 ? 'text-white' : 'text-slate-500'}`}>
                                                    {t.pct_complete}%
                                                </span>
                                            </div>
                                        </div>
                                        {cpm?.float > 0 && (
                                            <div className="absolute h-1.5 bg-slate-200/60 rounded-full border border-slate-300/20"
                                                 style={{ left: `${x + w}px`, width: `${(cpm.float / totalMs) * baseWidth}px`, top: '50%', transform: 'translateY(-50%)' }}>
                                                <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-white border-2 border-slate-300" title={`Float: ${cpm.float} days`} />
                                            </div>
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

    // Real data from API — replaces dummyProjects and dummyPlanTasks
    const [projects, setProjects]         = useState([]);
    const [projectTasks, setProjectTasks] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingTasks, setLoadingTasks]       = useState(false);

    const [selectedProjectId, setSelectedProjectId] = useState(null);

    // Fetch all projects on mount
    useEffect(() => {
        apiFetch('/projects')
            .then(res => {
                const list = res.data || [];
                setProjects(list);
                if (list.length > 0) setSelectedProjectId(list[0].id);
            })
            .catch(console.error)
            .finally(() => setLoadingProjects(false));
    }, []);

    // Fetch tasks whenever selected project changes
    useEffect(() => {
        if (!selectedProjectId) return;
        setLoadingTasks(true);
        apiFetch(`/projects/${selectedProjectId}/tasks`)
            .then(res => setProjectTasks(res.data || []))
            .catch(console.error)
            .finally(() => setLoadingTasks(false));
    }, [selectedProjectId]);

    const project = useMemo(() => {
        if (!projects || projects.length === 0) return null;
        return projects.find(p => p.id === selectedProjectId) || projects[0];
    }, [selectedProjectId, projects]);

    const cpmResults = useMemo(() => {
        try {
            return calculateCPM(projectTasks);
        } catch (err) {
            console.error("CPM Calculation Error:", err);
            return [];
        }
    }, [projectTasks]);
    
    const costData = useMemo(() => {
        if (!project || !project.planned_start || !project.planned_end) return [];
        return generateSCurveData(projectTasks, project.planned_start, project.planned_end);
    }, [projectTasks, project]);
    
    const manpowerData = useMemo(() => {
        if (!project || !project.planned_start || !project.planned_end) return [];
        const tasksWithHours = projectTasks.map(t => ({
            ...t,
            planned_cost: Number(t.planned_hours) || 0,
            actual_cost: Number(t.actual_hours) || 0
        }));
        return generateSCurveData(tasksWithHours, project.planned_start, project.planned_end);
    }, [projectTasks, project]);

    const progressData = useMemo(() => {
        if (!project || !project.planned_start || !project.planned_end) return [];
        const tasksWithWeights = projectTasks.map(t => ({
            ...t,
            planned_cost: (Number(t.weight) || 0) * 100,
            actual_cost: (Number(t.pct_complete || 0) / 100) * ((Number(t.weight) || 0) * 100)
        }));
        return generateSCurveData(tasksWithWeights, project.planned_start, project.planned_end);
    }, [projectTasks, project]);

    // Compute live CPI from real tasks for Performance Index sidebar
    const evmMetrics = useMemo(() => {
        if (!projectTasks.length || !project) return null;
        return computeEvm(projectTasks, project.schedule_pct);
    }, [projectTasks, project]);

    const perfIndex = evmMetrics?.CPI ?? null;
    const perfColor = perfIndex === null ? { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'N/A' }
        : perfIndex >= 1   ? { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'ON TRACK' }
        : perfIndex >= 0.9 ? { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'AT RISK'  }
        :                    { bg: 'bg-red-100',      text: 'text-red-700',     border: 'border-red-200',     label: 'CRITICAL' };

    const curveConfig = {
        'Cost S-Curve': { 
            data: costData, mode: 'cost', yLabel: 'Currency (IDR)', 
            desc: 'Financial health analysis comparing budget (PV) against value earned (EV) and real spend (AC).',
            formatter: fmtIDR, color: '#10b981'
        },
        'Manpower S-Curve': { 
            data: manpowerData, mode: 'hours', yLabel: 'Labor Hours', 
            desc: 'Workforce productivity analysis comparing planned man-hours vs. actual hours recorded.',
            formatter: fmtHrs, color: '#6366f1'
        },
        'Progress S-Curve': { 
            data: progressData, mode: 'pct', yLabel: 'Percentage (%)', 
            desc: 'Physical schedule performance tracking the cumulative project weight completion.',
            formatter: fmtPct, color: '#f59e0b'
        }
    };

    const activeConfig = curveConfig[activeTab];
    const isCurveTab = !!activeConfig;
    const criticalPath = cpmResults.filter(t => t.isCritical);

    if (loadingProjects) return (
        <div className="h-screen flex items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" /> Loading projects...
        </div>
    );

    if (!project) return (
        <div className="h-screen flex items-center justify-center text-slate-500">
            <AlertCircle className="w-6 h-6 mr-2" />
            Project data not found
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            {/* HEADER & PROJECT SELECTOR */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Project Analytics</h2>
                    <p className="text-slate-500 mt-1">Predictive scheduling, EVM analytics, and resource intelligence</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select 
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                            className="bg-transparent text-slate-700 text-sm font-bold outline-none cursor-pointer min-w-[240px]"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* TAB STRIP */}
            <div className="flex gap-2 bg-white/60 p-2 rounded-[1.5rem] backdrop-blur-xl sticky top-0 z-40 border border-slate-200/50 shadow-sm overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${
                            activeTab === tab 
                            ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 -translate-y-0.5' 
                            : 'text-slate-400 hover:text-slate-800 hover:bg-white transition-all'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Loading tasks indicator */}
            {loadingTasks && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading task data...
                </div>
            )}

            {/* CONTENT AREA */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {isCurveTab && (
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Sidebar Metrics */}
                        <div className="xl:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-emerald-500" />
                                    Project Status
                                </h4>
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Performance Index</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl font-bold text-slate-800">
                                                {perfIndex !== null ? perfIndex.toFixed(2) : '—'}
                                            </span>
                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${perfColor.bg} ${perfColor.text} ${perfColor.border}`}>
                                                {perfColor.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Timeline</p>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><Calendar className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Start Date</p>
                                                    <p className="text-xs font-bold text-slate-700">{fmtDate(project.planned_start)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><Calendar className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Target Finish</p>
                                                    <p className="text-xs font-bold text-slate-700">{fmtDate(project.planned_end)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-3xl shadow-sm text-white relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="w-4 h-4 text-emerald-400" />
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Analytics Insights</p>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-300 font-medium">
                                        {activeConfig.desc}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="xl:col-span-3 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{activeTab}</h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{activeConfig.yLabel} Cumulative Trend</p>
                                </div>
                                <div className="flex gap-6 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PV</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">EV</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AC</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[450px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={activeConfig.data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="6 6" stroke="#f1f5f9" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} 
                                            tickLine={false} 
                                            axisLine={false}
                                            minTickGap={40}
                                            tickFormatter={v => v ? new Date(v).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : ''}
                                        />
                                        <YAxis 
                                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tickFormatter={v => {
                                                if (activeTab === 'Cost S-Curve') return `${(v / 1e6).toFixed(0)}M`;
                                                return v;
                                            }}
                                        />
                                        <Tooltip content={<CurveTooltip mode={activeConfig.mode} />} />
                                        <Area type="monotone" dataKey="EV" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorEV)" />
                                        <Line type="monotone" dataKey="PV" stroke="#cbd5e1" strokeWidth={3} dot={false} strokeDasharray="8 6" />
                                        <Line type="monotone" dataKey="AC" stroke="#f59e0b" strokeWidth={3} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Gantt Chart' && (
                    <div className="h-[calc(100vh-320px)] min-h-[600px] animate-in fade-in zoom-in duration-500">
                        <GanttChart tasks={projectTasks} cpmResults={cpmResults} />
                    </div>
                )}

                {activeTab === 'CPM Analysis' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Critical Path Legend */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                            <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                                <div className="p-3 bg-red-50 rounded-xl border border-red-100 shrink-0">
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Critical Path Identification</h3>
                                        <p className="text-slate-500 text-sm mt-1 max-w-3xl leading-relaxed">
                                            The following sequence of tasks determines the shortest possible project duration. Any delay in these activities will directly impact the final completion date.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {criticalPath.length === 0 ? (
                                            <p className="text-slate-400 text-sm">No critical path identified — add tasks with predecessors and durations.</p>
                                        ) : criticalPath.map((t, i) => (
                                            <div key={t.id} className="flex items-center gap-2">
                                                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 group hover:border-red-200 transition-colors cursor-default">
                                                    <span className="text-[10px] font-mono font-bold text-red-600 opacity-60">{t.wbs_code}</span>
                                                    <span className="text-xs font-bold text-slate-700 group-hover:text-red-600 transition-colors">{t.task_name}</span>
                                                </div>
                                                {i < criticalPath.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Table */}
                        <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-xl shadow-slate-200/10 overflow-hidden flex flex-col h-[calc(100vh-500px)] min-h-[500px]">
                            <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">CPM Calculation Matrix</h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Early & Late boundaries with Float identification</p>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Automated Pass</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Float</span>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-auto flex-1 [scrollbar-width:thin]">
                                <table className="w-full text-left border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur-md">
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                                            <th className="px-10 py-6 font-black">WBS & Node Identity</th>
                                            <th className="px-6 py-6 font-black">Time (Days)</th>
                                            <th className="px-6 py-6 font-black text-emerald-600">Perfect Scenario (ES/EF)</th>
                                            <th className="px-6 py-6 font-black text-amber-600">Deadline Scenario (LS/LF)</th>
                                            <th className="px-6 py-6 font-black">Wiggle Room</th>
                                            <th className="px-10 py-6 font-black text-right">Risk Level</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {cpmResults.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-10 py-16 text-center text-slate-400">
                                                    No CPM data — add tasks with planned durations and predecessor links.
                                                </td>
                                            </tr>
                                        ) : cpmResults.map(t => (
                                            <tr key={t.id} className={`group transition-all hover:bg-slate-50/50 ${t.isCritical ? 'bg-red-50/20' : ''}`}>
                                                <td className="px-10 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${t.isCritical ? 'bg-red-500 shadow-red-200' : 'bg-slate-300 shadow-slate-100'}`} />
                                                        <div>
                                                            <p className="font-black text-slate-700 group-hover:text-emerald-700 transition-colors leading-tight">{t.task_name}</p>
                                                            <p className="text-[10px] font-mono font-black text-slate-400 mt-0.5">{t.wbs_code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-xs font-black text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">{t.planned_duration}d</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 font-mono text-xs">
                                                        <span className="text-emerald-600 font-black">{t.es}</span>
                                                        <div className="w-4 h-[2px] bg-slate-100" />
                                                        <span className="text-emerald-700 font-black">{t.ef}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 font-mono text-xs">
                                                        <span className="text-amber-600 font-black">{t.ls}</span>
                                                        <div className="w-4 h-[2px] bg-slate-100" />
                                                        <span className="text-amber-700 font-black">{t.lf}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-tighter shadow-sm border ${
                                                            t.float === 0 
                                                            ? 'bg-red-500 text-white border-red-400' 
                                                            : 'bg-white text-slate-600 border-slate-200'
                                                        }`}>
                                                            {t.float} DAYS
                                                        </span>
                                                        {t.float > 0 && (
                                                            <div className="flex-1 max-w-[60px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-slate-300" style={{ width: `${Math.min(t.float * 5, 100)}%` }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-5 text-right">
                                                    {t.isCritical ? (
                                                        <span className="inline-flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-[0.15em] bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 animate-pulse">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Critical
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.15em] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Stable
                                                        </span>
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
        </div>
    );
}