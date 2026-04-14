const supabase = require('../config/db');

function computeEvm(tasks, schedulePct) {
    const BAC = tasks.reduce((s, t) => s + parseFloat(t.planned_cost || 0), 0);
    const EV  = tasks.reduce((s, t) => s + parseFloat(t.planned_cost || 0) * (parseFloat(t.pct_complete || 0) / 100), 0);
    const AC  = tasks.reduce((s, t) => s + parseFloat(t.actual_cost || 0), 0);
    const PV  = BAC * parseFloat(schedulePct || 0);
    const CPI = AC > 0 ? EV / AC : null;
    const SPI = PV > 0 ? EV / PV : null;
    const CV  = EV - AC;
    const SV  = EV - PV;
    const EAC = CPI && CPI > 0 ? BAC / CPI : null;
    const ETC = EAC !== null ? EAC - AC : null;
    const VAC = EAC !== null ? BAC - EAC : null;
    const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : null;
    const overallPct = BAC > 0 ? (EV / BAC) * 100 : 0;
    return { BAC, EV, AC, PV, CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI, overallPct };
}

// ─── ALERTS ───────────────────────────────────────────────────────────────────

const getAlerts = async (req, res) => {
    const { project_id } = req.query;
    try {
        // Get thresholds
        let t = { cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 };
        if (project_id) {
            const { data: specific } = await supabase.from('alert_thresholds').select('*').eq('project_id', project_id).single();
            if (specific) t = specific;
        }
        if (!project_id || !t.project_id) {
            const { data: global } = await supabase.from('alert_thresholds').select('*').is('project_id', null).single();
            if (global) t = global;
        }

        // Get projects
        let projQuery = supabase.from('projects').select('*');
        if (project_id) projQuery = projQuery.eq('id', project_id);
        else projQuery = projQuery.eq('status', 'active');
        const { data: projects } = await projQuery;

        const alerts = [];
        for (const proj of (projects || [])) {
            const { data: tasks } = await supabase
                .from('tasks').select('planned_cost, actual_cost, pct_complete').eq('project_id', proj.id);
            if (!tasks || tasks.length === 0) continue;

            const { CPI, SPI } = computeEvm(tasks, proj.schedule_pct);

            if (CPI !== null && CPI < parseFloat(t.cpi_red)) {
                alerts.push({ id: `${proj.id}-cpi-critical`, project: proj, metric: 'CPI', value: CPI, threshold: parseFloat(t.cpi_red), severity: 'critical', recommendation: 'Actual costs are significantly exceeding earned value. Review cost control measures immediately.' });
            } else if (CPI !== null && CPI < parseFloat(t.cpi_amber)) {
                alerts.push({ id: `${proj.id}-cpi-warning`, project: proj, metric: 'CPI', value: CPI, threshold: parseFloat(t.cpi_amber), severity: 'warning', recommendation: 'Cost performance is below target. Monitor spending and review upcoming task budgets.' });
            }

            if (SPI !== null && SPI < parseFloat(t.spi_red)) {
                alerts.push({ id: `${proj.id}-spi-critical`, project: proj, metric: 'SPI', value: SPI, threshold: parseFloat(t.spi_red), severity: 'critical', recommendation: 'Project is critically behind schedule. Escalate to management and consider resource reallocation.' });
            } else if (SPI !== null && SPI < parseFloat(t.spi_amber)) {
                alerts.push({ id: `${proj.id}-spi-warning`, project: proj, metric: 'SPI', value: SPI, threshold: parseFloat(t.spi_amber), severity: 'warning', recommendation: 'Schedule performance is below target. Review upcoming milestones and task dependencies.' });
            }
        }
        res.json({ success: true, data: alerts, thresholds: t });
    } catch (err) {
        console.error('[getAlerts]', err.message);
        res.status(500).json({ success: false, message: 'Failed to compute alerts.' });
    }
};

const getThresholds = async (req, res) => {
    const { project_id } = req.query;
    const query = project_id
        ? supabase.from('alert_thresholds').select('*').eq('project_id', project_id).single()
        : supabase.from('alert_thresholds').select('*').is('project_id', null).single();
    const { data } = await query;
    res.json({ success: true, data: data || { cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 } });
};

const updateThresholds = async (req, res) => {
    const { project_id, cpi_amber, cpi_red, spi_amber, spi_red } = req.body;
    const row = {
        project_id:   project_id || null,
        cpi_amber:    parseFloat(cpi_amber) || 1.00,
        cpi_red:      parseFloat(cpi_red)   || 0.90,
        spi_amber:    parseFloat(spi_amber) || 1.00,
        spi_red:      parseFloat(spi_red)   || 0.90,
        updated_by:   req.user.username,
        updated_at:   new Date().toISOString(),
    };
    const { data, error } = await supabase.from('alert_thresholds').upsert([row], { onConflict: 'project_id' }).select().single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data });
};

// ─── EVM ──────────────────────────────────────────────────────────────────────

const getPortfolioOverview = async (req, res) => {
    try {
        const { data: projects } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        let totalEV = 0, totalAC = 0, totalPV = 0, totalBAC = 0;
        const metrics = [];

        for (const proj of (projects || [])) {
            const { data: tasks } = await supabase.from('tasks').select('*').eq('project_id', proj.id);
            const evm = computeEvm(tasks || [], proj.schedule_pct);
            totalEV += evm.EV; totalAC += evm.AC; totalPV += evm.PV; totalBAC += evm.BAC;
            metrics.push({ ...proj, ...evm });
        }

        res.json({
            success: true,
            data: {
                projects: metrics,
                portfolio: {
                    totalBAC, totalAC, totalEV, totalPV,
                    portfolioCPI: totalAC > 0 ? totalEV / totalAC : null,
                    portfolioSPI: totalPV > 0 ? totalEV / totalPV : null,
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getProjectEvm = async (req, res) => {
    const { projectId } = req.params;
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found.' });
    const { data: tasks } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('wbs_code');
    const evm = computeEvm(tasks || [], proj.schedule_pct);
    res.json({ success: true, data: { project: proj, tasks: tasks || [], evm } });
};

module.exports = { getAlerts, getThresholds, updateThresholds, getPortfolioOverview, getProjectEvm };