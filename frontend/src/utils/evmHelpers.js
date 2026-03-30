/**
 * Shared EVM (Earned Value Management) computation helpers.
 * Used by Overview, PlanVsActual, Alerts, and Excel Export.
 */

export function computeEvm(tasks, schedulePct) {
    const BAC = tasks.reduce((s, t) => s + t.planned_cost, 0);
    const EV  = tasks.reduce((s, t) => s + t.planned_cost * (t.pct_complete / 100), 0);
    const AC  = tasks.reduce((s, t) => s + t.actual_cost, 0);
    const PV  = BAC * (schedulePct || 0);

    const CPI = AC > 0 ? EV / AC : null;
    const SPI = PV > 0 ? EV / PV : null;
    const CV  = EV - AC;
    const SV  = EV - PV;

    const EAC  = CPI !== null && CPI > 0 ? BAC / CPI : null;
    const ETC  = EAC !== null ? EAC - AC : null;
    const VAC  = EAC !== null ? BAC - EAC : null;
    const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : null;

    const overallPct = BAC > 0 ? (EV / BAC) * 100 : 0;

    const totalPlannedHours = tasks.reduce((s, t) => s + (t.planned_hours || 0), 0);
    const totalActualHours  = tasks.reduce((s, t) => s + (t.actual_hours || 0), 0);
    const totalHoursVariance = tasks.reduce((s, t) =>
        t.actual_hours > 0
            ? s + (Math.round((t.planned_hours || 0) * (t.pct_complete / 100)) - t.actual_hours)
            : s, 0);

    return { BAC, EV, AC, PV, CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI, overallPct, totalPlannedHours, totalActualHours, totalHoursVariance };
}

export function indexColor(val) {
    if (val === null) return { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-100',   label: '\u2014'      };
    if (val >= 1.0)  return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'On Track' };
    if (val >= 0.9)  return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',   label: 'At Risk'  };
    return                  { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-100',     label: 'Critical' };
}

export function varianceColor(val) {
    return val >= 0
        ? { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Favorable'   }
        : { text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-100',     label: 'Unfavorable' };
}

export function formatCurrency(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

export function formatDate(d) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function computeAlerts(projects, allTasks, thresholds) {
    const t = {
        cpi_amber: thresholds.cpi_amber ?? 1.00,
        cpi_red:   thresholds.cpi_red   ?? 0.90,
        spi_amber: thresholds.spi_amber ?? 1.00,
        spi_red:   thresholds.spi_red   ?? 0.90,
    };

    const alerts = [];

    projects.forEach(project => {
        const tasks = allTasks.filter(task => task.project_id === project.id);
        const BAC = tasks.reduce((s, task) => s + task.planned_cost, 0);
        const EV  = tasks.reduce((s, task) => s + task.planned_cost * (task.pct_complete / 100), 0);
        const AC  = tasks.reduce((s, task) => s + task.actual_cost, 0);
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

    return alerts;
}
