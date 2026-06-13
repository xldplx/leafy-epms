import React, { useState, useEffect, useMemo } from 'react';
import { 
    Activity, TrendingUp, AlertTriangle, BarChart3, 
    LineChart as ChartIcon, ArrowUpRight, ArrowDownRight, 
    Target, Loader2, Layers, Briefcase, CheckCircle2,
    Calendar, Clock, DollarSign, Download
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { computeEvm, computeAlerts, indexColor, formatCurrency } from '../../../utils/evmHelpers';
import { generateSCurveData } from '../../../utils/cpmHelpers';
import { STATUS_STYLES, CARD_CLASS } from '../../../utils/uiConstants';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import { exportWorkbook, exportFilename } from '../../../utils/excelExport';
import { apiFetch } from '../../../utils/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

// --- CUSTOM TOOLTIP FOR OVERVIEW ---
function OverviewTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-4 text-[11px] min-w-52 ring-1 ring-slate-900/5 animate-in fade-in zoom-in duration-200">
            <p className="font-black text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Target className="w-3 h-3 text-emerald-500" />
                {label}
            </p>
            <div className="space-y-2.5">
                {payload.map(p => (
                    <div key={p.dataKey} className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">{p.name}</span>
                        </div>
                        <span className="text-slate-800 font-mono font-black">{formatCurrency(p.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- MAIN OVERVIEW COMPONENT ---
export default function Overview() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [thresholds, setThresholds] = useState({ cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 });
    const [error, setError] = useState(null);

    const loadData = () => {
        setLoading(true);
        setError(null);
        Promise.all([
            apiFetch('/alerts/raw'), // returns projects[] and tasks[]
            apiFetch('/alerts/thresholds')
        ]).then(([raw, thresh]) => {
            if (raw.success) {
                setProjects(raw.projects || []);
                setAllTasks(raw.tasks || []);
            }
            if (thresh.success && thresh.data) {
                setThresholds(thresh.data);
            }
        })
        .catch(e => setError(e.message || 'Failed to load portfolio data.'))
        .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    // Per-project EVM (memoized)
    const projectMetrics = useMemo(() => projects.map(proj => {
        const tasks = allTasks.filter(t => t.project_id === proj.id);
        const evm = computeEvm(tasks, proj.schedule_pct);
        return { ...proj, ...evm };
    }), [projects, allTasks]);

    // Portfolio aggregates (memoized)
    const { totalBAC, portfolioCPI, portfolioSPI } = useMemo(() => {
        const tEV = projectMetrics.reduce((s, p) => s + p.EV, 0);
        const tAC = projectMetrics.reduce((s, p) => s + p.AC, 0);
        const tPV = projectMetrics.reduce((s, p) => s + p.PV, 0);
        const tBAC = projectMetrics.reduce((s, p) => s + p.BAC, 0);
        return {
            totalAC: tAC, totalBAC: tBAC, totalEV: tEV, totalPV: tPV,
            portfolioCPI: tAC > 0 ? tEV / tAC : null,
            portfolioSPI: tPV > 0 ? tEV / tPV : null,
        };
    }, [projectMetrics]);

    // S-Curve Data for Portfolio (Aggregated from all projects)
    const rawSCurveData = useMemo(() => {
        const dated = projects.filter(p => p.planned_start && p.planned_end);
        if (!dated.length || !allTasks.length) return [];
        const minDate = new Date(Math.min(...dated.map(p => new Date(p.planned_start).getTime())));
        const maxDate = new Date(Math.max(...dated.map(p => new Date(p.planned_end).getTime())));
        return generateSCurveData(allTasks, minDate.toISOString(), maxDate.toISOString());
    }, [projects, allTasks]);

    const [viewMode, setViewMode] = useState('Daily'); // 'Daily', 'Weekly', 'Monthly'

    const sCurveData = useMemo(() => {
        if (!rawSCurveData.length) return [];
        if (viewMode === 'Daily') return rawSCurveData;

        const grouped = [];
        const interval = viewMode === 'Weekly' ? 7 : 30;

        for (let i = 0; i < rawSCurveData.length; i += interval) {
            const chunk = rawSCurveData.slice(i, i + interval);
            const last = chunk[chunk.length - 1];
            grouped.push({
                ...last,
                date: last.date // Keep the last date of the period as label
            });
        }
        return grouped;
    }, [rawSCurveData, viewMode]);

    // Project status distribution
    const statusCounts = useMemo(() => {
        const counts = { active: 0, planning: 0, completed: 0, on_hold: 0 };
        projects.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
        return counts;
    }, [projects]);

    // Alerts (memoized)
    const { alerts, criticalCount, warningCount } = useMemo(() => {
        const a = computeAlerts(projects, allTasks, thresholds);
        return { alerts: a, criticalCount: a.filter(x => x.severity === 'critical').length, warningCount: a.filter(x => x.severity === 'warning').length };
    }, [projects, allTasks, thresholds]);

    const cpiColor = indexColor(portfolioCPI);
    const spiColor = indexColor(portfolioSPI);

    const cardClass = CARD_CLASS;

    const handleExport = () => {
        const rows = projectMetrics.map(p => ({
            'Code':       p.project_code,
            'Name':       p.project_name,
            'Status':     p.status,
            'BAC':        Math.round(p.BAC) || 0,
            'EV':         Math.round(p.EV) || 0,
            'AC':         Math.round(p.AC) || 0,
            'CPI':        p.CPI != null ? Number(p.CPI.toFixed(2)) : '',
            'SPI':        p.SPI != null ? Number(p.SPI.toFixed(2)) : '',
            '% Complete': Number.isFinite(p.overallPct) ? Number(p.overallPct.toFixed(1)) : 0,
        }));
        exportWorkbook(exportFilename('Portfolio'), [{ name: 'Portfolio', rows }]);
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-bold uppercase tracking-[0.2em] text-xs">Syncing Portfolio Data...</p>
        </div>
    );

    if (error) return (
        <div className="py-10">
            <ErrorState message={error} onRetry={loadData} />
        </div>
    );

    return (
        <div className="space-y-10 pb-12">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/80">Portfolio Live</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Project Overview</h2>
                    <p className="text-slate-500 mt-1 font-medium">Consolidated enterprise performance intelligence</p>
                </div>
                <div className="flex items-center gap-3">
                <button
                    onClick={handleExport}
                    disabled={projectMetrics.length === 0}
                    className="text-sm font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border shadow-sm text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none"
                >
                    <Download className="w-4 h-4" /> Export
                </button>
                <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
                    {['Daily', 'Weekly', 'Monthly'].map(mode => (
                        <button 
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                viewMode === mode 
                                ? 'bg-white text-emerald-700 shadow-md shadow-emerald-500/5 border border-emerald-100' 
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total BAC */}
                <div className={`${cardClass} p-6 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-slate-100 rounded-xl text-slate-500 shadow-inner">
                            <Briefcase className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Portfolio Budget</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{formatCurrency(totalBAC)}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">Total BAC Across Projects</p>
                </div>

                {/* Total Projects */}
                <div className={`${cardClass} p-6 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shadow-inner">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Projects</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{projects.length}</p>
                    <div className="flex gap-2 mt-2">
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">{statusCounts.active} Active</span>
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">{statusCounts.planning} Planning</span>
                    </div>
                </div>

                {/* SPI */}
                <div className={`${cardClass} p-6 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl shadow-inner transition-colors ${portfolioSPI == null ? 'bg-slate-100 text-slate-400' : portfolioSPI >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            <Activity className="w-5 h-5" />
                        </div>
                        <div className={`px-2 py-1 rounded-lg border font-black text-[9px] uppercase tracking-wider ${spiColor.bg} ${spiColor.border} ${spiColor.text}`}>
                            {spiColor.label}
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Avg. Schedule (SPI)</h3>
                    <p className={`text-2xl font-black tracking-tight mt-1 ${spiColor.text}`}>{portfolioSPI !== null ? portfolioSPI.toFixed(2) : '--'}</p>
                    <div className="mt-3 bg-slate-100/50 rounded-full h-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${portfolioSPI == null ? 'bg-slate-200' : portfolioSPI >= 1 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min((portfolioSPI || 0) * 100, 100)}%` }} />
                    </div>
                </div>

                {/* CPI */}
                <div className={`${cardClass} p-6 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl shadow-inner transition-colors ${portfolioCPI == null ? 'bg-slate-100 text-slate-400' : portfolioCPI >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div className={`px-2 py-1 rounded-lg border font-black text-[9px] uppercase tracking-wider ${cpiColor.bg} ${cpiColor.border} ${cpiColor.text}`}>
                            {cpiColor.label}
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Avg. Cost (CPI)</h3>
                    <p className={`text-2xl font-black tracking-tight mt-1 ${cpiColor.text}`}>{portfolioCPI !== null ? portfolioCPI.toFixed(2) : '--'}</p>
                    <div className="mt-3 bg-slate-100/50 rounded-full h-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${portfolioCPI == null ? 'bg-slate-200' : portfolioCPI >= 1 ? 'bg-emerald-500' : portfolioCPI >= 0.9 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min((portfolioCPI || 0) * 100, 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PORTFOLIO S-CURVE */}
                <div className={`${cardClass} p-8 lg:col-span-2`}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200">
                                <ChartIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Cumulative S-Curve</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{viewMode} Trend Tracking</p>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PV</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">EV</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AC</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {sCurveData.length === 0 ? (
                            <EmptyState
                                icon={ChartIcon}
                                title="No trend data yet"
                                hint="Add projects with planned start/end dates and tasks to see the cumulative S-curve."
                            />
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sCurveData}>
                                <defs>
                                    <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" hide={true} />
                                <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
                                <Tooltip content={<OverviewTooltip />} />
                                <Area type="monotone" dataKey="PV" name="Planned" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                                <Area type="monotone" dataKey="EV" name="Earned" stroke="#10b981" strokeWidth={3} fill="url(#colorEV)" />
                                <Area type="monotone" dataKey="AC" name="Actual" stroke="#f59e0b" strokeWidth={2} fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* DISTRIBUTION & ALERTS */}
                <div className="space-y-6">
                    {/* Status Distribution */}
                    <div className={`${cardClass} p-6`}>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Status Breakdown</h4>
                        <div className="h-[180px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={[
                                            { name: 'Active', value: statusCounts.active },
                                            { name: 'Planning', value: statusCounts.planning },
                                            { name: 'Completed', value: statusCounts.completed },
                                            { name: 'On Hold', value: statusCounts.on_hold }
                                        ]} 
                                        innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value"
                                    >
                                        {COLORS.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-slate-800">{projects.length}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Total</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{statusCounts.active} Active</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{statusCounts.planning} Planning</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{statusCounts.completed} Completed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{statusCounts.on_hold} On Hold</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Alerts */}
                    <div className={`${cardClass} p-6 bg-slate-900 text-white border-0`}>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Alerts</h4>
                            <AlertTriangle className={`w-4 h-4 ${alerts.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                        </div>
                        <div className="space-y-4">
                            {alerts.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-3xl font-black text-white">{alerts.length}</span>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-red-500 uppercase">{criticalCount} Critical</p>
                                            <p className="text-[10px] font-black text-amber-500 uppercase">{warningCount} Warning</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                        System has detected {alerts.length} performance anomalies that require executive attention.
                                    </p>
                                </>
                            ) : (
                                <div className="flex flex-col items-center py-4 gap-2">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Portfolio Healthy</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PROJECT HEALTH TABLE */}
            <div className={`${cardClass}`}>
                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-slate-500">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Project Health Monitor</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Live performance breakdown per project</p>
                        </div>
                    </div>
                </div>
                {projectMetrics.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title="No projects to monitor"
                        hint="Create a project to see live performance breakdowns here."
                    />
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                                <th className="px-8 py-5">Project Details</th>
                                <th className="px-6 py-5">Performance</th>
                                <th className="px-6 py-5">Schedule (SPI)</th>
                                <th className="px-6 py-5">Cost (CPI)</th>
                                <th className="px-8 py-5 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {projectMetrics.map(p => {
                                const spiC = indexColor(p.SPI);
                                const cpiC = indexColor(p.CPI);
                                return (
                                    <tr key={p.id} className="hover:bg-emerald-50/20 transition-all duration-200 group">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">{p.project_name}</p>
                                            <p className="font-mono text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{p.project_code}</p>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="w-32">
                                                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase mb-1.5">
                                                    <span>Done</span>
                                                    <span>{(Number.isFinite(p.overallPct) ? p.overallPct : 0).toFixed(1)}%</span>
                                                </div>
                                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(Number.isFinite(p.overallPct) ? p.overallPct : 0, 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-black ${spiC.text}`}>{p.SPI !== null ? p.SPI.toFixed(2) : '--'}</span>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${spiC.bg} ${spiC.border} ${spiC.text}`}>
                                                    {spiC.label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-black ${cpiC.text}`}>{p.CPI !== null ? p.CPI.toFixed(2) : '--'}</span>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${cpiC.bg} ${cpiC.border} ${cpiC.text}`}>
                                                    {cpiC.label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${STATUS_STYLES[p.status] || STATUS_STYLES.planning} tracking-widest shadow-sm`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
        </div>
    );
}
