import { useState } from 'react';
import { BarChart3 } from 'lucide-react';

// Dummy data — will be replaced with API calls in a later sprint
const dummyProjects = [
    { id: 1, project_name: 'Industrial Complex Phase 2',  project_code: 'PRJ-2026-001', schedule_pct: 0.75 },
    { id: 2, project_name: 'Office Tower Renovation',     project_code: 'PRJ-2026-002', schedule_pct: 0.50 },
    { id: 3, project_name: 'Warehouse Expansion Block C', project_code: 'PRJ-2026-003', schedule_pct: 0.25 },
];

const dummyTaskData = [
    // PRJ-2026-001
    { id: 1,  project_id: 1, wbs_code: '1.1.1', task_name: 'Bored Pile 600mm Dia.',       planned_cost: 450000000, planned_hours: 320, actual_cost: 480000000, actual_hours: 340, pct_complete: 100 },
    { id: 2,  project_id: 1, wbs_code: '1.1.2', task_name: 'Pile Cap Type PC-1',          planned_cost: 180000000, planned_hours: 140, actual_cost: 175000000, actual_hours: 135, pct_complete: 100 },
    { id: 3,  project_id: 1, wbs_code: '1.2',   task_name: 'Column & Beam Erection',      planned_cost: 920000000, planned_hours: 580, actual_cost: 580000000, actual_hours: 360, pct_complete:  60 },
    { id: 4,  project_id: 1, wbs_code: '2.1',   task_name: 'Main Distribution Board',     planned_cost: 210000000, planned_hours: 160, actual_cost:  65000000, actual_hours:  50, pct_complete:  30 },
    { id: 5,  project_id: 1, wbs_code: '2.2',   task_name: 'Fire Suppression System',     planned_cost: 175000000, planned_hours: 120, actual_cost:          0, actual_hours:   0, pct_complete:   0 },
    // PRJ-2026-002
    { id: 6,  project_id: 2, wbs_code: '1.0',   task_name: 'Structural Assessment',       planned_cost:  95000000, planned_hours:  80, actual_cost: 100000000, actual_hours:  85, pct_complete: 100 },
    { id: 7,  project_id: 2, wbs_code: '2.0',   task_name: 'Interior Fit-Out',            planned_cost: 340000000, planned_hours: 260, actual_cost: 160000000, actual_hours: 120, pct_complete:  45 },
    // PRJ-2026-003
    { id: 8,  project_id: 3, wbs_code: '1.0',   task_name: 'Site Preparation & Earthworks', planned_cost:  95000000, planned_hours: 120, actual_cost:  98000000, actual_hours: 115, pct_complete: 100 },
    { id: 9,  project_id: 3, wbs_code: '2.0',   task_name: 'Foundation & Pile Works',     planned_cost: 280000000, planned_hours: 240, actual_cost: 130000000, actual_hours: 110, pct_complete:  40 },
    { id: 10, project_id: 3, wbs_code: '3.0',   task_name: 'Structural Steel Frame',      planned_cost: 320000000, planned_hours: 280, actual_cost:          0, actual_hours:   0, pct_complete:   0 },
    { id: 11, project_id: 3, wbs_code: '4.0',   task_name: 'Electrical Installation',     planned_cost: 175000000, planned_hours: 160, actual_cost:          0, actual_hours:   0, pct_complete:   0 },
];

export default function PlanVsActual() {
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const selectedProject = dummyProjects.find(p => p.id === parseInt(selectedProjectId));
    const tasks = dummyTaskData.filter(t => t.project_id === parseInt(selectedProjectId));

    // EVM calculations
    const BAC = tasks.reduce((s, t) => s + t.planned_cost, 0);
    const EV  = tasks.reduce((s, t) => s + t.planned_cost * (t.pct_complete / 100), 0);
    const AC  = tasks.reduce((s, t) => s + t.actual_cost, 0);
    const PV  = BAC * (selectedProject?.schedule_pct || 0);

    const CPI = AC > 0 ? EV / AC : null;
    const SPI = PV > 0 ? EV / PV : null;
    const CV  = EV - AC;
    const SV  = EV - PV;

    // Forecast metrics
    const EAC  = CPI !== null && CPI > 0 ? BAC / CPI : null;
    const ETC  = EAC !== null ? EAC - AC : null;
    const VAC  = EAC !== null ? BAC - EAC : null;
    const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : null;

    const overallPct = BAC > 0 ? (EV / BAC) * 100 : 0;
    const totalHV = tasks.reduce((s, t) => t.actual_hours > 0
        ? s + (Math.round(t.planned_hours * (t.pct_complete / 100)) - t.actual_hours)
        : s, 0);

    const indexColor = (val) => {
        if (val === null) return { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-100',   label: 'N/A'      };
        if (val >= 1.0)  return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'On Track' };
        if (val >= 0.9)  return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',   label: 'At Risk'  };
        return                  { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-100',     label: 'Critical' };
    };

    const varianceColor = (val) =>
        val >= 0
            ? { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Favorable'   }
            : { text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-100',     label: 'Unfavorable' };

    const formatCurrency = (v) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

    const cpiColor = indexColor(CPI);
    const spiColor = indexColor(SPI);
    const cvColor  = varianceColor(CV);
    const svColor  = varianceColor(SV);

    const kpiCards = [
        {
            label: 'CPI',
            subtitle: 'Cost Performance Index — target ≥ 1.00',
            value: CPI !== null ? CPI.toFixed(2) : '—',
            color: cpiColor,
        },
        {
            label: 'SPI',
            subtitle: 'Schedule Performance Index — target ≥ 1.00',
            value: SPI !== null ? SPI.toFixed(2) : '—',
            color: spiColor,
        },
        {
            label: 'CV (Cost Variance)',
            subtitle: CV >= 0 ? 'Under budget' : 'Over budget',
            value: formatCurrency(CV),
            color: cvColor,
        },
        {
            label: 'SV (Schedule Variance)',
            subtitle: SV >= 0 ? 'Ahead of schedule' : 'Behind schedule',
            value: formatCurrency(SV),
            color: svColor,
        },
    ];

    const refValues = [
        { label: 'PV (Planned Value)',    value: formatCurrency(PV)  },
        { label: 'EV (Earned Value)',     value: formatCurrency(EV)  },
        { label: 'AC (Actual Cost)',      value: formatCurrency(AC)  },
        { label: 'BAC (Budget at Comp.)', value: formatCurrency(BAC) },
    ];

    const tcpiColor = indexColor(TCPI);
    const vacColor  = VAC !== null ? varianceColor(VAC) : null;

    const forecastValues = [
        {
            label: 'EAC (Est. at Completion)',
            value: EAC !== null ? formatCurrency(EAC) : '—',
            textClass: 'text-slate-800',
        },
        {
            label: 'ETC (Est. to Complete)',
            value: ETC !== null ? formatCurrency(ETC) : '—',
            textClass: 'text-slate-800',
        },
        {
            label: 'VAC (Variance at Comp.)',
            value: VAC !== null ? formatCurrency(VAC) : '—',
            textClass: vacColor ? vacColor.text : 'text-slate-800',
        },
        {
            label: 'TCPI (To-Complete PI)',
            value: TCPI !== null ? TCPI.toFixed(2) : '—',
            textClass: tcpiColor.text,
        },
    ];

    const inputClass = 'w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm';

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Plan vs Actual</h2>
                <p className="text-slate-500 mt-1">Earned Value Management performance report</p>
            </div>

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
                            {dummyProjects.map(p => (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {kpiCards.map(card => (
                            <div key={card.label} className={`rounded-3xl border p-6 ${card.color.bg} ${card.color.border}`}>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{card.label}</p>
                                <p className={`text-2xl font-bold ${card.color.text} mt-1 whitespace-nowrap`}>{card.value}</p>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{card.subtitle}</p>
                                <span className={`mt-3 inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${card.color.bg} ${card.color.border} ${card.color.text}`}>
                                    {card.color.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* REFERENCE VALUES */}
                    <div className="flex flex-wrap gap-3">
                        {refValues.map(item => (
                            <div key={item.label} className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                                <p className="text-xs text-slate-400 font-semibold">{item.label}</p>
                                <p className="text-slate-800 font-bold text-sm mt-0.5">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* FORECAST VALUES */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Forecast</h3>
                        <div className="flex flex-wrap gap-3">
                            {forecastValues.map(item => (
                                <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                                    <p className="text-xs text-slate-400 font-semibold">{item.label}</p>
                                    <p className={`font-bold text-sm mt-0.5 ${item.textClass}`}>{item.value}</p>
                                </div>
                            ))}
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
                                        const taskEV = task.planned_cost * (task.pct_complete / 100);
                                        const taskCV = taskEV - task.actual_cost;
                                        const taskCVColor = varianceColor(taskCV);
                                        const earnedHours = Math.round(task.planned_hours * (task.pct_complete / 100));
                                        const taskHV = task.actual_hours > 0 ? earnedHours - task.actual_hours : null;
                                        const taskHVColor = taskHV !== null ? varianceColor(taskHV) : null;
                                        return (
                                            <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
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
                                        <td className={`px-4 py-3.5 font-bold whitespace-nowrap ${cvColor.text}`}>{formatCurrency(CV)}</td>
                                        <td className="px-4 py-3.5">{tasks.reduce((s, t) => s + t.planned_hours, 0)}</td>
                                        <td className="px-4 py-3.5">{tasks.reduce((s, t) => s + t.actual_hours, 0)}</td>
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
