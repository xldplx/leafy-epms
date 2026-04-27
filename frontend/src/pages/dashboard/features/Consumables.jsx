import { useState, useEffect, useMemo } from 'react';
import { Plus, Package, AlertTriangle, Search, X, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { consumablesApi } from '../../../utils/api';
import { formatCurrency } from '../../../utils/evmHelpers';

export default function Consumables() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [form, setForm] = useState({ name:'', unit:'', supplier:'', qty_used:'', qty_on_hand:'', reorder_threshold:'', unit_cost:'' });
    const [formError, setFormError] = useState('');
    const userRole = localStorage.getItem('userRole');
    const canManage = ['Project Manager','Site Engineer'].includes(userRole);

    const fetchData = () => {
        setLoading(true);
        consumablesApi.getAll().then(r => setItems(r.data||[])).catch(console.error).finally(()=>setLoading(false));
    };
    useEffect(()=>{ fetchData(); },[]);

    const filtered = useMemo(() => items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.supplier||'').toLowerCase().includes(search.toLowerCase())), [items, search]);
    const lowStock = useMemo(() => items.filter(c => parseFloat(c.qty_on_hand) < parseFloat(c.reorder_threshold)), [items]);
    const totalInventoryValue = useMemo(() => items.reduce((s,c) => s + parseFloat(c.qty_on_hand||0)*parseFloat(c.unit_cost||0), 0), [items]);

    const stats = [
        { label:'Total Items', value:items.length, icon:<Package className="w-5 h-5"/>, iconBg:'bg-slate-100 text-slate-500' },
        { label:'Low Stock', value:lowStock.length, icon:<AlertTriangle className="w-5 h-5"/>, iconBg:'bg-red-50 text-red-500' },
        { label:'Stock OK', value:items.length-lowStock.length, icon:<CheckCircle2 className="w-5 h-5"/>, iconBg:'bg-emerald-50 text-emerald-600' },
        { label:'Inventory Value', value:formatCurrency(totalInventoryValue), icon:<Package className="w-5 h-5"/>, iconBg:'bg-blue-50 text-blue-500', wide:true },
    ];

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.name.trim()) { setFormError('Name is required.'); return; }
        setSaving(true);
        try {
            await consumablesApi.create({ ...form, qty_used:parseFloat(form.qty_used)||0, qty_on_hand:parseFloat(form.qty_on_hand)||0, reorder_threshold:parseFloat(form.reorder_threshold)||0, unit_cost:parseFloat(form.unit_cost)||0 });
            setIsModalOpen(false);
            setForm({ name:'', unit:'', supplier:'', qty_used:'', qty_on_hand:'', reorder_threshold:'', unit_cost:'' });
            setToast('Item added'); setTimeout(()=>setToast(''),2500);
            fetchData();
        } catch(e) { setFormError(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this item?')) return;
        try { await consumablesApi.delete(id); setToast('Item deleted'); setTimeout(()=>setToast(''),2500); fetchData(); }
        catch(e) { setToast('Error: '+e.message); setTimeout(()=>setToast(''),3000); }
    };

    return (
        <div className="space-y-8">
            {toast && <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${toast.startsWith('Error')?'bg-red-600':'bg-emerald-600'} text-white`}><CheckCircle2 className="w-4 h-4"/>{toast}</div>}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Consumables</h2>
                    <p className="text-slate-500 mt-1">Track inventory of consumable materials</p>
                </div>
                {canManage && <button onClick={()=>setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"><Plus className="w-5 h-5"/>Add Item</button>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map(s=>(
                    <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${s.iconBg}`}>{s.icon}</div>
                        <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p><p className="text-xl font-bold text-slate-700 mt-0.5">{s.value}</p></div>
                    </div>
                ))}
            </div>

            {lowStock.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0"/>
                    <div><p className="font-bold text-red-700 text-sm">Low Stock Alert</p>
                    <p className="text-xs text-red-600 mt-1">{lowStock.map(c=>c.name).join(', ')} — below reorder threshold.</p></div>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Inventory</h3>
                    <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} className="text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 outline-none focus:border-emerald-500 transition-colors"/>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                            <th className="px-6 py-4">Name</th><th className="px-4 py-4">Unit</th><th className="px-4 py-4">Supplier</th>
                            <th className="px-4 py-4">Qty Used</th><th className="px-4 py-4">On Hand</th><th className="px-4 py-4">Reorder At</th>
                            <th className="px-4 py-4">Unit Cost</th><th className="px-4 py-4">Status</th>
                            {canManage && <th className="px-4 py-4"></th>}
                        </tr></thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {loading ? <tr><td colSpan="9" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto"/></td></tr>
                            : filtered.length === 0 ? <tr><td colSpan="9" className="py-12 text-center text-slate-400"><Package className="w-10 h-10 text-slate-200 mx-auto mb-2"/>No items found.</td></tr>
                            : filtered.map(c => {
                                const isLow = parseFloat(c.qty_on_hand) < parseFloat(c.reorder_threshold);
                                return (
                                    <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${isLow?'bg-red-50/30':''}`}>
                                        <td className="px-6 py-4 font-semibold text-slate-700">{c.name}</td>
                                        <td className="px-4 py-4 text-slate-500">{c.unit||'—'}</td>
                                        <td className="px-4 py-4 text-slate-500">{c.supplier||'—'}</td>
                                        <td className="px-4 py-4 text-slate-500">{c.qty_used}</td>
                                        <td className={`px-4 py-4 font-bold ${isLow?'text-red-600':'text-slate-700'}`}>{c.qty_on_hand}</td>
                                        <td className="px-4 py-4 text-slate-500">{c.reorder_threshold}</td>
                                        <td className="px-4 py-4 text-slate-500">{formatCurrency(c.unit_cost)}</td>
                                        <td className="px-4 py-4">
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${isLow?'bg-red-50 text-red-600 border-red-100':'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                {isLow?'Low Stock':'OK'}
                                            </span>
                                        </td>
                                        {canManage && <td className="px-4 py-4"><button onClick={()=>handleDelete(c.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button></td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                    <span className="text-xs text-slate-400">Showing {filtered.length} of {items.length} items</span>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setIsModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Add Consumable Item</h3>
                            <button onClick={()=>setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>
                        {formError && <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">{formError}</div>}
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {[['Name','name','text','e.g. Welding Rod'],['Unit','unit','text','e.g. kg'],['Supplier','supplier','text','e.g. PT Supplier'],['Unit Cost (IDR)','unit_cost','number','0'],['Qty On Hand','qty_on_hand','number','0'],['Reorder At','reorder_threshold','number','0']].map(([label,key,type,ph])=>(
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
                                        <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                                            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all text-slate-700 text-sm"/>
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