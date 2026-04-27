const supabase = require('../config/db');

const getAllTools = async (req, res) => {
    try {
        let query = supabase.from('tools').select('*, projects(project_code)').order('name');
        if (req.query.project_id) query = query.eq('project_id', req.query.project_id);
        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const createTool = async (req, res) => {
    const { name, category, condition, assigned_to, checkout_date, return_date, project_id } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required.' });
    try {
        const { data, error } = await supabase.from('tools').insert([{
            name, category: category||null, condition: condition||'good',
            assigned_to: assigned_to||null, checkout_date: checkout_date||null,
            return_date: return_date||null, project_id: project_id||null,
        }]).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateTool = async (req, res) => {
    const updates = {};
    ['name','category','condition','assigned_to','checkout_date','return_date','project_id'].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();
    try {
        const { data, error } = await supabase.from('tools').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteTool = async (req, res) => {
    try {
        const { error } = await supabase.from('tools').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Tool deleted.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAllTools, createTool, updateTool, deleteTool };