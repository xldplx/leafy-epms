const supabase = require('../config/db');

/**
 * GET /api/personnel
 * Returns all personnel, optionally filtered by project_id.
 */
const getAllPersonnel = async (req, res) => {
    try {
        let query = supabase
            .from('personnel')
            .select('*, projects(project_name, project_code)')
            .order('full_name');

        if (req.query.project_id) {
            query = query.eq('project_id', req.query.project_id);
        }

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/personnel/:id
 * Returns a single personnel record.
 */
const getPersonnelById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('personnel')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) return res.status(404).json({ success: false, message: 'Personnel not found.' });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/personnel
 * Creates a new personnel record.
 * Requires Project Manager, Planner, or Site Engineer role.
 */
const createPersonnel = async (req, res) => {
    const { employee_id, full_name, designation, zone, project_id } = req.body;

    if (!employee_id || !full_name) {
        return res.status(400).json({ success: false, message: 'employee_id and full_name are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('personnel')
            .insert([{
                employee_id,
                full_name,
                designation: designation || null,
                zone:        zone || null,
                project_id:  project_id || null,
                status:      'active',
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ success: false, message: 'Employee ID already exists.' });
            }
            return res.status(500).json({ success: false, message: error.message });
        }

        res.status(201).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * PUT /api/personnel/:id
 * Updates a personnel record.
 */
const updatePersonnel = async (req, res) => {
    const updates = {};
    const fields = ['full_name', 'designation', 'zone', 'status', 'last_checkin', 'project_id'];
    fields.forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('personnel')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * DELETE /api/personnel/:id
 * Deletes a personnel record. Requires Project Manager role.
 */
const deletePersonnel = async (req, res) => {
    try {
        const { error } = await supabase
            .from('personnel')
            .delete()
            .eq('id', req.params.id);

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Personnel deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllPersonnel, getPersonnelById, createPersonnel, updatePersonnel, deletePersonnel };