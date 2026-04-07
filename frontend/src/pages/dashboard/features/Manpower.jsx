import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, CheckCircle2, X } from 'lucide-react';
import { personnelApi, projectsApi } from '../../../utils/api';
import { INPUT_CLASS } from '../../../utils/uiConstants';

export default function Manpower() {
    const [personnel, setPersonnel] = useState([]);
    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [successToast, setSuccessToast] = useState(false);
    const [form, setForm] = useState({ employee_id: '', full_name: '', designation: '', zone: '', project_id: '' });
    const [error, setError] = useState('');

    const userRole = localStorage.getItem('userRole');
    const canAdd = ['Project Manager', 'Planner', 'Site Engineer'].includes(userRole);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, projRes] = await Promise.all([personnelApi.getAll(), projectsApi.getAll()]);
            setPersonnel(pRes.data || []);
            setProjects(projRes.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await personnelApi.create({ ...form, project_id: form.project_id || null });
            setIsModalOpen(false);
            setForm({ employee_id: '', full_name: '', designation: '', zone: '', project_id: '' });
            setSuccessToast(true);
            setTimeout(() => setSuccessToast(false), 2500);
            fetchData();
        } catch (err) { setError(err.message); }
    };

    const filtered = personnel.filter(p =>
        p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.employee_id?.toLowerCase().includes(search.toLowerCase())
    );

    // Build histogram data (count per status or just show total)
    const weeklyData = Array(12).fill(0).map((_, i) => {
        // Simple: show relative count per "week slot" based on index
        const count = personnel.length;
        return count > 0 ? Math.max(10, (count / 12) * 100) : 0;
    });
    const maxBar = Math.max(...weeklyData, 1);

    const statusColors = { active: 'bg-emerald-500', inactive: 'bg-slate-300', on_leave: 'bg-amber-400' };

    return (
        <div className="space-y-8">
            {successToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Personnel added successfully
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Manpower Resources</h2>
                    <p className="text-slate-500 mt-1">Daily attendance & allocation by zone</p>
                </div>
                {canAdd && (
                    <button onClick={() => setIsModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Add Personnel
                    </button>
                )}
            </div>

            {/* HISTOGRAM */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    Resource Loading
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Total: {personnel.length} personnel</span>
                </h3>
                <div className="h-64 flex items-end justify-between gap-2 md:gap-4 border-b border-slate-100 pb-2">
                    {weeklyData.map((height, index) => (
                        <div key={index} className="flex-1 flex flex-col justify-end group relative h-full">
                            <div style={{ height: `${(height / maxBar) * 100}%` }}
                                className="w-full bg-emerald-100 rounded-t-lg transition-all duration-300 min-h-[4px]" />
                            <span className="text-[10px] text-slate-300 text-center mt-2 font-mono">W{index + 1}</span>
                        </div>
                    ))}
                </div>
                {personnel.length === 0 && <div className="text-center text-xs text-slate-400 mt-2 italic">No resource loading data available</div>}
            </div>

            {/* PERSONNEL TABLE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Active Personnel List</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search ID or Name..." value={search} onChange={e => setSearch(e.target.value)}
                            className="text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Employee ID</th>
                                <th className="px-6 py-4">Full Name</th>
                                <th className="px-6 py-4">Designation</th>
                                <th className="px-6 py-4">Zone</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
                            ) : filtered.length > 0 ? (
                                filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3.5 font-mono text-xs text-slate-500">{p.employee_id}</td>
                                        <td className="px-6 py-3.5 font-semibold text-slate-700">{p.full_name}</td>
                                        <td className="px-6 py-3.5">{p.designation || '—'}</td>
                                        <td className="px-6 py-3.5">{p.zone || '—'}</td>
                                        <td className="px-6 py-3.5 text-slate-400 text-xs">
                                            {projects.find(pr => pr.id === p.project_id)?.project_code || '—'}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md text-white ${statusColors[p.status] || 'bg-slate-400'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Users className="w-12 h-12 text-slate-200" />
                                            <p>No personnel records found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                    <span className="text-xs text-slate-400">Showing {filtered.length} of {personnel.length} records</span>
                </div>
            </div>

            {/* ADD MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Add Personnel</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        {error && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold uppercase text-center">{error}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            {[
                                { label: 'Employee ID', key: 'employee_id', placeholder: 'e.g. EMP-001', required: true },
                                { label: 'Full Name', key: 'full_name', placeholder: 'e.g. Budi Santoso', required: true },
                                { label: 'Designation', key: 'designation', placeholder: 'e.g. Civil Engineer' },
                                { label: 'Zone', key: 'zone', placeholder: 'e.g. Zone A' },
                            ].map(f => (
                                <div key={f.key} className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{f.label}</label>
                                    <input type="text" required={f.required} placeholder={f.placeholder} value={form[f.key]}
                                        onChange={e => setForm({ ...form, [f.key]: e.target.value })} className={INPUT_CLASS} />
                                </div>
                            ))}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project</label>
                                <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} className={INPUT_CLASS}>
                                    <option value="">— No project —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}