import React, { useState, useEffect, useMemo } from 'react';
import { Activity, TrendingUp, AlertTriangle, BarChart3, LineChart as ChartIcon, Target, Loader2, Layers, Briefcase, CheckCircle2, Calendar, DollarSign } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { computeEvm, computeAlerts, indexColor, formatCurrency } from '../../../utils/evmHelpers';
import { generateSCurveData } from '../../../utils/cpmHelpers';
import { STATUS_STYLES, CARD_CLASS } from '../../../utils/uiConstants';
import { apiFetch } from '../../../utils/api';
import { useTranslation } from '../../../utils/i18n';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

function OverviewTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-4 text-[11px] min-w-52 ring-1 ring-slate-900/5">
            <p className="font-black text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Target className="w-3 h-3 text-emerald-500" />{label}
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

export default function Overview() {
    const { t } = useTranslation();
    const [loading, setLoading]       = useState(true);
    const [projects, setProjects]     = useState([]);
    const [allTasks, setAllTasks]     = useState([]);
    const [thresholds, setThresholds] = useState({ cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 });
    const [viewMode, setViewMode]     = useState('Daily');

    useEffect(() => {
        setLoading(true);
        Promise.all([apiFetch('/alerts/raw'), apiFetch('/alerts/thresholds')])
            .then(([raw, thresh]) => {
                if (raw.success) { setProjects(raw.projects || []); setAllTasks(raw.tasks || []); }
                if (thresh.success && thresh.data) setThresholds(thresh.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const projectMetrics = useMemo(() => projects.map(proj => {
        const tasks = allTasks.filter(t => t.project_id === proj.id);
        return { ...proj, ...computeEvm(tasks, proj.schedule_pct) };
    }), [projects, allTasks]);

    const { totalBAC, portfolioCPI, portfolioSPI } = useMemo(() => {
        const tEV = projectMetrics.reduce((s, p) => s + p.EV, 0);
        const tAC = projectMetrics.reduce((s, p) => s + p.AC, 0);
        const tPV = projectMetrics.reduce((s, p) => s + p.PV, 0);
        const tBAC = projectMetrics.reduce((s, p) => s + p.BAC, 0);
        return { totalBAC: tBAC, portfolioCPI: tAC > 0 ? tEV / tAC : null, portfolioSPI: tPV > 0 ? tEV / tPV : null };
    }, [projectMetrics]);

    const rawSCurveData = useMemo(() => {
        const dated = projects.filter(p => p.planned_start && p.planned_end);
        if (!dated.length || !allTasks.length) return [];
        const minDate = new Date(Math.min(...dated.map(p => new Date(p.planned_start).getTime())));
        const maxDate = new Date(Math.max(...dated.map(p => new Date(p.planned_end).getTime())));
        return generateSCurveData(allTasks, minDate.toISOString(), maxDate.toISOString());
    }, [projects, allTasks]);

    const sCurveData = useMemo(() => {
        if (!rawSCurveData.length) return [];
        if (viewMode === 'Daily') return rawSCurveData;
        const interval = viewMode === t('overview.weekly') || viewMode === 'Weekly' ? 7 : 30;
        const grouped = [];
        for (let i = 0; i < rawSCurveData.length; i += interval) {
            const chunk = rawSCurveData.slice(i, i + interval);
            grouped.push({ ...chunk[chunk.length - 1] });
        }
        return grouped;
    }, [rawSCurveData, viewMode, t]);

    const statusCounts = useMemo(() => {
        const counts = { active: 0, planning: 0, completed: 0, on_hold: 0 };
        projects.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
        return counts;
    }, [projects]);

    const { alerts, criticalCount, warningCount } = useMemo(() => {
        const a = computeAlerts(projects, allTasks, thresholds);
        return { alerts: a, criticalCount: a.filter(x => x.severity === 'critical').length, warningCount: a.filter(x => x.severity === 'warning').length };
    }, [projects, allTasks, thresholds]);

    const cpiColor = indexColor(portfolioCPI);
    const spiColor = indexColor(portfolioSPI);

    const VIEW_MODES = [
        { key: 'Daily',   label: t('overview.daily') },
        { key: 'Weekly',  label: t('overview.weekly') },
        { key: 'Monthly', label: t('overview.monthly') },
    ];

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-bold uppercase tracking-[0.2em] text-xs">{t('overview.syncingData')}</p>
        </div>
    );

    return (
        <div className="space-y-10 pb-12">
            {/* VIEW MODE SELECTOR */}
            <div className="flex justify-end mb-6">
                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-sm">
                    {VIEW_MODES.map(({ key, label }) => (
                        <button key={key} onClick={() => setViewMode(key)}
                            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                viewMode === key ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-700'
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`${CARD_CLASS} p-6 group hover:scale-[1.02]`}>
                    <div className="p-3 bg-slate-100 rounded-xl text-slate-500 shadow-inner w-fit mb-4"><Briefcase className="w-5 h-5" /></div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('overview.portfolioBudget')}</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{formatCurrency(totalBAC)}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">{t('overview.totalBac')}</p>
                </div>
                <div className={`${CARD_CLASS} p-6 group hover:scale-[1.02]`}>
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shadow-inner w-fit mb-4"><Layers className="w-5 h-5" /></div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('overview.totalProjects')}</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{projects.length}</p>
                    <div className="flex gap-2 mt-2">
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">{statusCounts.active} {t('status.active')}</span>
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">{statusCounts.planning} {t('status.planning')}</span>
                    </div>
                </div>
                <div className={`${CARD_CLASS} p-6 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl shadow-inner ${portfolioSPI >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}><Activity className="w-5 h-5" /></div>
                        <div className={`px-2 py-1 rounded-lg border font-black text-[9px] uppercase ${spiColor.bg} ${spiColor.border} ${spiColor.text}`}>{spiColor.label}</div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('overview.avgSchedule')}</h3>
                    <p className={`text-2xl font-black tracking-tight mt-1 ${spiColor.text}`}>{portfolioSPI !== null ? portfolioSPI.toFixed(2) : '--'}</p>
                    <div className="mt-3 bg-slate-100/50 rounded-full h-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${portfolioSPI >= 1 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min((portfolioSPI || 0) * 100, 100)}%` }} />
                    </div>
                </div>
                <div className={`${CARD_CLASS} p-6 group hover:scale-[1.02]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl shadow-inner ${portfolioCPI >= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}><TrendingUp className="w-5 h-5" /></div>
                        <div className={`px-2 py-1 rounded-lg border font-black text-[9px] uppercase ${cpiColor.bg} ${cpiColor.border} ${cpiColor.text}`}>{cpiColor.label}</div>
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('overview.avgCost')}</h3>
                    <p className={`text-2xl font-black tracking-tight mt-1 ${cpiColor.text}`}>{portfolioCPI !== null ? portfolioCPI.toFixed(2) : '--'}</p>
                    <div className="mt-3 bg-slate-100/50 rounded-full h-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${portfolioCPI >= 1 ? 'bg-emerald-500' : portfolioCPI >= 0.9 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min((portfolioCPI || 0) * 100, 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* S-CURVE */}
                <div className={`${CARD_CLASS} p-8 lg:col-span-2`}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200"><ChartIcon className="w-5 h-5" /></div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">{t('overview.cumulativeCurve')}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                                    {VIEW_MODES.find(m => m.key === viewMode)?.label} {t('overview.trendTracking')}
                                </p>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {[['bg-slate-300', 'PV', t('overview.planned')], ['bg-emerald-500', 'EV', t('overview.earned')], ['bg-amber-400', 'AC', t('overview.actual')]].map(([color, key, label]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${color}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sCurveData}>
                                <defs>
                                    <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" hide />
                                <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
                                <Tooltip content={<OverviewTooltip />} />
                                <Area type="monotone" dataKey="PV" name={t('overview.planned')} stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                                <Area type="monotone" dataKey="EV" name={t('overview.earned')} stroke="#10b981" strokeWidth={3} fill="url(#colorEV)" />
                                <Area type="monotone" dataKey="AC" name={t('overview.actual')} stroke="#f59e0b" strokeWidth={2} fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Status Distribution */}
                    <div className={`${CARD_CLASS} p-6`}>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('overview.statusBreakdown')}</h4>
                        <div className="h-[180px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[
                                        { name: t('status.active'), value: statusCounts.active },
                                        { name: t('status.planning'), value: statusCounts.planning },
                                        { name: t('status.completed'), value: statusCounts.completed },
                                        { name: t('status.onHold'), value: statusCounts.on_hold },
                                    ]} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                                        {COLORS.map((c, i) => <Cell key={i} fill={c} strokeWidth={0} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-slate-800">{projects.length}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{t('common.total')}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {[['#10b981', statusCounts.active, t('status.active')], ['#3b82f6', statusCounts.planning, t('status.planning')],
                              ['#f59e0b', statusCounts.completed, t('status.completed')], ['#ef4444', statusCounts.on_hold, t('status.onHold')]].map(([color, count, label]) => (
                                <div key={label} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{count} {label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Alerts */}
                    <div className={`${CARD_CLASS} p-6 bg-slate-900 text-white border-0`}>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('overview.activeAlerts')}</h4>
                            <AlertTriangle className={`w-4 h-4 ${alerts.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                        </div>
                        {alerts.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl font-black text-white">{alerts.length}</span>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-red-500 uppercase">{criticalCount} {t('alerts.critical')}</p>
                                        <p className="text-[10px] font-black text-amber-500 uppercase">{warningCount} {t('alerts.atRisk')}</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    {t('overview.anomaliesDetected').replace('{count}', alerts.length)}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-4 gap-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t('overview.portfolioHealthy')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PROJECT HEALTH TABLE */}
            <div className={CARD_CLASS}>
                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-slate-500"><Activity className="w-5 h-5" /></div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">{t('overview.healthMonitor')}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{t('overview.livePerformance')}</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                                <th className="px-8 py-5">{t('overview.projectDetails')}</th>
                                <th className="px-6 py-5">{t('overview.performance')}</th>
                                <th className="px-6 py-5">{t('overview.avgSchedule')}</th>
                                <th className="px-6 py-5">{t('overview.avgCost')}</th>
                                <th className="px-8 py-5 text-right">{t('common.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {projectMetrics.map(p => {
                                const spiC = indexColor(p.SPI);
                                const cpiC = indexColor(p.CPI);
                                return (
                                    <tr key={p.id} className="hover:bg-emerald-50/20 transition-all duration-200 group">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">{p.project_name}</p>
                                            <p className="font-mono text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{p.project_code}</p>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="w-32">
                                                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase mb-1.5">
                                                    <span>{t('overview.done')}</span>
                                                    <span>{p.overallPct.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(p.overallPct, 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-black ${spiC.text}`}>{p.SPI !== null ? p.SPI.toFixed(2) : '--'}</span>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${spiC.bg} ${spiC.border} ${spiC.text}`}>{spiC.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-black ${cpiC.text}`}>{p.CPI !== null ? p.CPI.toFixed(2) : '--'}</span>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${cpiC.bg} ${cpiC.border} ${cpiC.text}`}>{cpiC.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${STATUS_STYLES[p.status] || STATUS_STYLES.planning} tracking-widest shadow-sm`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}