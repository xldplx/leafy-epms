/**
 * reportController.js
 * Backend untuk Report.jsx — Critical Activities & Delay Analysis
 *
 * Report.jsx mengambil data dari dua endpoint:
 *   GET /api/projects                        (sudah ada di projectsController)
 *   GET /api/projects/:projectId/tasks       (sudah ada di tasksController)
 *
 * Kedua endpoint di atas SUDAH ADA. Report.jsx mengolah data tasks di frontend
 * menggunakan field: task_name, wbs_code, planned_start, planned_end,
 * planned_duration, pct_complete, schedule_pct, float.
 *
 * Controller ini menambahkan:
 *   GET /api/projects/:projectId/report/critical  → critical activities (float <= 2 atau behind schedule)
 *   GET /api/projects/:projectId/report/delay     → delay analysis (tasks belum selesai + daysBehind)
 *   GET /api/projects/:projectId/report/summary   → KPI summary (untuk export & caching)
 *   PATCH /api/projects/:projectId/tasks/schedule-pct → update schedule_pct semua tasks berdasarkan tanggal hari ini
 *
 * schedule_pct auto-compute:
 *   Jika planned_start & planned_end ada:
 *     schedule_pct = min(100, max(0, (today - planned_start) / (planned_end - planned_start) * 100))
 *   Jika tidak ada: 0
 *
 * float auto-compute (simplified, karena CPM penuh butuh graph traversal):
 *   float = (planned_end - today) in days, jika negatif = 0 (overdue)
 *   0 = critical (sudah lewat atau hari ini deadline)
 *   null = tidak ada jadwal
 */

const supabase = require('../config/db');

// ── Helper: hitung schedule_pct dari tanggal ──────────────────────────────────
function computeSchedulePct(plannedStart, plannedEnd, today = new Date()) {
    if (!plannedStart || !plannedEnd) return 0;
    const start   = new Date(plannedStart);
    const end     = new Date(plannedEnd);
    const total   = end - start;
    if (total <= 0) return 1;
    const elapsed = today - start;
    // Return 0-1 (desimal) sesuai presisi DB NUMERIC(5,4)
    return Math.min(1, Math.max(0, elapsed / total));
}

// ── Helper: hitung float (simplified) ────────────────────────────────────────
// Total float = sisa hari dari hari ini ke planned_end
// 0 = task sudah melewati planned_end (critical/overdue)
function computeFloat(plannedEnd, today = new Date()) {
    if (!plannedEnd) return null;
    const end   = new Date(plannedEnd);
    const diffMs = end - today;
    const days  = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
}

// ── Helper: impact label ──────────────────────────────────────────────────────
function impactLabel(daysBehind) {
    if (daysBehind > 5) return 'High';
    if (daysBehind > 2) return 'Medium';
    return 'Low';
}

// ── GET /api/projects/:projectId/report/critical ──────────────────────────────
// Critical activities: float <= 2 ATAU pct_complete < schedule_pct
const getCriticalActivities = async (req, res) => {
    const { projectId } = req.params;
    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('id, task_name, wbs_code, planned_start, planned_end, planned_duration, pct_complete, float, schedule_pct, actual_cost, planned_cost')
            .eq('project_id', parseInt(projectId))
            .order('wbs_code');

        if (error) return res.status(500).json({ success: false, message: error.message });

        const today = new Date();
        const result = (tasks || [])
            .map(task => {
                const schedulePct = task.schedule_pct != null ? parseFloat(task.schedule_pct) : computeSchedulePct(task.planned_start, task.planned_end, today);
                const floatDays   = task.float        != null ? parseFloat(task.float)        : computeFloat(task.planned_end, today);
                return { ...task, schedule_pct: schedulePct, float: floatDays };
            })
            .filter(task => {
                const isBehind  = parseFloat(task.pct_complete || 0) < task.schedule_pct;
                const isLowFloat = task.float !== null && task.float <= 2;
                return isBehind || isLowFloat;
            })
            .map(task => ({
                ...task,
                delayDays: Math.max(0, (task.schedule_pct - parseFloat(task.pct_complete || 0)) * ((task.planned_duration || 1) / 100)),
            }));

        res.json({ success: true, data: result, total: result.length });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── GET /api/projects/:projectId/report/delay ─────────────────────────────────
// Delay analysis: semua tasks yang belum 100% dengan daysBehind
const getDelayAnalysis = async (req, res) => {
    const { projectId } = req.params;
    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('id, task_name, wbs_code, planned_start, planned_end, planned_duration, pct_complete, float, schedule_pct, actual_cost, planned_cost')
            .eq('project_id', parseInt(projectId))
            .lt('pct_complete', 100)   // hanya yang belum selesai
            .order('wbs_code');

        if (error) return res.status(500).json({ success: false, message: error.message });

        const today = new Date();
        const result = (tasks || [])
            .map(task => {
                const schedulePct   = task.schedule_pct != null ? parseFloat(task.schedule_pct) : computeSchedulePct(task.planned_start, task.planned_end, today);
                const actualPct     = parseFloat(task.pct_complete || 0);
                const pctBehind     = Math.max(0, schedulePct - actualPct);
                const daysBehind    = Math.round((pctBehind / 100) * (task.planned_duration || 1));

                return {
                    ...task,
                    schedule_pct: schedulePct,
                    daysBehind,
                    impact: impactLabel(daysBehind),
                };
            })
            .sort((a, b) => b.daysBehind - a.daysBehind);

        res.json({ success: true, data: result, total: result.length });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── GET /api/projects/:projectId/report/summary ───────────────────────────────
// KPI summary: totalCritical, highImpactDelays, totalTasks, avgDelayDays
const getReportSummary = async (req, res) => {
    const { projectId } = req.params;
    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('id, task_name, wbs_code, planned_start, planned_end, planned_duration, pct_complete, float, schedule_pct')
            .eq('project_id', parseInt(projectId));

        if (error) return res.status(500).json({ success: false, message: error.message });

        const today = new Date();
        const enriched = (tasks || []).map(task => {
            const schedulePct = task.schedule_pct != null ? parseFloat(task.schedule_pct) : computeSchedulePct(task.planned_start, task.planned_end, today);
            const floatDays   = task.float        != null ? parseFloat(task.float)        : computeFloat(task.planned_end, today);
            const actualPct   = parseFloat(task.pct_complete || 0);
            const pctBehind   = Math.max(0, schedulePct - actualPct);
            const daysBehind  = Math.round((pctBehind / 100) * (task.planned_duration || 1));
            const isBehind    = actualPct < schedulePct;
            const isLowFloat  = floatDays !== null && floatDays <= 2;

            return { ...task, schedule_pct: schedulePct, float: floatDays, daysBehind, isCritical: isBehind || isLowFloat };
        });

        const critical        = enriched.filter(t => t.isCritical);
        const incomplete      = enriched.filter(t => parseFloat(t.pct_complete || 0) < 100);
        const highImpact      = incomplete.filter(t => t.daysBehind > 5);
        const avgDelayDays    = incomplete.length > 0
            ? Math.round(incomplete.reduce((s, t) => s + t.daysBehind, 0) / incomplete.length)
            : 0;

        res.json({
            success: true,
            data: {
                totalCritical:    critical.length,
                highImpactDelays: highImpact.length,
                totalTasks:       enriched.length,
                avgDelayDays,
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PATCH /api/projects/:projectId/tasks/schedule-pct ────────────────────────
// Auto-update schedule_pct dan float semua tasks di project berdasarkan tanggal hari ini
// Dipanggil saat Report dibuka atau saat user klik "Refresh"
const refreshSchedulePct = async (req, res) => {
    const { projectId } = req.params;
    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('id, planned_start, planned_end')
            .eq('project_id', parseInt(projectId));

        if (error) return res.status(500).json({ success: false, message: error.message });

        const today = new Date();
        let updated = 0;

        // Update dalam batch parallel
        await Promise.all((tasks || []).map(async (task) => {
            const schedulePct = computeSchedulePct(task.planned_start, task.planned_end, today);
            const floatDays   = computeFloat(task.planned_end, today);

            const { error: uErr } = await supabase
                .from('tasks')
                .update({
                    schedule_pct: parseFloat(schedulePct.toFixed(4)),
                    float:        floatDays,
                    updated_at:   today.toISOString(),
                })
                .eq('id', task.id);

            if (!uErr) updated++;
        }));

        res.json({
            success: true,
            message: `schedule_pct & float refreshed for ${updated} tasks.`,
            refreshed: updated,
            as_of: today.toISOString(),
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = {
    getCriticalActivities,
    getDelayAnalysis,
    getReportSummary,
    refreshSchedulePct,
};