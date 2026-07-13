import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText, Calendar, AlertTriangle, AlertCircle,
    TrendingDown, TrendingUp, Search, X, Download
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { useTranslation } from '../../../utils/i18n';
import { exportWorkbook, exportFilename } from '../../../utils/excelExport';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Report({ onNavigate, initialProjectId, onConsumeInitial }) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('critical');
    const [projects, setProjects] = useState([]);
    const [projectTasks, setProjectTasks] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/projects').then(res => {
            const list = res.data || [];
            setProjects(list);
            if (list.length > 0) {
                setSelectedProjectId(initialProjectId || list[0].id);
            }
            setLoading(false);
        }).catch(console.error).finally(() => setLoading(false));
    }, [initialProjectId]);

    useEffect(() => {
        if (selectedProjectId) {
            apiFetch(`/projects/${selectedProjectId}/tasks`)
                .then(res => setProjectTasks(res.data || []))
                .catch(console.error);
        }
    }, [selectedProjectId]);

    useEffect(() => {
        if (initialProjectId && onConsumeInitial) onConsumeInitial();
    }, [initialProjectId, onConsumeInitial]);

    const criticalActivities = useMemo(() => {
        return projectTasks.filter(task => {
            // Tasks with no float (critical path) OR behind schedule
            const isBehind = task.pct_complete < (task.schedule_pct || 0) * 100;
            const isLowFloat = (task.float || 0) <= 2;
            return isBehind || isLowFloat;
        }).map(task => ({
            ...task,
            delayDays: Math.max(0, (task.schedule_pct || 0) * 100 - task.pct_complete) * ((task.planned_duration || 1) / 100)
        }));
    }, [projectTasks]);

    const delayAnalysis = useMemo(() => {
        // Analyze tasks that are delayed
        return projectTasks.filter(task => (task.pct_complete || 0) < 100).map(task => {
            const plannedDuration = task.planned_duration || 1;
            const scheduledPct = (task.schedule_pct || 0) * 100;
            const plannedPctComplete = scheduledPct;
            const actualPctComplete = task.pct_complete || 0;
            const pctBehind = Math.max(0, plannedPctComplete - actualPctComplete);
            const daysBehind = Math.round((pctBehind / 100) * plannedDuration);
            
            return {
                ...task,
                daysBehind,
                impact: daysBehind > 5 ? 'High' : daysBehind > 2 ? 'Medium' : 'Low'
            };
        }).sort((a, b) => b.daysBehind - a.daysBehind);
    }, [projectTasks]);

    const filteredCritical = useMemo(() => 
        criticalActivities.filter(task => 
            (task.task_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
            (task.wbs_code?.toLowerCase() || '').includes(search.toLowerCase())
        ), [criticalActivities, search]);

    const filteredDelays = useMemo(() => 
        delayAnalysis.filter(task => 
            (task.task_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
            (task.wbs_code?.toLowerCase() || '').includes(search.toLowerCase())
        ), [delayAnalysis, search]);

    const kpiMetrics = useMemo(() => ({
        totalCritical: criticalActivities.length,
        highImpactDelays: delayAnalysis.filter(t => t.impact === 'High').length,
        totalTasks: projectTasks.length,
        avgDelayDays: delayAnalysis.length > 0 
            ? Math.round(delayAnalysis.reduce((sum, t) => sum + t.daysBehind, 0) / delayAnalysis.length) 
            : 0
    }), [criticalActivities, delayAnalysis, projectTasks]);

    const handleExport = () => {
        const data = activeTab === 'critical' ? filteredCritical : filteredDelays;
        const rows = data.map(task => ({
            'WBS Code': task.wbs_code,
            'Task Name': task.task_name,
            'Planned Start': fmtDate(task.planned_start),
            'Planned End': fmtDate(task.planned_end),
            'Duration': `${task.planned_duration}d`,
            '% Complete': `${task.pct_complete || 0}%`,
            ...(activeTab === 'critical' 
                ? { 'Float (Days)': task.float || 0, 'Is Critical': task.float === 0 ? 'Yes' : 'No' } 
                : { 'Days Behind': task.daysBehind, 'Impact': task.impact })
        }));
        exportWorkbook(exportFilename(`Report-${activeTab}`), [{ name: activeTab === 'critical' ? 'Critical Activities' : 'Delay Analysis', rows }]);
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                Loading report...
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left pb-12 animate-in fade-in duration-300">

            {/* UNIFIED CONTROLS BAR CARD - Aligned with Projects/Analytics */}
            <div className="bg-white border border-slate-200 rounded-3xl py-3.5 px-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Project selector */}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5">Select Active Project</span>
                        <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(Number(e.target.value))}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer shadow-sm min-w-[200px]"
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                        </select>
                    </div>
                    
                    {/* Report View Toggle tabs */}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5">Report Category</span>
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner w-fit">
                            {[
                                { id: 'critical', label: 'Critical Path' },
                                { id: 'delay', label: 'Delay Log' }
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer ${
                                        activeTab === tab.id 
                                            ? 'bg-white text-emerald-700 shadow border border-emerald-100/60' 
                                            : 'text-slate-450 hover:text-slate-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Search & Export Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search input */}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5">Search task entries</span>
                        <div className="relative min-w-[200px]">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search name or WBS code..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl pl-8.5 pr-8.5 py-1.5 outline-none focus:border-emerald-500 transition-colors shadow-sm placeholder:text-slate-400 text-slate-700" />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Export Button */}
                    <button onClick={handleExport} disabled={filteredCritical.length === 0 && filteredDelays.length === 0}
                        className="text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 border shadow bg-white border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-250 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer self-end">
                        <Download className="w-3.5 h-3.5" /> Export
                    </button>
                </div>
            </div>

            {/* MAIN TASKS LOG CONSOLE CARD */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* Embedded Inline KPI Summary Header */}
                <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Report Task Log</h4>
                    
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-tight text-slate-500">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-650">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{kpiMetrics.totalCritical} Critical</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                            <TrendingDown className="w-4 h-4 shrink-0" />
                            <span>{kpiMetrics.highImpactDelays} Delays</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span>{kpiMetrics.totalTasks} Tasks</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100 text-violet-650">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span>{kpiMetrics.avgDelayDays}d Avg Delay</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/40 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4.5">WBS Code</th>
                                <th className="px-6 py-4.5">Task Name</th>
                                <th className="px-6 py-4.5">Planned Start</th>
                                <th className="px-6 py-4.5">Planned End</th>
                                <th className="px-6 py-4.5">Duration</th>
                                <th className="px-6 py-4.5">% Complete</th>
                                {activeTab === 'critical' ? (
                                    <>
                                        <th className="px-6 py-4.5">Float (Days)</th>
                                        <th className="px-6 py-4.5">Status</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4.5">Days Behind</th>
                                        <th className="px-6 py-4.5">Impact</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="text-sm font-semibold text-slate-605 divide-y divide-slate-100">
                            {(activeTab === 'critical' ? filteredCritical : filteredDelays).map((task) => (
                                <tr key={task.id} className="hover:bg-emerald-50/10 even:bg-slate-50/10 transition-colors">
                                    <td className="px-6 py-4.5 font-mono text-xs text-slate-400">{task.wbs_code}</td>
                                    <td className="px-6 py-4.5 font-extrabold text-slate-800">{task.task_name}</td>
                                    <td className="px-6 py-4.5 text-slate-500">{fmtDate(task.planned_start)}</td>
                                    <td className="px-6 py-4.5 text-slate-500">{fmtDate(task.planned_end)}</td>
                                    <td className="px-6 py-4.5 text-slate-500">{task.planned_duration}d</td>
                                    <td className="px-6 py-4.5">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                                <div className={`h-full transition-all duration-500 ${(task.pct_complete || 0) >= 80 ? 'bg-emerald-500' : (task.pct_complete || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${task.pct_complete || 0}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500">{task.pct_complete || 0}%</span>
                                        </div>
                                    </td>
                                    {activeTab === 'critical' ? (
                                        <>
                                            <td className="px-6 py-4.5">
                                                <span className={`text-xs font-black px-3 py-1 rounded border leading-none ${
                                                    task.float === 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>
                                                    {task.float || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded border leading-none ${
                                                    task.float === 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>
                                                    {task.float === 0 ? <AlertCircle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                                    {task.float === 0 ? 'Critical' : 'Stable'}
                                                </span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4.5">
                                                <span className={`text-xs font-black px-3 py-1 rounded border leading-none ${
                                                    task.daysBehind > 5 ? 'bg-rose-50 text-rose-700 border-rose-100' : task.daysBehind > 2 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-655 border-slate-200'
                                                }`}>
                                                    {task.daysBehind}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded border leading-none ${
                                                    task.impact === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100' : task.impact === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-655 border-slate-200'
                                                }`}>
                                                    {task.impact === 'High' ? <AlertTriangle className="w-4 h-4" /> : task.impact === 'Medium' ? <AlertCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                    {task.impact}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {((activeTab === 'critical' && filteredCritical.length === 0) || (activeTab === 'delay' && filteredDelays.length === 0)) && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText className="w-12 h-12 text-slate-200" />
                                            <p className="text-xs font-bold uppercase tracking-wider">No tasks found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>
                        Showing {(activeTab === 'critical' ? filteredCritical : filteredDelays).length} of {(activeTab === 'critical' ? criticalActivities : delayAnalysis).length} tasks
                    </span>
                    <span>
                        Total: {projectTasks.length} tasks in project
                    </span>
                </div>
            </div>
        </div>
    );
}
