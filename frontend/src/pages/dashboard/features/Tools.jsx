import React, { useState, useMemo } from 'react';
import { Hammer, Search, Plus, AlertTriangle } from 'lucide-react';
import { dummyTools, dummyProjects } from '../../../data/dummyData';

const CONDITION_MAP = {
    good: { label: 'Good',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    fair: { label: 'Fair',  cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    poor: { label: 'Poor',  cls: 'bg-red-50 text-red-700 border-red-100' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const projectCode = (id) => dummyProjects.find(p => p.id === id)?.project_code || '—';

export default function Tools() {
    const [search, setSearch] = useState('');
    const [filterCondition, setFilterCondition] = useState('all');

    const filtered = useMemo(() =>
        dummyTools.filter(t => {
            const s = search.toLowerCase();
            const match = t.name.toLowerCase().includes(s) ||
                t.category.toLowerCase().includes(s) ||
                (t.assigned_to || '').toLowerCase().includes(s);
            const cond = filterCondition === 'all' || t.condition === filterCondition;
            return match && cond;
        }), [search, filterCondition]);

    const checkedOut = dummyTools.filter(t => t.assigned_to !== null).length;
    const inWarehouse = dummyTools.length - checkedOut;
    const poorCondition = dummyTools.filter(t => t.condition === 'poor').length;

    const stats = [
        { label: 'Total Tools',   value: dummyTools.length, cls: 'bg-slate-100 text-slate-500' },
        { label: 'Checked Out',   value: checkedOut,         cls: 'bg-blue-50 text-blue-600' },
        { label: 'In Warehouse',  value: inWarehouse,        cls: 'bg-emerald-50 text-emerald-600' },
        { label: 'Needs Service', value: poorCondition,      cls: 'bg-red-50 text-red-600' },
    ];

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Tools</h2>
                    <p className="text-slate-500 mt-1">Drills, test instruments, and specialized tools — checkout tracking</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Tool
                </button>
            </div>

            {/* POOR CONDITION ALERT */}
            {poorCondition > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-red-800">{poorCondition} tool{poorCondition > 1 ? 's' : ''} in poor condition — service required</p>
                        <p className="text-xs text-red-500 mt-0.5">{dummyTools.filter(t => t.condition === 'poor').map(t => t.name).join(', ')}</p>
                    </div>
                </div>
            )}

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <p className="text-3xl font-bold text-slate-800">{c.value}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">{c.label}</p>
                    </div>
                ))}
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search tool or assigned to..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'good', 'fair', 'poor'].map(s => (
                            <button key={s} onClick={() => setFilterCondition(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${filterCondition === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'}`}>
                                {s === 'all' ? 'All' : s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Tool Name</th>
                                <th className="px-4 py-4">Category</th>
                                <th className="px-4 py-4">Condition</th>
                                <th className="px-4 py-4">Assigned To</th>
                                <th className="px-4 py-4">Checkout Date</th>
                                <th className="px-4 py-4">Return Date</th>
                                <th className="px-4 py-4">Project</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                            {filtered.map(t => {
                                const cond = CONDITION_MAP[t.condition];
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-700">{t.name}</td>
                                        <td className="px-4 py-4 text-slate-500">{t.category}</td>
                                        <td className="px-4 py-4">
                                            <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border ${cond.cls}`}>{cond.label}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {t.assigned_to
                                                ? <span className="font-medium text-slate-700">{t.assigned_to}</span>
                                                : <span className="text-slate-300">Not checked out</span>
                                            }
                                        </td>
                                        <td className="px-4 py-4 text-slate-500">{fmtDate(t.checkout_date)}</td>
                                        <td className="px-4 py-4 text-slate-500">{fmtDate(t.return_date)}</td>
                                        <td className="px-4 py-4">
                                            {t.project_id
                                                ? <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{projectCode(t.project_id)}</span>
                                                : <span className="text-slate-300">—</span>
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
                    Showing {filtered.length} of {dummyTools.length} tools
                </div>
            </div>
        </div>
    );
}
