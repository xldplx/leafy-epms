const supabase = require('../config/db');

const getDailyActuals = async (req, res) => {
    const { projectId } = req.params;
    const { date } = req.query;
    try {
        let query = supabase.from('daily_actuals')
            .select('*, tasks(task_name, wbs_code)')
            .eq('project_id', projectId)
            .order('entry_date', { ascending: false });
        if (date) query = query.eq('entry_date', date);
        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const submitDailyActuals = async (req, res) => {
    const { projectId } = req.params;
    const { entry_date, entries } = req.body;
    if (!entry_date || !Array.isArray(entries) || entries.length === 0)
        return res.status(400).json({ success: false, message: 'entry_date and entries[] are required.' });
    try {
        const rows = entries.filter(e => e.task_id).map(e => ({
            project_id:   parseInt(projectId),
            task_id:      e.task_id,
            entry_date,
            actual_hours: parseFloat(e.actual_hours) || 0,
            actual_cost:  parseFloat(e.actual_cost)  || 0,
            pct_complete: parseFloat(e.pct_complete) || 0,
            photo_url:    e.photo_url || null,
            submitted_by: req.user.username,
        }));
        const { data, error } = await supabase.from('daily_actuals').insert(rows).select();
        if (error) return res.status(500).json({ success: false, message: error.message });

        // Update cumulative actuals on each task
        for (const e of entries.filter(e => e.task_id)) {
            const { data: task } = await supabase.from('tasks').select('actual_cost,actual_hours,pct_complete').eq('id', e.task_id).single();
            if (task) {
                await supabase.from('tasks').update({
                    actual_cost:  (parseFloat(task.actual_cost)  || 0) + (parseFloat(e.actual_cost)  || 0),
                    actual_hours: (parseFloat(task.actual_hours) || 0) + (parseFloat(e.actual_hours) || 0),
                    pct_complete: Math.min(Math.max(parseFloat(task.pct_complete) || 0, parseFloat(e.pct_complete) || 0), 100),
                    updated_at:   new Date().toISOString(),
                }).eq('id', e.task_id);
            }
        }
        res.status(201).json({ success: true, submitted: data.length, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getDailyActuals, submitDailyActuals };