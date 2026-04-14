import React, { useState, useMemo } from 'react';
import { Package, Search, Plus, AlertTriangle, CheckCircle, ShoppingCart } from 'lucide-react';
import { dummyConsumables } from '../../../data/dummyData';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export default function Consumables() {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() =>
        dummyConsumables.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.supplier.toLowerCase().includes(search.toLowerCase())
        ), [search]);

    const lowStock = useMemo(() => dummyConsumables.filter(c => c.qty_on_hand < c.reorder_threshold), []);

    const totalValue = useMemo(() =>
        dummyConsumables.reduce((s, c) => s + c.qty_on_hand * c.unit_cost, 0), []);

    const stats = [
        { label: 'Total Items',    value: dummyConsumables.length, icon: <Package className="w-5 h-5" />,       iconBg: 'bg-slate-100 text-slate-500' },
        { label: 'Low Stock',      value: lowStock.length,         icon: <AlertTriangle className="w-5 h-5" />, iconBg: 'bg-amber-50 text-amber-600'  },
        { label: 'Stock OK',       value: dummyConsumables.length - lowStock.length, icon: <CheckCircle className="w-5 h-5" />, iconBg: 'bg-emerald-50 text-emerald-600' },
        { label: 'Stock Value',    value: fmt(totalValue),         icon: <ShoppingCart className="w-5 h-5" />,  iconBg: 'bg-blue-50 text-blue-600',    isWide: true },
    ];

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Consumables</h2>
                    <p className="text-slate-500 mt-1">Fuel, oil, and operational items — reorder threshold monitoring</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>

            {/* LOW STOCK ALERT BANNER */}
            {lowStock.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">
                            {lowStock.length} item{lowStock.length > 1 ? 's' : ''} below reorder threshold
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            {lowStock.map(c => c.name).join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>{c.icon}</div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold text-slate-800 truncate">{c.value}</p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">{c.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* TABLE CARD */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search item or supplier..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Item Name</th>
                                <th className="px-4 py-4">Supplier</th>
                                <th className="px-4 py-4">Unit</th>
                                <th className="px-4 py-4">Qty Used</th>
                                <th className="px-4 py-4">Qty On Hand</th>
                                <th className="px-4 py-4">Reorder At</th>
                                <th className="px-4 py-4">Unit Cost</th>
                                <th className="px-4 py-4">Stock Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                            {filtered.map(item => {
                                const isLow = item.qty_on_hand < item.reorder_threshold;
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isLow ? 'bg-amber-50/30' : ''}`}>
                                        <td className="px-6 py-4 font-semibold text-slate-700">{item.name}</td>
                                        <td className="px-4 py-4 text-slate-500 text-xs">{item.supplier}</td>
                                        <td className="px-4 py-4 text-slate-500">{item.unit}</td>
                                        <td className="px-4 py-4 text-slate-500">{item.qty_used.toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-4 font-semibold text-slate-700">{item.qty_on_hand.toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-4 text-slate-400">{item.reorder_threshold.toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-4 text-slate-500">{fmt(item.unit_cost)}</td>
                                        <td className="px-4 py-4">
                                            {isLow
                                                ? <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> Low Stock</span>
                                                : <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-100">Available</span>
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
                    Showing {filtered.length} of {dummyConsumables.length} items
                </div>
            </div>
        </div>
    );
}
