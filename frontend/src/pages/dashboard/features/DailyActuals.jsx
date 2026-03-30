import { useState } from 'react';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { dummyProjectsEvm, dummyTaskData } from '../../../data/dummyData';
import { formatCurrency, formatDate } from '../../../utils/evmHelpers';
import { INPUT_CLASS, INLINE_INPUT_CLASS } from '../../../utils/uiConstants';

const dummyProjects = dummyProjectsEvm;
const dummyTasks = dummyTaskData;

export default function DailyActuals() {
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [entryDate, setEntryDate] = useState('');
    const [actuals, setActuals] = useState({});
    const [submittedEntries, setSubmittedEntries] = useState([]);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const userRole = localStorage.getItem('userRole');
    const canSubmit = ['Project Manager', 'Site Engineer'].includes(userRole);

    const selectedProject = dummyProjects.find(p => p.id === parseInt(selectedProjectId));
    const projectTasks = dummyTasks.filter(t => t.project_id === parseInt(selectedProjectId));
    const isReady = selectedProjectId && entryDate;

    const updateActual = (taskId, field, value) => {
        let v = parseFloat(value);
        if (isNaN(v) || v < 0) v = 0;
        if (field === 'pct_complete' && v > 100) v = 100;
        setActuals(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: v } }));
    };

    const hasAnyActuals = projectTasks.some(t =>
        actuals[t.id]?.actual_hours > 0 ||
        actuals[t.id]?.actual_cost > 0 ||
        actuals[t.id]?.pct_complete > 0
    );

    const totalActualHours = projectTasks.reduce((s, t) => s + (parseFloat(actuals[t.id]?.actual_hours) || 0), 0);
    const totalActualCost  = projectTasks.reduce((s, t) => s + (parseFloat(actuals[t.id]?.actual_cost)  || 0), 0);

    const handleSubmit = () => {
        const entry = {
            id: Date.now(),
            project_name: selectedProject.project_name,
            project_code: selectedProject.project_code,
            date: entryDate,
            task_count: projectTasks.length,
        };
        setSubmittedEntries([entry, ...submittedEntries]);
        setIsSubmitted(true);
        setActuals({});
        setSelectedProjectId('');
        setEntryDate('');
        setTimeout(() => setIsSubmitted(false), 3000);
    };

    const inputClass = INPUT_CLASS;
    const inlineInputClass = INLINE_INPUT_CLASS;

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Daily Actuals</h2>
                    <p className="text-slate-500 mt-1">Record daily progress and cost entries by project</p>
                </div>
            </div>

            {/* SUCCESS TOAST */}
            {isSubmitted && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4" /> Daily entry submitted successfully
                </div>
            )}

            {/* CONTROLS CARD */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">Entry Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project</label>
                        <select
                            value={selectedProjectId}
                            onChange={e => { setSelectedProjectId(e.target.value); setActuals({}); }}
                            className={inputClass}
                        >
                            <option value="">Select a project...</option>
                            {dummyProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Entry Date</label>
                        <input
                            type="date"
                            value={entryDate}
                            onChange={e => setEntryDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            {/* TASKS TABLE — shown only when project + date are selected */}
            {isReady && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

                    {/* Table header */}
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-700">Task Actuals</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {selectedProject.project_name} &mdash; {formatDate(entryDate)}
                            </p>
                        </div>
                        {canSubmit && (
                            <button
                                onClick={handleSubmit}
                                disabled={!hasAnyActuals}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                <CheckCircle2 className="w-4 h-4" /> {hasAnyActuals ? 'Submit Daily Entry' : 'Enter actuals to submit'}
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-4 py-4">Task Name</th>
                                    <th className="px-4 py-4">WBS</th>
                                    <th className="px-4 py-4">Planned Cost</th>
                                    <th className="px-4 py-4">Planned Hrs</th>
                                    <th className="px-4 py-4 text-emerald-600">Actual Hours</th>
                                    <th className="px-4 py-4 text-emerald-600">Actual Cost (IDR)</th>
                                    <th className="px-4 py-4 text-emerald-600">% Complete</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                {projectTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-700">{task.task_name}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{task.wbs_code}</td>
                                        <td className="px-4 py-3 text-slate-400">{formatCurrency(task.planned_cost)}</td>
                                        <td className="px-4 py-3 text-slate-400">{task.planned_hours}</td>
                                        <td className="px-4 py-3 w-32">
                                            <input
                                                type="number"
                                                min="0"
                                                value={actuals[task.id]?.actual_hours || ''}
                                                onChange={e => updateActual(task.id, 'actual_hours', e.target.value)}
                                                placeholder="0"
                                                className={inlineInputClass}
                                            />
                                        </td>
                                        <td className="px-4 py-3 w-44">
                                            <input
                                                type="number"
                                                min="0"
                                                value={actuals[task.id]?.actual_cost || ''}
                                                onChange={e => updateActual(task.id, 'actual_cost', e.target.value)}
                                                placeholder="0"
                                                className={inlineInputClass}
                                            />
                                        </td>
                                        <td className="px-4 py-3 w-28">
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={actuals[task.id]?.pct_complete || ''}
                                                    onChange={e => updateActual(task.id, 'pct_complete', e.target.value)}
                                                    placeholder="0"
                                                    className={inlineInputClass}
                                                />
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
                    </div>
                </div>
            )}

            {/* SUBMITTED ENTRIES LOG */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700">Submitted Entries</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Entries recorded in this session</p>
                    </div>
                </div>

                {submittedEntries.length > 0 ? (
                    <div className="space-y-2">
                        {submittedEntries.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-slate-400">{entry.project_code}</span>
                                    <span className="font-semibold text-slate-700">{entry.project_name}</span>
                                </div>
                                <div className="flex items-center gap-6 text-slate-500">
                                    <span>{formatDate(entry.date)}</span>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                        {entry.task_count} tasks recorded
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-8 text-slate-400 text-sm">No entries recorded in this session.</p>
                )}
            </div>

        </div>
    );
}
