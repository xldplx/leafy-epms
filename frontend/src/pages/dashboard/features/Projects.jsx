import { useState, useEffect } from 'react';
import { Plus, FolderKanban, Calendar, DollarSign, ChevronRight, X, CheckCircle2, Loader2 } from 'lucide-react';
import ProjectDetail from './ProjectDetail';
import { projectsApi, tasksApi } from '../../../utils/api';
import { formatCurrency, formatDate, computeEvm, indexColor } from '../../../utils/evmHelpers';
import { STATUS_STYLES } from '../../../utils/uiConstants';

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [projectEvm, setProjectEvm] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ project_name:'', project_code:'', description:'', planned_start:'', planned_end:'', total_budget:'' });
    const [error, setError] = useState('');
    const [successToast, setSuccessToast] = useState('');
    const userRole = localStorage.getItem('userRole') || 'Guest';

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await projectsApi.getAll();
            const projs = res.data || [];
            setProjects(projs);
            // Load EVM for each project
            const evmMap = {};
            await Promise.all(projs.map(async (p) => {
                try {
                    const taskRes = await tasksApi.getByProject(p.id);
                    const tasks = taskRes.data || [];
                    evmMap[p.id] = computeEvm(tasks, p.schedule_pct);
                } catch { evmMap[p.id] = null; }
            }));
            setProjectEvm(evmMap);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProjects(); }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setIsModalOpen(false); };
        if (isModalOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isModalOpen]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.project_name.trim()) { setError('Project name is required.'); return; }
        if (!form.project_code.trim()) { setError('Project code is required.'); return; }
        if (form.planned_end && form.planned_start && new Date(form.planned_end) < new Date(form.planned_start)) {
            setError('End date must be on or after start date.'); return;
        }
        setSaving(true);
        try {
            await projectsApi.create({ ...form, project_name: form.project_name.trim(), project_code: form.project_code.trim(), total_budget: parseFloat(form.total_budget) || 0 });
            setIsModalOpen(false);
            setForm({ project_name:'', project_code:'', description:'', planned_start:'', planned_end:'', total_budget:'' });
            setSuccessToast('Project created successfully');
            setTimeout(() => setSuccessToast(''), 3000);
            fetchProjects();
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (selectedProject) {
        return <ProjectDetail project={selectedProject} onBack={() => { setSelectedProject(null); fetchProjects(); }} />;
    }

    return (
        <div className="space-y-8">
            {successToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> {successToast}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Projects</h2>
                    <p className="text-slate-500 mt-1">Manage project portfolio & work breakdown</p>
                </div>
                {userRole === 'Project Manager' && (
                    <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> New Project
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48 gap-3 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" /> Loading projects...
                </div>
            ) : projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => {
                        const evm = projectEvm[project.id];
                        const cpi = evm ? indexColor(evm.CPI) : null;
                        const spi = evm ? indexColor(evm.SPI) : null;
                        return (
                            <div key={project.id} onClick={() => setSelectedProject(project)}
                                className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <FolderKanban className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${STATUS_STYLES[project.status] || STATUS_STYLES.planning}`}>
                                        {project.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{project.project_name}</h3>
                                <p className="text-[10px] text-slate-400 font-mono mb-3 tracking-wide">{project.project_code}</p>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">{project.description || 'No description provided.'}</p>
                                {evm && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(evm.overallPct || 0, 100)}%` }} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 shrink-0">{(evm.overallPct || 0).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {cpi && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cpi.bg} ${cpi.border} ${cpi.text}`}>CPI {evm.CPI?.toFixed(2) ?? '—'}</span>}
                                            {spi && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${spi.bg} ${spi.border} ${spi.text}`}>SPI {evm.SPI?.toFixed(2) ?? '—'}</span>}
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 border-t border-slate-50 pt-3">
                                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0" />{project.planned_start ? formatDate(project.planned_start) : '—'}</div>
                                    <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 shrink-0" />{formatCurrency(project.total_budget)}</div>
                                </div>
                                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="text-emerald-500 flex items-center gap-1 text-xs font-semibold">Open Project <ChevronRight className="w-4 h-4" /></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <FolderKanban className="w-12 h-12 text-slate-200" />
                        <p className="text-slate-400">No projects found. Create your first project to get started.</p>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Create New Project</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        {error && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center font-bold">{error}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            {[['Project Name','text','project_name','e.g. Industrial Complex Phase 2'],['Project Code','text','project_code','e.g. PRJ-2026-004']].map(([label,type,key,ph]) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                    <input type={type} required value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})} placeholder={ph}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                                </div>
                            ))}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} rows={3} placeholder="Brief project description..."
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[['Start Date','planned_start'],['End Date','planned_end']].map(([label,key]) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type="date" value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}
                                            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Total Budget (IDR)</label>
                                <input type="number" value={form.total_budget} onChange={e => setForm({...form,total_budget:e.target.value})} placeholder="0"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}