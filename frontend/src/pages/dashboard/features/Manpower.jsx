import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Search, X, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../../utils/api';

const STATUS_BADGE = {
    active:   'bg-emerald-50 text-emerald-700 border border-emerald-100',
    inactive: 'bg-slate-50 text-slate-500 border border-slate-200',
    on_leave: 'bg-amber-50 text-amber-700 border border-amber-100',
};

const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export default function Manpower() {
    const [search, setSearch]       = useState('');
    const [personnel, setPersonnel] = useState([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving]           = useState(false);
    const [formError, setFormError]     = useState('');
    const [successToast, setSuccessToast] = useState(false);
    const [form, setForm] = useState({
        employee_id:  '',
        full_name:    '',
        designation:  '',
        zone:         '',
        status:       'active',
    });

    const fetchPersonnel = () => {
        apiFetch('/personnel').then(r => setPersonnel(r.data || [])).catch(console.error);
    };

    useEffect(() => { fetchPersonnel(); }, []);

    // Close modal on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setIsModalOpen(false); };
        if (isModalOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isModalOpen]);

    const filtered = useMemo(() =>
        personnel.filter(p =>
            p.full_name.toLowerCase().includes(search.toLowerCase()) ||
            p.employee_id.toLowerCase().includes(search.toLowerCase())
        ), [personnel, search]);

    // Histogram — grouped by zone
    const weeklyData = useMemo(() => {
        const zones    = [...new Set(personnel.map(p => p.zone || 'Unassigned'))];
        const maxCount = Math.max(...zones.map(z => personnel.filter(p => (p.zone || 'Unassigned') === z && p.status === 'active').length), 1);
        const bars     = zones.slice(0, 12).map(z => {
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
        if (!form.full_name.trim())   { setFormError('Full name is required.'); return; }

        setSaving(true);
        try {
            const res = await apiFetch('/personnel', {
                method: 'POST',
                body: JSON.stringify({
                    employee_id:  form.employee_id.trim(),
                    full_name:    form.full_name.trim(),
                    designation:  form.designation.trim() || null,
                    zone:         form.zone.trim()        || null,
                    status:       form.status,
                }),
            });
            if (!res.success) { setFormError(res.message || 'Failed to add personnel.'); return; }
            setIsModalOpen(false);
            setForm({ employee_id: '', full_name: '', designation: '', zone: '', status: 'active' });
            setSuccessToast(true);
            setTimeout(() => setSuccessToast(false), 3000);
            fetchPersonnel();
        } catch (err) {
            setFormError(err.message || 'Server error.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">

            {/* SUCCESS TOAST */}
            {successToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4" /> Personnel added successfully
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Manpower Resources</h2>
                    <p className="text-slate-500 mt-1">Daily attendance & allocation by zone</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Personnel
                </button>
            </div>

            {/* MANPOWER HISTOGRAM CARD */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    Resource Loading
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Histogram</span>
                </h3>
                <div className="h-64 flex items-end justify-between gap-2 md:gap-4 border-b border-slate-100 pb-2">
                    {weeklyData.map((bar, index) => (
                        <div key={index} className="flex-1 flex flex-col justify-end group relative h-full">
                            {bar.count > 0 && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {bar.label}: {bar.count}
                                </div>
                            )}
                            <div
                                style={{ height: `${Math.max(bar.pct, bar.count > 0 ? 4 : 0)}%` }}
                                className="w-full bg-emerald-100 rounded-t-lg transition-all duration-300 relative overflow-hidden min-h-[4px]"
                            >
                                {bar.count > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 transition-all duration-500" style={{ height: '100%' }} />
                                )}
                            </div>
                            <span className="text-[10px] text-slate-300 text-center mt-2 font-mono truncate">
                                {bar.label !== `W${index + 1}` ? bar.label.substring(0, 4) : `W${index + 1}`}
                            </span>
                        </div>
                    ))}
                </div>
                {!hasData ? (
                    <div className="text-center text-xs text-slate-400 mt-2 italic">No resource loading data available</div>
                ) : (
                    <div className="text-center text-xs text-slate-400 mt-2">
                        Active personnel by zone — {personnel.filter(p => p.status === 'active').length} active of {personnel.length} total
                    </div>
                )}
            </div>

            {/* DETAILED LIST TABLE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Active Personnel List</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search ID or Name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 outline-none focus:border-emerald-500 transition-colors"
                        />
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
                                <th className="px-6 py-4">Last Check-in</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {filtered.length > 0 ? (
                                filtered.map((person) => (
                                    <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{person.employee_id}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">{person.full_name}</td>
                                        <td className="px-6 py-4 text-slate-500">{person.designation || '—'}</td>
                                        <td className="px-6 py-4 text-slate-500">{person.zone || '—'}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs">{fmtDate(person.last_checkin)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${STATUS_BADGE[person.status] || STATUS_BADGE.inactive}`}>
                                                {(person.status || 'inactive').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4" />
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
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

            {/* ADD PERSONNEL MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <div role="dialog" aria-label="Add personnel" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Add Personnel</h3>
                            <button onClick={() => setIsModalOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Employee ID <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required value={form.employee_id}
                                    onChange={e => setForm({ ...form, employee_id: e.target.value })}
                                    placeholder="e.g. EMP-2026-001"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required value={form.full_name}
                                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    placeholder="e.g. Budi Santoso"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Designation</label>
                                <input
                                    type="text" value={form.designation}
                                    onChange={e => setForm({ ...form, designation: e.target.value })}
                                    placeholder="e.g. Site Supervisor"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Zone</label>
                                    <input
                                        type="text" value={form.zone}
                                        onChange={e => setForm({ ...form, zone: e.target.value })}
                                        placeholder="e.g. Zone A"
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="on_leave">On Leave</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Add Personnel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}