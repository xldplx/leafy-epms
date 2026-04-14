import React, { useState, useMemo } from 'react';
import { Layers, Search, Plus, Truck, BarChart2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { dummyMaterials, dummyMaterialReceipts, dummyProjects } from '../../../data/dummyData';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
const fmtNum = (v) => v.toLocaleString('id-ID');

const STATUS_MAP = {
    on_track:    { label: 'On Track',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    delayed:     { label: 'Delayed',     cls: 'bg-red-50 text-red-700 border-red-100' },
    not_started: { label: 'Not Started', cls: 'bg-slate-50 text-slate-500 border-slate-100' },
};

const TABS = ['Materials List', 'Incoming Deliveries', 'Usage Tracking'];

export default function Materials() {
    const [activeTab, setActiveTab] = useState('Materials List');
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('all');

    const filtered = useMemo(() =>
        dummyMaterials.filter(m => {
            const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.spec.toLowerCase().includes(search.toLowerCase());
            const matchProject = filterProject === 'all' || m.project_id === parseInt(filterProject);
            return matchSearch && matchProject;
        }), [search, filterProject]);

    const projectName = (id) => dummyProjects.find(p => p.id === id)?.project_code || '—';

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Materials</h2>
                    <p className="text-slate-500 mt-1">Cement, steel, cable — quantity tracking with receipt verification</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Material
                </button>
            </div>

            {/* TAB STRIP */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── MATERIALS LIST TAB ── */}
            {activeTab === 'Materials List' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search material..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                        </div>
                        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-all text-slate-600">
                            <option value="all">All Projects</option>
                            {dummyProjects.map(p => <option key={p.id} value={p.id}>{p.project_code}</option>)}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-6 py-4">Material Name</th>
                                    <th className="px-4 py-4">Spec</th>
                                    <th className="px-4 py-4">Unit</th>
                                    <th className="px-4 py-4">Planned Qty</th>
                                    <th className="px-4 py-4">Actual Qty</th>
                                    <th className="px-4 py-4 min-w-36">Delivery Progress</th>
                                    <th className="px-4 py-4">Unit Cost</th>
                                    <th className="px-4 py-4">Project</th>
                                    <th className="px-4 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                                {filtered.map(m => {
                                    const pct = m.planned_qty > 0 ? Math.min((m.actual_qty / m.planned_qty) * 100, 100) : 0;
                                    const s = STATUS_MAP[m.status];
                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-700">{m.name}</td>
                                            <td className="px-4 py-4 text-xs text-slate-400">{m.spec}</td>
                                            <td className="px-4 py-4 text-slate-500">{m.unit}</td>
                                            <td className="px-4 py-4 text-slate-500">{fmtNum(m.planned_qty)}</td>
                                            <td className="px-4 py-4 font-semibold text-slate-700">{fmtNum(m.actual_qty)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                                        <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 shrink-0 w-9 text-right">{pct.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{fmt(m.unit_cost)}</td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{projectName(m.project_id)}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border ${s.cls}`}>{s.label}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
                        Showing {filtered.length} of {dummyMaterials.length} materials
                    </div>
                </div>
            )}

            {/* ── INCOMING DELIVERIES TAB ── */}
            {activeTab === 'Incoming Deliveries' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-50 flex items-center gap-3">
                        <Truck className="w-5 h-5 text-emerald-600" />
                        <div>
                            <h3 className="font-bold text-slate-700">Incoming Material Receipts</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Track all material deliveries with date, quantity, supplier, and verification status</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-6 py-4">Delivery Date</th>
                                    <th className="px-4 py-4">Material</th>
                                    <th className="px-4 py-4">Qty Received</th>
                                    <th className="px-4 py-4">Supplier</th>
                                    <th className="px-4 py-4">Doc No.</th>
                                    <th className="px-4 py-4">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                                {dummyMaterialReceipts.map(r => {
                                    const mat = dummyMaterials.find(m => m.id === r.material_id);
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4 text-slate-500">{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-4 py-4 font-semibold text-slate-700">{mat?.name || '—'}</td>
                                            <td className="px-4 py-4">{fmtNum(r.qty)} {r.unit}</td>
                                            <td className="px-4 py-4 text-slate-500 text-xs">{r.supplier}</td>
                                            <td className="px-4 py-4"><span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{r.doc_no}</span></td>
                                            <td className="px-4 py-4">
                                                {r.verified
                                                    ? <span className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
                                                    : <span className="flex items-center gap-1.5 text-amber-600 text-xs font-bold"><AlertTriangle className="w-3.5 h-3.5" /> Pending</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── USAGE TRACKING TAB ── */}
            {activeTab === 'Usage Tracking' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-50 flex items-center gap-3">
                        <BarChart2 className="w-5 h-5 text-emerald-600" />
                        <div>
                            <h3 className="font-bold text-slate-700">Material Consumption vs Plan</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Monitor material usage with automatic variance tracking</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        {dummyMaterials.map(m => {
                            const pct = m.planned_qty > 0 ? (m.actual_qty / m.planned_qty) * 100 : 0;
                            const variance = m.actual_qty - m.planned_qty;
                            const isOver = variance > 0;
                            return (
                                <div key={m.id}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <span className="text-sm font-semibold text-slate-700">{m.name}</span>
                                            <span className="ml-2 text-xs text-slate-400">{m.spec}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-slate-700">{fmtNum(m.actual_qty)} / {fmtNum(m.planned_qty)} {m.unit}</span>
                                            {m.actual_qty > 0 && (
                                                <span className={`ml-2 text-xs font-bold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {isOver ? '+' : ''}{fmtNum(variance)} {m.unit}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-500 ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[11px] text-slate-400">{projectName(m.project_id)}</span>
                                        <span className="text-[11px] font-bold text-slate-500">{pct.toFixed(1)}% consumed</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );

    function projectName(id) {
        return dummyProjects.find(p => p.id === id)?.project_code || '—';
    }
}
