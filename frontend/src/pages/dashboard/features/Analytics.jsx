import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import { dummyProjectsEvm, dummyTaskData, dummyPlanTasks, dummyProjects } from '../../../data/dummyData';
import { formatCurrency } from '../../../utils/evmHelpers';
import { INPUT_CLASS } from '../../../utils/uiConstants';

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = ['Cost S-Curve', 'Manpower S-Curve', 'Time S-Curve', 'Gantt Chart', 'CPM Table'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtIDR  = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
const fmtHrs  = (v) => `${Math.round(v)} hrs`;
const fmtPct  = (v) => `${v.toFixed(1)}%`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Distribute a task's value linearly across its duration into monthly buckets */
function spreadMonthly(startStr, endStr, value) {
    const start = new Date(startStr);
    const end   = new Date(endStr);
    const totalDays = Math.max(1, (end - start) / 86400000);
    const result = {};
    let cur = new Date(start);
    while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
        const daysLeft    = Math.min(daysInMonth - cur.getDate() + 1, (end - cur) / 86400000 + 1);
        result[key] = (result[key] || 0) + (value / totalDays) * daysLeft;
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return result;
}

/** Build cumulative S-Curve data from plan tasks */
function buildSCurve(tasks, mode /* 'cost' | 'hours' | 'pct' */) {
    const pvMap = {}, evMap = {}, acMap = {};
    tasks.forEach(t => {
        const pv = mode === 'cost' ? t.planned_cost : mode === 'hours' ? t.planned_hours : t.weight * 100;
        const ev = mode === 'cost' ? t.planned_cost * (t.pct_complete / 100)
                 : mode === 'hours' ? t.planned_hours * (t.pct_complete / 100)
                 : t.weight * t.pct_complete;
        const ac = mode === 'cost' ? (dummyTaskData.find(d => d.wbs_code === t.wbs_code)?.actual_cost ?? 0)
                 : mode === 'hours' ? (dummyTaskData.find(d => d.wbs_code === t.wbs_code)?.actual_hours ?? 0)
                 : (t.pct_complete / 100) * t.weight * 100;

        const pvSpread = spreadMonthly(t.planned_start, t.planned_end, pv);
        const evSpread = spreadMonthly(t.planned_start, t.planned_end, ev);
        const acSpread = spreadMonthly(t.planned_start, t.planned_end, ac);

        Object.entries(pvSpread).forEach(([k, v]) => { pvMap[k] = (pvMap[k] || 0) + v; });
        Object.entries(evSpread).forEach(([k, v]) => { evMap[k] = (evMap[k] || 0) + v; });
        Object.entries(acSpread).forEach(([k, v]) => { acMap[k] = (acMap[k] || 0) + v; });
    });

    const keys = [...new Set([...Object.keys(pvMap), ...Object.keys(evMap), ...Object.keys(acMap)])].sort();
    let cumPV = 0, cumEV = 0, cumAC = 0;
    return keys.map(k => {
        cumPV += pvMap[k] || 0;
        cumEV += evMap[k] || 0;
        cumAC += acMap[k] || 0;
        const [year, month] = k.split('-');
        const label = new Date(parseInt(year), parseInt(month) - 1, 1)
            .toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        return { month: label, PV: Math.round(cumPV), EV: Math.round(cumEV), AC: Math.round(cumAC) };
    });
}

/** CPM: forward/backward pass on plan tasks */
function computeCPM(tasks) {
    const byId = Object.fromEntries(tasks.map(t => [t.id, { ...t, ES: 0, EF: 0, LS: 0, LF: 0, float: 0, isCritical: false }]));

    // Forward pass
    tasks.forEach(t => {
        const node = byId[t.id];
        const maxPredEF = t.predecessors.length
            ? Math.max(...t.predecessors.map(pid => byId[pid]?.EF ?? 0))
            : 0;
        node.ES = maxPredEF;
        node.EF = node.ES + t.planned_duration;
    });

    const maxEF = Math.max(...Object.values(byId).map(n => n.EF));

    // Backward pass
    [...tasks].reverse().forEach(t => {
        const node = byId[t.id];
        const successors = tasks.filter(s => s.predecessors.includes(t.id));
        node.LF = successors.length
            ? Math.min(...successors.map(s => byId[s.id].LS))
            : maxEF;
        node.LS = node.LF - t.planned_duration;
        node.float = node.LF - node.EF;
        node.isCritical = node.float === 0;
    });

    return Object.values(byId);
}

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
function CurveTooltip({ active, payload, label, mode }) {
    if (!active || !payload?.length) return null;
    const labels = { PV: 'Planned Value', EV: 'Earned Value', AC: 'Actual Cost' };
    const fmts   = { cost: fmtIDR, hours: fmtHrs, pct: fmtPct };
    const f = fmts[mode];
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-40">
            <p className="font-bold text-slate-700 mb-2">{label}</p>
            {payload.map(p => (
                <div key={p.dataKey} className="flex justify-between gap-4 mb-1">
                    <span style={{ color: p.color }} className="font-semibold">{labels[p.dataKey]}</span>
                    <span className="text-slate-600 font-mono">{f(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

// ─── GANTT CHART ─────────────────────────────────────────────────────────────
function GanttChart({ tasks, cpmResults }) {
    const today = new Date('2026-04-07');
    const allDates = tasks.flatMap(t => [new Date(t.planned_start), new Date(t.planned_end)]);
    const minDate  = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate  = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalMs  = maxDate - minDate;

    const pct = (d) => ((new Date(d) - minDate) / totalMs) * 100;
    const width = (s, e) => Math.max(((new Date(e) - new Date(s)) / totalMs) * 100, 1);
    const todayPct = Math.min(Math.max(((today - minDate) / totalMs) * 100, 0), 100);

    // Month header markers
    const months = [];
    let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cur <= maxDate) {
        months.push({ label: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), pct: pct(cur) });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    const cpmMap = Object.fromEntries((cpmResults || []).map(c => [c.id, c]));

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[700px]">
                {/* Month headers */}
                <div className="flex mb-2 pl-48 relative border-b border-slate-100 pb-2">
                    <div className="flex-1 relative h-5">
                        {months.map((m, i) => (
                            <span key={i} className="absolute text-[10px] font-semibold text-slate-400 -translate-x-1/2"
                                style={{ left: `${m.pct}%` }}>
                                {m.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Task rows */}
                {tasks.map(t => {
                    const cpm   = cpmMap[t.id];
                    const isCrit = cpm?.isCritical;
                    const barLeft  = pct(t.planned_start);
                    const barWidth = width(t.planned_start, t.planned_end);
                    const fillWidth = barWidth * (t.pct_complete / 100);

                    const statusColor = t.pct_complete === 100 ? 'bg-emerald-600'
                        : isCrit ? 'bg-red-400'
                        : 'bg-emerald-400';

                    return (
                        <div key={t.id} className="flex items-center py-2 border-b border-slate-50 hover:bg-slate-50/50 group">
                            {/* Task label */}
                            <div className="w-48 shrink-0 pr-4">
                                <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-emerald-700 transition-colors">{t.task_name}</p>
                                <p className="text-[10px] font-mono text-slate-400">{t.wbs_code}</p>
                            </div>

                            {/* Timeline area */}
                            <div className="flex-1 relative h-8">
                                {/* Today line */}
                                <div className="absolute top-0 bottom-0 w-px bg-red-400 z-20"
                                    style={{ left: `${todayPct}%` }}>
                                    <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-red-400" />
                                </div>

                                {/* Planned bar (background) */}
                                <div className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-md ${isCrit ? 'bg-red-100 border border-red-200' : 'bg-slate-100 border border-slate-200'}`}
                                    style={{ left: `${barLeft}%`, width: `${barWidth}%` }}>
                                    {/* Progress fill */}
                                    <div className={`h-full rounded-md ${statusColor} opacity-70 transition-all duration-500`}
                                        style={{ width: `${t.pct_complete}%` }} />
                                    {/* Pct label */}
                                    {barWidth > 8 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90 pointer-events-none">
                                            {t.pct_complete}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Side info */}
                            <div className="w-28 shrink-0 pl-3 text-right">
                                <p className="text-[10px] text-slate-400">{fmtDate(t.planned_start)}</p>
                                <p className="text-[10px] text-slate-400">{fmtDate(t.planned_end)}</p>
                            </div>
                        </div>
                    );
                })}

                {/* Today label */}
                <div className="flex pl-48 mt-1">
                    <div className="flex-1 relative">
                        <div className="absolute -translate-x-1/2 text-[10px] font-bold text-red-400"
                            style={{ left: `${todayPct}%` }}>
                            Today
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 mt-6 pl-48 flex-wrap">
                    <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded bg-emerald-400 opacity-70" /><span className="text-[11px] text-slate-500">In Progress</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded bg-emerald-600" /><span className="text-[11px] text-slate-500">Complete</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded bg-red-100 border border-red-200" /><span className="text-[11px] text-slate-500">Critical Path</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-px h-4 bg-red-400" /><span className="text-[11px] text-slate-500">Today</span></div>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Analytics() {
    const [activeTab, setActiveTab] = useState('Cost S-Curve');
    const [selectedProjectId, setSelectedProjectId] = useState('1');

    const selectedProject = dummyProjects.find(p => p.id === parseInt(selectedProjectId));

    // S-Curve data (project 1 only — plan tasks belong to project 1)
    const costData     = useMemo(() => buildSCurve(dummyPlanTasks, 'cost'),  []);
    const manpowerData = useMemo(() => buildSCurve(dummyPlanTasks, 'hours'), []);
    const timeData     = useMemo(() => buildSCurve(dummyPlanTasks, 'pct'),   []);

    // CPM
    const cpmResults = useMemo(() => computeCPM(dummyPlanTasks), []);
    const criticalPath = cpmResults.filter(t => t.isCritical);

    const curveConfig = {
        'Cost S-Curve':     { data: costData,     fmt: fmtIDR,  yLabel: 'IDR (Cumulative)',     desc: 'Planned cost • Earned value • Actual cost over project timeline' },
        'Manpower S-Curve': { data: manpowerData, fmt: fmtHrs,  yLabel: 'Hours (Cumulative)',   desc: 'Planned man-hours vs actual man-hours to optimize resource allocation' },
        'Time S-Curve':     { data: timeData,     fmt: fmtPct,  yLabel: 'Progress % (Cumul.)', desc: 'Planned progress % vs actual progress % — schedule performance' },
    };

    const isCurveTab = ['Cost S-Curve', 'Manpower S-Curve', 'Time S-Curve'].includes(activeTab);
    const curveMode  = activeTab === 'Cost S-Curve' ? 'cost' : activeTab === 'Manpower S-Curve' ? 'hours' : 'pct';
    const curve      = curveConfig[activeTab];

    return (
        <div className="space-y-8">
            {/* HEADER */}
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Analytics</h2>
                <p className="text-slate-500 mt-1">S-Curve analysis, Gantt scheduling, and Critical Path Method</p>
            </div>

            {/* TAB STRIP */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── S-CURVE TABS ── */}
            {isCurveTab && (
                <>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <p className="text-xs text-slate-500 leading-relaxed">{curve.desc}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
                            <h3 className="font-bold text-slate-700">{activeTab}</h3>
                            <p className="text-xs text-slate-400">PRJ-2026-001 — Industrial Complex Phase 2</p>
                        </div>
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={curve.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                <YAxis width={activeTab === 'Cost S-Curve' ? 80 : 60}
                                    tickFormatter={v => activeTab === 'Cost S-Curve' ? `${(v / 1e9).toFixed(1)}B` : activeTab === 'Manpower S-Curve' ? `${v}` : `${v.toFixed(0)}%`}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                <Tooltip content={<CurveTooltip mode={curveMode} />} />
                                <Legend formatter={(v) => ({ PV: 'Planned Value', EV: 'Earned Value', AC: 'Actual Cost' }[v])}
                                    wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                                <Line type="monotone" dataKey="PV" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 4" />
                                <Line type="monotone" dataKey="EV" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                <Line type="monotone" dataKey="AC" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>

                        {/* S-Curve type indicators */}
                        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-50 pt-5">
                            {[
                                { key: 'PV', label: 'Planned Value',  color: 'bg-slate-400', desc: activeTab === 'Cost S-Curve' ? 'Budgeted work scheduled' : activeTab === 'Manpower S-Curve' ? 'Planned man-hours' : 'Planned % progress' },
                                { key: 'EV', label: 'Earned Value',   color: 'bg-emerald-500', desc: activeTab === 'Cost S-Curve' ? 'Value of work completed' : activeTab === 'Manpower S-Curve' ? 'Productive hours earned' : 'Actual % achieved' },
                                { key: 'AC', label: 'Actual Cost',    color: 'bg-amber-400',   desc: activeTab === 'Cost S-Curve' ? 'Real expenditure to date' : activeTab === 'Manpower S-Curve' ? 'Actual hours worked' : 'Physical progress %' },
                            ].map(item => (
                                <div key={item.key} className="text-center">
                                    <div className={`w-8 h-1 rounded-full ${item.color} mx-auto mb-2`} />
                                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ── GANTT CHART TAB ── */}
            {activeTab === 'Gantt Chart' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-slate-700">Gantt Chart</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Horizontal bar chart per task — progress overlay, today marker, critical path highlighted</p>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">PRJ-2026-001</span>
                        </div>
                    </div>
                    <div className="p-6">
                        <GanttChart tasks={dummyPlanTasks} cpmResults={cpmResults} />
                    </div>
                </div>
            )}

            {/* ── CPM TABLE TAB ── */}
            {activeTab === 'CPM Table' && (
                <>
                    {/* Critical path summary */}
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                        <p className="text-sm font-bold text-red-800 mb-2">Critical Path ({criticalPath.length} tasks — Float = 0)</p>
                        <div className="flex flex-wrap gap-2">
                            {criticalPath.map(t => (
                                <span key={t.id} className="text-[11px] font-semibold bg-white border border-red-200 text-red-700 px-3 py-1 rounded-lg">
                                    {t.wbs_code} — {t.task_name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="font-bold text-slate-700">CPM Forward / Backward Pass Results</h3>
                            <p className="text-xs text-slate-400 mt-0.5">ES = Early Start · EF = Early Finish · LS = Late Start · LF = Late Finish · Float = Total Float (days)</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">Task</th>
                                        <th className="px-4 py-4">WBS</th>
                                        <th className="px-4 py-4">Duration</th>
                                        <th className="px-4 py-4">Predecessors</th>
                                        <th className="px-4 py-4">ES</th>
                                        <th className="px-4 py-4">EF</th>
                                        <th className="px-4 py-4">LS</th>
                                        <th className="px-4 py-4">LF</th>
                                        <th className="px-4 py-4">Float</th>
                                        <th className="px-4 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-50">
                                    {cpmResults.map(t => (
                                        <tr key={t.id} className={`transition-colors ${t.isCritical ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50/60'}`}>
                                            <td className="px-6 py-3.5 font-semibold text-slate-700">{t.task_name}</td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{t.wbs_code}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{t.planned_duration}d</td>
                                            <td className="px-4 py-3.5 text-slate-400 text-xs">
                                                {t.predecessors.length > 0
                                                    ? t.predecessors.map(pid => cpmResults.find(r => r.id === pid)?.wbs_code || pid).join(', ')
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{t.ES}d</td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{t.EF}d</td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{t.LS}d</td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{t.LF}d</td>
                                            <td className="px-4 py-3.5">
                                                <span className={`font-bold text-xs px-2 py-0.5 rounded ${t.float === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {t.float}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {t.isCritical
                                                    ? <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border bg-red-50 text-red-700 border-red-100">Critical</span>
                                                    : <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border bg-slate-50 text-slate-500 border-slate-100">Float</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
