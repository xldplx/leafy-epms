import { useState, useEffect } from 'react';
import { Plus, FolderKanban, Calendar, DollarSign, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import ProjectDetail from './ProjectDetail';
import { projectsApi, evmApi } from '../../../utils/api';
import { formatCurrency, formatDate, indexColor } from '../../../utils/evmHelpers';
import { STATUS_STYLES } from '../../../utils/uiConstants';

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [evmMap, setEvmMap] = useState({});
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        project_name: '', project_code: '', description: '',
        planned_start: '', planned_end: '', total_budget: '',
    });
    const [error, setError] = useState('');
    const [successToast, setSuccessToast] = useState(false);

    const userRole = localStorage.getItem('userRole') || 'Guest';

    // Fetch projects + EVM overview
    const fetchData = async () => {
        setLoading(true);
        try {
            const [projRes, evmRes] = await Promise.all([
                projectsApi.getAll(),
                evmApi.getOverview(),
            ]);
            setProjects(projRes.data || []);

            // Build evm map keyed by project id
            const map = {};
            (evmRes.data?.projects || []).forEach(p => { map[p.id] = p; });
            setEvmMap(map);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Close modal on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setIsModalOpen(false); };
        if (isModalOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isModalOpen]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedName = form.project_name.trim();
        const trimmedCode = form.project_code.trim();
        if (!trimmedName) { setError('Project name is required.'); return; }
        if (!trimmedCode) { setError('Project code is required.'); return; }
        if (new Date(form.planned_end) < new Date(form.planned_start)) {
            setError('End date must be on or after start date.'); return;
        }

        try {
            await projectsApi.create({
                project_name:  trimmedName,
                project_code:  trimmedCode,
                description:   form.description,
                planned_start: form.planned_start,
                planned_end:   form.planned_end,
                total_budget:  parseFloat(form.total_budget) || 0,
            });
            setIsModalOpen(false);
            setForm({ project_name: '', project_code: '', description: '', planned_start: '', planned_end: '', total_budget: '' });
            setSuccessToast(true);
            setTimeout(() => setSuccessToast(false), 3000);
            fetchData();
        } catch (err) {
            setError(err.message || 'Failed to create project.');
        }
    };

    if (selectedProject) {
        return <ProjectDetail project={selectedProject} onBack={() => { setSelectedProject(null); fetchData(); }} />;
    }

    return (
        <div className="space-y-8">
            {/* SUCCESS TOAST */}
            {successToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4" /> Project created successfully
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Projects</h2>
                    <p className="text-slate-500 mt-1">Manage project portfolio & work breakdown</p>
                </div>
                {userRole === 'Project Manager' && (
                    <button onClick={() => setIsModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> New Project
                    </button>
                )}
            </div>

            {/* LOADING */}
            {loading && (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                </div>
            )}

            {/* PROJECT CARDS */}
            {!loading && projects.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => {
                        const evm = evmMap[project.id];
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
                                        {project.status?.replace('_', ' ')}
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
                                            <span className="text-[10px] font-bold text-slate-500">{(evm.overallPct || 0).toFixed(0)}%</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {cpi && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${cpi.bg} ${cpi.border} ${cpi.text}`}>CPI {evm.CPI !== null ? evm.CPI.toFixed(2) : '—'}</span>}
                                            {spi && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${spi.bg} ${spi.border} ${spi.text}`}>SPI {evm.SPI !== null ? evm.SPI.toFixed(2) : '—'}</span>}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(project.planned_start)}</span>
                                    <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />{formatCurrency(project.total_budget)}</span>
                                </div>
                                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="text-emerald-500 flex items-center gap-1 text-xs font-semibold">Open Project <ChevronRight className="w-4 h-4" /></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* EMPTY STATE */}
            {!loading && projects.length === 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <FolderKanban className="w-12 h-12 text-slate-200" />
                        <p className="text-slate-400">No projects found. Create your first project to get started.</p>
                    </div>
                </div>
            )}

            {/* CREATE PROJECT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Create New Project</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {error && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase animate-pulse">{error}</div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            {[
                                { label: 'Project Name', key: 'project_name', type: 'text', placeholder: 'e.g. Industrial Complex Phase 2', required: true },
                                { label: 'Project Code', key: 'project_code', type: 'text', placeholder: 'e.g. PRJ-2026-004', required: true },
                            ].map(f => (
                                <div key={f.key} className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{f.label}</label>
                                    <input type={f.type} required={f.required} value={form[f.key]} placeholder={f.placeholder}
                                        onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                                </div>
                            ))}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm resize-none"
                                    placeholder="Brief project description..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[{ label: 'Start Date', key: 'planned_start' }, { label: 'End Date', key: 'planned_end' }].map(f => (
                                    <div key={f.key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{f.label}</label>
                                        <input type="date" required value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Total Budget (IDR)</label>
                                <input type="number" value={form.total_budget} onChange={e => setForm({ ...form, total_budget: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" placeholder="0" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">Create Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}