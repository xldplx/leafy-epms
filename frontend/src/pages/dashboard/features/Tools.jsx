import { useState, useEffect, useMemo } from 'react';
import { Hammer, Search, Plus, AlertTriangle, X, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { projectsApi } from '../../../utils/api';

// Tools API — gunakan endpoint /api/tools di backend
const toolsApi = {
    getAll:  ()          => fetch('http://localhost:5000/api/tools', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r=>r.json()),
    create:  (payload)   => fetch('http://localhost:5000/api/tools', { method:'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body:JSON.stringify(payload) }).then(r=>r.json()),
    update:  (id,payload)=> fetch(`http://localhost:5000/api/tools/${id}`, { method:'PUT', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body:JSON.stringify(payload) }).then(r=>r.json()),
    delete:  (id)        => fetch(`http://localhost:5000/api/tools/${id}`, { method:'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r=>r.json()),
};

const CONDITION_MAP = {
    good: { label: 'Good', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    fair: { label: 'Fair', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    poor: { label: 'Poor', cls: 'bg-red-50 text-red-700 border-red-100' },
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

export default function Tools() {
    const [tools, setTools] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCondition, setFilterCondition] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [form, setForm] = useState({ name:'', category:'', condition:'good', assigned_to:'', checkout_date:'', return_date:'', project_id:'' });
    const [formError, setFormError] = useState('');
    const userRole = localStorage.getItem('userRole');
    const canManage = ['Project Manager','Planner','Site Engineer'].includes(userRole);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tRes, pRes] = await Promise.all([toolsApi.getAll(), projectsApi.getAll()]);
            setTools(tRes.data || []);
            setProjects(pRes.data || []);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const filtered = useMemo(() => tools.filter(t => {
        const s = search.toLowerCase();
        const match = t.name.toLowerCase().includes(s) || (t.category||'').toLowerCase().includes(s) || (t.assigned_to||'').toLowerCase().includes(s);
        const cond = filterCondition === 'all' || t.condition === filterCondition;
        return match && cond;
    }), [tools, search, filterCondition]);

    const checkedOut    = tools.filter(t => t.assigned_to).length;
    const inWarehouse   = tools.length - checkedOut;
    const poorCondition = tools.filter(t => t.condition === 'poor').length;

    const stats = [
        { label:'Total Tools',   value:tools.length,   color:'text-slate-700' },
        { label:'Checked Out',   value:checkedOut,      color:'text-blue-600' },
        { label:'In Warehouse',  value:inWarehouse,     color:'text-emerald-600' },
        { label:'Needs Service', value:poorCondition,   color:'text-red-600' },
    ];

    const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

    const handleCreate = async (e) => {
        e.preventDefault(); setFormError('');
        if (!form.name.trim()) { setFormError('Tool name is required.'); return; }
        setSaving(true);
        try {
            const res = await toolsApi.create({ ...form, project_id: form.project_id||null, assigned_to: form.assigned_to||null, checkout_date: form.checkout_date||null, return_date: form.return_date||null });
            if (!res.success) throw new Error(res.message);
            setIsModalOpen(false);
            setForm({ name:'', category:'', condition:'good', assigned_to:'', checkout_date:'', return_date:'', project_id:'' });
            showToast('Tool added');
            fetchData();
        } catch(e) { setFormError(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this tool?')) return;
        try { await toolsApi.delete(id); showToast('Tool deleted'); fetchData(); }
        catch(e) { showToast('Error: '+e.message); }
    };

    const handleConditionChange = async (id, condition) => {
        try { await toolsApi.update(id, { condition }); fetchData(); }
        catch(e) { console.error(e); }
    };

    return (
        <div className="space-y-8">
            {toast && <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error')?'bg-red-600':'bg-emerald-600'} text-white`}><CheckCircle2 className="w-4 h-4"/>{toast}</div>}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Tools</h2>
                <p className="text-slate-500 mt-1">Drills, test instruments, and specialized tools — checkout tracking</p></div>
                {canManage && <button onClick={()=>setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm"><Plus className="w-4 h-4"/>Add Tool</button>}
            </div>

            {poorCondition > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5"/>
                    <div><p className="text-sm font-bold text-red-800">{poorCondition} tool{poorCondition>1?'s':''} in poor condition — service required</p>
                    <p className="text-xs text-red-500 mt-0.5">{tools.filter(t=>t.condition==='poor').map(t=>t.name).join(', ')}</p></div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(s=>(
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="text" placeholder="Search tool or assigned to..." value={search} onChange={e=>setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all"/>
                    </div>
                    <div className="flex gap-2">
                        {['all','good','fair','poor'].map(s=>(
                            <button key={s} onClick={()=>setFilterCondition(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${filterCondition===s?'bg-emerald-600 text-white border-emerald-600':'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'}`}>
                                {s==='all'?'All':s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            <th className="px-6 py-4">Tool Name</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Condition</th>
                            <th className="px-4 py-4">Assigned To</th><th className="px-4 py-4">Checkout Date</th><th className="px-4 py-4">Return Date</th>
                            <th className="px-4 py-4">Project</th>{canManage && <th className="px-4 py-4"></th>}
                        </tr></thead>
                        <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                            {loading ? <tr><td colSpan="8" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto"/></td></tr>
                            : filtered.length === 0 ? <tr><td colSpan="8" className="py-12 text-center text-slate-400"><Hammer className="w-10 h-10 text-slate-200 mx-auto mb-2"/>No tools found.</td></tr>
                            : filtered.map(t => {
                                const cond = CONDITION_MAP[t.condition] || CONDITION_MAP.good;
                                const proj = projects.find(p=>p.id===t.project_id);
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-700">{t.name}</td>
                                        <td className="px-4 py-4 text-slate-500">{t.category||'—'}</td>
                                        <td className="px-4 py-4">
                                            {canManage ? (
                                                <select value={t.condition} onChange={e=>handleConditionChange(t.id,e.target.value)}
                                                    className={`text-[11px] font-bold uppercase px-2 py-1 rounded-lg border cursor-pointer outline-none ${cond.cls}`}>
                                                    <option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option>
                                                </select>
                                            ) : <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border ${cond.cls}`}>{cond.label}</span>}
                                        </td>
                                        <td className="px-4 py-4">{t.assigned_to ? <span className="font-medium text-slate-700">{t.assigned_to}</span> : <span className="text-slate-300">Not checked out</span>}</td>
                                        <td className="px-4 py-4 text-slate-500">{fmtDate(t.checkout_date)}</td>
                                        <td className="px-4 py-4 text-slate-500">{fmtDate(t.return_date)}</td>
                                        <td className="px-4 py-4">{proj ? <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{proj.project_code}</span> : <span className="text-slate-300">—</span>}</td>
                                        {canManage && <td className="px-4 py-4"><button onClick={()=>handleDelete(t.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button></td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
                    Showing {filtered.length} of {tools.length} tools
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-slate-800">Add Tool</h3><button onClick={()=>setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button></div>
                        {formError && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">{formError}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {[['Tool Name','name','text','e.g. Angle Grinder'],['Category','category','text','e.g. Power Tools'],['Assigned To','assigned_to','text','Name or ID'],['Checkout Date','checkout_date','date',''],['Return Date','return_date','date','']].map(([label,key,type,ph])=>(
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                                            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm"/>
                                    </div>
                                ))}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Condition</label>
                                    <select value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                        <option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project</label>
                                <select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                    <option value="">— Not assigned —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_code}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={()=>setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:'Add Tool'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}