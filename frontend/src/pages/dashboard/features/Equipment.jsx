import React, { useState, useMemo } from 'react';
import { Wrench, Search, Plus, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { dummyEquipment, dummyProjects } from '../../../data/dummyData';

const STATUS_MAP = {
    available:   { label: 'Available',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    in_use:      { label: 'In Use',       cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    maintenance: { label: 'Maintenance',  cls: 'bg-amber-50 text-amber-700 border-amber-100' },
};

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export default function Equipment() {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const filtered = useMemo(() =>
        dummyEquipment.filter(e => {
            const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
                e.type.toLowerCase().includes(search.toLowerCase());
            const matchStatus = filterStatus === 'all' || e.status === filterStatus;
            return matchSearch && matchStatus;
        }), [search, filterStatus]);

    const stats = useMemo(() => ({
        total:       dummyEquipment.length,
        inUse:       dummyEquipment.filter(e => e.status === 'in_use').length,
        maintenance: dummyEquipment.filter(e => e.status === 'maintenance').length,
        available:   dummyEquipment.filter(e => e.status === 'available').length,
    }), []);

    const statCards = [
        { label: 'Total Units',     value: stats.total,       icon: <Wrench className="w-5 h-5" />,         iconBg: 'bg-slate-100 text-slate-500' },
        { label: 'In Use',          value: stats.inUse,       icon: <TrendingUp className="w-5 h-5" />,     iconBg: 'bg-blue-50 text-blue-600' },
        { label: 'Under Maintenance',value: stats.maintenance,icon: <AlertTriangle className="w-5 h-5" />,  iconBg: 'bg-amber-50 text-amber-600' },
        { label: 'Available',       value: stats.available,   icon: <CheckCircle className="w-5 h-5" />,   iconBg: 'bg-emerald-50 text-emerald-600' },
    ];

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Equipment</h2>
                    <p className="text-slate-500 mt-1">Cranes, excavators, and heavy machinery — hour-based utilization</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Equipment
                </button>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>{c.icon}</div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">{c.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* TABLE CARD */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name or type..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'available', 'in_use', 'maintenance'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterStatus === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'}`}
                            >
                                {s === 'all' ? 'All' : s === 'in_use' ? 'In Use' : s === 'maintenance' ? 'Maintenance' : 'Available'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Equipment Name</th>
                                <th className="px-4 py-4">Type</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4">Assigned Project</th>
                                <th className="px-4 py-4">Utilized Hrs</th>
                                <th className="px-4 py-4">Daily Rate</th>
                                <th className="px-4 py-4">Capacity</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                            {filtered.length > 0 ? filtered.map(eq => {
                                const s = STATUS_MAP[eq.status];
                                return (
                                    <tr key={eq.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-700">{eq.name}</td>
                                        <td className="px-4 py-4 text-slate-500">{eq.type}</td>
                                        <td className="px-4 py-4">
                                            <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border ${s.cls}`}>{s.label}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {eq.project_code !== '—'
                                                ? <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{eq.project_code}</span>
                                                : <span className="text-slate-300">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                <span>{eq.utilized_hours} hrs</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-slate-500">{fmt(eq.daily_rate)}</td>
                                        <td className="px-4 py-4 text-slate-500">{eq.capacity}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-14 text-center">
                                        <Wrench className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                        <p className="text-slate-400 text-sm">No equipment matches your filter.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
                    Showing {filtered.length} of {dummyEquipment.length} units
                </div>
            </div>
        </div>
    );
}
