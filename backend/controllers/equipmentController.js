const supabase = require('../config/db');

/**
 * GET /api/equipment
 * Returns all equipment, optionally filtered by project_id or status.
 */
const getAllEquipment = async (req, res) => {
    try {
        let query = supabase
            .from('equipment')
            .select('*, projects(project_code, project_name)')
            .order('name');

        if (req.query.project_id) query = query.eq('project_id', req.query.project_id);
        if (req.query.status)     query = query.eq('status', req.query.status);

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });

        // Map project_code for frontend compatibility
        const mapped = (data || []).map(e => ({
            ...e,
            project_code: e.projects?.project_code || '—',
        }));

        res.json({ success: true, data: mapped });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/equipment
 * Creates a new equipment record. Requires Project Manager or Site Engineer.
 */
const createEquipment = async (req, res) => {
    const { name, type, status, capacity, utilized_hours, daily_rate, project_id } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'name is required.' });
    }

    try {
        const { data, error } = await supabase
            .from('equipment')
            .insert([{
                name,
                type:           type || null,
                status:         status || 'available',
                capacity:       capacity || null,
                utilized_hours: parseFloat(utilized_hours) || 0,
                daily_rate:     parseFloat(daily_rate) || 0,
                project_id:     project_id || null,
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
 * PUT /api/equipment/:id
 * Updates an equipment record.
 */
const updateEquipment = async (req, res) => {
    const updates = {};
    const fields = ['name', 'type', 'status', 'capacity', 'utilized_hours', 'daily_rate', 'project_id'];
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('equipment')
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
 * DELETE /api/equipment/:id
 * Deletes an equipment record. Requires Project Manager role.
 */
const deleteEquipment = async (req, res) => {
    try {
        const { error } = await supabase
            .from('equipment')
            .delete()
            .eq('id', req.params.id);

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Equipment deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllEquipment, createEquipment, updateEquipment, deleteEquipment };