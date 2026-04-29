import React, { useMemo } from 'react';
import { Activity, TrendingUp, AlertTriangle, BarChart3, LineChart as ChartIcon } from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    Legend, ResponsiveContainer 
} from 'recharts';
import { dummyProjects, dummyProjectsEvm, dummyTaskData, dummyPlanTasks } from '../../../data/dummyData';
import { computeEvm, computeAlerts, indexColor, formatCurrency } from '../../../utils/evmHelpers';
import { generateSCurveData } from '../../../utils/cpmHelpers';
import { STATUS_STYLES } from '../../../utils/uiConstants';

// --- CUSTOM TOOLTIP FOR OVERVIEW ---
function OverviewTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl p-3 text-[10px] min-w-40 ring-1 ring-slate-900/5">
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

// --- MAIN OVERVIEW COMPONENT ---
export default function Overview() {
    const project = dummyProjects[0]; // For S-Curve reference

    // Per-project EVM (memoized)
    const projectMetrics = useMemo(() => dummyProjectsEvm.map(proj => {
        const tasks = dummyTaskData.filter(t => t.project_id === proj.id);
        const evm = computeEvm(tasks, proj.schedule_pct);
        const full = dummyProjects.find(p => p.id === proj.id);
        return { ...proj, ...evm, status: full?.status || 'planning', total_budget: full?.total_budget || evm.BAC, planned_start: full?.planned_start, planned_end: full?.planned_end };
    }), []);

    // Portfolio aggregates (memoized)
    const { totalAC, totalBAC, portfolioCPI, portfolioSPI } = useMemo(() => {
        const tEV = projectMetrics.reduce((s, p) => s + p.EV, 0);
        const tAC = projectMetrics.reduce((s, p) => s + p.AC, 0);
        const tPV = projectMetrics.reduce((s, p) => s + p.PV, 0);
        const tBAC = projectMetrics.reduce((s, p) => s + p.BAC, 0);
        return {
            totalAC: tAC, totalBAC: tBAC,
            portfolioCPI: tAC > 0 ? tEV / tAC : null,
            portfolioSPI: tPV > 0 ? tEV / tPV : null,
        };
    }, [projectMetrics]);

    // S-Curve Data for Portfolio
    const sCurveData = useMemo(() => generateSCurveData(dummyPlanTasks, project.planned_start, project.planned_end), []);

    // Alerts (memoized)
    const { alerts, criticalCount, warningCount } = useMemo(() => {
        const defaultThresholds = { cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 };
        const a = computeAlerts(dummyProjectsEvm, dummyTaskData, defaultThresholds);
        return { alerts: a, criticalCount: a.filter(x => x.severity === 'critical').length, warningCount: a.filter(x => x.severity === 'warning').length };
    }, []);

    const cpiColor = indexColor(portfolioCPI);
    const spiColor = indexColor(portfolioSPI);

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Project Overview</h2>
                    <p className="text-slate-500 mt-1">Real-time performance metrics & portfolio summary</p>
                </div>
            </div>

            {/* KPI CARDS — with target context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* SPI */}
                <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,182,212,0.1)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Activity className="w-6 h-6" />
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${spiColor.bg} ${spiColor.border} ${spiColor.text}`}>
                            {spiColor.label}
                        </span>
                    </div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Schedule Performance</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className={`text-3xl font-bold ${spiColor.text}`}>{portfolioSPI !== null ? portfolioSPI.toFixed(2) : '--'}</p>
                        <span className="text-sm font-medium text-slate-400">SPI</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${portfolioSPI >= 1 ? 'bg-emerald-500' : portfolioSPI >= 0.9 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min((portfolioSPI || 0) * 100, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Target ≥ 1.00</span>
                    </div>
                </div>

                {/* CPI */}
                <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.1)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${cpiColor.bg} ${cpiColor.border} ${cpiColor.text}`}>
                            {cpiColor.label}
                        </span>
                    </div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cost Performance</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className={`text-3xl font-bold ${cpiColor.text}`}>{portfolioCPI !== null ? portfolioCPI.toFixed(2) : '--'}</p>
                        <span className="text-sm font-medium text-slate-400">CPI</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${portfolioCPI >= 1 ? 'bg-emerald-500' : portfolioCPI >= 0.9 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min((portfolioCPI || 0) * 100, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Target ≥ 1.00</span>
                    </div>
                </div>

                {/* Alerts */}
                <div className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(99,102,241,0.1)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl transition-colors ${alerts.length > 0 ? 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        {alerts.length === 0 && (
                            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border bg-emerald-50 border-emerald-100 text-emerald-700">All Clear</span>
                        )}
                    </div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Alerts</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className={`text-3xl font-bold ${alerts.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{alerts.length}</p>
                    </div>
                    {alerts.length > 0 && (
                        <div className="mt-3 flex gap-2">
                            {criticalCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">{criticalCount} Critical</span>}
                            {warningCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">{warningCount} Warning</span>}
                        </div>
                    )}
                    {alerts.length === 0 && (
                        <p className="mt-2 text-xs text-slate-400">All projects within thresholds</p>
                    )}
                </div>
            </div>

            {/* PORTFOLIO S-CURVE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><ChartIcon className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-bold text-slate-700">Portfolio Triple S-Curve</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Cumulative PV vs EV vs AC projection</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">PV</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">EV</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">AC</span>
                        </div>
                    </div>
                </div>
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sCurveData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                hide={true}
                            />
                            <YAxis 
                                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={v => `${(v / 1e6).toFixed(0)}M`}
                            />
                            <Tooltip content={<OverviewTooltip />} />
                            <Line type="monotone" dataKey="PV" name="Planned" stroke="#cbd5e1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            <Line type="monotone" dataKey="EV" name="Earned" stroke="#10b981" strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="AC" name="Actual" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* PROJECT HEALTH TABLE */}
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
                            {projectMetrics.map(proj => {
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
                                                {proj.CPI !== null ? proj.CPI.toFixed(2) : '\u2014'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${spi.bg} ${spi.border} ${spi.text}`}>
                                                {proj.SPI !== null ? proj.SPI.toFixed(2) : '\u2014'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 bg-slate-100 rounded-full h-2">
                                                    <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(proj.overallPct, 100)}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 shrink-0 w-12 text-right">{proj.overallPct.toFixed(1)}%</span>
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

            {/* BUDGET OVERVIEW */}
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
                </div>
            </div>

        </div>
    );
}