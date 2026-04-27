const supabase = require('../config/db');

/**
 * GET /api/projects/:projectId/tasks
 * Returns all tasks for a project, ordered by wbs_code.
 */
const getTasksByProject = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', req.params.projectId)
            .order('wbs_code');

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/projects/:projectId/tasks
 * Creates a single task. Requires Project Manager or Planner role.
 */
const createTask = async (req, res) => {
    const { projectId } = req.params;
    const {
        wbs_id, wbs_code, task_name, planned_start, planned_end,
        planned_duration, planned_cost, planned_hours, weight, predecessors
    } = req.body;

    if (!task_name) {
        return res.status(400).json({ success: false, message: 'task_name is required.' });
    }

    // Check project is not baseline-locked
    try {
        const { data: proj } = await supabase
            .from('projects')
            .select('status')
            .eq('id', projectId)
            .single();

        if (proj && proj.status === 'active') {
            const { data: anyLocked } = await supabase
                .from('tasks')
                .select('id')
                .eq('project_id', projectId)
                .eq('is_baseline_locked', true)
                .limit(1);
            if (anyLocked && anyLocked.length > 0) {
                return res.status(403).json({ success: false, message: 'Cannot add tasks — baseline is locked.' });
            }
        }

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                project_id:       parseInt(projectId),
                wbs_id:           wbs_id || null,
                wbs_code:         wbs_code || null,
                task_name,
                planned_start:    planned_start || null,
                planned_end:      planned_end || null,
                planned_duration: planned_duration ? parseInt(planned_duration) : null,
                planned_cost:     parseFloat(planned_cost) || 0,
                planned_hours:    parseFloat(planned_hours) || 0,
                weight:           parseFloat(weight) || 0,
                predecessors:     predecessors || [],
                actual_cost:      0,
                actual_hours:     0,
                pct_complete:     0,
            }])
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * PUT /api/tasks/:id
 * Updates a task. Locked baseline tasks cannot be modified.
 */
const updateTask = async (req, res) => {
    try {
        // Check if task is baseline-locked
        const { data: existing } = await supabase
            .from('tasks')
            .select('is_baseline_locked')
            .eq('id', req.params.id)
            .single();

        if (existing && existing.is_baseline_locked) {
            // Only allow updating actuals on locked tasks
            const safeFields = ['actual_cost', 'actual_hours', 'pct_complete'];
            const updates = {};
            safeFields.forEach(f => {
                if (req.body[f] !== undefined) updates[f] = req.body[f];
            });

            if (Object.keys(updates).length === 0) {
                return res.status(403).json({ success: false, message: 'Task is baseline-locked. Only actual values can be updated.' });
            }

            updates.updated_at = new Date().toISOString();
            const { data, error } = await supabase
                .from('tasks').update(updates).eq('id', req.params.id).select().single();
            if (error) return res.status(500).json({ success: false, message: error.message });
            return res.json({ success: true, data });
        }

        // Task is not locked — allow all fields
        const updates = {};
        const allFields = [
            'wbs_id', 'wbs_code', 'task_name', 'planned_start', 'planned_end',
            'planned_duration', 'planned_cost', 'planned_hours', 'weight',
            'predecessors', 'actual_cost', 'actual_hours', 'pct_complete'
        ];
        allFields.forEach(f => {
            if (req.body[f] !== undefined) updates[f] = req.body[f];
        });
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('tasks').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * DELETE /api/tasks/:id
 * Deletes a task. Cannot delete baseline-locked tasks.
 */
const deleteTask = async (req, res) => {
    try {
        const { data: existing } = await supabase
            .from('tasks')
            .select('is_baseline_locked')
            .eq('id', req.params.id)
            .single();

        if (existing && existing.is_baseline_locked) {
            return res.status(403).json({ success: false, message: 'Cannot delete a baseline-locked task.' });
        }

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', req.params.id);

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Task deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/projects/:projectId/tasks/import
 * Bulk import tasks from Excel. Requires Project Manager or Planner role.
 */
const bulkImportTasks = async (req, res) => {
    const { projectId } = req.params;
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ success: false, message: 'tasks array is required.' });
    }

    try {
        const rows = tasks.map(t => ({
            project_id:    parseInt(projectId),
            wbs_code:      t.wbs_code || null,
            task_name:     t.task_name,
            planned_start: t.planned_start || null,
            planned_end:   t.planned_end || null,
            planned_cost:  parseFloat(t.planned_cost) || 0,
            planned_hours: parseFloat(t.planned_hours) || 0,
            weight:        parseFloat(t.weight) || 0,
            predecessors:  t.predecessors || [],
            actual_cost:   0,
            actual_hours:  0,
            pct_complete:  0,
        }));

        const { data, error } = await supabase
            .from('tasks')
            .insert(rows)
            .select();

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, imported: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/projects/:projectId/tasks/baseline
 * Locks the current plan as a baseline. Requires Project Manager role.
 */
const lockBaseline = async (req, res) => {
    const { projectId } = req.params;
    const { baseline_name } = req.body;

    try {
        const { data: tasks, error: taskErr } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId);

        if (taskErr) return res.status(500).json({ success: false, message: taskErr.message });
        if (!tasks || tasks.length === 0) {
            return res.status(400).json({ success: false, message: 'No tasks to lock. Add tasks before locking baseline.' });
        }

        // Save snapshot to baselines table
        const { error: baselineErr } = await supabase
            .from('baselines')
            .insert([{
                project_id:    parseInt(projectId),
                baseline_name: baseline_name || 'Baseline Rev.0',
                locked_by:     req.user.username,
                snapshot:      tasks,
            }]);

        if (baselineErr) return res.status(500).json({ success: false, message: baselineErr.message });

        // Mark all tasks as locked
        await supabase
            .from('tasks')
            .update({ is_baseline_locked: true, updated_at: new Date().toISOString() })
            .eq('project_id', projectId);

        // Update project status to active
        await supabase
            .from('projects')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', projectId);

        res.json({ success: true, message: 'Baseline locked successfully.', task_count: tasks.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getTasksByProject, createTask, updateTask, deleteTask,
    bulkImportTasks, lockBaseline
};