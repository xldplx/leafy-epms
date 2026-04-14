import React, { useState, useMemo } from 'react';
import { Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import { dummyBudget, dummyProjects } from '../../../data/dummyData';
import { INPUT_CLASS } from '../../../utils/uiConstants';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const CATEGORY_COLORS = {
    Labor:       'bg-blue-500',
    Materials:   'bg-emerald-500',
    Equipment:   'bg-violet-500',
    Consumables: 'bg-amber-500',
    Tools:       'bg-cyan-500',
    Overhead:    'bg-slate-400',
};

const CATEGORY_LIGHTS = {
    Labor:       'bg-blue-50 text-blue-700 border-blue-100',
    Materials:   'bg-emerald-50 text-emerald-700 border-emerald-100',
    Equipment:   'bg-violet-50 text-violet-700 border-violet-100',
    Consumables: 'bg-amber-50 text-amber-700 border-amber-100',
    Tools:       'bg-cyan-50 text-cyan-700 border-cyan-100',
    Overhead:    'bg-slate-50 text-slate-600 border-slate-200',
};

export default function Budget() {
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [filterType, setFilterType] = useState('all');

    const projectBudget = useMemo(() =>
        dummyBudget.filter(b => {
            const matchProject = !selectedProjectId || b.project_id === parseInt(selectedProjectId);
            const matchType = filterType === 'all' || b.type === filterType;
            return matchProject && matchType;
        }), [selectedProjectId, filterType]);

    const totals = useMemo(() => ({
        planned: projectBudget.reduce((s, b) => s + b.planned, 0),
        actual:  projectBudget.reduce((s, b) => s + b.actual, 0),
    }), [projectBudget]);

    const totalVariance = totals.planned - totals.actual;
    const spendPct = totals.planned > 0 ? (totals.actual / totals.planned) * 100 : 0;

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Budget</h2>
                    <p className="text-slate-500 mt-1">CAPEX & OPEX financial resources — planned vs actual with variance analysis</p>
                </div>
            </div>

            {/* FILTERS */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Project</label>
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={INPUT_CLASS}>
                        <option value="">All Projects</option>
                        {dummyProjects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                    </select>
                </div>
                <div className="sm:w-48 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className={INPUT_CLASS}>
                        <option value="all">CAPEX + OPEX</option>
                        <option value="CAPEX">CAPEX only</option>
                        <option value="OPEX">OPEX only</option>
                    </select>
                </div>
            </div>

            {/* SUMMARY KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Budget (Planned)</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{fmt(totals.planned)}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4">
                        <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: '100%' }} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spent (Actual)</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{fmt(totals.actual)}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4">
                        <div className={`h-1.5 rounded-full transition-all ${spendPct > 90 ? 'bg-red-500' : spendPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(spendPct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{spendPct.toFixed(1)}% of planned</p>
                </div>
                <div className={`rounded-2xl border shadow-sm p-6 ${totalVariance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget Remaining</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className={`text-3xl font-bold ${totalVariance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(Math.abs(totalVariance))}</p>
                        {totalVariance >= 0
                            ? <TrendingDown className="w-5 h-5 text-emerald-500" />
                            : <TrendingUp className="w-5 h-5 text-red-500" />
                        }
                    </div>
                    <p className={`text-xs font-semibold mt-1 ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {totalVariance >= 0 ? 'Under budget' : 'Over budget'}
                    </p>
                </div>
            </div>

            {/* CATEGORY BREAKDOWN */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                    <h3 className="font-bold text-slate-700">Budget Breakdown by Category</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Planned vs actual spend — variance analysis per cost category</p>
                </div>
                <div className="p-6 space-y-6">
                    {projectBudget.map(b => {
                        const pct = b.planned > 0 ? Math.min((b.actual / b.planned) * 100, 100) : 0;
                        const variance = b.planned - b.actual;
                        const barColor = CATEGORY_COLORS[b.category] || 'bg-slate-400';
                        const badgeClass = CATEGORY_LIGHTS[b.category] || 'bg-slate-50 text-slate-500 border-slate-200';
                        return (
                            <div key={b.id}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border ${badgeClass}`}>{b.category}</span>
                                        <span className="text-[11px] font-semibold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-md">{b.type}</span>
                                    </div>
                                    <div className="text-right text-xs">
                                        <span className="text-slate-500">{fmt(b.actual)}</span>
                                        <span className="text-slate-300 mx-1">/</span>
                                        <span className="text-slate-400">{fmt(b.planned)}</span>
                                        <span className={`ml-2 font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            ({variance >= 0 ? '-' : '+'}{fmt(Math.abs(variance))})
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5">
                                    <div className={`${barColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1 text-right">{pct.toFixed(1)}% spent</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Project</th>
                                <th className="px-4 py-4">Category</th>
                                <th className="px-4 py-4">Type</th>
                                <th className="px-4 py-4">Planned</th>
                                <th className="px-4 py-4">Actual</th>
                                <th className="px-4 py-4">Variance</th>
                                <th className="px-4 py-4 min-w-36">Spend</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                            {projectBudget.map(b => {
                                const variance = b.planned - b.actual;
                                const pct = b.planned > 0 ? (b.actual / b.planned) * 100 : 0;
                                const proj = dummyProjects.find(p => p.id === b.project_id);
                                return (
                                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{proj?.project_code || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3.5 font-semibold text-slate-700">{b.category}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${b.type === 'CAPEX' ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{b.type}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500">{fmt(b.planned)}</td>
                                        <td className="px-4 py-3.5 font-semibold text-slate-700">{fmt(b.actual)}</td>
                                        <td className={`px-4 py-3.5 font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {variance >= 0 ? '-' : '+'}{fmt(Math.abs(variance))}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 bg-slate-100 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">{pct.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 text-sm font-bold text-slate-700 border-t border-slate-100">
                                <td className="px-6 py-3.5" colSpan="3">Total</td>
                                <td className="px-4 py-3.5">{fmt(totals.planned)}</td>
                                <td className="px-4 py-3.5">{fmt(totals.actual)}</td>
                                <td className={`px-4 py-3.5 ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {totalVariance >= 0 ? '-' : '+'}{fmt(Math.abs(totalVariance))}
                                </td>
                                <td className="px-4 py-3.5 text-slate-400">{spendPct.toFixed(1)}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
