
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Search, X, Loader2, CheckCircle2, AlertTriangle, Pencil, Trash2, Download } from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { useTranslation } from '../../../utils/i18n';
import { exportWorkbook, exportFilename } from '../../../utils/excelExport';

const STATUS_BADGE = {
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    inactive: 'bg-slate-50 text-slate-500 border border-slate-200',
    on_leave: 'bg-amber-50 text-amber-700 border border-amber-100',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Manpower({ onNavigate, initialProjectId, onConsumeInitial }) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [personnel, setPersonnel] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [deletingId, setDeletingId] = useState(null);
    const [deletingPerson, setDeletingPerson] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [toast, setToast] = useState({ msg: '', type: 'success' });

    const userRole = localStorage.getItem('userRole');
    const canEdit = ['Project Manager', 'Planner'].includes(userRole);
    const canDelete = userRole === 'Project Manager';

    const [form, setForm] = useState({
        employee_id: '', full_name: '', designation: '', zone: '',
        email: '', skill: '', level: '', position: '', status: 'active'
    });

    const fetchProjects = async () => {
        try {
            const res = await apiFetch('/projects');
            if (res.success && res.data) {
                setProjects(res.data);
                if (res.data.length > 0) {
                    const initialId = initialProjectId || res.data[0].id;
                    setSelectedProjectId(String(initialId));
                }
            }
        } catch (e) { console.error(e); }
    };

    const fetchPersonnel = async () => {
        try {
            const res = await apiFetch('/personnel' + (selectedProjectId ? `?project_id=${selectedProjectId}` : ''));
            setPersonnel(res.data || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchProjects(); }, [initialProjectId]);
    useEffect(() => { if (selectedProjectId) fetchPersonnel(); }, [selectedProjectId]);
    useEffect(() => { if (initialProjectId && onConsumeInitial) onConsumeInitial(); }, [initialProjectId, onConsumeInitial]);
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') { setIsModalOpen(false); setDeletingId(null); } };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
    };

    const filtered = useMemo(() => personnel.filter(p =>
        (p.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (p.employee_id?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (p.email?.toLowerCase() || '').includes(search.toLowerCase())
    ), [personnel, search]);

    const weeklyData = useMemo(() => {
        const zones = [...new Set(personnel.map(p => p.zone || 'Unassigned'))];
        const maxCount = Math.max(...zones.map(z => personnel.filter(p => (p.zone || 'Unassigned') === z && p.status === 'active').length), 1);
        const bars = zones.slice(0, 12).map(z => {
            const count = personnel.filter(p => (p.zone || 'Unassigned') === z && p.status === 'active').length;
            return { pct: (count / maxCount) * 100, label: z, count };
        });
        while (bars.length < 12) bars.push({ pct: 0, label: `W${bars.length + 1}`, count: 0 });
        return bars;
    }, [personnel]);

    const hasData = weeklyData.some(b => b.count > 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.employee_id.trim()) { setFormError('Employee ID is required.'); return; }
        if (!form.full_name.trim()) { setFormError('Full Name is required.'); return; }
        setSaving(true);
        try {
            if (editingPerson) {
                await apiFetch(`/personnel/${editingPerson.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(form),
                });
                showToast(`"${form.full_name}" updated successfully.`);
            } else {
                await apiFetch('/personnel', {
                    method: 'POST',
                    body: JSON.stringify({ ...form, project_id: parseInt(selectedProjectId) }),
                });
                showToast(`"${form.full_name}" added successfully.`);
            }
            setIsModalOpen(false);
            resetForm();
            fetchPersonnel();
        } catch (err) { setFormError(err.message || 'Failed.');
        } finally { setSaving(false); }
    };

    const resetForm = () => {
        setForm({
            employee_id: '', full_name: '', designation: '', zone: '',
            email: '', skill: '', level: '', position: '', status: 'active'
        });
        setEditingPerson(null);
    };

    const openAddModal = () => { resetForm(); setFormError(''); setIsModalOpen(true); };
    const openEditModal = (person) => {
        setEditingPerson(person);
        setForm({
            employee_id: person.employee_id || '',
            full_name: person.full_name || '',
            designation: person.designation || '',
            zone: person.zone || '',
            email: person.email || '',
            skill: person.skill || '',
            level: person.level || '',
            position: person.position || '',
            status: person.status || 'active'
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setDeleteError('');
        setDeletingPerson(true);
        try {
            await apiFetch(`/personnel/${deletingId}`, { method: 'DELETE' });
            showToast('Personnel deleted successfully.');
            setDeletingId(null);
            fetchPersonnel();
        } catch (err) { setDeleteError(err.message || 'Failed.');
        } finally { setDeletingPerson(false); }
    };

    const handleExport = () => {
        const rows = personnel.map(p => ({
            'Employee ID': p.employee_id,
            'Full Name': p.full_name,
            'Position': p.position,
            'Designation': p.designation,
            'Level': p.level,
            'Skill': p.skill,
            'Email': p.email,
            'Zone': p.zone,
            'Status': p.status,
        }));
        exportWorkbook(exportFilename('Manpower'), [{ name: 'Manpower', rows }]);
    };

    const inputCls = "w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm";

    return (
        <div className="space-y-8">
            {toast.msg && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200 ${
                    toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white shadow-emerald-200'
                }`}>
                    {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 mb-6">
                <button onClick={handleExport} disabled={personnel.length === 0}
                    className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download className="w-5 h-5" /> Export
                </button>
                {canEdit && (
                    <button onClick={openAddModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Add Personnel
                    </button>
                )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Select Project</label>
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm">
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.project_code} - {p.project_name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { icon: <Users className="w-5 h-5" />, bg: 'bg-slate-100', cls: 'text-slate-500', label: 'Total', value: personnel.length, valCls: 'text-slate-800' },
                    { icon: <CheckCircle2 className="w-5 h-5" />, bg: 'bg-emerald-50', cls: 'text-emerald-600', label: 'Active', value: personnel.filter(p => p.status === 'active').length, valCls: 'text-emerald-600' },
                    { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-amber-50', cls: 'text-amber-600', label: 'On Leave', value: personnel.filter(p => p.status === 'on_leave').length, valCls: 'text-amber-600' },
                    { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-slate-50', cls: 'text-slate-600', label: 'Inactive', value: personnel.filter(p => p.status === 'inactive').length, valCls: 'text-slate-600' },
                ].map((kpi, index) => (
                    <div key={index} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className={`p-3 ${kpi.bg} rounded-xl ${kpi.cls} w-fit mb-4`}>{kpi.icon}</div>
                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{kpi.label}</h3>
                        <p className={`text-2xl font-black tracking-tight mt-1 ${kpi.valCls}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5" /> Resource Loading
                </h3>
                <div className="h-64 flex items-end justify-between gap-2 md:gap-4 border-b border-slate-100 pb-2">
                    {weeklyData.map((bar, index) => (
                        <div key={index} className="flex-1 flex flex-col justify-end group relative h-full">
                            {bar.count > 0 && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {bar.label}: {bar.count}
                                </div>
                            )}
                            <div style={{ height: `${Math.max(bar.pct, bar.count > 0 ? 4 : 0)}%` }}
                                className="w-full bg-emerald-100 rounded-t-lg transition-all duration-300 relative overflow-hidden min-h-[4px]">
                                {bar.count > 0 && <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 h-full" />}
                            </div>
                            <span className="text-[10px] text-slate-300 text-center mt-2 font-mono truncate">
                                {bar.label !== `W${index + 1}` ? bar.label.substring(0, 4) : `W${index + 1}`}
                            </span>
                        </div>
                    ))}
                </div>
                {!hasData ? (
                    <div className="text-center text-xs text-slate-400 mt-2 italic">No data available</div>
                ) : (
                    <div className="text-center text-xs text-slate-400 mt-2">
                        Active personnel by zone — {personnel.filter(p => p.status === 'active').length} active of {personnel.length} total
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search personnel..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full md:w-auto text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 outline-none focus:border-emerald-500 transition-colors min-w-[240px] shadow-sm" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Employee ID</th>
                                <th className="px-6 py-4">Full Name</th>
                                <th className="px-6 py-4">Position</th>
                                <th className="px-6 py-4">Level</th>
                                <th className="px-6 py-4">Skill</th>
                                <th className="px-6 py-4">Zone</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {filtered.length > 0 ? filtered.map(person => (
                                <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{person.employee_id}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-700">{person.full_name}</td>
                                    <td className="px-6 py-4 text-slate-500">{person.position || '—'}</td>
                                    <td className="px-6 py-4 text-slate-500">{person.level || '—'}</td>
                                    <td className="px-6 py-4 text-slate-500">{person.skill || '—'}</td>
                                    <td className="px-6 py-4 text-slate-500">{person.zone || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${STATUS_BADGE[person.status] || STATUS_BADGE.inactive}`}>
                                            {person.status === 'active' ? 'Active' : person.status === 'on_leave' ? 'On Leave' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {canEdit && (
                                                <button onClick={() => openEditModal(person)} title="Edit"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button onClick={() => { setDeleteError(''); setDeletingId(person.id); }} title="Delete"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users className="w-12 h-12 text-slate-200" />
                                            <p>No personnel found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 p-4 flex justify-between items-center border-t border-slate-100">
                    <span className="text-xs text-slate-400">Showing {filtered.length} of {personnel.length}</span>
                    <span className="text-xs text-slate-400">{personnel.length} total</span>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${editingPerson ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {editingPerson ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">{editingPerson ? 'Edit Personnel' : 'Add Personnel'}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        {formError && (
                            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {formError}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Employee ID <span className="text-red-500">*</span></label>
                                    <input type="text" required value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                                        placeholder="e.g. EMP-2026-001" className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Full Name <span className="text-red-500">*</span></label>
                                    <input type="text" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                                        placeholder="e.g. Budi Santoso" className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                        placeholder="e.g. budi@company.com" className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Position</label>
                                    <input type="text" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}
                                        placeholder="e.g. Site Supervisor" className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Designation</label>
                                    <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
                                        placeholder="e.g. Engineer" className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Level</label>
                                    <input type="text" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                                        placeholder="e.g. Junior, Senior" className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Skill</label>
                                    <input type="text" value={form.skill} onChange={e => setForm({ ...form, skill: e.target.value })}
                                        placeholder="e.g. Welding, Electrical" className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Zone</label>
                                    <input type="text" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}
                                        placeholder="e.g. Zone A" className={inputCls} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                    className={inputCls}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="on_leave">On Leave</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingPerson ? 'Save Changes' : 'Add Personnel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deletingId && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !deletingPerson && setDeletingId(null)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><Trash2 className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">Delete Personnel</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
                        {deleteError && (
                            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {deleteError}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingId(null)} disabled={deletingPerson}
                                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-60">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={deletingPerson}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {deletingPerson ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
