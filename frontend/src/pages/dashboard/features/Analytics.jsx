import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { calculateCPM, generateSCurveData } from '../../../utils/cpmHelpers';
import { computeEvm, indexColor } from '../../../utils/evmHelpers';
import { apiFetch } from '../../../utils/api';
import { useTranslation } from '../../../utils/i18n';
import { ZoomIn, ZoomOut, ChevronRight, Filter, Calendar, Target, Info, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

const fmtIDR  = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);
const fmtHrs  = (v) => `${Math.round(v || 0)} hrs`;
const fmtPct  = (v) => `${(v || 0).toFixed(1)}%`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

function CurveTooltip({ active, payload, label, mode }) {
    if (!active || !payload?.length) return null;
    const fmts = { cost: fmtIDR, hours: fmtHrs, pct: fmtPct };
    const f = fmts[mode] || ((v) => v);
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl p-4 text-xs min-w-52 ring-1 ring-slate-900/5">
            <p className="font-black text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />{label}
            </p>
            <div className="space-y-2.5">
                {payload.map(p => (
                    <div key={p.dataKey} className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">{p.dataKey}</span>
                        </div>
                        <span className="text-slate-800 font-mono font-black">{f(p.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GanttChart({ tasks = [], cpmResults = [], t }) {
    const [zoom, setZoom] = useState(1.5);
    const containerRef = useRef(null);
    const today = new Date();

    if (!tasks || tasks.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <AlertCircle className="w-12 h-12 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">{t('analytics.noSchedule')}</p>
        </div>
    );

    const allDates = tasks.flatMap(task => [new Date(task.planned_start), new Date(task.planned_end)]).filter(d => !isNaN(d.getTime()));
    if (allDates.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <AlertCircle className="w-12 h-12 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">{t('analytics.invalidDates')}</p>
        </div>
    );

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    minDate.setDate(minDate.getDate() - 10);
    maxDate.setDate(maxDate.getDate() + 20);
    const totalMs  = maxDate - minDate;
    const baseWidth = 1200 * zoom;

    const getX = (dateStr) => { const d = new Date(dateStr); if (isNaN(d.getTime())) return 0; return ((d - minDate) / totalMs) * baseWidth; };
    const getWidth = (s, e) => { const start = new Date(s); const end = new Date(e); if (isNaN(start.getTime()) || isNaN(end.getTime())) return 8; return Math.max(((end - start) / totalMs) * baseWidth, 8); };
    const todayX = getX(today);

    const months = [];
    let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cur <= maxDate) {
        months.push({ label: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), x: getX(cur) });
        cur.setMonth(cur.getMonth() + 1);
    }

    // Generate daily grid lines
    const days = [];
    let dayCur = new Date(minDate);
    while (dayCur <= maxDate) {
        days.push({ x: getX(dayCur) });
        dayCur.setDate(dayCur.getDate() + 1);
    }

    const cpmMap = Object.fromEntries(cpmResults.map(c => [c.id, c]));

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-30">
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <button onClick={() => setZoom(Math.max(1, zoom - 0.25))} className="p-3 hover:bg-white rounded-xl text-slate-500 transition-all active:scale-95 shadow-sm">
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-bold text-slate-600 px-4 min-w-[100px] text-center uppercase tracking-tighter">Zoom {Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="p-3 hover:bg-white rounded-xl text-slate-500 transition-all active:scale-95 shadow-sm">
                        <ZoomIn className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-lg bg-red-500 shadow-sm shadow-red-200" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('evm.critical')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-lg bg-emerald-500 shadow-sm shadow-emerald-200" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('analytics.stable')}</span>
                    </div>
                </div>
            </div>
            <div className="relative flex-1 flex overflow-hidden">
                <div className="w-72 border-r border-slate-100 bg-white z-20 shadow-[10px_0_20px_-10px_rgba(0,0,0,0.05)] shrink-0">
                    <div className="h-14 border-b border-slate-100 bg-slate-50 flex items-center px-6">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">{t('analytics.workBreakdown')}</span>
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-56px)] [scrollbar-width:none]">
                        {tasks.map(task => (
                            <div key={task.id} className="h-16 border-b border-slate-50 flex flex-col justify-center px-6 group hover:bg-emerald-50/30 transition-all cursor-default">
                                <p className="text-xs font-bold text-slate-700 truncate group-hover:text-emerald-700 transition-colors leading-tight">{task.task_name}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{task.wbs_code}</span>
                                    <span className="text-[9px] font-semibold text-slate-400">{task.planned_duration}d</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-auto relative bg-slate-50 [scrollbar-width:thin]" ref={containerRef}>
                    <div style={{ width: `${baseWidth}px`, height: '100%' }} className="relative">
                        {/* Daily vertical grid lines */}
                        {days.map((d, i) => (
                            <div key={`day-${i}`} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${d.x}px` }} />
                        ))}
                        
                        {/* Month headers */}
                        {months.map((m, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l-2 border-slate-300" style={{ left: `${m.x}px` }}>
                                <div className="h-14 border-b border-slate-200 flex items-center px-4 bg-slate-100/80">
                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{m.label}</span>
                                </div>
                            </div>
                        ))}
                        
                        {/* Today's line */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 shadow-[0_0_12px_rgba(239,68,68,0.4)]" style={{ left: `${todayX}px` }}>
                            <div className="absolute top-14 -translate-x-1/2 px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-red-200 tracking-tighter">{t('analytics.today')}</div>
                        </div>
                        
                        {/* Dependency arrows */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                            {tasks.map(task => (task.predecessors || []).map(predId => {
                                const pred = tasks.find(pt => pt.id === predId);
                                if (!pred) return null;
                                const x1 = getX(pred.planned_end), y1 = tasks.indexOf(pred) * 64 + 32 + 56;
                                const x2 = getX(task.planned_start), y2 = tasks.indexOf(task) * 64 + 32 + 56;
                                return <path key={`${predId}-${task.id}`} d={`M ${x1} ${y1} L ${x1+20} ${y1} L ${x1+20} ${y2} L ${x2} ${y2}`} fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 3" />;
                            }))}
                        </svg>
                        
                        {/* Task bars */}
                        <div className="pt-14">
                            {tasks.map((task) => {
                                const cpm  = cpmMap[task.id];
                                const x    = getX(task.planned_start);
                                const w    = getWidth(task.planned_start, task.planned_end);
                                const isCrit = cpm?.isCritical;
                                return (
                                    <div key={task.id} className="h-16 relative flex items-center group">
                                        <div className={`h-9 rounded-xl relative transition-all duration-300 group-hover:scale-[1.02] shadow-md overflow-hidden border-2 ${isCrit ? 'bg-red-50 border-red-300 shadow-red-100' : 'bg-emerald-50 border-emerald-300 shadow-emerald-100'}`}
                                            style={{ left: `${x}px`, width: `${w}px` }}>
                                            <div className={`h-full opacity-100 transition-all duration-1000 ease-out ${isCrit ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                                                style={{ width: `${task.pct_complete}%` }} />
                                            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                                                <span className={`text-[10px] font-bold tracking-tighter ${task.pct_complete > 30 ? 'text-white' : 'text-slate-700'}`}>{task.pct_complete}%</span>
                                            </div>
                                        </div>
                                        {cpm?.float > 0 && (
                                            <div className="absolute h-2 bg-slate-200 rounded-full border border-slate-300/40"
                                                style={{ left: `${x + w}px`, width: `${(cpm.float / totalMs) * baseWidth}px`, top: '50%', transform: 'translateY(-50%)' }}>
                                                <div className="absolute -right-1.5 -top-1.5 w-4 h-4 rounded-full bg-white border-2 border-slate-300" title={`Float: ${cpm.float} days`} />
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

export default function Analytics() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab]         = useState('cost');
    const [projects, setProjects]           = useState([]);
    const [projectTasks, setProjectTasks]   = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingTasks, setLoadingTasks]       = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const TABS = [
        { key: 'cost',      label: t('analytics.costCurve') },
        { key: 'manpower',  label: t('analytics.manpowerCurve') },
        { key: 'progress',  label: t('analytics.progressCurve') },
        { key: 'gantt',     label: t('analytics.gantt') },
        { key: 'cpm',       label: t('analytics.cpm') },
    ];

    useEffect(() => {
        apiFetch('/projects').then(res => {
            const list = res.data || [];
            setProjects(list);
            if (list.length > 0) setSelectedProjectId(list[0].id);
        }).catch(console.error).finally(() => setLoadingProjects(false));
    }, []);

    useEffect(() => {
        if (!selectedProjectId) return;
        setLoadingTasks(true);
        apiFetch(`/projects/${selectedProjectId}/tasks`)
            .then(res => setProjectTasks(res.data || []))
            .catch(console.error).finally(() => setLoadingTasks(false));
    }, [selectedProjectId]);

    const project = useMemo(() => projects.find(p => p.id === selectedProjectId) || projects[0] || null, [selectedProjectId, projects]);

    const cpmResults = useMemo(() => { try { return calculateCPM(projectTasks); } catch { return []; } }, [projectTasks]);

    const costData = useMemo(() => {
        if (!project?.planned_start || !project?.planned_end) return [];
        return generateSCurveData(projectTasks, project.planned_start, project.planned_end);
    }, [projectTasks, project]);

    const manpowerData = useMemo(() => {
        if (!project?.planned_start || !project?.planned_end) return [];
        return generateSCurveData(projectTasks.map(task => ({ ...task, planned_cost: Number(task.planned_hours) || 0, actual_cost: Number(task.actual_hours) || 0 })), project.planned_start, project.planned_end);
    }, [projectTasks, project]);

    const progressData = useMemo(() => {
        if (!project?.planned_start || !project?.planned_end) return [];
        return generateSCurveData(projectTasks.map(task => ({ ...task, planned_cost: (Number(task.weight) || 0) * 100, actual_cost: (Number(task.pct_complete || 0) / 100) * ((Number(task.weight) || 0) * 100) })), project.planned_start, project.planned_end);
    }, [projectTasks, project]);

    const evmMetrics = useMemo(() => {
        if (!projectTasks.length || !project) return null;
        return computeEvm(projectTasks, project.schedule_pct);
    }, [projectTasks, project]);

    const perfIndex = evmMetrics?.CPI ?? null;
    const perfColor = perfIndex === null ? { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'N/A' }
        : perfIndex >= 1   ? { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: t('evm.onTrack') }
        : perfIndex >= 0.9 ? { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   label: t('evm.atRisk') }
        :                    { bg: 'bg-red-100',      text: 'text-red-700',     border: 'border-red-200',     label: t('evm.critical') };

    const curveConfig = {
        cost:     { data: costData,     mode: 'cost',  yLabel: t('analytics.currency'),    desc: t('analytics.costDesc') },
        manpower: { data: manpowerData, mode: 'hours', yLabel: t('analytics.laborHours'),  desc: t('analytics.manpowerDesc') },
        progress: { data: progressData, mode: 'pct',   yLabel: t('analytics.percentage'),  desc: t('analytics.progressDesc') },
    };
    const activeConfig = curveConfig[activeTab];
    const isCurveTab   = !!activeConfig;
    const criticalPath = cpmResults.filter(task => task.isCritical);

    if (loadingProjects) return (
        <div className="h-screen flex items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" /> {t('analytics.loadingProjects')}
        </div>
    );
    if (!project) return (
        <div className="h-screen flex items-center justify-center text-slate-500">
            <AlertCircle className="w-6 h-6 mr-2" /> {t('analytics.noData')}
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            {/* CONTROLS */}
            <div className="flex justify-end mb-6">
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Select Project</label>
                    <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(Number(e.target.value))}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm font-semibold">
                        {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                    </select>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-2 bg-white/60 p-2 rounded-[1.5rem] backdrop-blur-xl sticky top-0 z-40 border border-slate-200/50 shadow-sm overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${
                            activeTab === tab.key ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 -translate-y-0.5' : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                        }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loadingTasks && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('analytics.loadingTasks')}
                </div>
            )}

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        icon: <Target className="w-5 h-5" />, 
                        bg: 'bg-slate-100', 
                        cls: 'text-slate-500', 
                        label: 'CPI', 
                        value: perfIndex !== null ? perfIndex.toFixed(2) : '—', 
                        valCls: perfColor.text
                    },
                    { 
                        icon: <CheckCircle2 className="w-5 h-5" />, 
                        bg: 'bg-emerald-50', 
                        cls: 'text-emerald-600', 
                        label: 'SPI', 
                        value: evmMetrics?.SPI != null ? evmMetrics?.SPI?.toFixed(2) : '—',
                        valCls: 'text-emerald-600'
                    },
                    { 
                        icon: <AlertCircle className="w-5 h-5" />, 
                        bg: 'bg-amber-50', 
                        cls: 'text-amber-600', 
                        label: 'Planned Value', 
                        value: evmMetrics?.PV != null ? `IDR ${(evmMetrics?.PV / 1e6).toFixed(1)}M` : '—',
                        valCls: 'text-amber-600'
                    },
                    { 
                        icon: <Clock className="w-5 h-5" />, 
                        bg: 'bg-emerald-50', 
                        cls: 'text-emerald-600', 
                        label: 'Earned Value', 
                        value: evmMetrics?.EV != null ? `IDR ${(evmMetrics?.EV / 1e6).toFixed(1)}M` : '—',
                        valCls: 'text-emerald-600'
                    },
                ].map((kpi, index) => (
                    <div key={index} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className={`p-3 ${kpi.bg} rounded-xl ${kpi.cls} w-fit mb-4`}>{kpi.icon}</div>
                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{kpi.label}</h3>
                        <p className={`text-2xl font-black tracking-tight mt-1 ${kpi.valCls}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>


            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* CURVE TABS */}
                {isCurveTab && (
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Sidebar */}
                        <div className="xl:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-emerald-500" /> {t('analytics.projectStatus')}
                                </h4>
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{t('analytics.perfIndex')}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl font-bold text-slate-800">{perfIndex !== null ? perfIndex.toFixed(2) : '—'}</span>
                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${perfColor.bg} ${perfColor.text} ${perfColor.border}`}>{perfColor.label}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('analytics.projectTimeline')}</p>
                                        <div className="space-y-3">
                                            {[
                                                { icon: 'bg-emerald-50 text-emerald-600', label: t('analytics.startDate'), value: fmtDate(project.planned_start) },
                                                { icon: 'bg-amber-50 text-amber-600',    label: t('analytics.targetFinish'), value: fmtDate(project.planned_end) },
                                            ].map(item => (
                                                <div key={item.label} className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg ${item.icon} flex items-center justify-center`}><Calendar className="w-4 h-4" /></div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{item.label}</p>
                                                        <p className="text-xs font-bold text-slate-700">{item.value}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-3xl shadow-sm text-white relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="w-4 h-4 text-emerald-400" />
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{t('analytics.insightsTitle')}</p>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-300 font-medium">{activeConfig.desc}</p>
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="xl:col-span-3 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{TABS.find(tab => tab.key === activeTab)?.label}</h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{activeConfig.yLabel} {t('analytics.cumulativeTrend')}</p>
                                </div>
                                <div className="flex gap-6 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100">
                                    {[['bg-slate-300', 'PV'], ['bg-emerald-500', 'EV'], ['bg-amber-400', 'AC']].map(([color, key]) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{key}</span>
                                        </div>
                                    ))}
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
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} tickLine={false} axisLine={false} minTickGap={40}
                                            tickFormatter={v => v ? new Date(v).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : ''} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} tickLine={false} axisLine={false}
                                            tickFormatter={v => activeTab === 'cost' ? `${(v / 1e6).toFixed(0)}M` : v} />
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

                {/* GANTT */}
                {activeTab === 'gantt' && (
                    <div className="h-[calc(100vh-320px)] min-h-[600px] animate-in fade-in zoom-in duration-500">
                        <GanttChart tasks={projectTasks} cpmResults={cpmResults} t={t} />
                    </div>
                )}

                {/* CPM */}
                {activeTab === 'cpm' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                            <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                                <div className="p-3 bg-red-50 rounded-xl border border-red-100 shrink-0"><AlertCircle className="w-6 h-6 text-red-600" /></div>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">{t('analytics.criticalPath')}</h3>
                                        <p className="text-slate-500 text-sm mt-1 max-w-3xl leading-relaxed">{t('analytics.criticalDesc')}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {criticalPath.length === 0 ? (
                                            <p className="text-slate-400 text-sm">{t('analytics.noCritical')}</p>
                                        ) : criticalPath.map((task, i) => (
                                            <div key={task.id} className="flex items-center gap-2">
                                                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 group hover:border-red-200 transition-colors cursor-default">
                                                    <span className="text-[10px] font-mono font-bold text-red-600 opacity-60">{task.wbs_code}</span>
                                                    <span className="text-xs font-bold text-slate-700 group-hover:text-red-600 transition-colors">{task.task_name}</span>
                                                </div>
                                                {i < criticalPath.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-xl shadow-slate-200/10 overflow-hidden flex flex-col h-[calc(100vh-500px)] min-h-[500px]">
                            <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{t('analytics.cpmMatrix')}</h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{t('analytics.earlyLate')}</p>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('analytics.autoPass')}</span></div>
                                    <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-emerald-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('analytics.realtimeFloat')}</span></div>
                                </div>
                            </div>
                            <div className="overflow-auto flex-1 [scrollbar-width:thin]">
                                <table className="w-full text-left border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur-md">
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                                            <th className="px-10 py-6">{t('analytics.wbsNode')}</th>
                                            <th className="px-6 py-6">{t('analytics.timeDays')}</th>
                                            <th className="px-6 py-6 text-emerald-600">{t('analytics.perfectScenario')}</th>
                                            <th className="px-6 py-6 text-amber-600">{t('analytics.deadlineScenario')}</th>
                                            <th className="px-6 py-6">{t('analytics.wiggleRoom')}</th>
                                            <th className="px-10 py-6 text-right">{t('analytics.riskLevel')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {cpmResults.length === 0 ? (
                                            <tr><td colSpan="6" className="px-10 py-16 text-center text-slate-400">{t('analytics.noCpmData')}</td></tr>
                                        ) : cpmResults.map(task => (
                                            <tr key={task.id} className={`group transition-all hover:bg-slate-50/50 ${task.isCritical ? 'bg-red-50/20' : ''}`}>
                                                <td className="px-10 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${task.isCritical ? 'bg-red-500 shadow-red-200' : 'bg-slate-300 shadow-slate-100'}`} />
                                                        <div>
                                                            <p className="font-black text-slate-700 group-hover:text-emerald-700 transition-colors leading-tight">{task.task_name}</p>
                                                            <p className="text-[10px] font-mono font-black text-slate-400 mt-0.5">{task.wbs_code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5"><span className="text-xs font-black text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">{task.planned_duration}d</span></td>
                                                <td className="px-6 py-5"><div className="flex items-center gap-2 font-mono text-xs"><span className="text-emerald-600 font-black">{task.es}</span><div className="w-4 h-[2px] bg-slate-100" /><span className="text-emerald-700 font-black">{task.ef}</span></div></td>
                                                <td className="px-6 py-5"><div className="flex items-center gap-2 font-mono text-xs"><span className="text-amber-600 font-black">{task.ls}</span><div className="w-4 h-[2px] bg-slate-100" /><span className="text-amber-700 font-black">{task.lf}</span></div></td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-tighter shadow-sm border ${task.float === 0 ? 'bg-red-500 text-white border-red-400' : 'bg-white text-slate-600 border-slate-200'}`}>{task.float} DAYS</span>
                                                        {task.float > 0 && <div className="flex-1 max-w-[60px] h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-300" style={{ width: `${Math.min(task.float * 5, 100)}%` }} /></div>}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-5 text-right">
                                                    {task.isCritical ? (
                                                        <span className="inline-flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-[0.15em] bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 animate-pulse">
                                                            <AlertCircle className="w-3 h-3" /> {t('evm.critical')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.15em] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                            <CheckCircle2 className="w-3 h-3" /> {t('analytics.stable')}
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