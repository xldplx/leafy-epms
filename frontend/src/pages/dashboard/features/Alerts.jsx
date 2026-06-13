import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
import { computeAlerts } from '../../../utils/evmHelpers';
import { INPUT_CLASS } from '../../../utils/uiConstants';
import { recordAudit } from '../../../utils/auditLog';
import { apiFetch } from '../../../utils/api';

export default function Alerts() {
    const [thresholds, setThresholds] = useState({
        cpi_amber: '1.00',
        cpi_red:   '0.90',
        spi_amber: '1.00',
        spi_red:   '0.90',
    });

    const [thresholdToast, setThresholdToast] = useState(false);
    const userRole = localStorage.getItem('userRole');

    // Real data from API — replaces dummyProjectsEvm and dummyTaskData
    const [projects, setProjects] = useState([]);
    const [allTasks, setAllTasks] = useState([]);

    useEffect(() => {
        // Fetch projects + tasks with same shape as dummyProjectsEvm + dummyTaskData
        apiFetch('/alerts/raw').then(r => {
            if (r.success) {
                setProjects(r.projects || []);
                setAllTasks(r.tasks || []);
            }
        }).catch(console.error);

        // Fetch saved thresholds from DB
        apiFetch('/alerts/thresholds').then(r => {
            if (r.success && r.data) {
                setThresholds({
                    cpi_amber: String(r.data.cpi_amber),
                    cpi_red:   String(r.data.cpi_red),
                    spi_amber: String(r.data.spi_amber),
                    spi_red:   String(r.data.spi_red),
                });
            }
        }).catch(console.error);
    }, []);

    // Parse threshold strings to floats for computation — fallback to 0 if empty/invalid
    const t = {
        cpi_amber: parseFloat(thresholds.cpi_amber) || 0,
        cpi_red:   parseFloat(thresholds.cpi_red)   || 0,
        spi_amber: parseFloat(thresholds.spi_amber) || 0,
        spi_red:   parseFloat(thresholds.spi_red)   || 0,
    };

    // Compute alerts from real API data + thresholds — same computeAlerts function, no dummy data
    const alerts = computeAlerts(projects, allTasks, t);

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount  = alerts.filter(a => a.severity === 'warning').length;

    const thresholdWarning =
        t.cpi_red >= t.cpi_amber ||
        t.spi_red >= t.spi_amber;

    const inputClass = INPUT_CLASS;

    const thresholdFields = [
        { key: 'cpi_amber', label: 'CPI — At Risk below' },
        { key: 'cpi_red',   label: 'CPI — Critical below' },
        { key: 'spi_amber', label: 'SPI — At Risk below' },
        { key: 'spi_red',   label: 'SPI — Critical below' },
    ];

    const handleThresholdBlur = async (e, key) => {
        const num     = parseFloat(e.target.value);
        const clamped = isNaN(num) ? 0 : Math.min(1.5, Math.max(0, num));
        const updated = { ...thresholds, [key]: clamped.toFixed(2) };
        setThresholds(updated);

        // Save to backend
        try {
            await apiFetch('/alerts/thresholds', {
                method: 'PUT',
                body: JSON.stringify({
                    cpi_amber: parseFloat(updated.cpi_amber),
                    cpi_red:   parseFloat(updated.cpi_red),
                    spi_amber: parseFloat(updated.spi_amber),
                    spi_red:   parseFloat(updated.spi_red),
                }),
            });
        } catch (e) { console.error(e); }

        recordAudit({ action: 'UPDATE', resource_type: 'threshold', detail: `Set ${key} to ${clamped.toFixed(2)}` });
        setThresholdToast(true);
        setTimeout(() => setThresholdToast(false), 2000);
    };

    return (
        <div className="space-y-8">

            {/* THRESHOLD UPDATE TOAST */}
            {thresholdToast && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4" /> Thresholds updated
                </div>
            )}

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
                                    onBlur={e => handleThresholdBlur(e, field.key)}
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
                    {[...alerts].sort((a, b) => (b.severity === 'critical' ? 1 : 0) - (a.severity === 'critical' ? 1 : 0) || a.project.project_name.localeCompare(b.project.project_name)).map(alert => (
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
                                <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">{alert.recommendation}</p>
                                
                                {alert.affectedTasks && alert.affectedTasks.length > 0 && (
                                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">High Impact Tasks</p>
                                        <div className="space-y-2">
                                            {alert.affectedTasks.map(task => (
                                                <div key={task.id} className="flex items-center justify-between gap-4">
                                                    <span className="text-xs font-bold text-slate-700">{task.task_name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 bg-slate-200 rounded-full h-1 overflow-hidden">
                                                            <div className="bg-emerald-500 h-full" style={{ width: `${task.pct_complete}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-400 w-8 text-right">{task.pct_complete}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
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