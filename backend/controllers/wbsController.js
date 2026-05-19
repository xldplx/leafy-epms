const supabase = require('../config/db');

const getWbsByProject = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('wbs').select('*')
            .eq('project_id', req.params.projectId)
            .order('wbs_code');
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const createWbsNode = async (req, res) => {
    const { parent_id, wbs_code, name, level } = req.body;
    if (!wbs_code || !name)
        return res.status(400).json({ success: false, message: 'wbs_code and name are required.' });
    try {
        const { data, error } = await supabase.from('wbs').insert([{
            project_id: parseInt(req.params.projectId),
            parent_id:  parent_id || null,
            wbs_code, name,
            level: level || 1,
        }]).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── UPDATE WBS node name (rename) ─────────────────────────────────────────────
const updateWbsNode = async (req, res) => {
    const { name, wbs_code } = req.body;
    if (!name && !wbs_code)
        return res.status(400).json({ success: false, message: 'name or wbs_code is required.' });
    const updates = {};
    if (name)     updates.name     = name.trim();
    if (wbs_code) updates.wbs_code = wbs_code.trim();
    try {
        const { data, error } = await supabase
            .from('wbs').update(updates)
            .eq('id', req.params.id)
            .eq('project_id', req.params.projectId)
            .select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data) return res.status(404).json({ success: false, message: 'WBS node not found.' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteWbsNode = async (req, res) => {
    try {
        const { data: linked } = await supabase.from('tasks').select('id').eq('wbs_id', req.params.id).limit(1);
        if (linked && linked.length > 0)
            return res.status(409).json({ success: false, message: 'Cannot delete — tasks are assigned to this WBS node.' });
        const { error } = await supabase.from('wbs').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'WBS node deleted.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getWbsByProject, createWbsNode, updateWbsNode, deleteWbsNode };