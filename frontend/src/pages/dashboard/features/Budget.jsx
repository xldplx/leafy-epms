import { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingDown, TrendingUp, Plus, X, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { projectsApi } from '../../../utils/api';
import { INPUT_CLASS } from '../../../utils/uiConstants';

const budgetApi = {
    getAll:  (filters={}) => fetch(`http://localhost:5000/api/budget${Object.keys(filters).length?'?'+new URLSearchParams(filters):''}`, { headers:{Authorization:`Bearer ${localStorage.getItem('token')}`} }).then(r=>r.json()),
    create:  (payload)    => fetch('http://localhost:5000/api/budget', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`}, body:JSON.stringify(payload) }).then(r=>r.json()),
    update:  (id,payload) => fetch(`http://localhost:5000/api/budget/${id}`, { method:'PUT', headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`}, body:JSON.stringify(payload) }).then(r=>r.json()),
    delete:  (id)         => fetch(`http://localhost:5000/api/budget/${id}`, { method:'DELETE', headers:{Authorization:`Bearer ${localStorage.getItem('token')}`} }).then(r=>r.json()),
};

const fmt = (v) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(v||0);

const CATEGORY_COLORS = { Labor:'bg-blue-500', Materials:'bg-emerald-500', Equipment:'bg-violet-500', Consumables:'bg-amber-500', Tools:'bg-cyan-500', Overhead:'bg-slate-400' };
const CATEGORY_LIGHTS = { Labor:'bg-blue-50 text-blue-700 border-blue-100', Materials:'bg-emerald-50 text-emerald-700 border-emerald-100', Equipment:'bg-violet-50 text-violet-700 border-violet-100', Consumables:'bg-amber-50 text-amber-700 border-amber-100', Tools:'bg-cyan-50 text-cyan-700 border-cyan-100', Overhead:'bg-slate-50 text-slate-600 border-slate-200' };

export default function Budget() {
    const [budget, setBudget] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [form, setForm] = useState({ project_id:'', category:'Labor', type:'CAPEX', planned:'', actual:'' });
    const [formError, setFormError] = useState('');
    const userRole = localStorage.getItem('userRole');
    const canManage = ['Project Manager','Cost Engineer'].includes(userRole);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bRes, pRes] = await Promise.all([budgetApi.getAll(), projectsApi.getAll()]);
            setBudget(bRes.data || []);
            setProjects(pRes.data || []);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

    const projectBudget = useMemo(() => budget.filter(b => {
        const matchProject = !selectedProjectId || b.project_id === parseInt(selectedProjectId);
        const matchType    = filterType === 'all' || b.type === filterType;
        return matchProject && matchType;
    }), [budget, selectedProjectId, filterType]);

    const totals = useMemo(() => ({
        planned: projectBudget.reduce((s,b) => s + parseFloat(b.planned||0), 0),
        actual:  projectBudget.reduce((s,b) => s + parseFloat(b.actual||0), 0),
    }), [projectBudget]);

    const totalVariance = totals.planned - totals.actual;
    const spendPct = totals.planned > 0 ? (totals.actual / totals.planned) * 100 : 0;

    const handleCreate = async (e) => {
        e.preventDefault(); setFormError('');
        if (!form.project_id) { setFormError('Project is required.'); return; }
        setSaving(true);
        try {
            const res = await budgetApi.create({ ...form, planned:parseFloat(form.planned)||0, actual:parseFloat(form.actual)||0 });
            if (!res.success) throw new Error(res.message);
            setIsModalOpen(false);
            setForm({ project_id:'', category:'Labor', type:'CAPEX', planned:'', actual:'' });
            showToast('Budget item added');
            fetchData();
        } catch(e) { setFormError(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this budget item?')) return;
        try { await budgetApi.delete(id); showToast('Deleted'); fetchData(); }
        catch(e) { showToast('Error: '+e.message); }
    };

    return (
        <div className="space-y-8">
            {toast && <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error')?'bg-red-600':'bg-emerald-600'} text-white`}><CheckCircle2 className="w-4 h-4"/>{toast}</div>}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Budget</h2>
                <p className="text-slate-500 mt-1">CAPEX & OPEX financial resources — planned vs actual with variance analysis</p></div>
                {canManage && <button onClick={()=>setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-2"><Plus className="w-5 h-5"/>Add Budget Item</button>}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Project</label>
                    <select value={selectedProjectId} onChange={e=>setSelectedProjectId(e.target.value)} className={INPUT_CLASS}>
                        <option value="">All Projects</option>
                        {projects.map(p=><option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                    </select>
                </div>
                <div className="sm:w-48 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                    <select value={filterType} onChange={e=>setFilterType(e.target.value)} className={INPUT_CLASS}>
                        <option value="all">CAPEX + OPEX</option>
                        <option value="CAPEX">CAPEX only</option>
                        <option value="OPEX">OPEX only</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Budget (Planned)</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{fmt(totals.planned)}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4"><div className="bg-slate-400 h-1.5 rounded-full w-full"/></div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spent (Actual)</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{fmt(totals.actual)}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4">
                        <div className={`h-1.5 rounded-full transition-all ${spendPct>90?'bg-red-500':spendPct>70?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${Math.min(spendPct,100)}%`}}/>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{spendPct.toFixed(1)}% of planned</p>
                </div>
                <div className={`rounded-2xl border shadow-sm p-6 ${totalVariance>=0?'bg-emerald-50 border-emerald-100':'bg-red-50 border-red-100'}`}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget Remaining</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className={`text-3xl font-bold ${totalVariance>=0?'text-emerald-700':'text-red-700'}`}>{fmt(Math.abs(totalVariance))}</p>
                        {totalVariance>=0 ? <TrendingDown className="w-5 h-5 text-emerald-500"/> : <TrendingUp className="w-5 h-5 text-red-500"/>}
                    </div>
                    <p className={`text-xs font-semibold mt-1 ${totalVariance>=0?'text-emerald-600':'text-red-600'}`}>{totalVariance>=0?'Under budget':'Over budget'}</p>
                </div>
            </div>

            {/* Category Breakdown */}
            {projectBudget.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50"><h3 className="font-bold text-slate-700">Budget Breakdown by Category</h3></div>
                    <div className="p-6 space-y-6">
                        {projectBudget.map(b => {
                            const pct = parseFloat(b.planned)>0 ? Math.min((parseFloat(b.actual)/parseFloat(b.planned))*100,100) : 0;
                            const variance = parseFloat(b.planned) - parseFloat(b.actual);
                            return (
                                <div key={b.id}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border ${CATEGORY_LIGHTS[b.category]||'bg-slate-50 text-slate-500 border-slate-200'}`}>{b.category}</span>
                                            <span className="text-[11px] font-semibold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-md">{b.type}</span>
                                        </div>
                                        <div className="text-right text-xs">
                                            <span className="text-slate-500">{fmt(b.actual)}</span><span className="text-slate-300 mx-1">/</span><span className="text-slate-400">{fmt(b.planned)}</span>
                                            <span className={`ml-2 font-bold ${variance>=0?'text-emerald-600':'text-red-600'}`}>({variance>=0?'-':'+'}{fmt(Math.abs(variance))})</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                        <div className={`${CATEGORY_COLORS[b.category]||'bg-slate-400'} h-2.5 rounded-full transition-all duration-500`} style={{width:`${pct}%`}}/>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 text-right">{pct.toFixed(1)}% spent</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            <th className="px-6 py-4">Project</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Type</th>
                            <th className="px-4 py-4">Planned</th><th className="px-4 py-4">Actual</th><th className="px-4 py-4">Variance</th>
                            <th className="px-4 py-4 min-w-36">Spend</th>{canManage && <th className="px-4 py-4"></th>}
                        </tr></thead>
                        <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                            {loading ? <tr><td colSpan="8" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto"/></td></tr>
                            : projectBudget.length===0 ? <tr><td colSpan="8" className="py-12 text-center text-slate-400"><Wallet className="w-10 h-10 text-slate-200 mx-auto mb-2"/>No budget items found. Add items to get started.</td></tr>
                            : projectBudget.map(b => {
                                const variance = parseFloat(b.planned) - parseFloat(b.actual);
                                const pct = parseFloat(b.planned)>0 ? (parseFloat(b.actual)/parseFloat(b.planned))*100 : 0;
                                const proj = projects.find(p=>p.id===b.project_id);
                                return (
                                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-3.5"><span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{proj?.project_code||'—'}</span></td>
                                        <td className="px-4 py-3.5 font-semibold text-slate-700">{b.category}</td>
                                        <td className="px-4 py-3.5"><span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${b.type==='CAPEX'?'bg-violet-50 text-violet-700 border-violet-100':'bg-blue-50 text-blue-700 border-blue-100'}`}>{b.type}</span></td>
                                        <td className="px-4 py-3.5 text-slate-500">{fmt(b.planned)}</td>
                                        <td className="px-4 py-3.5 font-semibold text-slate-700">{fmt(b.actual)}</td>
                                        <td className={`px-4 py-3.5 font-bold ${variance>=0?'text-emerald-600':'text-red-600'}`}>{variance>=0?'-':'+'}{fmt(Math.abs(variance))}</td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${pct>100?'bg-red-500':pct>80?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
                                                <span className="text-xs font-bold text-slate-500">{pct.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        {canManage && <td className="px-4 py-3.5"><button onClick={()=>handleDelete(b.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button></td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                        {projectBudget.length > 0 && (
                            <tfoot><tr className="bg-slate-50 text-sm font-bold text-slate-700 border-t border-slate-100">
                                <td className="px-6 py-3.5" colSpan="3">Total</td>
                                <td className="px-4 py-3.5">{fmt(totals.planned)}</td>
                                <td className="px-4 py-3.5">{fmt(totals.actual)}</td>
                                <td className={`px-4 py-3.5 ${totalVariance>=0?'text-emerald-600':'text-red-600'}`}>{totalVariance>=0?'-':'+'}{fmt(Math.abs(totalVariance))}</td>
                                <td className="px-4 py-3.5 text-slate-400">{spendPct.toFixed(1)}%</td>
                                {canManage && <td/>}
                            </tr></tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-slate-800">Add Budget Item</h3><button onClick={()=>setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button></div>
                        {formError && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">{formError}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project *</label>
                                <select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})} required className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                    <option value="">Select project...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Category</label>
                                    <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                        {['Labor','Materials','Equipment','Consumables','Tools','Overhead'].map(c=><option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Type</label>
                                    <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                        <option value="CAPEX">CAPEX</option><option value="OPEX">OPEX</option>
                                    </select>
                                </div>
                                {[['Planned Amount (IDR)','planned'],['Actual Amount (IDR)','actual']].map(([label,key])=>(
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type="number" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder="0" className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm"/>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={()=>setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}