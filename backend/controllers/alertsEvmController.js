const supabase = require('../config/db');

// ─── SHARED EVM COMPUTATION ───────────────────────────────────────────────────

function computeEvm(tasks, schedulePct) {
    const BAC = tasks.reduce((s, t) => s + parseFloat(t.planned_cost || 0), 0);
    const EV  = tasks.reduce((s, t) => s + parseFloat(t.planned_cost || 0) * (parseFloat(t.pct_complete || 0) / 100), 0);
    const AC  = tasks.reduce((s, t) => s + parseFloat(t.actual_cost || 0), 0);
    const PV  = BAC * parseFloat(schedulePct || 0);

    const CPI  = AC > 0 ? EV / AC : null;
    const SPI  = PV > 0 ? EV / PV : null;
    const CV   = EV - AC;
    const SV   = EV - PV;
    const EAC  = CPI && CPI > 0 ? BAC / CPI : null;
    const ETC  = EAC !== null ? EAC - AC : null;
    const VAC  = EAC !== null ? BAC - EAC : null;
    const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : null;
    const overallPct = BAC > 0 ? (EV / BAC) * 100 : 0;

    const totalPlannedHours = tasks.reduce((s, t) => s + parseFloat(t.planned_hours || 0), 0);
    const totalActualHours  = tasks.reduce((s, t) => s + parseFloat(t.actual_hours  || 0), 0);

    return { BAC, EV, AC, PV, CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI, overallPct, totalPlannedHours, totalActualHours };
}

// ─── ALERTS ───────────────────────────────────────────────────────────────────

/**
 * GET /api/alerts
 * Computes CPI/SPI alerts for all active projects against configured thresholds.
 */
const getAlerts = async (req, res) => {
    const { project_id } = req.query;

    try {
        // Fetch thresholds — project-specific first, fallback to global
        let thresholds = { cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 };

        if (project_id) {
            const { data: projT } = await supabase
                .from('alert_thresholds')
                .select('*')
                .eq('project_id', project_id)
                .single();
            if (projT) thresholds = projT;
        }

        if (!project_id || !thresholds.project_id) {
            const { data: globalT } = await supabase
                .from('alert_thresholds')
                .select('*')
                .is('project_id', null)
                .single();
            if (globalT) thresholds = { ...thresholds, ...globalT };
        }

        // Fetch projects
        let projQuery = supabase.from('projects').select('*');
        if (project_id) {
            projQuery = projQuery.eq('id', project_id);
        } else {
            projQuery = projQuery.in('status', ['active', 'planning']);
        }
        const { data: projects } = await projQuery;

        const alerts = [];

        for (const proj of (projects || [])) {
            const { data: tasks } = await supabase
                .from('tasks')
                .select('planned_cost, actual_cost, pct_complete, planned_hours, actual_hours')
                .eq('project_id', proj.id);

            if (!tasks || tasks.length === 0) continue;

            const { CPI, SPI } = computeEvm(tasks, proj.schedule_pct);
            const cpiAmber = parseFloat(thresholds.cpi_amber);
            const cpiRed   = parseFloat(thresholds.cpi_red);
            const spiAmber = parseFloat(thresholds.spi_amber);
            const spiRed   = parseFloat(thresholds.spi_red);

            if (CPI !== null && CPI < cpiRed) {
                alerts.push({
                    id: `${proj.id}-cpi-critical`,
                    project: proj,
                    metric: 'CPI',
                    value: CPI,
                    threshold: cpiRed,
                    severity: 'critical',
                    recommendation: 'Actual costs are significantly exceeding earned value. Review cost control measures immediately.',
                });
            } else if (CPI !== null && CPI < cpiAmber) {
                alerts.push({
                    id: `${proj.id}-cpi-warning`,
                    project: proj,
                    metric: 'CPI',
                    value: CPI,
                    threshold: cpiAmber,
                    severity: 'warning',
                    recommendation: 'Cost performance is below target. Monitor spending and review upcoming task budgets.',
                });
            }

            if (SPI !== null && SPI < spiRed) {
                alerts.push({
                    id: `${proj.id}-spi-critical`,
                    project: proj,
                    metric: 'SPI',
                    value: SPI,
                    threshold: spiRed,
                    severity: 'critical',
                    recommendation: 'Project is critically behind schedule. Escalate to management and consider resource reallocation.',
                });
            } else if (SPI !== null && SPI < spiAmber) {
                alerts.push({
                    id: `${proj.id}-spi-warning`,
                    project: proj,
                    metric: 'SPI',
                    value: SPI,
                    threshold: spiAmber,
                    severity: 'warning',
                    recommendation: 'Schedule performance is below target. Review upcoming milestones and task dependencies.',
                });
            }
        }

        res.json({ success: true, data: alerts, thresholds });
    } catch (err) {
        console.error('[getAlerts]', err.message);
        res.status(500).json({ success: false, message: 'Failed to compute alerts.' });
    }
};

/**
 * GET /api/alerts/thresholds
 * Returns the configured alert thresholds (project-specific or global).
 */
const getThresholds = async (req, res) => {
    const { project_id } = req.query;

    try {
        let query = project_id
            ? supabase.from('alert_thresholds').select('*').eq('project_id', project_id).single()
            : supabase.from('alert_thresholds').select('*').is('project_id', null).single();

        const { data } = await query;
        res.json({
            success: true,
            data: data || { cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * PUT /api/alerts/thresholds
 * Updates alert thresholds. Requires Project Manager role.
 */
const updateThresholds = async (req, res) => {
    const { project_id, cpi_amber, cpi_red, spi_amber, spi_red } = req.body;

    const row = {
        project_id:  project_id || null,
        cpi_amber:   parseFloat(cpi_amber) || 1.00,
        cpi_red:     parseFloat(cpi_red)   || 0.90,
        spi_amber:   parseFloat(spi_amber) || 1.00,
        spi_red:     parseFloat(spi_red)   || 0.90,
        updated_by:  req.user.username,
        updated_at:  new Date().toISOString(),
    };

    try {
        const { data, error } = await supabase
            .from('alert_thresholds')
            .upsert([row], { onConflict: 'project_id' })
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── EVM ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/evm/overview
 * Returns portfolio-level EVM metrics for all projects.
 */
const getPortfolioOverview = async (req, res) => {
    try {
        const { data: projects, error: projErr } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (projErr) return res.status(500).json({ success: false, message: projErr.message });

        let totalEV = 0, totalAC = 0, totalPV = 0, totalBAC = 0;
        const metrics = [];

        for (const proj of (projects || [])) {
            const { data: tasks } = await supabase
                .from('tasks')
                .select('planned_cost, actual_cost, pct_complete, planned_hours, actual_hours')
                .eq('project_id', proj.id);

            const evm = computeEvm(tasks || [], proj.schedule_pct);
            totalEV  += evm.EV;
            totalAC  += evm.AC;
            totalPV  += evm.PV;
            totalBAC += evm.BAC;

            metrics.push({ ...proj, ...evm });
        }

        res.json({
            success: true,
            data: {
                projects: metrics,
                portfolio: {
                    totalBAC,
                    totalAC,
                    totalEV,
                    totalPV,
                    portfolioCPI: totalAC > 0 ? totalEV / totalAC : null,
                    portfolioSPI: totalPV > 0 ? totalEV / totalPV : null,
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/evm/:projectId
 * Returns detailed EVM metrics for a single project.
 */
const getProjectEvm = async (req, res) => {
    const { projectId } = req.params;

    try {
        const { data: proj, error: projErr } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projErr || !proj) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('wbs_code');

        const evm = computeEvm(tasks || [], proj.schedule_pct);

        res.json({ success: true, data: { project: proj, tasks: tasks || [], evm } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAlerts, getThresholds, updateThresholds, getPortfolioOverview, getProjectEvm };