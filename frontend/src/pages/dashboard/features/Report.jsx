
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
        <div className="space-y-8 pb-12">
            <div className="flex justify-end gap-3 mb-6">
                <button onClick={handleExport} disabled={filteredCritical.length === 0 && filteredDelays.length === 0}
                    className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 py-3 rounded-2xl font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    <Download className="w-5 h-5" />
                    Export
                </button>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] ml-1 block mb-3">
                    Select Project
                </label>
                <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="p-3 bg-red-50 rounded-xl text-red-600 w-fit mb-4">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Critical Activities</h3>
                    <p className="text-2xl font-black text-red-600 tracking-tight mt-1">{kpiMetrics.totalCritical}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="p-3 bg-orange-50 rounded-xl text-orange-600 w-fit mb-4">
                        <TrendingDown className="w-5 h-5" />
                    </div>
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">High Impact Delays</h3>
                    <p className="text-2xl font-black text-orange-600 tracking-tight mt-1">{kpiMetrics.highImpactDelays}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="p-3 bg-slate-100 rounded-xl text-slate-500 w-fit mb-4">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Total Tasks</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{kpiMetrics.totalTasks}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600 w-fit mb-4">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Avg Days Behind</h3>
                    <p className="text-2xl font-black text-amber-600 tracking-tight mt-1">{kpiMetrics.avgDelayDays}</p>
                </div>
            </div>

            <div className="flex gap-2 bg-white/70 p-2 rounded-[2rem] border border-slate-200/50 shadow-sm backdrop-blur-sm">
                <button onClick={() => setActiveTab('critical')}
                    className={`flex-1 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                        activeTab === 'critical' 
                            ? 'bg-emerald-600 text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] -translate-y-0.5' 
                            : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                    }`}
                >
                    Critical Activities
                </button>
                <button onClick={() => setActiveTab('delay')}
                    className={`flex-1 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                        activeTab === 'delay' 
                            ? 'bg-emerald-600 text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] -translate-y-0.5' 
                            : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                    }`}
                >
                    Delay Analysis
                </button>
            </div>

            <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 ml-2" />
                <input type="text" placeholder="Search tasks..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-sm text-slate-700 placeholder-slate-400"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-[11px] uppercase tracking-[0.2em] text-slate-500 font-black">
                                <th className="px-6 py-4 border-b border-slate-100">WBS Code</th>
                                <th className="px-6 py-4 border-b border-slate-100">Task Name</th>
                                <th className="px-6 py-4 border-b border-slate-100">Planned Start</th>
                                <th className="px-6 py-4 border-b border-slate-100">Planned End</th>
                                <th className="px-6 py-4 border-b border-slate-100">Duration</th>
                                <th className="px-6 py-4 border-b border-slate-100">% Complete</th>
                                {activeTab === 'critical' ? (
                                    <>
                                        <th className="px-6 py-4 border-b border-slate-100">Float (Days)</th>
                                        <th className="px-6 py-4 border-b border-slate-100">Status</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 border-b border-slate-100">Days Behind</th>
                                        <th className="px-6 py-4 border-b border-slate-100">Impact</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="text-sm font-semibold text-slate-700">
                            {(activeTab === 'critical' ? filteredCritical : filteredDelays).map((task, i) => (
                                <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{task.wbs_code}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{task.task_name}</td>
                                    <td className="px-6 py-4 text-slate-500">{fmtDate(task.planned_start)}</td>
                                    <td className="px-6 py-4 text-slate-500">{fmtDate(task.planned_end)}</td>
                                    <td className="px-6 py-4 text-slate-600">{task.planned_duration}d</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-500 ${(task.pct_complete || 0) >= 80 ? 'bg-emerald-500' : (task.pct_complete || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${task.pct_complete || 0}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-slate-600">{task.pct_complete || 0}%</span>
                                        </div>
                                    </td>
                                    {activeTab === 'critical' ? (
                                        <>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-black px-3 py-1 rounded-lg border ${
                                                    task.float === 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                }`}>
                                                    {task.float || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-lg border ${
                                                    task.float === 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                }`}>
                                                    {task.float === 0 ? <AlertCircle className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                                    {task.float === 0 ? 'Critical' : 'Stable'}
                                                </span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-black px-3 py-1 rounded-lg border ${
                                                    task.daysBehind > 5 ? 'bg-red-50 text-red-600 border-red-200' : task.daysBehind > 2 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}>
                                                    {task.daysBehind}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-lg border ${
                                                    task.impact === 'High' ? 'bg-red-50 text-red-600 border-red-200' : task.impact === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}>
                                                    {task.impact === 'High' ? <AlertTriangle className="w-3 h-3" /> : task.impact === 'Medium' ? <AlertCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
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
                                            <p className="font-medium">No tasks found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold">
                        Showing {(activeTab === 'critical' ? filteredCritical : filteredDelays).length} of {(activeTab === 'critical' ? criticalActivities : delayAnalysis).length} tasks
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                        Total: {projectTasks.length} tasks in project
                    </span>
                </div>
            </div>
        </div>
    );
}
