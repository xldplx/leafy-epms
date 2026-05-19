import { useState, useMemo, useEffect } from 'react';
import { BarChart3, Download, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { computeEvm, computeAlerts, indexColor, varianceColor, formatCurrency } from '../../../utils/evmHelpers';
import { INPUT_CLASS } from '../../../utils/uiConstants';
import { apiFetch } from '../../../utils/api';

export default function PlanVsActual() {
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [exportFeedback, setExportFeedback] = useState(false);

    // Real data from API — replaces dummyProjectsEvm and dummyTaskData
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks]       = useState([]);

    useEffect(() => {
        apiFetch('/projects').then(r => setProjects(r.data || [])).catch(console.error);
    }, []);

    useEffect(() => {
        if (!selectedProjectId) { setTasks([]); return; }
        apiFetch(`/projects/${selectedProjectId}/tasks`).then(r => setTasks(r.data || [])).catch(console.error);
    }, [selectedProjectId]);

    const selectedProject = projects.find(p => p.id === parseInt(selectedProjectId));

    // EVM calculations via shared helper (memoized)
    const { evm, kpiCards, refValues, forecastValues } = useMemo(() => {
        const e = computeEvm(tasks, selectedProject?.schedule_pct || 0);
        const { BAC, EV, AC, PV, CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI } = e;

        const cpiC  = indexColor(CPI);
        const spiC  = indexColor(SPI);
        const cvC   = varianceColor(CV);
        const svC   = varianceColor(SV);
        const tcpiC = indexColor(TCPI);
        const vacC  = VAC !== null ? varianceColor(VAC) : null;

        return {
            evm: e,
            kpiCards: [
                { label: 'CPI', subtitle: 'Cost Performance Index — target ≥ 1.00', value: CPI !== null ? CPI.toFixed(2) : '—', color: cpiC },
                { label: 'SPI', subtitle: 'Schedule Performance Index — target ≥ 1.00', value: SPI !== null ? SPI.toFixed(2) : '—', color: spiC },
                { label: 'CV (Cost Variance)', subtitle: CV >= 0 ? 'Under budget' : 'Over budget', value: formatCurrency(CV), color: cvC },
                { label: 'SV (Schedule Variance)', subtitle: SV >= 0 ? 'Ahead of schedule' : 'Behind schedule', value: formatCurrency(SV), color: svC },
            ],
            refValues: [
                { label: 'PV (Planned Value)',    value: formatCurrency(PV)  },
                { label: 'EV (Earned Value)',     value: formatCurrency(EV)  },
                { label: 'AC (Actual Cost)',      value: formatCurrency(AC)  },
                { label: 'BAC (Budget at Comp.)', value: formatCurrency(BAC) },
            ],
            forecastValues: [
                { label: 'EAC (Est. at Completion)', value: EAC !== null ? formatCurrency(EAC) : '—', textClass: 'text-slate-800' },
                { label: 'ETC (Est. to Complete)',   value: ETC !== null ? formatCurrency(ETC) : '—', textClass: 'text-slate-800' },
                { label: 'VAC (Variance at Comp.)',  value: VAC !== null ? formatCurrency(VAC) : '—', textClass: vacC ? vacC.text : 'text-slate-800' },
                { label: 'TCPI (To-Complete PI)',    value: TCPI !== null ? TCPI.toFixed(2) : '—',    textClass: tcpiC.text },
            ],
        };
    }, [tasks, selectedProject?.schedule_pct]);

    const { BAC, EV, AC, PV, CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI, overallPct, totalHoursVariance: totalHV } = evm;

    const fmtIDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

    const handleExport = () => {
        if (!selectedProject) return;
        const wb = XLSX.utils.book_new();

        // Sheet 1: KPI Summary — readable formatted values
        const kpiData = [
            { Metric: 'CPI (Cost Performance Index)',         Value: CPI !== null ? CPI.toFixed(2) : 'N/A',   Status: indexColor(CPI).label },
            { Metric: 'SPI (Schedule Performance Index)',      Value: SPI !== null ? SPI.toFixed(2) : 'N/A',   Status: indexColor(SPI).label },
            { Metric: 'CV (Cost Variance)',                   Value: fmtIDR(CV),                               Status: varianceColor(CV).label },
            { Metric: 'SV (Schedule Variance)',               Value: fmtIDR(SV),                               Status: varianceColor(SV).label },
            { Metric: 'BAC (Budget at Completion)',           Value: fmtIDR(BAC),                              Status: '' },
            { Metric: 'EV (Earned Value)',                    Value: fmtIDR(EV),                               Status: '' },
            { Metric: 'AC (Actual Cost)',                     Value: fmtIDR(AC),                               Status: '' },
            { Metric: 'PV (Planned Value)',                   Value: fmtIDR(PV),                               Status: '' },
            { Metric: 'EAC (Estimate at Completion)',         Value: EAC !== null ? fmtIDR(Math.round(EAC)) : 'N/A', Status: '' },
            { Metric: 'ETC (Estimate to Complete)',           Value: ETC !== null ? fmtIDR(Math.round(ETC)) : 'N/A', Status: '' },
            { Metric: 'VAC (Variance at Completion)',         Value: VAC !== null ? fmtIDR(Math.round(VAC)) : 'N/A', Status: VAC !== null ? varianceColor(VAC).label : '' },
            { Metric: 'TCPI (To-Complete Performance Index)', Value: TCPI !== null ? TCPI.toFixed(2) : 'N/A',  Status: TCPI !== null ? indexColor(TCPI).label : '' },
        ];
        const ws1 = XLSX.utils.json_to_sheet(kpiData);
        ws1['!cols'] = [{ wch: 38 }, { wch: 28 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'KPI Summary');

        // Sheet 2: Task Details — formatted currency columns
        const taskRows = tasks.map(t => {
            const taskEV    = parseFloat(t.planned_cost) * (parseFloat(t.pct_complete) / 100);
            const earnedHrs = Math.round((parseFloat(t.planned_hours) || 0) * (parseFloat(t.pct_complete) / 100));
            return {
                'Task Name':      t.task_name,
                'WBS':            t.wbs_code,
                'Planned Cost':   fmtIDR(t.planned_cost),
                'Actual Cost':    fmtIDR(t.actual_cost),
                'Cost Variance':  fmtIDR(taskEV - parseFloat(t.actual_cost)),
                'Planned Hours':  t.planned_hours,
                'Actual Hours':   t.actual_hours,
                'Hours Variance': parseFloat(t.actual_hours) > 0 ? earnedHrs - parseFloat(t.actual_hours) : 0,
                '% Complete':     `${t.pct_complete}%`,
            };
        });
        const ws2 = XLSX.utils.json_to_sheet(taskRows);
        ws2['!cols'] = [{ wch: 28 }, { wch: 8 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Task Details');

        // Sheet 3: Alerts
        const projectAlerts = computeAlerts(
            [selectedProject],
            tasks,
            { cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 }
        );
        const alertRows = projectAlerts.length > 0
            ? projectAlerts.map(a => ({
                'Metric':         a.metric,
                'Value':          a.value.toFixed(2),
                'Threshold':      a.threshold.toFixed(2),
                'Severity':       a.severity === 'critical' ? 'CRITICAL' : 'WARNING',
                'Recommendation': a.recommendation,
            }))
            : [{ 'Metric': '-', 'Value': '-', 'Threshold': '-', 'Severity': 'No Alerts', 'Recommendation': 'All metrics are within configured thresholds.' }];
        const ws3 = XLSX.utils.json_to_sheet(alertRows);
        ws3['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 60 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Alerts');

        XLSX.writeFile(wb, `EVM_Report_${selectedProject.project_code}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        setExportFeedback(true);
        setTimeout(() => setExportFeedback(false), 2500);
    };

    const inputClass = INPUT_CLASS;

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Plan vs Actual</h2>
                    <p className="text-slate-500 mt-1">Earned Value Management performance report</p>
                </div>
                {selectedProject && (
                    <button
                        onClick={handleExport}
                        className="text-sm font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border shadow-sm text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Download className="w-4 h-4" /> Export to Excel
                    </button>
                )}
            </div>

            {/* EXPORT SUCCESS TOAST */}
            {exportFeedback && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4" /> Report exported successfully
                </div>
            )}

            {/* PROJECT SELECTOR */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">Select Project</h3>
                <div className="max-w-md">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Project</label>
                        <select
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select a project...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* EMPTY STATE — shown when no project is selected */}
            {!selectedProject && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
                    <p className="text-slate-400 text-sm">Select a project above to view the Earned Value Management report.</p>
                </div>
            )}

            {/* EVM CONTENT — shown only when a project is selected */}
            {selectedProject && (
                <>
                    {/* PHYSICAL PROGRESS BAR */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-700">Physical Progress</h3>
                            <span className="text-2xl font-bold text-emerald-600">{overallPct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                            <div
                                className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(overallPct, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mt-2">
                            <span>EV: {formatCurrency(EV)}</span>
                            <span>BAC: {formatCurrency(BAC)}</span>
                        </div>
                    </div>

                    {/* KPI CARDS */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {kpiCards.map(card => (
                                <div key={card.label} className={`rounded-2xl border p-5 ${card.color.bg} ${card.color.border}`}>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{card.label}</p>
                                    <p className={`text-2xl font-bold ${card.color.text} mt-1 whitespace-nowrap`}>{card.value}</p>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{card.subtitle}</p>
                                    <span className={`mt-3 inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${card.color.bg} ${card.color.border} ${card.color.text}`}>
                                        {card.color.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* REFERENCE & FORECAST */}
                        <div className="border-t border-slate-100 pt-5">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Reference & Forecast</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                                {[...refValues, ...forecastValues].map(item => (
                                    <div key={item.label} className="min-w-0">
                                        <p className="text-[10px] text-slate-400 font-semibold truncate">{item.label}</p>
                                        <p className={`font-bold text-sm mt-0.5 ${item.textClass || 'text-slate-800'}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PER-TASK COMPARISON TABLE */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-700">Task-Level Comparison</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{selectedProject.project_name}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-4 py-4">Task Name</th>
                                        <th className="px-4 py-4">WBS</th>
                                        <th className="px-4 py-4">Planned Cost</th>
                                        <th className="px-4 py-4">Actual Cost</th>
                                        <th className="px-4 py-4">Cost Variance</th>
                                        <th className="px-4 py-4">Planned Hrs</th>
                                        <th className="px-4 py-4">Actual Hrs</th>
                                        <th className="px-4 py-4">Hrs Variance</th>
                                        <th className="px-4 py-4">% Complete</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {tasks.map(task => {
                                        const taskEV       = parseFloat(task.planned_cost) * (parseFloat(task.pct_complete) / 100);
                                        const taskCV       = taskEV - parseFloat(task.actual_cost);
                                        const taskCVColor  = varianceColor(taskCV);
                                        const earnedHours  = Math.round(parseFloat(task.planned_hours) * (parseFloat(task.pct_complete) / 100));
                                        const taskHV       = parseFloat(task.actual_hours) > 0 ? earnedHours - parseFloat(task.actual_hours) : null;
                                        const taskHVColor  = taskHV !== null ? varianceColor(taskHV) : null;
                                        const rowBg = taskCV < 0 ? 'bg-red-50/60' : parseFloat(task.pct_complete) === 100 ? 'bg-emerald-50/50' : parseFloat(task.pct_complete) === 0 ? 'bg-slate-50/60' : '';
                                        return (
                                            <tr key={task.id} className={`${rowBg} hover:bg-slate-100/50 transition-colors`}>
                                                <td className="px-4 py-3.5 font-semibold text-slate-700">{task.task_name}</td>
                                                <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{task.wbs_code}</td>
                                                <td className="px-4 py-3.5 text-slate-500">{formatCurrency(task.planned_cost)}</td>
                                                <td className="px-4 py-3.5 text-slate-500">{formatCurrency(task.actual_cost)}</td>
                                                <td className={`px-4 py-3.5 font-bold whitespace-nowrap ${taskCVColor.text}`}>
                                                    {formatCurrency(taskCV)}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500">{task.planned_hours}</td>
                                                <td className="px-4 py-3.5 text-slate-500">{task.actual_hours}</td>
                                                <td className={`px-4 py-3.5 font-bold ${taskHVColor ? taskHVColor.text : 'text-slate-400'}`}>
                                                    {taskHV !== null ? (taskHV >= 0 ? `+${taskHV}` : taskHV) : '—'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2 min-w-20">
                                                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                                            <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${task.pct_complete}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600 shrink-0">{task.pct_complete}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50/50 text-sm font-bold text-slate-700 border-t border-slate-100">
                                        <td className="px-4 py-3.5" colSpan="2">Total</td>
                                        <td className="px-4 py-3.5">{formatCurrency(BAC)}</td>
                                        <td className="px-4 py-3.5">{formatCurrency(AC)}</td>
                                        <td className={`px-4 py-3.5 font-bold whitespace-nowrap ${varianceColor(CV).text}`}>{formatCurrency(CV)}</td>
                                        <td className="px-4 py-3.5">{tasks.reduce((s, t) => s + parseFloat(t.planned_hours || 0), 0)}</td>
                                        <td className="px-4 py-3.5">{tasks.reduce((s, t) => s + parseFloat(t.actual_hours || 0), 0)}</td>
                                        <td className={`px-4 py-3.5 font-bold ${varianceColor(totalHV).text}`}>
                                            {totalHV >= 0 ? `+${totalHV}` : totalHV}
                                        </td>
                                        <td className="px-4 py-3.5" />
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