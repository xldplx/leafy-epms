import React, { useState, useEffect, useMemo } from 'react';
import { Activity, TrendingUp, AlertTriangle, BarChart3, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { evmApi } from '../../../utils/api';
import { indexColor, formatCurrency } from '../../../utils/evmHelpers';
import { STATUS_STYLES } from '../../../utils/uiConstants';

function OverviewTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl p-3 text-[10px] min-w-40">
            <p className="font-bold text-slate-800 mb-2">{label}</p>
            <div className="space-y-1">
                {payload.map(p => (
                    <div key={p.dataKey} className="flex justify-between items-center gap-4">
                        <span style={{ color: p.color }} className="font-bold uppercase tracking-wider">{p.name}</span>
                        <span className="text-slate-700 font-mono font-bold">{formatCurrency(p.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Overview() {
    const [portfolioData, setPortfolioData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        evmApi.getOverview()
            .then(res => setPortfolioData(res.data))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const projectMetrics = portfolioData?.projects || [];
    const portfolio = portfolioData?.portfolio || {};

    const { totalAC, totalBAC, portfolioCPI, portfolioSPI } = useMemo(() => ({
        totalAC: portfolio.totalAC || 0,
        totalBAC: portfolio.totalBAC || 0,
        portfolioCPI: portfolio.portfolioCPI,
        portfolioSPI: portfolio.portfolioSPI,
    }), [portfolio]);

    // Build simple S-curve from EV/AC/PV per project
    const sCurveData = useMemo(() => {
        if (!projectMetrics.length) return [];
        return projectMetrics.map(p => ({
            date: p.project_code,
            PV: p.PV || 0,
            EV: p.EV || 0,
            AC: p.AC || 0,
        }));
    }, [projectMetrics]);

    const cpiColor = indexColor(portfolioCPI);
    const spiColor = indexColor(portfolioSPI);

    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" /> Loading portfolio data...
        </div>
    );
    if (error) return (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 text-sm">{error}</div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Project Overview</h2>
                    <p className="text-slate-500 mt-1">Real-time performance metrics & portfolio summary</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* SPI */}
                <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Activity className="w-6 h-6" />
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${spiColor.bg} ${spiColor.border} ${spiColor.text}`}>{spiColor.label}</span>
                    </div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Schedule Performance</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className={`text-3xl font-bold ${spiColor.text}`}>{portfolioSPI !== null ? portfolioSPI.toFixed(2) : '--'}</p>
                        <span className="text-sm font-medium text-slate-400">SPI</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${(portfolioSPI||0) >= 1 ? 'bg-emerald-500' : (portfolioSPI||0) >= 0.9 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(((portfolioSPI||0)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Target ≥ 1.00</span>
                    </div>
                </div>

                {/* CPI */}
                <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${cpiColor.bg} ${cpiColor.border} ${cpiColor.text}`}>{cpiColor.label}</span>
                    </div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cost Performance</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className={`text-3xl font-bold ${cpiColor.text}`}>{portfolioCPI !== null ? portfolioCPI.toFixed(2) : '--'}</p>
                        <span className="text-sm font-medium text-slate-400">CPI</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${(portfolioCPI||0) >= 1 ? 'bg-emerald-500' : (portfolioCPI||0) >= 0.9 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(((portfolioCPI||0)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Target ≥ 1.00</span>
                    </div>
                </div>

                {/* Alerts */}
                <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Projects</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-3xl font-bold text-slate-700">{projectMetrics.length}</p>
                        <span className="text-sm font-medium text-slate-400">projects</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                        Total spend: <span className="font-bold text-slate-600">{formatCurrency(totalAC)}</span>
                    </p>
                </div>
            </div>

            {/* S-Curve / EVM Chart */}
            {sCurveData.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">EVM by Project (PV / EV / AC)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={sCurveData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
                            <Tooltip content={<OverviewTooltip />} />
                            <Line type="monotone" dataKey="PV" name="Planned" stroke="#cbd5e1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            <Line type="monotone" dataKey="EV" name="Earned" stroke="#10b981" strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="AC" name="Actual" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Project Health Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500"><BarChart3 className="w-5 h-5" /></div>
                    <div>
                        <h3 className="font-bold text-slate-700">Project Health</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Per-project performance summary</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Project</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4">CPI</th>
                                <th className="px-4 py-4">SPI</th>
                                <th className="px-4 py-4 min-w-44">Progress</th>
                                <th className="px-4 py-4">BAC</th>
                                <th className="px-4 py-4">Actual Spend</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                            {projectMetrics.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">No projects found. Create a project to get started.</td></tr>
                            ) : projectMetrics.map(proj => {
                                const cpi = indexColor(proj.CPI);
                                const spi = indexColor(proj.SPI);
                                return (
                                    <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-700">{proj.project_name}</p>
                                            <p className="font-mono text-[10px] text-slate-400 mt-0.5">{proj.project_code}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${STATUS_STYLES[proj.status] || STATUS_STYLES.planning}`}>
                                                {proj.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${cpi.bg} ${cpi.border} ${cpi.text}`}>
                                                {proj.CPI !== null ? proj.CPI.toFixed(2) : '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${spi.bg} ${spi.border} ${spi.text}`}>
                                                {proj.SPI !== null ? proj.SPI.toFixed(2) : '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 bg-slate-100 rounded-full h-2">
                                                    <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(proj.overallPct || 0, 100)}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 shrink-0 w-12 text-right">{(proj.overallPct || 0).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{formatCurrency(proj.BAC)}</td>
                                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{formatCurrency(proj.AC)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50/50 text-sm font-bold text-slate-700 border-t border-slate-100">
                                <td className="px-6 py-3.5" colSpan="5">Portfolio Total</td>
                                <td className="px-4 py-3.5 whitespace-nowrap">{formatCurrency(totalBAC)}</td>
                                <td className="px-4 py-3.5 whitespace-nowrap">{formatCurrency(totalAC)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Budget Overview */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">Budget Overview — BAC vs Actual Spend</h3>
                <div className="space-y-5">
                    {projectMetrics.map(proj => {
                        const spendPct = proj.BAC > 0 ? (proj.AC / proj.BAC) * 100 : 0;
                        const barColor = spendPct > 100 ? 'bg-red-500' : spendPct > 80 ? 'bg-amber-500' : 'bg-emerald-500';
                        return (
                            <div key={proj.id}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-semibold text-slate-700">{proj.project_name}</span>
                                    <span className="text-xs text-slate-400">
                                        {formatCurrency(proj.AC)} / {formatCurrency(proj.BAC)}
                                        <span className="ml-2 font-bold text-slate-600">{spendPct.toFixed(0)}%</span>
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3">
                                    <div className={`${barColor} h-3 rounded-full transition-all duration-500`} style={{ width: `${Math.min(spendPct, 100)}%` }} />
                                </div>
                            </div>
                        );
                    })}
                    {projectMetrics.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No project data available.</p>}
                </div>
            </div>
        </div>
    );
}