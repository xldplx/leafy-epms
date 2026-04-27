import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Plus, Trash2, Upload, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { tasksApi, wbsApi, evmApi } from '../../../utils/api';
import { formatCurrency, formatDate, indexColor } from '../../../utils/evmHelpers';
import { INPUT_CLASS, INLINE_INPUT_CLASS } from '../../../utils/uiConstants';

export default function ProjectDetail({ project, onBack }) {
    const [tasks, setTasks] = useState([]);
    const [evm, setEvm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [locking, setLocking] = useState(false);
    const [toast, setToast] = useState('');
    const [activeTab, setActiveTab] = useState('tasks');
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [taskForm, setTaskForm] = useState({ wbs_code:'', task_name:'', planned_start:'', planned_end:'', planned_cost:'', planned_hours:'', weight:'' });
    const [taskError, setTaskError] = useState('');
    const userRole = localStorage.getItem('userRole');
    const canEdit = ['Project Manager','Planner'].includes(userRole);
    const isLocked = tasks.some(t => t.is_baseline_locked);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [taskRes, evmRes] = await Promise.all([
                tasksApi.getByProject(project.id),
                evmApi.getByProject(project.id),
            ]);
            setTasks(taskRes.data || []);
            setEvm(evmRes.data?.evm || null);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [project.id]);

    const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

    const handleAddTask = async (e) => {
        e.preventDefault();
        setTaskError('');
        if (!taskForm.task_name.trim()) { setTaskError('Task name is required.'); return; }
        setSaving(true);
        try {
            await tasksApi.create(project.id, { ...taskForm, planned_cost: parseFloat(taskForm.planned_cost)||0, planned_hours: parseFloat(taskForm.planned_hours)||0, weight: parseFloat(taskForm.weight)||0 });
            setIsAddTaskOpen(false);
            setTaskForm({ wbs_code:'', task_name:'', planned_start:'', planned_end:'', planned_cost:'', planned_hours:'', weight:'' });
            showToast('Task added');
            fetchData();
        } catch(e) { setTaskError(e.message); }
        finally { setSaving(false); }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Delete this task?')) return;
        try { await tasksApi.delete(taskId); showToast('Task deleted'); fetchData(); }
        catch(e) { showToast('Error: '+e.message); }
    };

    const handleLockBaseline = async () => {
        if (!confirm('Lock baseline? This cannot be undone. All planned values will be locked.')) return;
        setLocking(true);
        try { await tasksApi.lockBaseline(project.id, `Baseline Rev.0`); showToast('Baseline locked successfully'); fetchData(); }
        catch(e) { showToast('Error: '+e.message); }
        finally { setLocking(false); }
    };

    const handlePctChange = async (taskId, pct) => {
        try {
            await tasksApi.update(taskId, { pct_complete: parseFloat(pct)||0 });
            setTasks(prev => prev.map(t => t.id===taskId ? {...t, pct_complete: parseFloat(pct)||0} : t));
        } catch(e) { console.error(e); }
    };

    const cpiColor = evm ? indexColor(evm.CPI) : null;
    const spiColor = evm ? indexColor(evm.SPI) : null;

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error')?'bg-red-600':'bg-emerald-600'} text-white`}>
                    <CheckCircle2 className="w-4 h-4"/>{toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all">
                    <ArrowLeft className="w-5 h-5"/>
                </button>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800">{project.project_name}</h2>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{project.project_code} · {project.status.replace('_',' ')}</p>
                </div>
                {canEdit && !isLocked && tasks.length > 0 && (
                    <button onClick={handleLockBaseline} disabled={locking}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm shadow-lg transition-all disabled:opacity-60">
                        {locking ? <Loader2 className="w-4 h-4 animate-spin"/> : <Lock className="w-4 h-4"/>} Lock Baseline
                    </button>
                )}
                {isLocked && (
                    <span className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-xs font-bold">
                        <Lock className="w-3.5 h-3.5"/> Baseline Locked
                    </span>
                )}
            </div>

            {/* EVM KPIs */}
            {evm && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        ['BAC', formatCurrency(evm.BAC), 'text-slate-700'],
                        ['EV', formatCurrency(evm.EV), 'text-emerald-600'],
                        ['AC', formatCurrency(evm.AC), 'text-blue-600'],
                        ['CPI', evm.CPI?.toFixed(2)||'—', cpiColor?.text||'text-slate-700'],
                    ].map(([label,val,color])=>(
                        <div key={label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                            <p className={`text-xl font-bold mt-1 ${color}`}>{val}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
                {['tasks','details'].map(tab=>(
                    <button key={tab} onClick={()=>setActiveTab(tab)}
                        className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${activeTab===tab?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'tasks' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-700">Work Breakdown / Tasks</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{tasks.length} tasks · {isLocked ? 'Baseline locked — edit actuals only' : 'Planning mode'}</p>
                        </div>
                        {canEdit && !isLocked && (
                            <button onClick={()=>setIsAddTaskOpen(!isAddTaskOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-lg transition-all">
                                <Plus className="w-4 h-4"/> Add Task
                            </button>
                        )}
                    </div>

                    {/* Add Task Form */}
                    {isAddTaskOpen && (
                        <div className="p-6 bg-slate-50 border-b border-slate-100">
                            {taskError && <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">{taskError}</div>}
                            <form onSubmit={handleAddTask} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">WBS Code</label>
                                    <input value={taskForm.wbs_code} onChange={e=>setTaskForm({...taskForm,wbs_code:e.target.value})} placeholder="1.1.1" className={INPUT_CLASS}/></div>
                                <div className="md:col-span-2 space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Task Name *</label>
                                    <input value={taskForm.task_name} onChange={e=>setTaskForm({...taskForm,task_name:e.target.value})} placeholder="e.g. Site Preparation" required className={INPUT_CLASS}/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Weight (0–1)</label>
                                    <input type="number" step="0.01" min="0" max="1" value={taskForm.weight} onChange={e=>setTaskForm({...taskForm,weight:e.target.value})} placeholder="0.10" className={INPUT_CLASS}/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Start Date</label>
                                    <input type="date" value={taskForm.planned_start} onChange={e=>setTaskForm({...taskForm,planned_start:e.target.value})} className={INPUT_CLASS}/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">End Date</label>
                                    <input type="date" value={taskForm.planned_end} onChange={e=>setTaskForm({...taskForm,planned_end:e.target.value})} className={INPUT_CLASS}/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Planned Cost (IDR)</label>
                                    <input type="number" value={taskForm.planned_cost} onChange={e=>setTaskForm({...taskForm,planned_cost:e.target.value})} placeholder="0" className={INPUT_CLASS}/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Planned Hours</label>
                                    <input type="number" value={taskForm.planned_hours} onChange={e=>setTaskForm({...taskForm,planned_hours:e.target.value})} placeholder="0" className={INPUT_CLASS}/></div>
                                <div className="md:col-span-4 flex gap-3 pt-2">
                                    <button type="button" onClick={()=>setIsAddTaskOpen(false)} className="px-5 py-2 bg-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-300 transition-all">Cancel</button>
                                    <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-60">
                                        {saving?<Loader2 className="w-4 h-4 animate-spin"/>:null} Save Task
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tasks Table */}
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-24 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin"/>Loading...</div>
                        ) : tasks.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No tasks yet. Add tasks to start planning.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead><tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-4 py-4">WBS</th><th className="px-4 py-4">Task Name</th>
                                    <th className="px-4 py-4">Planned Cost</th><th className="px-4 py-4">Actual Cost</th>
                                    <th className="px-4 py-4">Planned Hrs</th><th className="px-4 py-4">Actual Hrs</th>
                                    <th className="px-4 py-4">% Complete</th>
                                    {canEdit && !isLocked && <th className="px-4 py-4"></th>}
                                </tr></thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {tasks.map(t=>(
                                        <tr key={t.id} className={`hover:bg-slate-50/50 transition-colors ${t.is_baseline_locked?'bg-amber-50/20':''}`}>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.wbs_code||'—'}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">{t.task_name}</td>
                                            <td className="px-4 py-3 text-slate-500">{formatCurrency(t.planned_cost)}</td>
                                            <td className="px-4 py-3 text-slate-500">{formatCurrency(t.actual_cost)}</td>
                                            <td className="px-4 py-3 text-slate-500">{t.planned_hours||0}h</td>
                                            <td className="px-4 py-3 text-slate-500">{t.actual_hours||0}h</td>
                                            <td className="px-4 py-3 w-36">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                                        <div className="h-1.5 rounded-full bg-emerald-500" style={{width:`${Math.min(t.pct_complete||0,100)}%`}}/>
                                                    </div>
                                                    <span className="text-xs font-bold w-8 text-right">{t.pct_complete||0}%</span>
                                                </div>
                                            </td>
                                            {canEdit && !isLocked && (
                                                <td className="px-4 py-3"><button onClick={()=>handleDeleteTask(t.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button></td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'details' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <h3 className="font-bold text-slate-700">Project Information</h3>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        {[
                            ['Project Name', project.project_name],
                            ['Project Code', project.project_code],
                            ['Status', project.status.replace('_',' ')],
                            ['Created By', project.created_by||'—'],
                            ['Start Date', project.planned_start ? formatDate(project.planned_start) : '—'],
                            ['End Date', project.planned_end ? formatDate(project.planned_end) : '—'],
                            ['Total Budget', formatCurrency(project.total_budget)],
                            ['EAC', evm?.EAC ? formatCurrency(evm.EAC) : '—'],
                        ].map(([label,val])=>(
                            <div key={label}>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                <p className="font-semibold text-slate-700">{val}</p>
                            </div>
                        ))}
                    </div>
                    {project.description && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                            <p className="text-slate-600 text-sm leading-relaxed">{project.description}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}