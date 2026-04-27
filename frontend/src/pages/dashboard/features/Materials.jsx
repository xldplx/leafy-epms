import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, CheckCircle2, Loader2, Trash2, Package } from 'lucide-react';
import { materialsApi, projectsApi } from '../../../utils/api';
import { formatCurrency, formatDate } from '../../../utils/evmHelpers';
import { INPUT_CLASS } from '../../../utils/uiConstants';

const STATUS_BADGE = { on_track:'bg-emerald-50 text-emerald-700 border-emerald-100', delayed:'bg-red-50 text-red-600 border-red-100', not_started:'bg-slate-50 text-slate-500 border-slate-200' };

export default function Materials() {
    const [materials, setMaterials] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [activeTab, setActiveTab] = useState('materials');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [form, setForm] = useState({ name:'', spec:'', unit:'', planned_qty:'', unit_cost:'', status:'not_started', project_id:'' });
    const [receiptForm, setReceiptForm] = useState({ material_id:'', date:'', qty:'', unit:'', supplier:'', doc_no:'', project_id:'' });
    const [formError, setFormError] = useState('');
    const userRole = localStorage.getItem('userRole');
    const canManage = ['Project Manager','Planner'].includes(userRole);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [mRes, rRes, pRes] = await Promise.all([materialsApi.getAll(), materialsApi.getReceipts(), projectsApi.getAll()]);
            setMaterials(mRes.data||[]);
            setReceipts(rRes.data||[]);
            setProjects(pRes.data||[]);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(()=>{ fetchData(); },[]);

    const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),2500); };

    const filtered = useMemo(() => materials.filter(m =>
        (!filterProject || m.project_id === parseInt(filterProject)) &&
        m.name.toLowerCase().includes(search.toLowerCase())
    ), [materials, search, filterProject]);

    const handleCreate = async (e) => {
        e.preventDefault(); setFormError('');
        if (!form.name.trim()) { setFormError('Name is required.'); return; }
        setSaving(true);
        try {
            await materialsApi.create({ ...form, planned_qty:parseFloat(form.planned_qty)||0, unit_cost:parseFloat(form.unit_cost)||0, project_id:form.project_id||null });
            setIsModalOpen(false); setForm({ name:'', spec:'', unit:'', planned_qty:'', unit_cost:'', status:'not_started', project_id:'' });
            showToast('Material added'); fetchData();
        } catch(e) { setFormError(e.message); }
        finally { setSaving(false); }
    };

    const handleCreateReceipt = async (e) => {
        e.preventDefault(); setFormError('');
        if (!receiptForm.material_id || !receiptForm.date || !receiptForm.qty) { setFormError('Material, date, and qty are required.'); return; }
        setSaving(true);
        try {
            await materialsApi.createReceipt({ ...receiptForm, qty:parseFloat(receiptForm.qty), project_id:receiptForm.project_id||null });
            setIsReceiptModalOpen(false); setReceiptForm({ material_id:'', date:'', qty:'', unit:'', supplier:'', doc_no:'', project_id:'' });
            showToast('Receipt recorded'); fetchData();
        } catch(e) { setFormError(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this material?')) return;
        try { await materialsApi.delete(id); showToast('Deleted'); fetchData(); }
        catch(e) { showToast('Error: '+e.message); }
    };

    const handleVerify = async (id) => {
        try { await materialsApi.verifyReceipt(id); showToast('Receipt verified'); fetchData(); }
        catch(e) { showToast('Error: '+e.message); }
    };

    return (
        <div className="space-y-8">
            {toast && <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error')?'bg-red-600':'bg-emerald-600'} text-white`}><CheckCircle2 className="w-4 h-4"/>{toast}</div>}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Materials</h2><p className="text-slate-500 mt-1">Track material procurement & delivery</p></div>
                {canManage && (
                    <div className="flex gap-3">
                        <button onClick={()=>setIsReceiptModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2 text-sm"><Plus className="w-4 h-4"/>Add Receipt</button>
                        <button onClick={()=>setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 text-sm"><Plus className="w-4 h-4"/>Add Material</button>
                    </div>
                )}
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
                {['materials','receipts'].map(tab=>(
                    <button key={tab} onClick={()=>setActiveTab(tab)} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${activeTab===tab?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
                ))}
            </div>

            {activeTab === 'materials' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                        <h3 className="font-bold text-slate-700">Material Registry</h3>
                        <div className="flex gap-3">
                            <select value={filterProject} onChange={e=>setFilterProject(e.target.value)} className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500">
                                <option value="">All Projects</option>
                                {projects.map(p=><option key={p.id} value={p.id}>{p.project_code}</option>)}
                            </select>
                            <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} className="text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 outline-none focus:border-emerald-500"/>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead><tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Material</th><th className="px-4 py-4">Spec</th><th className="px-4 py-4">Unit</th>
                                <th className="px-4 py-4">Planned Qty</th><th className="px-4 py-4">Actual Qty</th><th className="px-4 py-4">Unit Cost</th>
                                <th className="px-4 py-4">Project</th><th className="px-4 py-4">Status</th>
                                {canManage && <th className="px-4 py-4"></th>}
                            </tr></thead>
                            <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                {loading ? <tr><td colSpan="9" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto"/></td></tr>
                                : filtered.length === 0 ? <tr><td colSpan="9" className="py-12 text-center text-slate-400"><Package className="w-10 h-10 text-slate-200 mx-auto mb-2"/>No materials found.</td></tr>
                                : filtered.map(m=>(
                                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-700">{m.name}</td>
                                        <td className="px-4 py-4 text-slate-500">{m.spec||'—'}</td>
                                        <td className="px-4 py-4 text-slate-500">{m.unit||'—'}</td>
                                        <td className="px-4 py-4 text-slate-500">{m.planned_qty}</td>
                                        <td className="px-4 py-4 font-bold text-slate-700">{m.actual_qty}</td>
                                        <td className="px-4 py-4 text-slate-500">{formatCurrency(m.unit_cost)}</td>
                                        <td className="px-4 py-4 font-mono text-xs text-slate-400">{m.projects?.project_code||'—'}</td>
                                        <td className="px-4 py-4"><span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${STATUS_BADGE[m.status]||STATUS_BADGE.not_started}`}>{m.status.replace('_',' ')}</span></td>
                                        {canManage && <td className="px-4 py-4"><button onClick={()=>handleDelete(m.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100"><span className="text-xs text-slate-400">Showing {filtered.length} of {materials.length} materials</span></div>
                </div>
            )}

            {activeTab === 'receipts' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50"><h3 className="font-bold text-slate-700">Delivery Receipts</h3></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead><tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Material</th><th className="px-4 py-4">Date</th><th className="px-4 py-4">Qty</th>
                                <th className="px-4 py-4">Supplier</th><th className="px-4 py-4">Doc No.</th><th className="px-4 py-4">Verified</th>
                                {canManage && <th className="px-4 py-4"></th>}
                            </tr></thead>
                            <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                {loading ? <tr><td colSpan="7" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto"/></td></tr>
                                : receipts.length === 0 ? <tr><td colSpan="7" className="py-12 text-center text-slate-400">No receipts found.</td></tr>
                                : receipts.map(r=>(
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-700">{r.materials?.name||'—'}</td>
                                        <td className="px-4 py-4 text-slate-500">{formatDate(r.date)}</td>
                                        <td className="px-4 py-4 text-slate-500">{r.qty} {r.unit||''}</td>
                                        <td className="px-4 py-4 text-slate-500">{r.supplier||'—'}</td>
                                        <td className="px-4 py-4 font-mono text-xs text-slate-400">{r.doc_no||'—'}</td>
                                        <td className="px-4 py-4">
                                            {r.verified ? <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-100">Verified</span>
                                            : <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border bg-amber-50 text-amber-700 border-amber-100">Pending</span>}
                                        </td>
                                        {canManage && <td className="px-4 py-4">{!r.verified && <button onClick={()=>handleVerify(r.id)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">Verify</button>}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Material Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-slate-800">Add Material</h3><button onClick={()=>setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button></div>
                        {formError && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">{formError}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {[['Name','name','text','e.g. Steel Bar'],['Spec','spec','text','e.g. ASTM A36'],['Unit','unit','text','e.g. ton'],['Unit Cost (IDR)','unit_cost','number','0'],['Planned Qty','planned_qty','number','0']].map(([label,key,type,ph])=>(
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm"/>
                                    </div>
                                ))}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                                    <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                        <option value="not_started">Not Started</option><option value="on_track">On Track</option><option value="delayed">Delayed</option>
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
                                    {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:'Add Material'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Receipt Modal */}
            {isReceiptModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setIsReceiptModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-slate-800">Record Delivery Receipt</h3><button onClick={()=>setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button></div>
                        {formError && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">{formError}</div>}
                        <form onSubmit={handleCreateReceipt} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Material *</label>
                                <select value={receiptForm.material_id} onChange={e=>setReceiptForm({...receiptForm,material_id:e.target.value})} required className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm">
                                    <option value="">Select material...</option>{materials.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[['Date','date','date',''],['Qty Received','qty','number','0'],['Unit','unit','text','e.g. ton'],['Supplier','supplier','text',''],['Doc No.','doc_no','text','e.g. DO-2026-001']].map(([label,key,type,ph])=>(
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type={type} value={receiptForm[key]} onChange={e=>setReceiptForm({...receiptForm,[key]:e.target.value})} placeholder={ph} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm"/>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={()=>setIsReceiptModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:'Record Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}