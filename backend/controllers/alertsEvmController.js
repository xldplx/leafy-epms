const supabase = require('../config/db');

function computeEvm(tasks, schedulePct) {
    const BAC = tasks.reduce((s, t) => s + parseFloat(t.planned_cost || 0), 0);
    const EV  = tasks.reduce((s, t) => s + parseFloat(t.planned_cost || 0) * (parseFloat(t.pct_complete || 0) / 100), 0);
    const AC  = tasks.reduce((s, t) => s + parseFloat(t.actual_cost  || 0), 0);
    const PV  = BAC * parseFloat(schedulePct || 0);
    const CPI = AC > 0 ? EV / AC : null;
    const SPI = PV > 0 ? EV / PV : null;
    const EAC = CPI && CPI > 0 ? BAC / CPI : null;
    const overallPct = BAC > 0 ? (EV / BAC) * 100 : 0;
    return {
        BAC, EV, AC, PV, CPI, SPI, EAC, overallPct,
        CV: EV - AC, SV: EV - PV,
        ETC: EAC !== null ? EAC - AC : null,
        VAC: EAC !== null ? BAC - EAC : null,
        TCPI: (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : null,
        totalPlannedHours: tasks.reduce((s, t) => s + parseFloat(t.planned_hours || 0), 0),
        totalActualHours:  tasks.reduce((s, t) => s + parseFloat(t.actual_hours  || 0), 0),
    };
}

// ── Bilingual recommendation messages ────────────────────────────────────────
// Returns { en, id } so frontend can pick based on user language preference.
// Frontend reads localStorage 'epms.language' and picks the right key.
function makeRecommendation(type, extra = '') {
    const map = {
        'cpi_critical': {
            en: 'Actual costs are significantly exceeding earned value. Review cost control measures immediately.',
            id: 'Biaya aktual melebihi nilai yang diraih secara signifikan. Tinjau langkah pengendalian biaya segera.',
        },
        'cpi_warning': {
            en: 'Cost performance is below target. Monitor spending and review upcoming task budgets.',
            id: 'Kinerja biaya di bawah target. Pantau pengeluaran dan tinjau anggaran tugas mendatang.',
        },
        'spi_critical': {
            en: `Project is critically behind schedule.${extra ? ' High-impact delayed tasks: ' + extra + '.' : ''} Escalate to management.`,
            id: `Proyek sangat terlambat dari jadwal.${extra ? ' Tugas terdampak utama: ' + extra + '.' : ''} Eskalasi ke manajemen.`,
        },
        'spi_warning': {
            en: 'Schedule performance is below target. Review upcoming milestones and task dependencies.',
            id: 'Kinerja jadwal di bawah target. Tinjau tonggak mendatang dan ketergantungan tugas.',
        },
    };
    return map[type] || { en: '', id: '' };
}

// GET /api/alerts/raw
const getAlertsRaw = async (req, res) => {
    try {
        const { data: projects } = await supabase.from('projects')
            .select('id,project_name,project_code,schedule_pct,status,total_budget,planned_start,planned_end')
            .order('created_at', { ascending: false });

        const { data: tasks } = await supabase.from('tasks')
            .select('id,project_id,task_name,wbs_code,planned_cost,actual_cost,pct_complete,planned_hours,actual_hours,weight,is_baseline_locked');

        res.json({
            success: true,
            projects: (projects || []).map(p => ({
                ...p,
                schedule_pct: parseFloat(p.schedule_pct || 0),
                total_budget: parseFloat(p.total_budget || 0),
            })),
            tasks: (tasks || []).map(t => ({
                ...t,
                planned_cost:  parseFloat(t.planned_cost  || 0),
                actual_cost:   parseFloat(t.actual_cost   || 0),
                pct_complete:  parseFloat(t.pct_complete  || 0),
                planned_hours: parseFloat(t.planned_hours || 0),
                actual_hours:  parseFloat(t.actual_hours  || 0),
                weight:        parseFloat(t.weight        || 0),
            })),
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getThresholds = async (req, res) => {
    const { project_id } = req.query;
    try {
        const query = project_id
            ? supabase.from('alert_thresholds').select('*').eq('project_id', project_id).single()
            : supabase.from('alert_thresholds').select('*').is('project_id', null).single();
        const { data } = await query;
        res.json({ success: true, data: data || { cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

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
        const { data, error } = await supabase.from('alert_thresholds')
            .upsert([row], { onConflict: 'project_id' }).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAlerts = async (req, res) => {
    const { project_id } = req.query;
    try {
        const { data: globalT } = await supabase.from('alert_thresholds').select('*').is('project_id', null).single();
        const thresholds = globalT || { cpi_amber: 1.00, cpi_red: 0.90, spi_amber: 1.00, spi_red: 0.90 };

        let projQ = supabase.from('projects').select('*');
        if (project_id) projQ = projQ.eq('id', project_id);
        const { data: projects } = await projQ;

        const alerts = [];
        for (const proj of (projects || [])) {
            const { data: tasks } = await supabase.from('tasks')
                .select('id,task_name,planned_cost,actual_cost,pct_complete,planned_hours,actual_hours,weight')
                .eq('project_id', proj.id);
            if (!tasks || tasks.length === 0) continue;

            const { CPI, SPI } = computeEvm(tasks, proj.schedule_pct);
            const { cpi_amber, cpi_red, spi_amber, spi_red } = thresholds;

            if (CPI !== null && CPI < cpi_red) {
                const rec = makeRecommendation('cpi_critical');
                alerts.push({ id: `${proj.id}-cpi-critical`, project: proj, metric: 'CPI', value: CPI, threshold: cpi_red, severity: 'critical', recommendation: rec.en, recommendation_id: rec.id });
            } else if (CPI !== null && CPI < cpi_amber) {
                const rec = makeRecommendation('cpi_warning');
                alerts.push({ id: `${proj.id}-cpi-warning`, project: proj, metric: 'CPI', value: CPI, threshold: cpi_amber, severity: 'warning', recommendation: rec.en, recommendation_id: rec.id });
            }

            if (SPI !== null && SPI < spi_red) {
                const delayedTasks = tasks.filter(t => t.pct_complete < 100)
                    .sort((a, b) => (b.planned_cost * (1 - b.pct_complete / 100)) - (a.planned_cost * (1 - a.pct_complete / 100)))
                    .slice(0, 2);
                const taskNames = delayedTasks.map(t => t.task_name).join(', ');
                const rec = makeRecommendation('spi_critical', taskNames);
                alerts.push({ id: `${proj.id}-spi-critical`, project: proj, metric: 'SPI', value: SPI, threshold: spi_red, severity: 'critical', recommendation: rec.en, recommendation_id: rec.id, affectedTasks: delayedTasks });
            } else if (SPI !== null && SPI < spi_amber) {
                const rec = makeRecommendation('spi_warning');
                alerts.push({ id: `${proj.id}-spi-warning`, project: proj, metric: 'SPI', value: SPI, threshold: spi_amber, severity: 'warning', recommendation: rec.en, recommendation_id: rec.id });
            }
        }
        res.json({ success: true, data: alerts, thresholds });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getPortfolioOverview = async (req, res) => {
    try {
        const { data: projects } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        let totalEV = 0, totalAC = 0, totalPV = 0, totalBAC = 0;
        const metrics = [];
        for (const proj of (projects || [])) {
            const { data: tasks } = await supabase.from('tasks').select('planned_cost,actual_cost,pct_complete,planned_hours,actual_hours').eq('project_id', proj.id);
            const evm = computeEvm(tasks || [], proj.schedule_pct);
            totalEV += evm.EV; totalAC += evm.AC; totalPV += evm.PV; totalBAC += evm.BAC;
            metrics.push({ ...proj, ...evm });
        }
        res.json({ success: true, data: { projects: metrics, portfolio: { totalBAC, totalAC, totalEV, totalPV,
            portfolioCPI: totalAC > 0 ? totalEV / totalAC : null,
            portfolioSPI: totalPV > 0 ? totalEV / totalPV : null,
        }}});
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getProjectEvm = async (req, res) => {
    try {
        const { data: proj } = await supabase.from('projects').select('*').eq('id', req.params.projectId).single();
        if (!proj) return res.status(404).json({ success: false, message: 'Project not found.' });
        const { data: tasks } = await supabase.from('tasks').select('*').eq('project_id', req.params.projectId).order('wbs_code');
        const evm = computeEvm(tasks || [], proj.schedule_pct);
        res.json({ success: true, data: { project: proj, tasks: tasks || [], evm } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAlertsRaw, getThresholds, updateThresholds, getAlerts, getPortfolioOverview, getProjectEvm };