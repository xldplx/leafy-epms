import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, X, Loader2, CheckCircle2, AlertTriangle, Droplet, Activity, Layers, History, ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { load, save } from '../../../utils/localStore';

const ITEMS_KEY = 'epms.consumables.v1';
const LOG_KEY   = 'epms.consumables_log.v1';

const CATEGORIES = ['Fuel', 'Lubricant', 'Welding', 'Cleaning', 'Other'];
const UNITS      = ['L', 'kg', 'pcs'];

// ── DEMO CONSUMABLES SEED — replaced once Ananta's backend ships ──
const DEMO_CONSUMABLES = [
    { id: 101, name: 'Diesel Fuel',         category: 'Fuel',      unit: 'L',   current_stock: 850, reorder_threshold: 200, last_used_at: null },
    { id: 102, name: 'Motor Oil 10W-40',    category: 'Lubricant', unit: 'L',   current_stock: 120, reorder_threshold: 50,  last_used_at: null },
    { id: 103, name: 'Welding Rods E6013',  category: 'Welding',   unit: 'kg',  current_stock: 45,  reorder_threshold: 30,  last_used_at: null },
    { id: 104, name: 'Hydraulic Oil ISO 68',category: 'Lubricant', unit: 'L',   current_stock: 80,  reorder_threshold: 40,  last_used_at: null },
    { id: 105, name: 'Grease MP3',          category: 'Lubricant', unit: 'kg',  current_stock: 15,  reorder_threshold: 20,  last_used_at: null },
    { id: 106, name: 'Cutting Discs 14"',   category: 'Other',     unit: 'pcs', current_stock: 60,  reorder_threshold: 25,  last_used_at: null },
    { id: 107, name: 'Cleaning Solvent',    category: 'Cleaning',  unit: 'L',   current_stock: 30,  reorder_threshold: 15,  last_used_at: null },
    { id: 108, name: 'Curing Compound',     category: 'Other',     unit: 'kg',  current_stock: 25,  reorder_threshold: 30,  last_used_at: null },
];

const STATUS_FILTERS = ['All', 'Low Stock', 'Healthy'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const stockState = (item) => item.current_stock < item.reorder_threshold ? 'Low Stock' : 'Healthy';

export default function Consumables() {
    const [items, setItems] = useState(() => load(ITEMS_KEY, DEMO_CONSUMABLES));
    const [log,   setLog]   = useState(() => load(LOG_KEY, []));

    const [projects, setProjects]                   = useState([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [historyOpen, setHistoryOpen]   = useState(true);

    // Add Consumable modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', category: 'Fuel', unit: 'L', current_stock: '', reorder_threshold: '' });
    const [addError, setAddError] = useState('');
    const [saving, setSaving]     = useState(false);

    // Log Consumption modal
    const [logTargetId, setLogTargetId] = useState(null);
    const [logForm, setLogForm]         = useState({ qty: '', date: todayISO(), project_id: '', note: '' });
    const [logError, setLogError]       = useState('');
    const [savingLog, setSavingLog]     = useState(false);

    const [successToast, setSuccessToast] = useState('');

    const userRole   = localStorage.getItem('userRole');
    const canAdd     = ['Project Manager', 'Planner'].includes(userRole);
    const canLogUse  = ['Project Manager', 'Planner', 'Site Engineer'].includes(userRole);

    // Fetch projects (live endpoint)
    useEffect(() => {
        setIsLoadingProjects(true);
        apiFetch('/projects')
            .then(r => {
                const list = r.data || [];
                setProjects(list);
                if (list.length > 0) setSelectedProjectId(String(list[0].id));
            })
            .catch(console.error)
            .finally(() => setIsLoadingProjects(false));
    }, []);

    // Close modals on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key !== 'Escape') return;
            setIsAddModalOpen(false);
            setLogTargetId(null);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const showToast = (msg) => {
        setSuccessToast(msg);
        setTimeout(() => setSuccessToast(''), 3000);
    };

    // ── KPI strip ─────────────────────────────────────────────────────────────
    const today = todayISO();
    const projectIdNum = parseInt(selectedProjectId) || null;

    const counts = useMemo(() => {
        const lowStock = items.filter(i => i.current_stock < i.reorder_threshold).length;
        const todaysConsumptions = log.filter(e =>
            e.date === today && (projectIdNum ? e.project_id === projectIdNum : true)
        ).length;
        const categories = new Set(items.map(i => i.category)).size;
        return { total: items.length, lowStock, todaysConsumptions, categories };
    }, [items, log, projectIdNum, today]);

    // ── Filtered table ────────────────────────────────────────────────────────
    const filtered = useMemo(() => items.filter(i => {
        if (statusFilter !== 'All' && stockState(i) !== statusFilter) return false;
        if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }), [items, search, statusFilter]);

    // ── Recent activity (project-scoped) ──────────────────────────────────────
    const recentEvents = useMemo(() => {
        if (!projectIdNum) return [];
        return log
            .filter(e => e.project_id === projectIdNum)
            .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
            .slice(0, 10);
    }, [log, projectIdNum]);

    const itemById = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items]);

    // ── Add Consumable ────────────────────────────────────────────────────────
    const openAddModal = () => {
        setAddForm({ name: '', category: 'Fuel', unit: 'L', current_stock: '', reorder_threshold: '' });
        setAddError('');
        setIsAddModalOpen(true);
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        setAddError('');
        if (!addForm.name.trim()) { setAddError('Name is required.'); return; }
        const stock     = parseFloat(addForm.current_stock);
        const threshold = parseFloat(addForm.reorder_threshold);
        if (isNaN(stock) || stock < 0)         { setAddError('Stock must be 0 or greater.'); return; }
        if (isNaN(threshold) || threshold < 0) { setAddError('Reorder threshold must be 0 or greater.'); return; }

        setSaving(true);
        setTimeout(() => {
            setItems(prev => {
                const next = [...prev, {
                    id:                Date.now(),
                    name:              addForm.name.trim(),
                    category:          addForm.category,
                    unit:              addForm.unit,
                    current_stock:     stock,
                    reorder_threshold: threshold,
                    last_used_at:      null,
                }];
                save(ITEMS_KEY, next);
                return next;
            });
            setIsAddModalOpen(false);
            setSaving(false);
            showToast('Consumable added (demo only — not persisted to backend)');
        }, 350);
    };

    // ── Log Consumption ───────────────────────────────────────────────────────
    const openLogModal = (itemId) => {
        setLogForm({ qty: '', date: todayISO(), project_id: selectedProjectId, note: '' });
        setLogError('');
        setLogTargetId(itemId);
    };

    const handleLogConsumption = (e) => {
        e.preventDefault();
        setLogError('');
        const target = itemById[logTargetId];
        if (!target) { setLogError('Item not found.'); return; }

        const qty = parseFloat(logForm.qty);
        if (isNaN(qty) || qty <= 0)            { setLogError('Quantity must be greater than zero.'); return; }
        if (qty > target.current_stock)        { setLogError(`Only ${target.current_stock} ${target.unit} in stock.`); return; }
        if (!logForm.date)                     { setLogError('Date is required.'); return; }
        if (logForm.date > todayISO())         { setLogError('Date cannot be in the future.'); return; }
        if (!logForm.project_id)               { setLogError('Please select a project.'); return; }

        setSavingLog(true);
        setTimeout(() => {
            const projectId = parseInt(logForm.project_id);
            setItems(prev => {
                const next = prev.map(i => i.id === logTargetId
                    ? { ...i, current_stock: i.current_stock - qty, last_used_at: logForm.date }
                    : i);
                save(ITEMS_KEY, next);
                return next;
            });
            setLog(prev => {
                const next = [...prev, {
                    id:         Date.now(),
                    item_id:    logTargetId,
                    project_id: projectId,
                    qty,
                    date:       logForm.date,
                    note:       logForm.note.trim(),
                }];
                save(LOG_KEY, next);
                return next;
            });
            setLogTargetId(null);
            setSavingLog(false);
            showToast(`Logged ${qty} ${target.unit} of ${target.name}`);
        }, 350);
    };

    const logTarget = itemById[logTargetId];
    const selectedProject = projects.find(p => String(p.id) === selectedProjectId);

    return (
        <div className="space-y-8">

            {/* SUCCESS TOAST */}
            {successToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4" /> {successToast}
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-slate-50 text-slate-500 border-slate-200">
                            Demo Data
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Consumables</h2>
                    <p className="text-slate-500 mt-1">Fuel, lubricants, and operational items — daily consumption logging</p>
                </div>
                {canAdd && (
                    <button
                        onClick={openAddModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Consumable
                    </button>
                )}
            </div>

            {/* PROJECT SELECTOR */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Project Scope</span>
                </div>
                <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    disabled={isLoadingProjects || projects.length === 0}
                    className="flex-1 max-w-md px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm font-semibold disabled:opacity-60"
                >
                    {isLoadingProjects ? (
                        <option value="">Loading projects...</option>
                    ) : projects.length === 0 ? (
                        <option value="">No projects available</option>
                    ) : (
                        projects.map(p => (
                            <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
                        ))
                    )}
                </select>
                <span className="text-xs text-slate-400 hidden md:inline">Consumption events log against this project.</span>
            </div>

            {/* KPI STRIP */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-slate-100 rounded-xl text-slate-500"><Package className="w-5 h-5" /></div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Items</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{counts.total}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 rounded-xl text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Low Stock</h3>
                    <p className="text-2xl font-black text-red-600 tracking-tight mt-1">{counts.lowStock}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Droplet className="w-5 h-5" /></div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Today's Consumptions</h3>
                    <p className="text-2xl font-black text-blue-600 tracking-tight mt-1">{counts.todaysConsumptions}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Layers className="w-5 h-5" /></div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Categories</h3>
                    <p className="text-2xl font-black text-emerald-600 tracking-tight mt-1">{counts.categories}</p>
                </div>
            </div>

            {/* FILTER + SEARCH */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                statusFilter === f
                                ? 'bg-white text-emerald-700 shadow-md shadow-emerald-500/5 border border-emerald-100'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search consumable name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-emerald-500 transition-colors min-w-[240px]"
                    />
                </div>
            </div>

            {/* STOCK TABLE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Reorder At</th>
                                <th className="px-6 py-4">Last Used</th>
                                {canLogUse && <th className="px-6 py-4 text-right">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {filtered.length > 0 ? (
                                filtered.map(i => {
                                    const isLow = i.current_stock < i.reorder_threshold;
                                    return (
                                        <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-700">{i.name}</td>
                                            <td className="px-6 py-4 text-slate-500">{i.category}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-2">
                                                    <span className={`font-mono font-bold ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                                                        {i.current_stock} {i.unit}
                                                    </span>
                                                    {isLow && (
                                                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100">
                                                            Low
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{i.reorder_threshold} {i.unit}</td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">{fmtDate(i.last_used_at)}</td>
                                            {canLogUse && (
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => openLogModal(i.id)}
                                                        disabled={i.current_stock <= 0}
                                                        title={i.current_stock <= 0 ? 'Out of stock' : 'Log consumption'}
                                                        className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        Log Consumption
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={canLogUse ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Package className="w-12 h-12 text-slate-200" />
                                            <p>No consumables match the current filter.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                    <span className="text-xs text-slate-400">Showing {filtered.length} of {items.length} items</span>
                </div>
            </div>

            {/* RECENT CONSUMPTION (project-scoped) */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => setHistoryOpen(o => !o)}
                    className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-xl text-slate-500"><History className="w-4 h-4" /></div>
                        <div className="text-left">
                            <h3 className="font-bold text-slate-700">Recent Consumption</h3>
                            <p className="text-xs text-slate-400">
                                {selectedProject
                                    ? `${selectedProject.project_code} — ${selectedProject.project_name}`
                                    : 'Select a project to view events'}
                            </p>
                        </div>
                    </div>
                    {historyOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>

                {historyOpen && (
                    <div className="border-t border-slate-100">
                        {recentEvents.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/60 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Item</th>
                                        <th className="px-6 py-3">Quantity</th>
                                        <th className="px-6 py-3">Note</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {recentEvents.map(e => {
                                        const item = itemById[e.item_id];
                                        return (
                                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3 text-slate-500 text-xs">{fmtDate(e.date)}</td>
                                                <td className="px-6 py-3 font-semibold text-slate-700">{item?.name || `Item #${e.item_id}`}</td>
                                                <td className="px-6 py-3 font-mono text-slate-700">{e.qty} {item?.unit || ''}</td>
                                                <td className="px-6 py-3 text-slate-400 text-xs">{e.note || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <History className="w-10 h-10 text-slate-200" />
                                <p className="text-sm">No consumption events for this project yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── ADD CONSUMABLE MODAL ───────────────────────────────────────── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsAddModalOpen(false)}>
                    <div role="dialog" aria-label="Add consumable" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Add Consumable</h3>
                            <button onClick={() => setIsAddModalOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {addError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">
                                {addError}
                            </div>
                        )}

                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required value={addForm.name}
                                    onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                                    placeholder="e.g. Diesel Fuel"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Category</label>
                                    <select
                                        value={addForm.category}
                                        onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Unit</label>
                                    <select
                                        value={addForm.unit}
                                        onChange={e => setAddForm({ ...addForm, unit: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    >
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Starting Stock <span className="text-red-500">*</span></label>
                                    <input
                                        type="number" required min="0" step="any" value={addForm.current_stock}
                                        onChange={e => setAddForm({ ...addForm, current_stock: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Reorder Threshold <span className="text-red-500">*</span></label>
                                    <input
                                        type="number" required min="0" step="any" value={addForm.reorder_threshold}
                                        onChange={e => setAddForm({ ...addForm, reorder_threshold: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Add Consumable'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── LOG CONSUMPTION MODAL ──────────────────────────────────────── */}
            {logTargetId !== null && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setLogTargetId(null)}>
                    <div role="dialog" aria-label="Log consumption" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-slate-800">Log Consumption</h3>
                            <button onClick={() => setLogTargetId(null)} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-6 font-mono">
                            {logTarget?.name} · {logTarget?.current_stock} {logTarget?.unit} in stock
                        </p>

                        {logError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">
                                {logError}
                            </div>
                        )}

                        <form onSubmit={handleLogConsumption} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Quantity <span className="text-red-500">*</span></label>
                                    <input
                                        type="number" required min="0" step="any" value={logForm.qty}
                                        onChange={e => setLogForm({ ...logForm, qty: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date" required max={todayISO()} value={logForm.date}
                                        onChange={e => setLogForm({ ...logForm, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project <span className="text-red-500">*</span></label>
                                <select
                                    required value={logForm.project_id}
                                    onChange={e => setLogForm({ ...logForm, project_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                >
                                    <option value="">Select a project...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Note <span className="text-slate-300">(optional)</span></label>
                                <input
                                    type="text" value={logForm.note}
                                    onChange={e => setLogForm({ ...logForm, note: e.target.value })}
                                    placeholder="e.g. Excavator EX-02 refuel"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setLogTargetId(null)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingLog}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {savingLog ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Log Consumption'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
