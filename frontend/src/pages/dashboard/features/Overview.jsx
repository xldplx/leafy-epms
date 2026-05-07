import React, { useMemo } from 'react';
import { Activity, TrendingUp, AlertTriangle, BarChart3, LineChart as ChartIcon, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { dummyProjects, dummyProjectsEvm, dummyTaskData, dummyPlanTasks } from '../../../data/dummyData';
import { computeEvm, computeAlerts, indexColor, formatCurrency } from '../../../utils/evmHelpers';
import { generateSCurveData } from '../../../utils/cpmHelpers';
import { STATUS_STYLES, CARD_CLASS } from '../../../utils/uiConstants';

// --- CUSTOM TOOLTIP FOR OVERVIEW ---
function OverviewTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-4 text-[11px] min-w-52 ring-1 ring-slate-900/5 animate-in fade-in zoom-in duration-200">
            <p className="font-black text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Target className="w-3 h-3 text-emerald-500" />
                {label}
            </p>
            <div className="space-y-2.5">
                {payload.map(p => (
                    <div key={p.dataKey} className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">{p.name}</span>
                        </div>
                        <span className="text-slate-800 font-mono font-black">{formatCurrency(p.value)}</span>
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
    const { totalAC, totalBAC, totalEV, totalPV, portfolioCPI, portfolioSPI } = useMemo(() => {
        const tEV = projectMetrics.reduce((s, p) => s + p.EV, 0);
        const tAC = projectMetrics.reduce((s, p) => s + p.AC, 0);
        const tPV = projectMetrics.reduce((s, p) => s + p.PV, 0);
        const tBAC = projectMetrics.reduce((s, p) => s + p.BAC, 0);
        return {
            totalAC: tAC, totalBAC: tBAC, totalEV: tEV, totalPV: tPV,
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

    const cardClass = CARD_CLASS;

    return (
        <div className="space-y-10 pb-12">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/80">System Live</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Project Overview</h2>
                    <p className="text-slate-500 mt-1 font-medium">Real-time performance metrics & portfolio summary</p>
                </div>
                <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
                    <button className="px-4 py-2 text-xs font-bold bg-white text-slate-800 rounded-xl shadow-sm border border-slate-100">Daily</button>
                    <button className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Weekly</button>
                    <button className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Monthly</button>
                </div>
            </div>

            {/* KPI CARDS — with target context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* SPI */}
                <div className={`${cardClass} p-8 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase tracking-wider ${spiColor.bg} ${spiColor.border} ${spiColor.text}`}>
                            {portfolioSPI >= 1 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {spiColor.label}
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.15em]">Schedule Performance</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-4xl font-black tracking-tighter ${spiColor.text}`}>{portfolioSPI !== null ? portfolioSPI.toFixed(2) : '--'}</p>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">SPI</span>
                    </div>
                    <div className="mt-6">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            <span>Progress</span>
                            <span>Target 1.00</span>
                        </div>
                        <div className="bg-slate-100/50 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/50">
                            <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${portfolioSPI >= 1 ? 'bg-emerald-500' : portfolioSPI >= 0.9 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min((portfolioSPI || 0) * 100, 100)}%` }} />
                        </div>
                    </div>
                </div>

                {/* CPI */}
                <div className={`${cardClass} p-8 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-inner">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase tracking-wider ${cpiColor.bg} ${cpiColor.border} ${cpiColor.text}`}>
                            {portfolioCPI >= 1 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {cpiColor.label}
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.15em]">Cost Performance</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-4xl font-black tracking-tighter ${cpiColor.text}`}>{portfolioCPI !== null ? portfolioCPI.toFixed(2) : '--'}</p>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">CPI</span>
                    </div>
                    <div className="mt-6">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            <span>Efficiency</span>
                            <span>Target 1.00</span>
                        </div>
                        <div className="bg-slate-100/50 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/50">
                            <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${portfolioCPI >= 1 ? 'bg-emerald-500' : portfolioCPI >= 0.9 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min((portfolioCPI || 0) * 100, 100)}%` }} />
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                <div className={`${cardClass} p-8 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl transition-all duration-300 shadow-inner ${alerts.length > 0 ? 'bg-red-500/10 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        {alerts.length === 0 && (
                            <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border bg-emerald-50 border-emerald-100 text-emerald-700 tracking-widest">All Clear</span>
                        )}
                    </div>
                    <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.15em]">Active Alerts</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-4xl font-black tracking-tighter ${alerts.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{alerts.length}</p>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Issues</span>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        {criticalCount > 0 ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-100 shadow-sm animate-pulse">
                                <div className="w-1 h-1 rounded-full bg-red-600" />
                                {criticalCount} Critical
                            </span>
                        ) : null}
                        {warningCount > 0 ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                                <div className="w-1 h-1 rounded-full bg-amber-600" />
                                {warningCount} Warning
                            </span>
                        ) : null}
                        {alerts.length === 0 && (
                            <p className="text-[11px] font-medium text-slate-400 italic">No anomalies detected</p>
                        )}
                    </div>
                </div>
            </div>

            {/* PORTFOLIO S-CURVE */}
            <div className={`${cardClass} p-10`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-500 text-white rounded-[1.25rem] shadow-lg shadow-emerald-200">
                            <ChartIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Portfolio Performance Curve</h3>
                            <p className="text-sm text-slate-400 font-medium mt-0.5">Cumulative PV vs EV vs AC tracking</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 bg-slate-50/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full bg-slate-300 shadow-sm" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Planned (PV)</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-200" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Earned (EV)</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full bg-amber-400 shadow-md shadow-amber-200" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Actual (AC)</span>
                        </div>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sCurveData}>
                            <defs>
                                <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorAC" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="date" hide={true} />
                            <YAxis 
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={v => `${(v / 1e6).toFixed(0)}M`}
                            />
                            <Tooltip content={<OverviewTooltip />} />
                            <Area type="monotone" dataKey="PV" name="Planned" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="6 6" fill="transparent" />
                            <Area type="monotone" dataKey="EV" name="Earned" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorEV)" />
                            <Area type="monotone" dataKey="AC" name="Actual" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAC)" />
                        </AreaChart>
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