import { useState } from 'react';
import { Plus, FolderKanban, Calendar, DollarSign, ChevronRight, X } from 'lucide-react';
import ProjectDetail from './ProjectDetail';

export default function Projects() {
    const [projects, setProjects] = useState([
        {
            id: 1,
            project_name: 'Industrial Complex Phase 2',
            project_code: 'PRJ-2026-001',
            description: 'Construction of Phase 2 industrial facilities including structural, electrical, and MEP works.',
            planned_start: '2025-10-01',
            planned_end: '2026-06-30',
            total_budget: 1935000000,
            status: 'active',
            created_by: 'admin_pm',
        },
        {
            id: 2,
            project_name: 'Office Tower Renovation',
            project_code: 'PRJ-2026-002',
            description: 'Full renovation of floors 3–12 including structural assessment, interior fit-out, and MEP upgrades.',
            planned_start: '2026-01-15',
            planned_end: '2026-08-31',
            total_budget: 435000000,
            status: 'active',
            created_by: 'admin_pm',
        },
        {
            id: 3,
            project_name: 'Warehouse Expansion Block C',
            project_code: 'PRJ-2026-003',
            description: 'New warehouse block construction with loading dock, fire suppression, and electrical installation.',
            planned_start: '2026-03-01',
            planned_end: '2026-12-31',
            total_budget: 870000000,
            status: 'planning',
            created_by: 'admin_pm',
        },
    ]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({
        project_name: '',
        project_code: '',
        description: '',
        planned_start: '',
        planned_end: '',
        total_budget: '',
    });
    const [error, setError] = useState('');

    const userRole = localStorage.getItem('userRole') || 'Guest';

    const handleCreate = (e) => {
        e.preventDefault();
        setError('');

        const trimmedName = form.project_name.trim();
        const trimmedCode = form.project_code.trim();

        if (!trimmedName) { setError('Project name is required.'); return; }
        if (!trimmedCode) { setError('Project code is required.'); return; }
        if (parseFloat(form.total_budget) < 0) { setError('Budget cannot be negative.'); return; }
        if (new Date(form.planned_end) < new Date(form.planned_start)) {
            setError('End date must be on or after start date.');
            return;
        }

        const existing = projects.find(p => p.project_code === trimmedCode);
        if (existing) {
            setError('Project code already exists.');
            return;
        }

        const newProject = {
            id: Date.now(),
            ...form,
            project_name: trimmedName,
            project_code: trimmedCode,
            total_budget: parseFloat(form.total_budget) || 0,
            status: 'planning',
            created_by: localStorage.getItem('userName') || 'Unknown',
        };

        setProjects([newProject, ...projects]);
        setIsModalOpen(false);
        setForm({ project_name: '', project_code: '', description: '', planned_start: '', planned_end: '', total_budget: '' });
    };

    const statusStyles = {
        active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        planning: 'bg-blue-50 text-blue-600 border-blue-100',
        completed: 'bg-slate-50 text-slate-500 border-slate-100',
        on_hold: 'bg-amber-50 text-amber-600 border-amber-100',
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (selectedProject) {
        return <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />;
    }

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Projects</h2>
                    <p className="text-slate-500 mt-1">Manage project portfolio & work breakdown</p>
                </div>
                {userRole === 'Project Manager' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Project
                    </button>
                )}
            </div>

            {/* PROJECT CARDS GRID */}
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => setSelectedProject(project)}
                            className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        >
                            {/* Top Row: Icon + Status */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <FolderKanban className="w-6 h-6" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${statusStyles[project.status] || statusStyles.planning}`}>
                                    {project.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Project Info */}
                            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{project.project_name}</h3>
                            <p className="text-[10px] text-slate-400 font-mono mb-3 tracking-wide">{project.project_code}</p>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">{project.description || 'No description provided.'}</p>

                            {/* Footer: Dates + Budget */}
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(project.planned_start)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    {formatCurrency(project.total_budget)}
                                </span>
                            </div>

                            {/* Hover Arrow */}
                            <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="text-emerald-500 flex items-center gap-1 text-xs font-semibold">
                                    Open Project <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* EMPTY STATE */
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
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Create New Project</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase animate-pulse">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    value={form.project_name}
                                    onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    placeholder="e.g. Industrial Complex Phase 2"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project Code</label>
                                <input
                                    type="text"
                                    required
                                    value={form.project_code}
                                    onChange={(e) => setForm({ ...form, project_code: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    placeholder="e.g. PRJ-2026-004"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm resize-none"
                                    placeholder="Brief project description..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.planned_start}
                                        onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.planned_end}
                                        onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Total Budget (IDR)</label>
                                <input
                                    type="number"
                                    value={form.total_budget}
                                    onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    placeholder="0"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                                >
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
