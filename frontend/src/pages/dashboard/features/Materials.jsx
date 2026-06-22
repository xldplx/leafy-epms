
import { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, X, Loader2, CheckCircle2, AlertTriangle,
    Package, Pencil, Trash2, Download, Layers
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { useTranslation } from '../../../utils/i18n';
import { exportWorkbook, exportFilename } from '../../../utils/excelExport';

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_BADGE = {
    on_track: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    low_stock: 'bg-amber-50 text-amber-700 border-amber-100',
    out_of_stock: 'bg-red-50 text-red-700 border-red-100',
};

export default function Materials({ onNavigate, initialProjectId, onConsumeInitial }) {
    const { t } = useTranslation();

    const [materials, setMaterials] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Add / Edit modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [addForm, setAddForm] = useState({
        name: '', unit: '', quantity: 0, planned_qty: 0, actual_qty: 0, unit_cost: 0, status: 'on_track', spec: ''
    });
    const [addError, setAddError] = useState('');
    const [savingAdd, setSavingAdd] = useState(false);

    // Delete confirm
    const [deletingId, setDeletingId] = useState(null);
    const [deletingMaterial, setDeletingMaterial] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [toast, setToast] = useState({ msg: '', type: 'success' });

    const userRole = localStorage.getItem('userRole');
    const canEdit = ['Project Manager', 'Planner'].includes(userRole);
    const canDelete = userRole === 'Project Manager';

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
    };

    // Fetch projects and materials
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

    const fetchMaterials = async (projectId) => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await apiFetch(`/materials?project_id=${projectId}`);
            setMaterials(res.data || []);
        } catch (e) {
            showToast(e.message || 'Failed to load materials.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProjects(); }, [initialProjectId]);

    useEffect(() => {
        if (selectedProjectId) fetchMaterials(selectedProjectId);
    }, [selectedProjectId]);

    useEffect(() => {
        if (initialProjectId && onConsumeInitial) {
            onConsumeInitial();
        }
    }, [initialProjectId, onConsumeInitial]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') { setIsAddModalOpen(false); setDeletingId(null); } };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // KPI
    const counts = useMemo(() => ({
        total: materials.length,
        lowStock: materials.filter(m => parseFloat(m.quantity) <= 10).length,
        outOfStock: materials.filter(m => parseFloat(m.quantity) <= 0).length,
    }), [materials]);

    // Filter
    const filtered = useMemo(() => materials.filter(m => {
        if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }), [materials, search]);

    // Add / Edit
    const openAddModal = () => {
        setEditingMaterial(null);
        setAddForm({ name: '', unit: '', quantity: 0, planned_qty: 0, actual_qty: 0, unit_cost: 0, status: 'on_track', spec: '' });
        setAddError(''); setIsAddModalOpen(true);
    };

    const openEditModal = (material) => {
        setEditingMaterial(material);
        setAddForm({
            name: material.name,
            unit: material.unit || '',
            quantity: parseFloat(material.quantity) || 0,
            planned_qty: parseFloat(material.planned_qty) || 0,
            actual_qty: parseFloat(material.actual_qty) || 0,
            unit_cost: parseFloat(material.unit_cost) || 0,
            status: material.status || 'on_track',
            spec: material.spec || ''
        });
        setAddError(''); setIsAddModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setAddError('');
        if (!addForm.name.trim()) { setAddError('Name is required.'); return; }
        setSavingAdd(true);
        try {
            if (editingMaterial) {
                await apiFetch(`/materials/${editingMaterial.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(addForm),
                });
                showToast(`"${addForm.name}" updated successfully.`);
            } else {
                await apiFetch('/materials', {
                    method: 'POST',
                    body: JSON.stringify({
                        ...addForm,
                        project_id: parseInt(selectedProjectId)
                    }),
                });
                showToast(`"${addForm.name}" added successfully.`);
            }
            setIsAddModalOpen(false);
            fetchMaterials(selectedProjectId);
        } catch (err) { setAddError(err.message || 'Failed.'); }
        finally { setSavingAdd(false); }
    };

    // Delete
    const handleDelete = async () => {
        if (!deletingId) return;
        setDeleteError(''); setDeletingMaterial(true);
        try {
            await apiFetch(`/materials/${deletingId}`, { method: 'DELETE' });
            showToast('Material deleted successfully.');
            setDeletingId(null);
            fetchMaterials(selectedProjectId);
        } catch (err) { setDeleteError(err.message || 'Failed.'); }
        finally { setDeletingMaterial(false); }
    };

    // Export
    const handleExport = () => {
        const rows = materials.map(m => ({
            Name: m.name,
            Unit: m.unit,
            Quantity: m.quantity,
            "Planned Qty": m.planned_qty,
            "Actual Qty": m.actual_qty,
            "Unit Cost": m.unit_cost,
            Status: m.status,
            Specification: m.spec,
        }));
        exportWorkbook(exportFilename('Materials'), [{ name: 'Materials', rows }]);
    };

    const statusLabel = (s) => s === 'on_track' ? 'On Track' : s === 'low_stock' ? 'Low Stock' : 'Out of Stock';
    const inputCls = "w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm";

    return (
        <div className="space-y-8">
            {/* Toast */}
            {toast.msg && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200 ${
                    toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white shadow-emerald-200'
                }`}>
                    {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Materials</h2>
                    <p className="text-slate-500 mt-1">Manage construction materials and inventory</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExport} disabled={materials.length === 0}
                        className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download className="w-5 h-5" /> Export
                    </button>
                    {canEdit && (
                        <button onClick={openAddModal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Add Material
                        </button>
                    )}
                </div>
            </div>

            {/* Project Selector */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Select Project</label>
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm">
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>
                    ))}
                </select>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { icon: <Package className="w-5 h-5" />, bg: 'bg-slate-100', cls: 'text-slate-500', label: 'Total', value: counts.total, valCls: 'text-slate-800' },
                    { icon: <CheckCircle2 className="w-5 h-5" />, bg: 'bg-emerald-50', cls: 'text-emerald-600', label: 'On Track', value: counts.total - counts.lowStock, valCls: 'text-emerald-600' },
                    { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-amber-50', cls: 'text-amber-600', label: 'Low Stock', value: counts.lowStock, valCls: 'text-amber-600' },
                    { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-red-50', cls: 'text-red-600', label: 'Out of Stock', value: counts.outOfStock, valCls: 'text-red-600' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className={`p-3 ${kpi.bg} rounded-xl ${kpi.cls} w-fit mb-4`}>{kpi.icon}</div>
                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{kpi.label}</h3>
                        <p className={`text-2xl font-black tracking-tight mt-1 ${kpi.valCls}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Histogram */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Layers className="w-5 h-5" /> Quantity by Material
                </h3>
                <div className="h-64 flex items-end justify-between gap-2 md:gap-4 border-b border-slate-100 pb-2">
                    {filtered.slice(0, 12).map((m, idx) => {
                        const maxQty = Math.max(...filtered.map(x => parseFloat(x.quantity) || 0), 1);
                        const pct = (parseFloat(m.quantity) || 0) / maxQty * 100;
                        return (
                            <div key={idx} className="flex-1 flex flex-col justify-end group relative h-full">
                                {parseFloat(m.quantity) > 0 && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                        {m.name}: {m.quantity}
                                    </div>
                                )}
                                <div style={{ height: `${Math.max(pct, parseFloat(m.quantity) > 0 ? 4 : 0)}%` }}
                                    className="w-full bg-emerald-100 rounded-t-lg transition-all duration-300 relative overflow-hidden min-h-[4px]">
                                    {parseFloat(m.quantity) > 0 && <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 h-full" />}
                                </div>
                                <span className="text-[10px] text-slate-300 text-center mt-2 font-mono truncate">{m.unit}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search materials..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full md:w-auto text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 outline-none focus:border-emerald-500 transition-colors min-w-[240px] shadow-sm" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                        <p className="text-xs font-bold uppercase tracking-widest">Loading...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Unit</th>
                                        <th className="px-6 py-4">Quantity</th>
                                        <th className="px-6 py-4">Planned Qty</th>
                                        <th className="px-6 py-4">Actual Qty</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {filtered.length > 0 ? filtered.map(material => {
                                        const isLowStock = parseFloat(material.quantity) <= 10;
                                        const isOutOfStock = parseFloat(material.quantity) <= 0;
                                        let status = material.status || 'on_track';
                                        if (isOutOfStock) status = 'out_of_stock';
                                        else if (isLowStock) status = 'low_stock';

                                        return (
                                            <tr key={material.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 font-semibold text-slate-700">{material.name}</td>
                                                <td className="px-6 py-4 text-slate-500">{material.unit || '—'}</td>
                                                <td className={`px-6 py-4 font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-slate-700'}`}>
                                                    {parseFloat(material.quantity).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{parseFloat(material.planned_qty).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-slate-500">{parseFloat(material.actual_qty).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${STATUS_BADGE[status] || STATUS_BADGE.on_track}`}>
                                                        {statusLabel(status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canEdit && (
                                                            <button onClick={() => openEditModal(material)} title="Edit"
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button onClick={() => { setDeleteError(''); setDeletingId(material.id); }} title="Delete"
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-16 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Package className="w-12 h-12 text-slate-200" />
                                                    <p>No materials found.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 p-4 flex justify-between items-center border-t border-slate-100">
                            <span className="text-xs text-slate-400">Showing {filtered.length} of {materials.length}</span>
                            <span className="text-xs text-slate-400">{counts.total} total</span>
                        </div>
                    </>
                )}
            </div>

            {/* Add / Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsAddModalOpen(false)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${editingMaterial ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {editingMaterial ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">{editingMaterial ? 'Edit Material' : 'Add Material'}</h3>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        {addError && (
                            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {addError}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Name <span className="text-red-500">*</span></label>
                                <input type="text" required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                                    placeholder="e.g. Portland Cement Type I" className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Unit</label>
                                    <input type="text" value={addForm.unit} onChange={e => setAddForm({ ...addForm, unit: e.target.value })}
                                        placeholder="e.g. kg" className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Quantity</label>
                                    <input type="number" step="0.01" value={addForm.quantity} onChange={e => setAddForm({ ...addForm, quantity: e.target.value })}
                                        className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Planned Qty</label>
                                    <input type="number" step="0.01" value={addForm.planned_qty} onChange={e => setAddForm({ ...addForm, planned_qty: e.target.value })}
                                        className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Actual Qty</label>
                                    <input type="number" step="0.01" value={addForm.actual_qty} onChange={e => setAddForm({ ...addForm, actual_qty: e.target.value })}
                                        className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Unit Cost</label>
                                    <input type="number" step="0.01" value={addForm.unit_cost} onChange={e => setAddForm({ ...addForm, unit_cost: e.target.value })}
                                        className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                                    <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })}
                                        className={inputCls}>
                                        <option value="on_track">On Track</option>
                                        <option value="low_stock">Low Stock</option>
                                        <option value="out_of_stock">Out of Stock</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Specification</label>
                                <textarea value={addForm.spec} onChange={e => setAddForm({ ...addForm, spec: e.target.value })}
                                    placeholder="Optional specifications" rows="2" className={inputCls} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingAdd}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {savingAdd ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingMaterial ? 'Save Changes' : 'Add Material')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !deletingMaterial && setDeletingId(null)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><Trash2 className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">Delete Material</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
                        {deleteError && (
                            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {deleteError}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingId(null)} disabled={deletingMaterial}
                                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-60">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={deletingMaterial}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {deletingMaterial ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
