const supabase = require('../config/db');

/**
 * GET /api/projects/:projectId/daily-actuals
 * Returns daily actuals for a project, optionally filtered by date.
 */
const getDailyActuals = async (req, res) => {
    const { projectId } = req.params;
    const { date } = req.query;

    try {
        let query = supabase
            .from('daily_actuals')
            .select('*, tasks(task_name, wbs_code)')
            .eq('project_id', projectId)
            .order('entry_date', { ascending: false });

        if (date) query = query.eq('entry_date', date);

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/projects/:projectId/daily-actuals
 * Submits daily actuals for multiple tasks and updates cumulative task values.
 * Requires Project Manager or Site Engineer role.
 */
const submitDailyActuals = async (req, res) => {
    const { projectId } = req.params;
    const { entry_date, entries } = req.body;

    if (!entry_date || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ success: false, message: 'entry_date and entries[] are required.' });
    }

    const validEntries = entries.filter(e => e.task_id);
    if (validEntries.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one entry must have a valid task_id.' });
    }

    try {
        // Insert daily actual records
        const rows = validEntries.map(e => ({
            project_id:   parseInt(projectId),
            task_id:      e.task_id,
            entry_date,
            actual_hours: parseFloat(e.actual_hours) || 0,
            actual_cost:  parseFloat(e.actual_cost)  || 0,
            pct_complete: parseFloat(e.pct_complete) || 0,
            submitted_by: req.user.username,
        }));

        const { data, error } = await supabase
            .from('daily_actuals')
            .insert(rows)
            .select();

        if (error) return res.status(500).json({ success: false, message: error.message });

        // Update cumulative actuals on each task
        for (const e of validEntries) {
            const { data: task } = await supabase
                .from('tasks')
                .select('actual_cost, actual_hours, pct_complete')
                .eq('id', e.task_id)
                .single();

            if (task) {
                const newActualCost  = (parseFloat(task.actual_cost)  || 0) + (parseFloat(e.actual_cost)  || 0);
                const newActualHours = (parseFloat(task.actual_hours) || 0) + (parseFloat(e.actual_hours) || 0);
                // pct_complete is always the latest value submitted (max to avoid regression)
                const newPct = Math.max(parseFloat(task.pct_complete) || 0, parseFloat(e.pct_complete) || 0);

                await supabase
                    .from('tasks')
                    .update({
                        actual_cost:  newActualCost,
                        actual_hours: newActualHours,
                        pct_complete: Math.min(newPct, 100),
                        updated_at:   new Date().toISOString(),
                    })
                    .eq('id', e.task_id);
            }
        }

        res.status(201).json({
            success: true,
            submitted: data.length,
            data,
            message: `${data.length} daily actuals submitted and task values updated.`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getDailyActuals, submitDailyActuals };