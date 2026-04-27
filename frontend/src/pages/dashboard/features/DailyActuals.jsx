import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Loader2 } from 'lucide-react';
import { projectsApi, tasksApi, dailyActualsApi } from '../../../utils/api';
import { formatCurrency, formatDate } from '../../../utils/evmHelpers';
import { INPUT_CLASS, INLINE_INPUT_CLASS } from '../../../utils/uiConstants';

export default function DailyActuals() {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [entryDate, setEntryDate] = useState('');
    const [actuals, setActuals] = useState({});
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState('');
    const userRole = localStorage.getItem('userRole');
    const canSubmit = ['Project Manager', 'Site Engineer'].includes(userRole);

    useEffect(() => {
        projectsApi.getAll().then(r => setProjects(r.data || [])).catch(console.error).finally(() => setLoadingProjects(false));
    }, []);

    useEffect(() => {
        if (!selectedProjectId) { setTasks([]); setHistory([]); return; }
        setLoadingTasks(true);
        setLoadingHistory(true);
        setActuals({});
        tasksApi.getByProject(selectedProjectId).then(r => setTasks(r.data || [])).catch(console.error).finally(() => setLoadingTasks(false));
        dailyActualsApi.getByProject(selectedProjectId).then(r => setHistory(r.data || [])).catch(console.error).finally(() => setLoadingHistory(false));
    }, [selectedProjectId]);

    const updateActual = (taskId, field, value) => {
        let v = parseFloat(value);
        if (isNaN(v) || v < 0) v = 0;
        if (field === 'pct_complete' && v > 100) v = 100;
        setActuals(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: v } }));
    };

    const hasAnyActuals = tasks.some(t => actuals[t.id]?.actual_hours > 0 || actuals[t.id]?.actual_cost > 0 || actuals[t.id]?.pct_complete > 0);
    const totalActualHours = tasks.reduce((s, t) => s + (parseFloat(actuals[t.id]?.actual_hours) || 0), 0);
    const totalActualCost  = tasks.reduce((s, t) => s + (parseFloat(actuals[t.id]?.actual_cost)  || 0), 0);
    const selectedProject  = projects.find(p => p.id === parseInt(selectedProjectId));
    const isReady = selectedProjectId && entryDate;

    const handleSubmit = async () => {
        if (!hasAnyActuals) return;
        setSubmitting(true);
        try {
            const entries = tasks
                .filter(t => actuals[t.id]?.actual_hours > 0 || actuals[t.id]?.actual_cost > 0 || actuals[t.id]?.pct_complete > 0)
                .map(t => ({ task_id: t.id, actual_hours: actuals[t.id]?.actual_hours || 0, actual_cost: actuals[t.id]?.actual_cost || 0, pct_complete: actuals[t.id]?.pct_complete || 0 }));
            await dailyActualsApi.submit(selectedProjectId, entryDate, entries);
            setToast('Daily entry submitted successfully');
            setTimeout(() => setToast(''), 3000);
            setActuals({});
            // Refresh history
            const r = await dailyActualsApi.getByProject(selectedProjectId);
            setHistory(r.data || []);
        } catch (e) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 3000); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-8">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error') ? 'bg-red-600' : 'bg-emerald-600'} text-white`}>
                    <CheckCircle2 className="w-4 h-4" /> {toast}
                </div>
            )}
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Daily Actuals</h2>
                <p className="text-slate-500 mt-1">Record daily progress and cost entries by project</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">Entry Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project</label>
                        <select value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); }} className={INPUT_CLASS} disabled={loadingProjects}>
                            <option value="">{loadingProjects ? 'Loading...' : 'Select a project...'}</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Entry Date</label>
                        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className={INPUT_CLASS} />
                    </div>
                </div>
            </div>

            {isReady && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-700">Task Actuals</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{selectedProject?.project_name} — {formatDate(entryDate)}</p>
                        </div>
                        {canSubmit && (
                            <button onClick={handleSubmit} disabled={!hasAnyActuals || submitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {hasAnyActuals ? 'Submit Daily Entry' : 'Enter actuals to submit'}
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        {loadingTasks ? (
                            <div className="flex items-center justify-center h-24 gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading tasks...</div>
                        ) : tasks.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No tasks found for this project. Add tasks in Project Detail first.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-4 py-4">Task Name</th><th className="px-4 py-4">WBS</th><th className="px-4 py-4">Planned Cost</th>
                                        <th className="px-4 py-4">Planned Hrs</th><th className="px-4 py-4 text-emerald-600">Actual Hours</th>
                                        <th className="px-4 py-4 text-emerald-600">Actual Cost (IDR)</th><th className="px-4 py-4 text-emerald-600">% Complete</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {tasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-700">{task.task_name}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{task.wbs_code}</td>
                                            <td className="px-4 py-3 text-slate-400">{formatCurrency(task.planned_cost)}</td>
                                            <td className="px-4 py-3 text-slate-400">{task.planned_hours}</td>
                                            <td className="px-4 py-3 w-32"><input type="number" min="0" value={actuals[task.id]?.actual_hours||''} onChange={e=>updateActual(task.id,'actual_hours',e.target.value)} placeholder="0" className={INLINE_INPUT_CLASS} /></td>
                                            <td className="px-4 py-3 w-44"><input type="number" min="0" value={actuals[task.id]?.actual_cost||''} onChange={e=>updateActual(task.id,'actual_cost',e.target.value)} placeholder="0" className={INLINE_INPUT_CLASS} /></td>
                                            <td className="px-4 py-3 w-28">
                                                <div className="flex items-center gap-1.5">
                                                    <input type="number" min="0" max="100" value={actuals[task.id]?.pct_complete||''} onChange={e=>updateActual(task.id,'pct_complete',e.target.value)} placeholder="0" className={INLINE_INPUT_CLASS} />
                                                    <span className="text-slate-400 text-xs font-semibold shrink-0">%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50/50 text-sm font-bold text-slate-700 border-t border-slate-100">
                                        <td className="px-4 py-3.5" colSpan="4">Totals</td>
                                        <td className="px-4 py-3.5">{totalActualHours > 0 ? totalActualHours : '—'}</td>
                                        <td className="px-4 py-3.5">{totalActualCost > 0 ? formatCurrency(totalActualCost) : '—'}</td>
                                        <td className="px-4 py-3.5" />
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500"><ClipboardList className="w-5 h-5" /></div>
                    <div>
                        <h3 className="font-bold text-slate-700">Submission History</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{selectedProjectId ? 'All entries for selected project' : 'Select a project to view history'}</p>
                    </div>
                </div>
                {loadingHistory ? (
                    <div className="flex items-center justify-center h-16 gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
                ) : history.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {history.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-slate-400">{entry.tasks?.wbs_code || '—'}</span>
                                    <span className="font-semibold text-slate-700">{entry.tasks?.task_name || 'Task'}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-500 text-xs">
                                    <span>{formatDate(entry.entry_date)}</span>
                                    <span>{entry.actual_hours}h</span>
                                    <span>{formatCurrency(entry.actual_cost)}</span>
                                    <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">{entry.pct_complete}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-8 text-slate-400 text-sm">{selectedProjectId ? 'No entries recorded for this project.' : 'Select a project to view submission history.'}</p>
                )}
            </div>
        </div>
    );
}