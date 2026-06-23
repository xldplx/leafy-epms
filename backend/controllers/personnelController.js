const supabase = require('../config/db');

const SELECT_COLS = 'id, employee_id, full_name, designation, zone, email, skill, level, position, status, project_id, created_at';

// GET /api/personnel?project_id=X
const getAllPersonnel = async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = supabase.from('personnel').select(SELECT_COLS).order('full_name');
        if (project_id) query = query.eq('project_id', parseInt(project_id));
        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/personnel
const createPersonnel = async (req, res) => {
    const { employee_id, full_name, designation, zone, email, skill, level, position, status, project_id } = req.body;
    if (!employee_id?.trim()) return res.status(400).json({ success: false, message: 'employee_id is required.' });
    if (!full_name?.trim())   return res.status(400).json({ success: false, message: 'full_name is required.' });
    try {
        const { data, error } = await supabase.from('personnel').insert([{
            employee_id: employee_id.trim(),
            full_name:   full_name.trim(),
            designation: designation?.trim() || null,
            zone:        zone?.trim()        || null,
            email:       email?.trim()       || null,
            skill:       skill?.trim()       || null,
            level:       level?.trim()       || null,
            position:    position?.trim()    || null,
            status:      status              || 'active',
            project_id:  project_id ? parseInt(project_id) : null,
        }]).select(SELECT_COLS).single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/personnel/:id
const updatePersonnel = async (req, res) => {
    const updates = {};
    ['employee_id','full_name','designation','zone','email','skill','level','position','status','project_id']
        .forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (Object.keys(updates).length === 0)
        return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    try {
        const { data, error } = await supabase.from('personnel')
            .update(updates).eq('id', req.params.id).select(SELECT_COLS).single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Personnel not found.' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/personnel/:id
const deletePersonnel = async (req, res) => {
    try {
        const { error } = await supabase.from('personnel').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Personnel deleted.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAllPersonnel, createPersonnel, updatePersonnel, deletePersonnel };