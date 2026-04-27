const supabase = require('../config/db');

const getAllBudget = async (req, res) => {
    try {
        let query = supabase.from('budget').select('*, projects(project_code, project_name)').order('category');
        if (req.query.project_id) query = query.eq('project_id', req.query.project_id);
        if (req.query.type) query = query.eq('type', req.query.type);
        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const createBudget = async (req, res) => {
    const { project_id, category, type, planned, actual } = req.body;
    if (!project_id || !category || !type) return res.status(400).json({ success: false, message: 'project_id, category, and type are required.' });
    try {
        const { data, error } = await supabase.from('budget').insert([{
            project_id: parseInt(project_id), category, type,
            planned: parseFloat(planned)||0, actual: parseFloat(actual)||0,
        }]).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateBudget = async (req, res) => {
    const updates = {};
    ['category','type','planned','actual'].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();
    try {
        const { data, error } = await supabase.from('budget').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteBudget = async (req, res) => {
    try {
        const { error } = await supabase.from('budget').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Budget item deleted.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAllBudget, createBudget, updateBudget, deleteBudget };