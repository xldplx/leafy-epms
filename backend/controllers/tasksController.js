/**
 * tasksController.js
 *
 * getTasksByProject kini auto-compute schedule_pct & float setiap request,
 * sehingga Report.jsx mendapat nilai real tanpa perlu endpoint terpisah.
 *
 * schedule_pct = % durasi yang seharusnya sudah selesai berdasarkan hari ini
 * float        = sisa hari ke planned_end (0 = critical/overdue, null = no schedule)
 */

const supabase = require('../config/db');

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeSchedulePct(plannedStart, plannedEnd, today) {
    if (!plannedStart || !plannedEnd) return 0;
    const start   = new Date(plannedStart);
    const end     = new Date(plannedEnd);
    const total   = end - start;
    if (total <= 0) return 100;
    const elapsed = today - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function computeFloat(plannedEnd, today) {
    if (!plannedEnd) return null;
    const end  = new Date(plannedEnd);
    const days = Math.floor((end - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
}

// Inject schedule_pct & float ke setiap task berdasarkan tanggal hari ini
function enrichTasks(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // awal hari — konsisten

    return tasks.map(task => {
        // Gunakan nilai DB jika sudah up-to-date (di-set hari ini via PATCH),
        // kalau tidak ada hitung on-the-fly agar Report selalu dapat data real.
        const schedulePct = computeSchedulePct(task.planned_start, task.planned_end, today);
        const floatDays   = computeFloat(task.planned_end, today);

        return {
            ...task,
            schedule_pct: parseFloat(schedulePct.toFixed(2)),
            float:        floatDays,
        };
    });
}

// ── GET /api/projects/:projectId/tasks ────────────────────────────────────────
const getTasksByProject = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', req.params.projectId)
            .order('wbs_code');

        if (error) return res.status(500).json({ success: false, message: error.message });

        // Enrich dengan schedule_pct & float real-time
        const enriched = enrichTasks(data || []);
        res.json({ success: true, data: enriched });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── POST /api/projects/:projectId/tasks ───────────────────────────────────────
const createTask = async (req, res) => {
    const { projectId } = req.params;
    const {
        wbs_code, task_name, planned_start, planned_end,
        planned_duration, planned_cost, planned_hours, weight,
        predecessors, wbs_id,
    } = req.body;

    if (!task_name)
        return res.status(400).json({ success: false, message: 'task_name is required.' });

    try {
        const { data, error } = await supabase.from('tasks').insert([{
            project_id:       parseInt(projectId),
            wbs_id:           wbs_id           ? parseInt(wbs_id) : null,
            wbs_code:         wbs_code         || null,
            task_name,
            planned_start:    planned_start    || null,
            planned_end:      planned_end      || null,
            planned_duration: planned_duration ? parseInt(planned_duration) : null,
            planned_cost:     parseFloat(planned_cost)  || 0,
            planned_hours:    parseFloat(planned_hours) || 0,
            weight:           parseFloat(weight)        || 0,
            predecessors:     predecessors || [],
            actual_cost: 0, actual_hours: 0, pct_complete: 0,
        }]).select().single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        const [enriched] = enrichTasks([data]);
        res.status(201).json({ success: true, data: enriched });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PUT /api/tasks/:id ────────────────────────────────────────────────────────
const updateTask = async (req, res) => {
    const updates = {};
    [
        'wbs_id', 'wbs_code', 'task_name', 'planned_start', 'planned_end',
        'planned_duration', 'planned_cost', 'planned_hours', 'weight',
        'predecessors', 'actual_cost', 'actual_hours', 'pct_complete',
    ].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        const [enriched] = enrichTasks([data]);
        res.json({ success: true, data: enriched });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── DELETE /api/tasks/:id ─────────────────────────────────────────────────────
const deleteTask = async (req, res) => {
    try {
        const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Task deleted.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── POST /api/projects/:projectId/tasks/import ────────────────────────────────
const bulkImportTasks = async (req, res) => {
    const { projectId } = req.params;
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0)
        return res.status(400).json({ success: false, message: 'tasks array is required.' });

    try {
        const rows = tasks.map(t => ({
            project_id:    parseInt(projectId),
            wbs_code:      t.wbs_code      || null,
            task_name:     t.task_name,
            planned_start: t.planned_start || null,
            planned_end:   t.planned_end   || null,
            planned_cost:  parseFloat(t.planned_cost)  || 0,
            planned_hours: parseFloat(t.planned_hours) || 0,
            weight:        parseFloat(t.weight)        || 0,
            predecessors:  t.predecessors  || [],
            actual_cost: 0, actual_hours: 0, pct_complete: 0,
        }));

        const { data, error } = await supabase.from('tasks').insert(rows).select();
        if (error) return res.status(500).json({ success: false, message: error.message });

        const enriched = enrichTasks(data || []);
        res.status(201).json({ success: true, imported: enriched.length, data: enriched });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── POST /api/projects/:projectId/tasks/baseline ──────────────────────────────
const lockBaseline = async (req, res) => {
    const { projectId } = req.params;
    const { baseline_name } = req.body;

    try {
        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId);

        if (!tasks || tasks.length === 0)
            return res.status(400).json({ success: false, message: 'No tasks to lock.' });

        await supabase.from('baselines').insert([{
            project_id:    parseInt(projectId),
            baseline_name: baseline_name || 'Baseline Rev.0',
            locked_by:     req.user.username,
            snapshot:      tasks,
        }]);

        await supabase.from('tasks')
            .update({ is_baseline_locked: true, updated_at: new Date().toISOString() })
            .eq('project_id', projectId);

        await supabase.from('projects')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', projectId);

        res.json({ success: true, message: 'Baseline locked.', task_count: tasks.length });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── GET /api/projects/:projectId/tasks/baseline ───────────────────────────────
const getBaselineInfo = async (req, res) => {
    const { projectId } = req.params;
    try {
        const { data, error } = await supabase
            .from('baselines')
            .select('baseline_name, locked_by, locked_at')
            .eq('project_id', projectId)
            .order('locked_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return res.json({ success: false, data: null });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = {
    getTasksByProject,
    createTask,
    updateTask,
    deleteTask,
    bulkImportTasks,
    lockBaseline,
    getBaselineInfo,
};