import { useState, useEffect, useRef } from 'react';
import { ClipboardList, CheckCircle2, Camera, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/evmHelpers';
import { INPUT_CLASS, INLINE_INPUT_CLASS, CARD_CLASS } from '../../../utils/uiConstants';
import EmptyState from '../../../components/EmptyState';
import { apiFetch } from '../../../utils/api';

export default function DailyActuals() {
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [entryDate, setEntryDate]                 = useState('');
    const [actuals, setActuals]                     = useState({});
    const [submittedEntries, setSubmittedEntries]   = useState([]);
    const [isSubmitted, setIsSubmitted]             = useState(false);
    const [isUploading, setIsUploading]             = useState({}); // taskId -> boolean
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isSubmitting, setIsSubmitting]           = useState(false);
    const [submitError, setSubmitError]             = useState('');

    // Real data from API — replaces dummyProjectsEvm and dummyTaskData
    const [projects, setProjects]         = useState([]);
    const [projectTasks, setProjectTasks] = useState([]);

    const fileInputRefs = useRef({});

    const userRole  = localStorage.getItem('userRole');
    const canSubmit = ['Project Manager', 'Site Engineer'].includes(userRole);

    useEffect(() => {
        setIsLoadingProjects(true);
        apiFetch('/projects')
            .then(r => setProjects(r.data || []))
            .catch(console.error)
            .finally(() => setIsLoadingProjects(false));
    }, []);

    useEffect(() => {
        if (!selectedProjectId) { setProjectTasks([]); return; }
        apiFetch(`/projects/${selectedProjectId}/tasks`).then(r => setProjectTasks(r.data || [])).catch(console.error);
    }, [selectedProjectId]);

    const selectedProject = projects.find(p => String(p.id) === selectedProjectId);
    const isReady = selectedProjectId && entryDate;

    const updateActual = (taskId, field, value) => {
        if (field === 'photo') {
            setActuals(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: value } }));
            return;
        }
        let v = parseFloat(value);
        if (isNaN(v) || v < 0) v = 0;
        if (field === 'pct_complete' && v > 100) v = 100;
        setActuals(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: v } }));
    };

    const handleFileChange = async (taskId, file) => {
        if (!file) return;
        
        setIsUploading(prev => ({ ...prev, [taskId]: true }));
        
        // MOCK UPLOAD: In a real app, you'd upload to Supabase Storage here
        // const { data, error } = await supabase.storage.from('evidence').upload(path, file);
        // For now, we'll use a local preview URL to simulate success
        const previewUrl = URL.createObjectURL(file);
        
        setTimeout(() => {
            updateActual(taskId, 'photo', { file, url: previewUrl });
            setIsUploading(prev => ({ ...prev, [taskId]: false }));
        }, 1000);
    };

    const removePhoto = (taskId) => {
        updateActual(taskId, 'photo', null);
    };

    const hasAnyActuals = projectTasks.some(t =>
        actuals[t.id]?.actual_hours > 0 ||
        actuals[t.id]?.actual_cost > 0 ||
        actuals[t.id]?.pct_complete > 0 ||
        actuals[t.id]?.photo
    );

    const totalActualHours = projectTasks.reduce((s, t) => s + (parseFloat(actuals[t.id]?.actual_hours) || 0), 0);
    const totalActualCost  = projectTasks.reduce((s, t) => s + (parseFloat(actuals[t.id]?.actual_cost)  || 0), 0);

    const handleSubmit = async () => {
        if (!selectedProjectId || !entryDate) {
            setSubmitError('Please select a project and date before submitting.');
            return;
        }
        setSubmitError('');

        // EVM integrity: a row with cost must also have hours, and vice-versa.
        const mismatched = projectTasks.filter(t => {
            const a = actuals[t.id] || {};
            const h = parseFloat(a.actual_hours) || 0;
            const c = parseFloat(a.actual_cost)  || 0;
            return (h > 0) !== (c > 0);
        }).map(t => t.task_name);
        if (mismatched.length) {
            setSubmitError(`Enter both hours and cost (or neither) for: ${mismatched.join(', ')}`);
            return;
        }

        const entries = projectTasks
            .filter(t => actuals[t.id]?.actual_hours > 0 || actuals[t.id]?.actual_cost > 0 || actuals[t.id]?.pct_complete > 0 || actuals[t.id]?.photo)
            .map(t => ({
                task_id:      t.id,
                actual_hours: actuals[t.id]?.actual_hours || 0,
                actual_cost:  actuals[t.id]?.actual_cost  || 0,
                pct_complete: actuals[t.id]?.pct_complete || 0,
                photo_url:    null, // evidence is a local preview only until file storage is wired
            }));

        setIsSubmitting(true);
        try {
            await apiFetch(`/projects/${selectedProjectId}/daily-actuals`, {
                method: 'POST',
                body: JSON.stringify({ entry_date: entryDate, entries }),
            });
            const entry = {
                id:           Date.now(),
                project_name: selectedProject.project_name,
                project_code: selectedProject.project_code,
                date:         entryDate,
                task_count:   entries.length,
            };
            setSubmittedEntries([entry, ...submittedEntries]);
            setIsSubmitted(true);
            setActuals({});
            setSelectedProjectId('');
            setEntryDate('');
            setTimeout(() => setIsSubmitted(false), 3000);
        } catch (e) {
            setSubmitError(e.message || 'Failed to submit daily actuals.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass       = INPUT_CLASS;
    const inlineInputClass = INLINE_INPUT_CLASS;
    const cardClass        = CARD_CLASS;

    if (isLoadingProjects) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-bold uppercase tracking-[0.2em] text-xs">Loading Projects...</p>
        </div>
    );

    return (
        <div className="space-y-10 pb-12">

            {/* SUCCESS TOAST */}
            {isSubmitted && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-[1.25rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                    Daily actuals submitted and recorded
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Daily Progress</h2>
                    <p className="text-slate-500 mt-1 font-medium">Record site activity, costs, and visual evidence</p>
                </div>
            </div>

            {/* CONTROLS CARD */}
            <div className={`${cardClass} p-8`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 shadow-inner">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Entry Configuration</h3>
                        <p className="text-xs text-slate-400 font-medium">Select target project and reporting date</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Project</label>
                        <select
                            value={selectedProjectId}
                            onChange={e => { setSelectedProjectId(e.target.value); setActuals({}); }}
                            className={inputClass}
                        >
                            <option value="">Select an active project...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reporting Date</label>
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

            {/* EMPTY STATE — project + date chosen but the project has no tasks */}
            {isReady && projectTasks.length === 0 && (
                <div className={`${cardClass} p-8`}>
                    <EmptyState
                        icon={ClipboardList}
                        title="No tasks for this project"
                        hint="Add tasks under this project's WBS before recording daily progress."
                    />
                </div>
            )}

            {/* TASKS TABLE — shown when project + date selected and tasks exist */}
            {isReady && projectTasks.length > 0 && (
                <div className={`${cardClass} animate-in fade-in slide-in-from-bottom-4 duration-500`}>

                    {/* Table header */}
                    <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50/30 backdrop-blur-sm">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100">Project Session</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{selectedProject?.project_name}</h3>
                            <p className="text-sm text-slate-400 font-bold mt-0.5 uppercase tracking-tighter">
                                {formatDate(entryDate)} &mdash; {selectedProject?.project_code}
                            </p>
                        </div>
                        {canSubmit && (
                            <div className="flex flex-col items-stretch gap-2 shrink-0">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!hasAnyActuals || isSubmitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-sm shadow-xl shadow-emerald-200/50 hover:shadow-emerald-300/50 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    {isSubmitting
                                        ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                                        : <><CheckCircle2 className="w-5 h-5" /> {hasAnyActuals ? 'Submit Records' : 'Enter data to submit'}</>
                                    }
                                </button>
                                {submitError && (
                                    <div className="p-3 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">
                                        {submitError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                                    <th className="px-8 py-5">Task Details</th>
                                    <th className="px-6 py-5">Budget Ref</th>
                                    <th className="px-6 py-5 text-emerald-600">Actual Hours</th>
                                    <th className="px-6 py-5 text-emerald-600">Actual Cost</th>
                                    <th className="px-6 py-5 text-emerald-600">% Done</th>
                                    <th className="px-8 py-5 text-emerald-600">Evidence <span className="text-slate-300 lowercase font-bold tracking-normal">(preview only)</span></th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                {projectTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-emerald-50/30 transition-all duration-200">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-slate-800 tracking-tight">{task.task_name}</p>
                                            <p className="font-mono text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{task.wbs_code}</p>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                    {formatCurrency(task.planned_cost)}
                                                </p>
                                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                    {task.planned_hours} hrs
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 w-32">
                                            <input
                                                type="number"
                                                min="0"
                                                value={actuals[task.id]?.actual_hours || ''}
                                                onChange={e => updateActual(task.id, 'actual_hours', e.target.value)}
                                                placeholder="0"
                                                className={inlineInputClass}
                                            />
                                        </td>
                                        <td className="px-6 py-6 w-48">
                                            <div className="relative group">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within:text-emerald-500 transition-colors">Rp</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={actuals[task.id]?.actual_cost || ''}
                                                    onChange={e => updateActual(task.id, 'actual_cost', e.target.value)}
                                                    placeholder="0"
                                                    className={`${inlineInputClass} pl-8`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 w-32">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={actuals[task.id]?.pct_complete || ''}
                                                    onChange={e => updateActual(task.id, 'pct_complete', e.target.value)}
                                                    placeholder="0"
                                                    className={inlineInputClass}
                                                />
                                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-tighter shrink-0">%</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 w-48">
                                            {actuals[task.id]?.photo ? (
                                                <div className="relative group/img w-16 h-12 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                                    <img src={actuals[task.id].photo.url} className="w-full h-full object-cover" alt="evidence" />
                                                    <button 
                                                        onClick={() => removePhoto(task.id)}
                                                        className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => fileInputRefs.current[task.id]?.click()}
                                                    disabled={isUploading[task.id]}
                                                    className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 text-slate-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center disabled:opacity-50"
                                                >
                                                    {isUploading[task.id] ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Camera className="w-5 h-5" />
                                                    )}
                                                </button>
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                ref={el => fileInputRefs.current[task.id] = el}
                                                onChange={e => handleFileChange(task.id, e.target.files[0])}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50/50 text-sm font-black text-slate-800 border-t border-slate-100">
                                    <td className="px-8 py-6" colSpan="2">Aggregate Totals</td>
                                    <td className="px-6 py-6 text-emerald-700 font-black">{totalActualHours > 0 ? `${totalActualHours} hrs` : '—'}</td>
                                    <td className="px-6 py-6 text-emerald-700 font-black">{totalActualCost > 0 ? formatCurrency(totalActualCost) : '—'}</td>
                                    <td className="px-6 py-6" colSpan="2" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* SUBMITTED ENTRIES LOG */}
            <div className={`${cardClass} p-8`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 shadow-inner">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Session Log</h3>
                        <p className="text-xs text-slate-400 font-medium">Recent submissions in this session</p>
                    </div>
                </div>

                {submittedEntries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {submittedEntries.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{entry.project_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">{entry.project_code}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-500">{entry.task_count} tasks recorded</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(entry.date)}</p>
                                    <div className="flex items-center gap-1.5 justify-end mt-1 text-emerald-600">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase tracking-tighter">Recorded</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-[2rem]">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">No records for this session</p>
                    </div>
                )}
            </div>
        </div>
    );
}