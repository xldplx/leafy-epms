import { useState, useEffect, useMemo } from 'react';
import { Plus, Hammer, Search, X, Loader2, CheckCircle2, Wrench, AlertTriangle, Package, RotateCcw } from 'lucide-react';
import { useTranslation } from '../../../utils/i18n';

const DEMO_TOOLS = [
    { id: 1, name: 'Total Station Leica TS06', category: 'Survey',        condition: 'good',         assigned_to: 'Budi Santoso', checkout_date: '2026-05-04', return_date: null },
    { id: 2, name: 'Concrete Vibrator',         category: 'Concrete',      condition: 'good',         assigned_to: null,           checkout_date: null,         return_date: null },
    { id: 3, name: 'Rebar Bender 25mm',         category: 'Reinforcement', condition: 'fair',         assigned_to: null,           checkout_date: null,         return_date: null },
    { id: 4, name: 'Theodolite Sokkia DT-540',  category: 'Survey',        condition: 'needs_repair', assigned_to: null,           checkout_date: null,         return_date: '2026-05-02' },
    { id: 5, name: 'Power Drill Bosch GBM-13',  category: 'Hand Tool',     condition: 'good',         assigned_to: 'Andi Wijaya',  checkout_date: '2026-05-05', return_date: null },
    { id: 6, name: 'Laser Level DeWalt',        category: 'Survey',        condition: 'good',         assigned_to: null,           checkout_date: null,         return_date: null },
    { id: 7, name: 'Concrete Mixer 350L',       category: 'Concrete',      condition: 'good',         assigned_to: null,           checkout_date: null,         return_date: null },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const todayISO = () => new Date().toISOString().slice(0, 10);
const STATUS_FILTERS_KEYS = ['All', 'Available', 'Checked Out', 'Needs Repair'];
const toolStatus = (t) => {
    if (t.condition === 'needs_repair') return 'Needs Repair';
    if (t.assigned_to && !t.return_date) return 'Checked Out';
    return 'Available';
};

const CONDITION_BADGE = {
    good:         'bg-emerald-50 text-emerald-700 border-emerald-100',
    fair:         'bg-amber-50 text-amber-700 border-amber-100',
    needs_repair: 'bg-red-50 text-red-700 border-red-100',
};

export default function Tools() {
    const { t } = useTranslation();
    const [tools, setTools]               = useState(DEMO_TOOLS);
    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [saving, setSaving]                 = useState(false);
    const [addForm, setAddForm]               = useState({ name: '', category: '', condition: 'good' });
    const [addError, setAddError]             = useState('');
    const [checkoutTargetId, setCheckoutTargetId] = useState(null);
    const [checkoutForm, setCheckoutForm]         = useState({ assigned_to: '', checkout_date: todayISO() });
    const [checkoutError, setCheckoutError]       = useState('');
    const [successToast, setSuccessToast]         = useState('');

    const userRole = localStorage.getItem('userRole');
    const canEdit  = ['Project Manager', 'Planner', 'Site Engineer'].includes(userRole);

    useEffect(() => {
        const handler = (e) => { if (e.key !== 'Escape') return; setIsAddModalOpen(false); setCheckoutTargetId(null); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const counts = useMemo(() => ({
        total: tools.length,
        available: tools.filter(t => !t.assigned_to && t.condition !== 'needs_repair').length,
        checkedOut: tools.filter(t => t.assigned_to && !t.return_date).length,
        needsRepair: tools.filter(t => t.condition === 'needs_repair').length,
    }), [tools]);

    const STATUS_FILTER_LABELS = {
        'All': t('common.all'),
        'Available': t('tools.available'),
        'Checked Out': t('tools.checkedOut'),
        'Needs Repair': t('tools.needsRepair'),
    };

    const filtered = useMemo(() => tools.filter(tool => {
        if (statusFilter !== 'All' && toolStatus(tool) !== statusFilter) return false;
        if (search && !tool.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }), [tools, search, statusFilter]);

    const showToast = (msg) => { setSuccessToast(msg); setTimeout(() => setSuccessToast(''), 3000); };

    const handleAddTool = (e) => {
        e.preventDefault();
        setAddError('');
        if (!addForm.name.trim()) { setAddError(t('common.name') + ' ' + t('common.required') + '.'); return; }
        setSaving(true);
        setTimeout(() => {
            setTools(prev => [...prev, { id: Date.now(), name: addForm.name.trim(), category: addForm.category.trim() || null, condition: addForm.condition, assigned_to: null, checkout_date: null, return_date: null }]);
            setIsAddModalOpen(false);
            setSaving(false);
            showToast(t('tools.addedDemo'));
        }, 400);
    };

    const handleCheckout = (e) => {
        e.preventDefault();
        setCheckoutError('');
        if (!checkoutForm.assigned_to.trim()) { setCheckoutError(t('tools.assignedToLabel') + ' ' + t('common.required') + '.'); return; }
        if (!checkoutForm.checkout_date) { setCheckoutError(t('tools.checkoutDate') + ' ' + t('common.required') + '.'); return; }
        setSaving(true);
        setTimeout(() => {
            setTools(prev => prev.map(tool => tool.id === checkoutTargetId
                ? { ...tool, assigned_to: checkoutForm.assigned_to.trim(), checkout_date: checkoutForm.checkout_date, return_date: null }
                : tool));
            setCheckoutTargetId(null);
            setSaving(false);
            showToast(t('tools.checkedOutDemo'));
        }, 400);
    };

    const handleReturn = (toolId) => {
        setTools(prev => prev.map(tool => tool.id === toolId ? { ...tool, assigned_to: null, checkout_date: null, return_date: todayISO() } : tool));
        showToast(t('tools.returnedDemo'));
    };

    const conditionLabel = (c) => c === 'good' ? t('tools.conditionGood') : c === 'fair' ? t('tools.conditionFair') : t('tools.conditionRepair');
    const checkoutTarget = tools.find(tool => tool.id === checkoutTargetId);

    return (
        <div className="space-y-8">
            {successToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4" /> {successToast}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-slate-50 text-slate-500 border-slate-200">Demo Data</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{t('tools.title')}</h2>
                    <p className="text-slate-500 mt-1">{t('tools.subtitle')}</p>
                </div>
                {canEdit && (
                    <button onClick={() => { setAddForm({ name: '', category: '', condition: 'good' }); setAddError(''); setIsAddModalOpen(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> {t('tools.addTool')}
                    </button>
                )}
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { icon: <Package className="w-5 h-5" />, bg: 'bg-slate-100', text: 'text-slate-500', label: t('common.total'), value: counts.total, valueClass: 'text-slate-800' },
                    { icon: <CheckCircle2 className="w-5 h-5" />, bg: 'bg-emerald-50', text: 'text-emerald-600', label: t('tools.available'), value: counts.available, valueClass: 'text-emerald-600' },
                    { icon: <Wrench className="w-5 h-5" />, bg: 'bg-blue-50', text: 'text-blue-600', label: t('tools.checkedOut'), value: counts.checkedOut, valueClass: 'text-blue-600' },
                    { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-red-50', text: 'text-red-600', label: t('tools.needsRepair'), value: counts.needsRepair, valueClass: 'text-red-600' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className={`p-3 ${kpi.bg} rounded-xl ${kpi.text} w-fit mb-4`}>{kpi.icon}</div>
                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{kpi.label}</h3>
                        <p className={`text-2xl font-black tracking-tight mt-1 ${kpi.valueClass}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* FILTERS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
                    {STATUS_FILTERS_KEYS.map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)}
                            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === f ? 'bg-white text-emerald-700 shadow-md border border-emerald-100' : 'text-slate-400 hover:text-slate-700'}`}>
                            {STATUS_FILTER_LABELS[f]}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder={t('tools.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}
                        className="text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-emerald-500 transition-colors min-w-[240px]" />
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">{t('common.name')}</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">{t('tools.condition')}</th>
                                <th className="px-6 py-4">{t('tools.assignedTo')}</th>
                                <th className="px-6 py-4">{t('tools.checkout')}</th>
                                <th className="px-6 py-4">{t('tools.return')}</th>
                                {canEdit && <th className="px-6 py-4 text-right">{t('common.actions')}</th>}
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {filtered.length > 0 ? filtered.map(tool => {
                                const isCheckedOut  = !!tool.assigned_to && !tool.return_date;
                                const isNeedsRepair = tool.condition === 'needs_repair';
                                return (
                                    <tr key={tool.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-700">{tool.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{tool.category || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${CONDITION_BADGE[tool.condition] || CONDITION_BADGE.good}`}>
                                                {conditionLabel(tool.condition)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{tool.assigned_to || '—'}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs">{fmtDate(tool.checkout_date)}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs">{fmtDate(tool.return_date)}</td>
                                        {canEdit && (
                                            <td className="px-6 py-4 text-right">
                                                {isNeedsRepair ? (
                                                    <span className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-100">{t('tools.inRepair')}</span>
                                                ) : isCheckedOut ? (
                                                    <button onClick={() => handleReturn(tool.id)}
                                                        className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1.5 ml-auto">
                                                        <RotateCcw className="w-3 h-3" /> {t('tools.return')}
                                                    </button>
                                                ) : (
                                                    <button onClick={() => { setCheckoutForm({ assigned_to: '', checkout_date: todayISO() }); setCheckoutError(''); setCheckoutTargetId(tool.id); }}
                                                        className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                                        {t('tools.checkOut')}
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={canEdit ? 7 : 6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Hammer className="w-12 h-12 text-slate-200" />
                                            <p>{t('tools.noMatch')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                    <span className="text-xs text-slate-400">{t('common.showing')} {filtered.length} {t('common.of')} {tools.length}</span>
                </div>
            </div>

            {/* ADD TOOL MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsAddModalOpen(false)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{t('tools.addTool')}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        {addError && <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">{addError}</div>}
                        <form onSubmit={handleAddTool} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('common.name')} <span className="text-red-500">*</span></label>
                                <input type="text" required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                                    placeholder="e.g. Total Station Leica TS06"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Category</label>
                                    <input type="text" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                                        placeholder="e.g. Survey"
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('tools.condition')}</label>
                                    <select value={addForm.condition} onChange={e => setAddForm({ ...addForm, condition: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm">
                                        <option value="good">{t('tools.conditionGood')}</option>
                                        <option value="fair">{t('tools.conditionFair')}</option>
                                        <option value="needs_repair">{t('tools.conditionRepair')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">{t('common.cancel')}</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : t('tools.addTool')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CHECKOUT MODAL */}
            {checkoutTargetId && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setCheckoutTargetId(null)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-slate-800">{t('tools.checkOut')}</h3>
                            <button onClick={() => setCheckoutTargetId(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-6 font-mono">{checkoutTarget?.name}</p>
                        {checkoutError && <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">{checkoutError}</div>}
                        <form onSubmit={handleCheckout} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('tools.assignedToLabel')} <span className="text-red-500">*</span></label>
                                <input type="text" required value={checkoutForm.assigned_to} onChange={e => setCheckoutForm({ ...checkoutForm, assigned_to: e.target.value })}
                                    placeholder="e.g. Budi Santoso"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('tools.checkoutDate')} <span className="text-red-500">*</span></label>
                                <input type="date" required max={todayISO()} value={checkoutForm.checkout_date} onChange={e => setCheckoutForm({ ...checkoutForm, checkout_date: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setCheckoutTargetId(null)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">{t('common.cancel')}</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('tools.checkingOut')}</> : t('tools.confirmCheckout')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}