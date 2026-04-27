import { useState, useEffect } from 'react';
import { Plus, Users, Search, X, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { personnelApi, projectsApi } from '../../../utils/api';
import { INPUT_CLASS } from '../../../utils/uiConstants';

const STATUS_BADGE = { active: 'bg-emerald-50 text-emerald-700 border-emerald-100', inactive: 'bg-slate-50 text-slate-500 border-slate-200', on_leave: 'bg-amber-50 text-amber-700 border-amber-100' };

export default function Manpower() {
    const [personnel, setPersonnel] = useState([]);
    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [form, setForm] = useState({ employee_id:'', full_name:'', designation:'', zone:'', project_id:'' });
    const [formError, setFormError] = useState('');
    const userRole = localStorage.getItem('userRole');
    const canManage = ['Project Manager','Planner','Site Engineer'].includes(userRole);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, projRes] = await Promise.all([personnelApi.getAll(), projectsApi.getAll()]);
            setPersonnel(pRes.data || []);
            setProjects(projRes.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = personnel.filter(p =>
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.employee_id.toLowerCase().includes(search.toLowerCase()) ||
        (p.designation||'').toLowerCase().includes(search.toLowerCase())
    );

    // Group by zone for histogram
    const zones = [...new Set(personnel.map(p => p.zone || 'Unassigned'))];
    const maxCount = Math.max(...zones.map(z => personnel.filter(p => (p.zone||'Unassigned') === z && p.status === 'active').length), 1);

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.employee_id.trim() || !form.full_name.trim()) { setFormError('Employee ID and Full Name are required.'); return; }
        setSaving(true);
        try {
            await personnelApi.create({ ...form, project_id: form.project_id || null });
            setIsModalOpen(false);
            setForm({ employee_id:'', full_name:'', designation:'', zone:'', project_id:'' });
            setToast('Personnel added successfully');
            setTimeout(() => setToast(''), 3000);
            fetchData();
        } catch (e) { setFormError(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this personnel record?')) return;
        try {
            await personnelApi.delete(id);
            setToast('Personnel deleted');
            setTimeout(() => setToast(''), 2500);
            fetchData();
        } catch (e) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 3000); }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await personnelApi.update(id, { status });
            fetchData();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-8">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error')?'bg-red-600':'bg-emerald-600'} text-white`}>
                    <CheckCircle2 className="w-4 h-4" /> {toast}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Manpower Resources</h2>
                    <p className="text-slate-500 mt-1">Personnel attendance & allocation by zone</p>
                </div>
                {canManage && (
                    <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Add Personnel
                    </button>
                )}
            </div>

            {/* Zone Histogram */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    Resource Loading <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">by Zone</span>
                </h3>
                {zones.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-slate-300 text-sm italic">No resource data available</div>
                ) : (
                    <div className="h-48 flex items-end justify-around gap-2 border-b border-slate-100 pb-2">
                        {zones.map(zone => {
                            const count = personnel.filter(p => (p.zone||'Unassigned') === zone && p.status === 'active').length;
                            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                                <div key={zone} className="flex flex-col items-center gap-1 flex-1">
                                    <span className="text-xs font-bold text-emerald-600">{count}</span>
                                    <div className="w-full flex flex-col justify-end" style={{height:'160px'}}>
                                        <div style={{height:`${pct}%`, minHeight: count>0?'8px':'4px'}} className="w-full bg-emerald-400 rounded-t-lg transition-all duration-500" />
                                    </div>
                                    <span className="text-[9px] text-slate-400 text-center leading-tight mt-1">{zone}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Personnel Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Personnel List</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search ID or Name..." value={search} onChange={e=>setSearch(e.target.value)}
                            className="text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Employee ID</th><th className="px-6 py-4">Full Name</th>
                                <th className="px-6 py-4">Designation</th><th className="px-6 py-4">Zone</th>
                                <th className="px-6 py-4">Project</th><th className="px-6 py-4">Status</th>
                                {canManage && <th className="px-6 py-4"></th>}
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2"><Users className="w-12 h-12 text-slate-200" /><p>No personnel records found.</p></div>
                                </td></tr>
                            ) : filtered.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.employee_id}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-700">{p.full_name}</td>
                                    <td className="px-6 py-4 text-slate-500">{p.designation || '—'}</td>
                                    <td className="px-6 py-4 text-slate-500">{p.zone || '—'}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.projects?.project_code || '—'}</td>
                                    <td className="px-6 py-4">
                                        {canManage ? (
                                            <select value={p.status} onChange={e=>handleStatusChange(p.id,e.target.value)}
                                                className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border cursor-pointer outline-none ${STATUS_BADGE[p.status]||STATUS_BADGE.inactive}`}>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="on_leave">On Leave</option>
                                            </select>
                                        ) : (
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${STATUS_BADGE[p.status]||STATUS_BADGE.inactive}`}>{p.status.replace('_',' ')}</span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td className="px-6 py-4">
                                            <button onClick={()=>handleDelete(p.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                    <span className="text-xs text-slate-400">Showing {filtered.length} of {personnel.length} records</span>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Add Personnel</h3>
                            <button onClick={()=>setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        {formError && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">{formError}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            {[['Employee ID','employee_id','e.g. EMP-001'],['Full Name','full_name','e.g. Ahmad Sutrisno'],['Designation','designation','e.g. Civil Engineer'],['Zone','zone','e.g. Zone A']].map(([label,key,ph])=>(
                                <div key={key} className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                    <input type="text" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                                </div>
                            ))}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project</label>
                                <select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm">
                                    <option value="">— Not assigned —</option>
                                    {projects.map(p=><option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={()=>setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
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