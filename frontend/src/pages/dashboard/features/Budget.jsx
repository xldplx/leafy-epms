import { useState, useEffect, useMemo } from 'react';
import {
    Plus, Wallet, X, Loader2, CheckCircle2, TrendingUp, TrendingDown,
    DollarSign, Activity as ActivityIcon, Pencil, Trash2, AlertTriangle, RefreshCw, Link2, Download
} from 'lucide-react';
import { formatCurrency } from '../../../utils/evmHelpers';
import { INPUT_CLASS } from '../../../utils/uiConstants';
import { apiFetch } from '../../../utils/api';
import { exportWorkbook, exportFilename } from '../../../utils/excelExport';
import { useTranslation } from '../../../utils/i18n';

const VALID_TYPES = ['CAPEX', 'OPEX'];
const EMPTY_FORM  = { category: '', type: 'CAPEX', planned: '', actual: '', wbs_id: '' };

export default function Budget() {
    const { t } = useTranslation();

    const [projects, setProjects]                   = useState([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [categories, setCategories]               = useState([]);
    const [loadingCats, setLoadingCats]             = useState(false);
    const [wbsNodes, setWbsNodes]                   = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRow, setEditingRow]   = useState(null);
    const [form, setForm]               = useState(EMPTY_FORM);
    const [saving, setSaving]           = useState(false);
    const [formError, setFormError]     = useState('');

    const [deletingId, setDeletingId]   = useState(null);
    const [deletingRow, setDeletingRow] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [syncingId, setSyncingId]     = useState(null); // per-row sync
    const [syncingAll, setSyncingAll]   = useState(false);

    const [toast, setToast] = useState({ msg: '', type: 'success' });

    const userRole = localStorage.getItem('userRole');
    const canEdit  = ['Project Manager', 'Cost Engineer'].includes(userRole);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
    };

    // ── Fetch projects ────────────────────────────────────────────────────────
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

    // ── Fetch budget + WBS when project changes ───────────────────────────────
    const fetchCategories = async (pid) => {
        if (!pid) { setCategories([]); return; }
        setLoadingCats(true);
        try {
            const [budgetRes, wbsRes] = await Promise.all([
                apiFetch(`/budget?project_id=${pid}`),
                apiFetch(`/projects/${pid}/wbs`),
            ]);
            setCategories(budgetRes.data || []);
            setWbsNodes(wbsRes.data || []);
        } catch (e) { showToast(e.message || 'Failed to load.', 'error'); }
        finally { setLoadingCats(false); }
    };

    useEffect(() => { fetchCategories(selectedProjectId); }, [selectedProjectId]);

    useEffect(() => {
        const handler = (e) => { if (e.key !== 'Escape') return; setIsModalOpen(false); setDeletingId(null); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const selectedProject = projects.find(p => String(p.id) === selectedProjectId);

    // ── Aggregates ────────────────────────────────────────────────────────────
    const { totalPlanned, totalActual, totalVariance, usagePct } = useMemo(() => {
        const tp = categories.reduce((s, c) => s + (Number(c.planned) || 0), 0);
        const ta = categories.reduce((s, c) => s + (Number(c.actual)  || 0), 0);
        return { totalPlanned: tp, totalActual: ta, totalVariance: tp - ta, usagePct: tp > 0 ? (ta / tp) * 100 : 0 };
    }, [categories]);

    const capexRows = categories.filter(c => c.type === 'CAPEX');
    const opexRows  = categories.filter(c => c.type === 'OPEX');

    // ── Modals ────────────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingRow(null); setForm(EMPTY_FORM); setFormError(''); setIsModalOpen(true);
    };

    const openEditModal = (row) => {
        setEditingRow(row);
        setForm({ category: row.category, type: row.type, planned: String(row.planned), actual: String(row.actual || 0), wbs_id: row.wbs_id ? String(row.wbs_id) : '' });
        setFormError(''); setIsModalOpen(true);
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault(); setFormError('');
        if (!form.category.trim()) { setFormError(t('budget.categoryName') + ' ' + t('common.required') + '.'); return; }
        const plannedNum = parseFloat(form.planned);
        if (isNaN(plannedNum) || plannedNum < 0) { setFormError(t('budget.planned') + ' must be ≥ 0.'); return; }
        const actualNum  = parseFloat(form.actual) || 0;

        setSaving(true);
        try {
            const payload = { category: form.category.trim(), type: form.type, planned: plannedNum, actual: actualNum, wbs_id: form.wbs_id || null };
            if (editingRow) {
                await apiFetch(`/budget/${editingRow.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast(`"${form.category}" ${t('budget.updatedSuccess')}`);
            } else {
                await apiFetch('/budget', { method: 'POST', body: JSON.stringify({ ...payload, project_id: selectedProjectId }) });
                showToast(`"${form.category}" ${t('budget.addedSuccess')}`);
            }
            setIsModalOpen(false);
            fetchCategories(selectedProjectId);
        } catch (err) { setFormError(err.message || 'An error occurred.'); }
        finally { setSaving(false); }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deletingId) return; setDeleteError(''); setDeletingRow(true);
        try {
            await apiFetch(`/budget/${deletingId}`, { method: 'DELETE' });
            showToast(t('budget.deletedSuccess'));
            setDeletingId(null); fetchCategories(selectedProjectId);
        } catch (err) { setDeleteError(err.message || 'Failed.'); }
        finally { setDeletingRow(false); }
    };

    // ── Sync single row ───────────────────────────────────────────────────────
    const handleSyncOne = async (rowId) => {
        setSyncingId(rowId);
        try {
            const res = await apiFetch(`/budget/${rowId}/sync`, { method: 'PATCH' });
            showToast(`${t('budget.syncedActual')} ${formatCurrency(res.synced_actual)}`);
            fetchCategories(selectedProjectId);
        } catch (err) { showToast(err.message || 'Sync failed.', 'error'); }
        finally { setSyncingId(null); }
    };

    // ── Sync all rows ─────────────────────────────────────────────────────────
    const handleSyncAll = async () => {
        setSyncingAll(true);
        try {
            const res = await apiFetch(`/budget/sync-all?project_id=${selectedProjectId}`, { method: 'PATCH' });
            showToast(`${res.synced_count} ${t('budget.syncedCount')}`);
            fetchCategories(selectedProjectId);
        } catch (err) { showToast(err.message || 'Sync failed.', 'error'); }
        finally { setSyncingAll(false); }
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = () => {
        const rows = categories.map((c) => ({
            'Category':      c.category,
            'Type':          c.type,
            'WBS':           c.wbs?.wbs_code || '',
            'Planned (IDR)': Number(c.planned) || 0,
            'Actual (IDR)':  Number(c.actual) || 0,
            'Variance':      (Number(c.planned) || 0) - (Number(c.actual) || 0),
        }));
        exportWorkbook(exportFilename('Budget', selectedProject?.project_code), [{ name: 'Budget', rows }]);
    };

    // ── Render row ────────────────────────────────────────────────────────────
    const renderRow = (row) => {
        const variance = (Number(row.planned) || 0) - (Number(row.actual) || 0);
        const pct      = (Number(row.planned) || 0) > 0 ? (Number(row.actual) / Number(row.planned)) * 100 : 0;
        const overrun  = (Number(row.actual) || 0) > (Number(row.planned) || 0) && (Number(row.actual) || 0) > 0;
        const isSyncing = syncingId === row.id;
        return (
            <tr key={row.id} className={`transition-colors group ${overrun ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/50'}`}>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{row.category}</span>
                        {row.wbs && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                                <Link2 className="w-2.5 h-2.5" /> {row.wbs.wbs_code}
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-sm">{formatCurrency(row.planned)}</td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-mono text-sm">{formatCurrency(row.actual || 0)}</span>
                        {canEdit && (
                            <button onClick={() => handleSyncOne(row.id)} disabled={isSyncing}
                                title="Sync from tasks"
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40">
                                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>
                </td>
                <td className={`px-6 py-4 font-mono text-sm font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {variance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(variance))}
                </td>
                <td className="px-6 py-4 text-slate-500 font-semibold text-sm">{pct.toFixed(1)}%</td>
                <td className="px-6 py-4 w-36">
                    <div className="space-y-1">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${overrun ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : pct > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                    </div>
                </td>
                {canEdit && (
                    <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(row)} title={t('common.edit')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setDeleteError(''); setDeletingId(row.id); }} title={t('common.delete')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                )}
            </tr>
        );
    };

    if (isLoadingProjects) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-bold uppercase tracking-[0.2em] text-xs">{t('common.loading')}</p>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* TOAST */}
            {toast.msg && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200 ${
                    toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white shadow-emerald-200'}`}>
                    {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 mb-6">
                <button
                    onClick={handleExport}
                    disabled={categories.length === 0}
                    className="text-sm font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border shadow-sm text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none"
                >
                    <Download className="w-4 h-4" /> {t('common.export')}
                </button>
                {canEdit && selectedProjectId && categories.length > 0 && (
                    <button onClick={handleSyncAll} disabled={syncingAll}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all disabled:opacity-60">
                        {syncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {t('budget.syncAll')}
                    </button>
                )}
                {canEdit && selectedProjectId && (
                    <button onClick={openAddModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> {t('budget.addCategory')}
                    </button>
                )}
            </div>

            {/* PROJECT SELECTOR */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('common.project')}</label>
                <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={`${INPUT_CLASS} mt-1`}>
                    {projects.length === 0 && <option value="">No projects available</option>}
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                </select>
                {selectedProject && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">{t('budget.totalBudget')}: {formatCurrency(selectedProject.total_budget || 0)}</p>
                )}
            </div>

            {selectedProjectId && (
                <>
                    {/* KPI STRIP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { icon: <DollarSign className="w-5 h-5" />, bg: 'bg-slate-100', cls: 'text-slate-500', label: t('budget.totalPlanned'), value: formatCurrency(totalPlanned), valCls: 'text-slate-800' },
                        { icon: <ActivityIcon className="w-5 h-5" />, bg: 'bg-blue-50', cls: 'text-blue-600', label: t('budget.totalActual'), value: formatCurrency(totalActual), valCls: 'text-slate-800' },
                        {
                            icon: totalVariance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
                            bg: totalVariance >= 0 ? 'bg-emerald-50' : 'bg-red-50',
                            cls: totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600',
                            label: t('budget.variance'),
                            value: `${totalVariance >= 0 ? '+' : '−'}${formatCurrency(Math.abs(totalVariance))}`,
                            valCls: totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600',
                        },
                        {
                            icon: <Wallet className="w-5 h-5" />,
                            bg: usagePct > 100 ? 'bg-red-50' : usagePct >= 90 ? 'bg-amber-50' : 'bg-emerald-50',
                            cls: usagePct > 100 ? 'text-red-600' : usagePct >= 90 ? 'text-amber-600' : 'text-emerald-600',
                            label: t('budget.percentUsed'),
                            value: `${usagePct.toFixed(1)}%`,
                            valCls: usagePct > 100 ? 'text-red-600' : usagePct >= 90 ? 'text-amber-600' : 'text-slate-800',
                        },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className={`p-3 ${kpi.bg} rounded-xl ${kpi.cls} w-fit mb-4`}>{kpi.icon}</div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{kpi.label}</h3>
                            <p className={`text-xl font-black tracking-tight mt-1 font-mono ${kpi.valCls}`}>{kpi.value}</p>
                            {kpi.label === t('budget.percentUsed') && (
                                <div className="mt-3 bg-slate-100 rounded-full h-1 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${usagePct > 100 ? 'bg-red-500' : usagePct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(usagePct, 100)}%` }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Plan vs Actual Variance */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <ActivityIcon className="w-5 h-5" /> Plan vs Actual Variance
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-2 md:gap-4 border-b border-slate-100 pb-2">
                        {[...capexRows, ...opexRows].slice(0, 12).map((item, idx) => {
                            const planned = parseFloat(item.planned) || 0;
                            const actual = parseFloat(item.actual) || 0;
                            const maxVal = Math.max(...[...capexRows, ...opexRows].map(x => Math.max(parseFloat(x.planned) || 0, parseFloat(x.actual) || 0)), 1);
                            const plannedPct = (planned / maxVal) * 100;
                            const actualPct = (actual / maxVal) * 100;
                            const variance = actual - planned;
                            return (
                                <div key={idx} className="flex-1 flex flex-col justify-end group relative h-full">
                                    {(planned > 0 || actual > 0) && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                            {item.category}: {formatCurrency(planned)} (planned) vs {formatCurrency(actual)} (actual)
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1 h-full justify-end">
                                        {/* Planned */}
                                        <div style={{ height: `${Math.max(plannedPct, planned > 0 ? 4 : 0)}%` }}
                                            className="w-full bg-slate-200 rounded-t-lg transition-all duration-300 relative overflow-hidden min-h-[4px]">
                                            {planned > 0 && <div className="absolute bottom-0 left-0 right-0 bg-slate-500 h-full" />}
                                        </div>
                                        {/* Actual */}
                                        <div style={{ height: `${Math.max(actualPct, actual > 0 ? 4 : 0)}%` }}
                                            className={`w-full rounded-t-lg transition-all duration-300 relative overflow-hidden min-h-[4px] ${variance >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                            {actual > 0 && <div className={`absolute bottom-0 left-0 right-0 h-full ${variance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-300 text-center mt-2 font-mono truncate">{item.type}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-6 mt-4 text-xs text-slate-500 font-semibold">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-slate-500 rounded"></div>
                            <span>Planned</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                            <span>Actual (Under Budget / On Budget)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>Actual (Over Budget)</span>
                        </div>
                    </div>
                </div>

                    {/* SYNC INFO */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700">
                        <RefreshCw className="w-4 h-4 shrink-0" />
                        <span>{t('budget.syncInfo')}</span>
                    </div>

                    {/* CATEGORIES TABLE */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-bold text-slate-700">{t('budget.categories')}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{t('budget.groupedBy')}</p>
                        </div>

                        {loadingCats ? (
                            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                <span className="text-xs font-bold uppercase tracking-widest">{t('common.loading')}</span>
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="px-6 py-16 text-center text-slate-400">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <Wallet className="w-12 h-12 text-slate-200" />
                                    <p className="text-sm">{t('budget.noCategories')}</p>
                                    {canEdit && (
                                        <button onClick={openAddModal} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider">
                                            {t('budget.addFirst')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                            <th className="px-6 py-4">{t('common.name')}</th>
                                            <th className="px-6 py-4">{t('budget.planned')}</th>
                                            <th className="px-6 py-4">{t('budget.actual')}</th>
                                            <th className="px-6 py-4">{t('budget.variance')}</th>
                                            <th className="px-6 py-4">{t('budget.percentUsed')}</th>
                                            <th className="px-6 py-4">{t('budget.progress')}</th>
                                            {canEdit && <th className="px-6 py-4 text-right">{t('common.actions')}</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                        {capexRows.length > 0 && (
                                            <>
                                                <tr><td colSpan={canEdit ? 7 : 6} className="px-6 py-2 bg-slate-50/60 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{t('budget.capex')}</td></tr>
                                                {capexRows.map(renderRow)}
                                            </>
                                        )}
                                        {opexRows.length > 0 && (
                                            <>
                                                <tr><td colSpan={canEdit ? 7 : 6} className="px-6 py-2 bg-slate-50/60 text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">{t('budget.opex')}</td></tr>
                                                {opexRows.map(renderRow)}
                                            </>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50/80 text-sm font-bold text-slate-700 border-t-2 border-slate-200">
                                            <td className="px-6 py-4">{t('common.total')}</td>
                                            <td className="px-6 py-4 font-mono">{formatCurrency(totalPlanned)}</td>
                                            <td className="px-6 py-4 font-mono">{formatCurrency(totalActual)}</td>
                                            <td className={`px-6 py-4 font-mono ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {totalVariance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(totalVariance))}
                                            </td>
                                            <td className="px-6 py-4">{usagePct.toFixed(1)}%</td>
                                            <td className="px-6 py-4" />
                                            {canEdit && <td className="px-6 py-4" />}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${editingRow ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {editingRow ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">{editingRow ? t('budget.editCategory') : t('budget.addCategory')}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>

                        {formError && (
                            <div className="p-3 mb-5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('budget.categoryName')} <span className="text-red-500">*</span></label>
                                <input type="text" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                    placeholder="e.g. Site Preparation"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('budget.type')} <span className="text-red-500">*</span></label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm">
                                        {VALID_TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('budget.planned')} (IDR) <span className="text-red-500">*</span></label>
                                    <input type="number" required min={0} step={1000} value={form.planned} onChange={e => setForm({ ...form, planned: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Manual actual input */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('budget.actual')} (IDR)</label>
                                    <input type="number" min={0} step={1000} value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm" />
                                </div>
                                {/* WBS Link */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                                        <Link2 className="w-3 h-3" /> {t('budget.wbsLink')} <span className="text-slate-300">(optional)</span>
                                    </label>
                                    <select value={form.wbs_id} onChange={e => setForm({ ...form, wbs_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm">
                                        <option value="">{t('budget.noWbsLink')}</option>
                                        {wbsNodes.map(n => <option key={n.id} value={n.id}>{n.wbs_code} — {n.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {form.wbs_id && (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
                                    <RefreshCw className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    {t('budget.syncWbsInfo')}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">{t('common.cancel')}</button>
                                <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : (editingRow ? t('projects.saveChanges') : t('budget.addCategory'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !deletingRow && setDeletingId(null)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><Trash2 className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">{t('budget.deleteCategory')}</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">{t('settings.users.deleteCannotUndo')}</p>
                        {deleteError && <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {deleteError}</div>}
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingId(null)} disabled={deletingRow} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-60">{t('common.cancel')}</button>
                            <button onClick={handleDelete} disabled={deletingRow} className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {deletingRow ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.deleting')}</> : <><Trash2 className="w-4 h-4" /> {t('common.delete')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}