import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, CheckCircle2, Loader2, Trash2, Wrench } from 'lucide-react';
import { equipmentApi, projectsApi } from '../../../utils/api';
import { INPUT_CLASS } from '../../../utils/uiConstants';

const STATUS_BADGE = { available:'bg-emerald-50 text-emerald-700 border-emerald-100', in_use:'bg-blue-50 text-blue-700 border-blue-100', maintenance:'bg-amber-50 text-amber-700 border-amber-100' };

export default function Equipment() {
    const [equipment, setEquipment] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [form, setForm] = useState({ name:'', type:'', status:'available', capacity:'', utilized_hours:'', daily_rate:'', project_id:'' });
    const [formError, setFormError] = useState('');
    const userRole = localStorage.getItem('userRole');
    const canManage = ['Project Manager','Site Engineer'].includes(userRole);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eRes, pRes] = await Promise.all([equipmentApi.getAll(), projectsApi.getAll()]);
            setEquipment(eRes.data || []);
            setProjects(pRes.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = useMemo(() => equipment.filter(e =>
        (!filterStatus || e.status === filterStatus) &&
        (e.name.toLowerCase().includes(search.toLowerCase()) || (e.type||'').toLowerCase().includes(search.toLowerCase()))
    ), [equipment, search, filterStatus]);

    const stats = useMemo(() => ({
        total: equipment.length,
        inUse: equipment.filter(e=>e.status==='in_use').length,
        maintenance: equipment.filter(e=>e.status==='maintenance').length,
        available: equipment.filter(e=>e.status==='available').length,
    }), [equipment]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.name.trim()) { setFormError('Equipment name is required.'); return; }
        setSaving(true);
        try {
            await equipmentApi.create({ ...form, project_id: form.project_id||null, utilized_hours: parseFloat(form.utilized_hours)||0, daily_rate: parseFloat(form.daily_rate)||0 });
            setIsModalOpen(false);
            setForm({ name:'', type:'', status:'available', capacity:'', utilized_hours:'', daily_rate:'', project_id:'' });
            setToast('Equipment added'); setTimeout(()=>setToast(''),2500);
            fetchData();
        } catch (e) { setFormError(e.message); }
        finally { setSaving(false); }
    };

    const handleStatusChange = async (id, status) => {
        try { await equipmentApi.update(id, { status }); fetchData(); } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this equipment?')) return;
        try { await equipmentApi.delete(id); setToast('Equipment deleted'); setTimeout(()=>setToast(''),2500); fetchData(); }
        catch (e) { setToast('Error: '+e.message); setTimeout(()=>setToast(''),3000); }
    };

    const statCards = [
        { label:'Total Units', value:stats.total, color:'text-slate-700' },
        { label:'In Use', value:stats.inUse, color:'text-blue-600' },
        { label:'Maintenance', value:stats.maintenance, color:'text-amber-600' },
        { label:'Available', value:stats.available, color:'text-emerald-600' },
    ];

    return (
        <div className="space-y-8">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error')?'bg-red-600':'bg-emerald-600'} text-white`}>
                    <CheckCircle2 className="w-4 h-4" /> {toast}
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Equipment</h2>
                    <p className="text-slate-500 mt-1">Track heavy machinery & site equipment</p>
                </div>
                {canManage && (
                    <button onClick={()=>setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Add Equipment
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map(s => (
                    <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                    <h3 className="font-bold text-slate-700">Equipment Registry</h3>
                    <div className="flex gap-3">
                        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 transition-colors">
                            <option value="">All Statuses</option>
                            <option value="available">Available</option>
                            <option value="in_use">In Use</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}
                                className="text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 outline-none focus:border-emerald-500 transition-colors" />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Equipment</th><th className="px-4 py-4">Type</th><th className="px-4 py-4">Capacity</th>
                                <th className="px-4 py-4">Hours Used</th><th className="px-4 py-4">Project</th><th className="px-4 py-4">Status</th>
                                {canManage && <th className="px-4 py-4"></th>}
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2"><Wrench className="w-10 h-10 text-slate-200" /><p>No equipment found.</p></div>
                                </td></tr>
                            ) : filtered.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-700">{e.name}</td>
                                    <td className="px-4 py-4 text-slate-500">{e.type || '—'}</td>
                                    <td className="px-4 py-4 text-slate-500">{e.capacity || '—'}</td>
                                    <td className="px-4 py-4 text-slate-500">{e.utilized_hours || 0}h</td>
                                    <td className="px-4 py-4 font-mono text-xs text-slate-400">{e.project_code || '—'}</td>
                                    <td className="px-4 py-4">
                                        {canManage ? (
                                            <select value={e.status} onChange={ev=>handleStatusChange(e.id,ev.target.value)}
                                                className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border cursor-pointer outline-none ${STATUS_BADGE[e.status]}`}>
                                                <option value="available">Available</option>
                                                <option value="in_use">In Use</option>
                                                <option value="maintenance">Maintenance</option>
                                            </select>
                                        ) : (
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${STATUS_BADGE[e.status]}`}>{e.status.replace('_',' ')}</span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-4"><button onClick={()=>handleDelete(e.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                    <span className="text-xs text-slate-400">Showing {filtered.length} of {equipment.length} units</span>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Add Equipment</h3>
                            <button onClick={()=>setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        {formError && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">{formError}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {[['Equipment Name','name','e.g. Excavator CAT 320'],['Type','type','e.g. Heavy Machinery']].map(([label,key,ph])=>(
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type="text" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                                            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm" />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[['Capacity','capacity','e.g. 20 ton'],['Hours Utilized','utilized_hours','0']].map(([label,key,ph])=>(
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type={key==='utilized_hours'?'number':'text'} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                                            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm" />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                                    <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                        <option value="available">Available</option><option value="in_use">In Use</option><option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project</label>
                                    <select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                        <option value="">— Not assigned —</option>
                                        {projects.map(p=><option key={p.id} value={p.id}>{p.project_code}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={()=>setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:'Add Equipment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}