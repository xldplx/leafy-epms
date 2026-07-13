import { useState, useMemo, useEffect } from 'react';
import { BarChart3, Download, CheckCircle2, DollarSign, Calendar, Clock, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, ChevronRight, FolderKanban, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { computeEvm, indexColor, varianceColor, formatCurrency } from '../../../utils/evmHelpers';
import { apiFetch } from '../../../utils/api';
import { useTranslation } from '../../../utils/i18n';

export default function PlanVsActual() {
    const { t } = useTranslation();
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [exportFeedback, setExportFeedback]       = useState(false);
    const [projects, setProjects]       = useState([]);
    const [projectEvm, setProjectEvm]   = useState({});
    const [tasks, setTasks]             = useState([]);
    const [loading, setLoading]         = useState(true);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/projects');
            const projs = res.data || [];
            setProjects(projs);

            // Compute EVM for all projects to render the portfolio summary
            const evmMap = {};
            await Promise.all(projs.map(async (p) => {
                try {
                    const taskRes = await apiFetch(`/projects/${p.id}/tasks`);
                    const tList   = taskRes.data || [];
                    evmMap[p.id]  = computeEvm(tList, p.schedule_pct || 0);
                } catch { evmMap[p.id] = null; }
            }));
            setProjectEvm(evmMap);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProjects(); }, []);

    useEffect(() => {
        if (!selectedProjectId) { setTasks([]); return; }
        apiFetch(`/projects/${selectedProjectId}/tasks`).then(r => setTasks(r.data || [])).catch(console.error);
    }, [selectedProjectId]);

    const selectedProject = projects.find(p => p.id === parseInt(selectedProjectId));

    const { evm, kpiCards, refValues, forecastValues } = useMemo(() => {
        const e = computeEvm(tasks, selectedProject?.schedule_pct || 0);
        const { BAC, EV, AC, PV, CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI } = e;
        const cpiC = indexColor(CPI), spiC = indexColor(SPI);
        const cvC = varianceColor(CV), svC = varianceColor(SV);
        const tcpiC = indexColor(TCPI);
        const vacC = VAC !== null ? varianceColor(VAC) : null;
        return {
            evm: e,
            kpiCards: [
                { label: 'CPI', subtitle: CV >= 0 ? t('pva.underBudget') : t('pva.overBudget'), value: CPI !== null ? CPI.toFixed(2) : '—', color: cpiC, desc: 'Cost Performance Index' },
                { label: 'SPI', subtitle: SV >= 0 ? t('pva.aheadSchedule') : t('pva.behindSchedule'), value: SPI !== null ? SPI.toFixed(2) : '—', color: spiC, desc: 'Schedule Performance Index' },
                { label: 'CV', subtitle: CV >= 0 ? t('pva.underBudget') : t('pva.overBudget'), value: formatCurrency(CV), color: cvC, desc: 'Cost Variance Value' },
                { label: 'SV', subtitle: SV >= 0 ? t('pva.aheadSchedule') : t('pva.behindSchedule'), value: formatCurrency(SV), color: svC, desc: 'Schedule Variance Value' },
            ],
            refValues: [
                { label: 'PV (Planned Value)', value: formatCurrency(PV), desc: 'Budgeted cost of planned work' },
                { label: 'EV (Earned Value)', value: formatCurrency(EV), desc: 'Budgeted cost of work completed' },
                { label: 'AC (Actual Cost)', value: formatCurrency(AC), desc: 'Actual cost of work completed' },
                { label: 'BAC (Budget at Completion)', value: formatCurrency(BAC), desc: 'Total baseline budget' },
            ],
            forecastValues: [
                { label: 'EAC (Estimate at Completion)', value: EAC !== null ? formatCurrency(EAC) : '—', textClass: 'text-slate-800 font-extrabold' },
                { label: 'ETC (Estimate to Complete)', value: ETC !== null ? formatCurrency(ETC) : '—', textClass: 'text-slate-800 font-extrabold' },
                { label: 'VAC (Variance at Completion)', value: VAC !== null ? formatCurrency(VAC) : '—', textClass: vacC ? `${vacC.text} font-extrabold` : 'text-slate-800 font-extrabold' },
                { label: 'TCPI (To-Complete Perf. Index)', value: TCPI !== null ? TCPI.toFixed(2) : '—', textClass: `${tcpiC.text} font-extrabold` },
            ],
        };
    }, [tasks, selectedProject?.schedule_pct, t]);

    const { BAC, EV, AC, PV, CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI, overallPct, totalHoursVariance: totalHV } = evm;

    const fmtIDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

    const handleExport = () => {
        if (!selectedProject) return;
        const wb = XLSX.utils.book_new();
        const kpiData = [
            { Metric: 'CPI', Value: CPI !== null ? CPI.toFixed(2) : 'N/A', Status: indexColor(CPI).label },
            { Metric: 'SPI', Value: SPI !== null ? SPI.toFixed(2) : 'N/A', Status: indexColor(SPI).label },
            { Metric: 'CV',  Value: fmtIDR(CV),  Status: varianceColor(CV).label },
            { Metric: 'SV',  Value: fmtIDR(SV),  Status: varianceColor(SV).label },
            { Metric: 'BAC', Value: fmtIDR(BAC), Status: '' },
            { Metric: 'EV',  Value: fmtIDR(EV),  Status: '' },
            { Metric: 'AC',  Value: fmtIDR(AC),  Status: '' },
            { Metric: 'PV',  Value: fmtIDR(PV),  Status: '' },
            { Metric: 'EAC', Value: EAC !== null ? fmtIDR(Math.round(EAC)) : 'N/A', Status: '' },
            { Metric: 'ETC', Value: ETC !== null ? fmtIDR(Math.round(ETC)) : 'N/A', Status: '' },
            { Metric: 'VAC', Value: VAC !== null ? fmtIDR(Math.round(VAC)) : 'N/A', Status: VAC !== null ? varianceColor(VAC).label : '' },
            { Metric: 'TCPI', Value: TCPI !== null ? TCPI.toFixed(2) : 'N/A', Status: TCPI !== null ? indexColor(TCPI).label : '' },
        ];
        const ws1 = XLSX.utils.json_to_sheet(kpiData);
        ws1['!cols'] = [{ wch: 38 }, { wch: 28 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'KPI Summary');
        const taskRows = tasks.map(t => {
            const taskEV = parseFloat(t.planned_cost) * (parseFloat(t.pct_complete) / 100);
            const earnedHrs = Math.round((parseFloat(t.planned_hours) || 0) * (parseFloat(t.pct_complete) / 100));
            return {
                'Task Name': t.task_name, 'WBS': t.wbs_code,
                'Planned Cost': fmtIDR(t.planned_cost), 'Actual Cost': fmtIDR(t.actual_cost),
                'Cost Variance': fmtIDR(taskEV - parseFloat(t.actual_cost)),
                'Planned Hours': t.planned_hours, 'Actual Hours': t.actual_hours,
                'Hours Variance': parseFloat(t.actual_hours) > 0 ? earnedHrs - parseFloat(t.actual_hours) : 0,
                '% Complete': `${t.pct_complete}%`,
            };
        });
        const ws2 = XLSX.utils.json_to_sheet(taskRows);
        XLSX.utils.book_append_sheet(wb, ws2, 'Task Details');
        XLSX.writeFile(wb, `EVM_Report_${selectedProject.project_code}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        setExportFeedback(true);
        setTimeout(() => setExportFeedback(false), 2500);
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                Loading Plan vs Actual...
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left pb-12 animate-in fade-in duration-300">
            {/* SUCCESS TOAST */}
            {exportFeedback && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4" /> {t('pva.exportedSuccess')}
                </div>
            )}

            {/* UNIFIED CONTROLS BAR CARD - Fully consistent alignment */}
            <div className="bg-white border border-slate-200 rounded-3xl py-3.5 px-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5">Select Active Project</span>
                        <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-705 text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer shadow-sm min-w-[220px]"
                        >
                            <option value="">{t('pva.selectPlaceholder')}</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
                        </select>
                    </div>
                </div>

                {selectedProject && (
                    <button onClick={handleExport}
                        className="text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 border shadow bg-white border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-250 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer self-end">
                        <Download className="w-3.5 h-3.5" /> {t('pva.exportExcel')}
                    </button>
                </div>
            )}

            {/* NO PROJECT SELECTED - Beautiful Portfolio EVM Heath Ledger */}
            {!selectedProjectId && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    
                    {/* Portfolio overview welcome card */}
                    <div className="bg-slate-800 p-6.5 rounded-3xl shadow-sm text-white relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <FolderKanban className="w-60 h-60 text-white" />
                        </div>
                        <div className="relative z-10 text-left max-w-2xl">
                            <h3 className="text-lg font-black tracking-tight mb-2">Plan vs Actual Portfolio Ledger</h3>
                            <p className="text-xs leading-relaxed text-slate-300 font-bold uppercase tracking-tight">
                                Select a project from the filter above or choose one directly from the performance ledger below to inspect physical progress, variance alerts, and forecast estimates.
                            </p>
                        </div>
                    </div>

                    {/* Portfolio EVM Table Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500"><BarChart3 className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="font-bold text-slate-800 tracking-tight">Portfolio EVM Ledger</h3>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Real-time cost & schedule performance</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/20 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4.5">Project Code</th>
                                        <th className="px-6 py-4.5">Project Name</th>
                                        <th className="px-6 py-4.5">Status</th>
                                        <th className="px-6 py-4.5">CPI</th>
                                        <th className="px-6 py-4.5">SPI</th>
                                        <th className="px-6 py-4.5">Progress</th>
                                        <th className="px-6 py-4.5 text-right">BAC Budget</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-semibold text-slate-650 divide-y divide-slate-100">
                                    {projects.map(p => {
                                        const evm = projectEvm[p.id];
                                        const cpiColor = evm ? indexColor(evm.CPI) : null;
                                        const spiColor = evm ? indexColor(evm.SPI) : null;
                                        
                                        return (
                                            <tr key={p.id} onClick={() => setSelectedProjectId(String(p.id))}
                                                className="hover:bg-emerald-50/10 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-6 py-4.5 font-mono text-xs text-slate-400 group-hover:text-emerald-700 transition-colors font-bold">{p.project_code}</td>
                                                <td className="px-6 py-4.5 font-extrabold text-slate-800 group-hover:text-emerald-700 transition-colors">{p.project_name}</td>
                                                <td className="px-6 py-4.5">
                                                    <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500">
                                                        {(p.status || 'planning').replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4.5">
                                                    {evm && cpiColor ? (
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border leading-none ${cpiColor.bg} ${cpiColor.text} ${cpiColor.border}`}>
                                                            {evm.CPI?.toFixed(2)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-6 py-4.5">
                                                    {evm && spiColor ? (
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border leading-none ${spiColor.bg} ${spiColor.text} ${spiColor.border}`}>
                                                            {evm.SPI?.toFixed(2)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-6 py-4.5">
                                                    {evm ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-12 bg-slate-100 rounded-full h-1 overflow-hidden">
                                                                <div className="h-full bg-emerald-500" style={{ width: `${evm.overallPct}%` }} />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-slate-500">{evm.overallPct.toFixed(0)}%</span>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-6 py-4.5 text-right font-bold text-slate-700">
                                                    {formatCurrency(p.total_budget)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {selectedProject && (
                <>
                    {/* PHYSICAL PROGRESS BLOCK */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3.5">
                            <div>
                                <h3 className="font-bold text-slate-800 tracking-tight">{t('pva.physicalProgress')}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Earned Value weight completion</p>
                            </div>
                            <span className="text-2xl font-black text-emerald-600">{overallPct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(overallPct, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider mt-2.5">
                            <span>EV: {formatCurrency(EV)}</span>
                            <span>BAC: {formatCurrency(BAC)}</span>
                        </div>
                    </div>

                    {/* KPI CARDS GRID */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {kpiCards.map(card => (
                            <div key={card.label} className={`rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between ${card.color.bg} ${card.color.border}`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{card.label}</p>
                                    <p className={`text-2xl font-black ${card.color.text} tracking-tight mt-1 whitespace-nowrap`}>{card.value}</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100/35 pt-3">
                                    <span className="text-[9px] font-bold text-slate-550 uppercase truncate">{card.desc}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border leading-none shrink-0 ${card.color.bg} ${card.color.border} ${card.color.text}`}>{card.color.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* REFERENCE & FORECAST DETAILS CARD */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-600" /> {t('pva.refForecast')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-150">
                            
                            {/* EVM Reference Values */}
                            <div className="space-y-4 text-left">
                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Baseline Reference Values</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    {refValues.map(item => (
                                        <div key={item.label} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                                            <span className="text-sm font-extrabold text-slate-800 mt-1">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* EVM Forecast Indicators */}
                            <div className="space-y-4 md:pl-8 text-left pt-6 md:pt-0">
                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">EVM Estimate & Forecast</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    {forecastValues.map(item => (
                                        <div key={item.label} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                                            <span className={`text-sm mt-1 ${item.textClass}`}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TASK COMPARISON TABLE CONTAINER */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/40">
                            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><BarChart3 className="w-5 h-5" /></div>
                            <div>
                                <h3 className="font-bold text-slate-800 tracking-tight">{t('pva.taskComparison')}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{selectedProject.project_name}</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/20 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4.5">{t('common.name')}</th>
                                        <th className="px-6 py-4.5">WBS</th>
                                        <th className="px-6 py-4.5">{t('pva.plannedCost')}</th>
                                        <th className="px-6 py-4.5">{t('pva.actualCost')}</th>
                                        <th className="px-6 py-4.5">{t('pva.costVariance')}</th>
                                        <th className="px-6 py-4.5">{t('pva.plannedHrs')}</th>
                                        <th className="px-6 py-4.5">{t('pva.actualHrs')}</th>
                                        <th className="px-6 py-4.5">{t('pva.hrsVariance')}</th>
                                        <th className="px-6 py-4.5 text-right">{t('pva.complete')}</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-semibold text-slate-600 divide-y divide-slate-100">
                                    {tasks.map(task => {
                                        const taskEV = parseFloat(task.planned_cost) * (parseFloat(task.pct_complete) / 100);
                                        const taskCV = taskEV - parseFloat(task.actual_cost);
                                        const taskCVColor = varianceColor(taskCV);
                                        const earnedHours = Math.round(parseFloat(task.planned_hours) * (parseFloat(task.pct_complete) / 100));
                                        const taskHV = parseFloat(task.actual_hours) > 0 ? earnedHours - parseFloat(task.actual_hours) : null;
                                        const taskHVColor = taskHV !== null ? varianceColor(taskHV) : null;
                                        const rowBg = taskCV < 0 ? 'bg-rose-50/15 hover:bg-rose-50/25' : parseFloat(task.pct_complete) === 100 ? 'bg-emerald-50/10 hover:bg-emerald-50/20' : 'hover:bg-slate-50/50';
                                        
                                        return (
                                            <tr key={task.id} className={`${rowBg} transition-colors`}>
                                                <td className="px-6 py-4.5 font-extrabold text-slate-800">{task.task_name}</td>
                                                <td className="px-6 py-4.5 font-mono text-xs text-slate-400">{task.wbs_code}</td>
                                                <td className="px-6 py-4.5 text-slate-500">{formatCurrency(task.planned_cost)}</td>
                                                <td className="px-6 py-4.5 text-slate-500">{formatCurrency(task.actual_cost)}</td>
                                                <td className={`px-6 py-4.5 font-bold whitespace-nowrap ${taskCVColor.text}`}>{formatCurrency(taskCV)}</td>
                                                <td className="px-6 py-4.5 text-slate-500">{task.planned_hours}</td>
                                                <td className="px-6 py-4.5 text-slate-500">{task.actual_hours}</td>
                                                <td className={`px-6 py-4.5 font-bold ${taskHVColor ? taskHVColor.text : 'text-slate-400'}`}>
                                                    {taskHV !== null ? (taskHV >= 0 ? `+${taskHV}` : taskHV) : '—'}
                                                </td>
                                                <td className="px-6 py-4.5 text-right">
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                            <div className="h-full bg-emerald-500" style={{ width: `${task.pct_complete}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-500 shrink-0">{task.pct_complete}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50/40 text-sm font-bold text-slate-700 border-t border-slate-100">
                                        <td className="px-6 py-4.5" colSpan="2">{t('common.total')}</td>
                                        <td className="px-6 py-4.5">{formatCurrency(BAC)}</td>
                                        <td className="px-6 py-4.5">{formatCurrency(AC)}</td>
                                        <td className={`px-6 py-4.5 font-bold whitespace-nowrap ${varianceColor(CV).text}`}>{formatCurrency(CV)}</td>
                                        <td className="px-6 py-4.5">{tasks.reduce((s, t) => s + parseFloat(t.planned_hours || 0), 0)}</td>
                                        <td className="px-6 py-4.5">{tasks.reduce((s, t) => s + parseFloat(t.actual_hours || 0), 0)}</td>
                                        <td className={`px-6 py-4.5 font-bold ${varianceColor(totalHV).text}`}>{totalHV >= 0 ? `+${totalHV}` : totalHV}</td>
                                        <td className="px-6 py-4.5" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}