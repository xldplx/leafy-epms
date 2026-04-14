const supabase = require('../config/db');

const getWbsByProject = async (req, res) => {
    const { data, error } = await supabase
        .from('wbs').select('*').eq('project_id', req.params.projectId).order('wbs_code');
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data });
};

const createWbsNode = async (req, res) => {
    const { parent_id, wbs_code, name, level } = req.body;
    if (!wbs_code || !name) return res.status(400).json({ success: false, message: 'wbs_code and name required.' });
    const { data, error } = await supabase.from('wbs').insert([{
        project_id: parseInt(req.params.projectId),
        parent_id:  parent_id || null,
        wbs_code, name,
        level:      level || 1,
    }]).select().single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.status(201).json({ success: true, data });
};

const deleteWbsNode = async (req, res) => {
    const { error } = await supabase.from('wbs').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'WBS node deleted.' });
};

module.exports = { getWbsByProject, createWbsNode, deleteWbsNode };