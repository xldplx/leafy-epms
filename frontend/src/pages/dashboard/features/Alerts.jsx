import { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';

// Dummy EVM data — will be replaced with API calls in a later sprint
const dummyProjects = [
    { id: 1, project_name: 'Industrial Complex Phase 2',  project_code: 'PRJ-2026-001', schedule_pct: 0.75 },
    { id: 2, project_name: 'Office Tower Renovation',     project_code: 'PRJ-2026-002', schedule_pct: 0.50 },
    { id: 3, project_name: 'Warehouse Expansion Block C', project_code: 'PRJ-2026-003', schedule_pct: 0.25 },
];

const dummyTaskData = [
    { id: 1,  project_id: 1, planned_cost: 450000000, actual_cost: 480000000, pct_complete: 100 },
    { id: 2,  project_id: 1, planned_cost: 180000000, actual_cost: 175000000, pct_complete: 100 },
    { id: 3,  project_id: 1, planned_cost: 920000000, actual_cost: 580000000, pct_complete:  60 },
    { id: 4,  project_id: 1, planned_cost: 210000000, actual_cost:  65000000, pct_complete:  30 },
    { id: 5,  project_id: 1, planned_cost: 175000000, actual_cost:          0, pct_complete:   0 },
    { id: 6,  project_id: 2, planned_cost:  95000000, actual_cost: 100000000, pct_complete: 100 },
    { id: 7,  project_id: 2, planned_cost: 340000000, actual_cost: 160000000, pct_complete:  45 },
    { id: 8,  project_id: 3, planned_cost:  95000000, actual_cost:  98000000, pct_complete: 100 },
    { id: 9,  project_id: 3, planned_cost: 280000000, actual_cost: 130000000, pct_complete:  40 },
    { id: 10, project_id: 3, planned_cost: 320000000, actual_cost:          0, pct_complete:   0 },
    { id: 11, project_id: 3, planned_cost: 175000000, actual_cost:          0, pct_complete:   0 },
];

export default function Alerts() {
    const [thresholds, setThresholds] = useState({
        cpi_amber: '1.00',
        cpi_red:   '0.90',
        spi_amber: '1.00',
        spi_red:   '0.90',
    });

    const userRole = localStorage.getItem('userRole');

    // Parse threshold strings to floats for computation — fallback to 0 if empty/invalid
    const t = {
        cpi_amber: parseFloat(thresholds.cpi_amber) || 0,
        cpi_red:   parseFloat(thresholds.cpi_red)   || 0,
        spi_amber: parseFloat(thresholds.spi_amber) || 0,
        spi_red:   parseFloat(thresholds.spi_red)   || 0,
    };

    // Compute alerts from EVM metrics + thresholds — no state, recalculated on every render
    const alerts = [];

    dummyProjects.forEach(project => {
        const tasks = dummyTaskData.filter(t => t.project_id === project.id);
        const BAC = tasks.reduce((s, t) => s + t.planned_cost, 0);
        const EV  = tasks.reduce((s, t) => s + t.planned_cost * (t.pct_complete / 100), 0);
        const AC  = tasks.reduce((s, t) => s + t.actual_cost, 0);
        const PV  = BAC * project.schedule_pct;

        const CPI = AC > 0 ? EV / AC : null;
        const SPI = PV > 0 ? EV / PV : null;

        if (CPI !== null) {
            if (CPI < t.cpi_red) {
                alerts.push({
                    id: `${project.id}-cpi-critical`,
                    project,
                    metric: 'CPI',
                    value: CPI,
                    threshold: t.cpi_red,
                    severity: 'critical',
                    recommendation: 'Actual costs are significantly exceeding earned value. Review cost control measures immediately.',
                });
            } else if (CPI < t.cpi_amber) {
                alerts.push({
                    id: `${project.id}-cpi-warning`,
                    project,
                    metric: 'CPI',
                    value: CPI,
                    threshold: t.cpi_amber,
                    severity: 'warning',
                    recommendation: 'Cost performance is below target. Monitor spending and review upcoming task budgets.',
                });
            }
        }

        if (SPI !== null) {
            if (SPI < t.spi_red) {
                alerts.push({
                    id: `${project.id}-spi-critical`,
                    project,
                    metric: 'SPI',
                    value: SPI,
                    threshold: t.spi_red,
                    severity: 'critical',
                    recommendation: 'Project is critically behind schedule. Escalate to management and consider resource reallocation.',
                });
            } else if (SPI < t.spi_amber) {
                alerts.push({
                    id: `${project.id}-spi-warning`,
                    project,
                    metric: 'SPI',
                    value: SPI,
                    threshold: t.spi_amber,
                    severity: 'warning',
                    recommendation: 'Schedule performance is below target. Review upcoming milestones and task dependencies.',
                });
            }
        }
    });

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount  = alerts.filter(a => a.severity === 'warning').length;

    const thresholdWarning =
        t.cpi_red >= t.cpi_amber ||
        t.spi_red >= t.spi_amber;

    const inputClass = 'w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-700 text-sm';

    const thresholdFields = [
        { key: 'cpi_amber', label: 'CPI — At Risk below' },
        { key: 'cpi_red',   label: 'CPI — Critical below' },
        { key: 'spi_amber', label: 'SPI — At Risk below' },
        { key: 'spi_red',   label: 'SPI — Critical below' },
    ];

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Early Warning Alerts</h2>
                <p className="text-slate-500 mt-1">Real-time threshold monitoring across all projects</p>
            </div>

            {/* SUMMARY CHIPS */}
            <div className="flex flex-wrap gap-3">
                {alerts.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        All projects are within configured thresholds
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold">
                            <Bell className="w-4 h-4" />
                            {alerts.length} Active {alerts.length === 1 ? 'Alert' : 'Alerts'}
                        </div>
                        {criticalCount > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                {criticalCount} Critical
                            </div>
                        )}
                        {warningCount > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                {warningCount} At Risk
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* THRESHOLD CONFIGURATION — PM only */}
            {userRole === 'Project Manager' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-700">Threshold Configuration</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Alerts are triggered automatically when metrics fall below these values. Changes apply immediately.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        {thresholdFields.map(field => (
                            <div key={field.key} className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{field.label}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1.5"
                                    value={thresholds[field.key]}
                                    onChange={e => setThresholds({ ...thresholds, [field.key]: e.target.value })}
                                    onBlur={e => {
                                        const num = parseFloat(e.target.value);
                                        const clamped = isNaN(num) ? 0 : Math.min(1.5, Math.max(0, num));
                                        setThresholds({ ...thresholds, [field.key]: clamped.toFixed(2) });
                                    }}
                                    className={inputClass}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* THRESHOLD INVERSION WARNING */}
            {thresholdWarning && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Critical threshold should be set lower than the At Risk threshold for correct alert classification.
                </div>
            )}

            {/* ALERTS LIST */}
            {alerts.length > 0 ? (
                <div className="space-y-3">
                    {alerts.map(alert => (
                        <div
                            key={alert.id}
                            className={`bg-white rounded-3xl border p-6 flex items-start gap-4 ${
                                alert.severity === 'critical' ? 'border-red-100' : 'border-amber-100'
                            }`}
                        >
                            {/* Icon */}
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                                alert.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-slate-800">{alert.project.project_name}</p>
                                        <p className="font-mono text-xs text-slate-400 mt-0.5">{alert.project.project_code}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border shrink-0 ${
                                        alert.severity === 'critical'
                                            ? 'bg-red-50 text-red-600 border-red-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                        {alert.severity === 'critical' ? 'Critical' : 'At Risk'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{alert.recommendation}</p>
                                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                                    <span>
                                        <strong className="text-slate-600">{alert.metric}:</strong> {alert.value.toFixed(2)}
                                    </span>
                                    <span>Threshold: {alert.threshold.toFixed(2)}</span>
                                    <span>Deviation: {((alert.value - alert.threshold) * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-12 h-12 text-emerald-300" />
                        <p className="text-slate-400">All projects are currently within configured thresholds.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
