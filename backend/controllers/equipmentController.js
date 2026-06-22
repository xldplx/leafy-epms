
const supabase = require('../config/db');

// GET /api/equipment?project_id=X
const getAllEquipment = async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = supabase.from('equipment').select('*');
        if (project_id) {
            query = query.eq('project_id', parseInt(project_id));
        }
        const { data, error } = await query;
        
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/equipment
const createEquipment = async (req, res) => {
    const { project_id, name, type, operator, location, status, last_service, utilization, planned_utilization, actual_utilization } = req.body;
    if (!project_id) return res.status(400).json({ success: false, message: 'project_id is required.' });
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'name is required.' });

    try {
        const { data, error } = await supabase.from('equipment').insert([{
            project_id: parseInt(project_id),
            name: name.trim(),
            type: type?.trim() || null,
            operator: operator?.trim() || null,
            location: location?.trim() || null,
            status: status || 'available',
            last_service: last_service || null,
            utilization: parseFloat(utilization) || 0,
            planned_utilization: parseFloat(planned_utilization) || 0,
            actual_utilization: parseFloat(actual_utilization) || 0
        }]).select().single();
        
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/equipment/:id
const updateEquipment = async (req, res) => {
    const { id } = req.params;
    const updates = {};
    if (req.body.name !== undefined) {
        if (!req.body.name.trim()) return res.status(400).json({ success: false, message: 'name cannot be empty.' });
        updates.name = req.body.name.trim();
    }
    if (req.body.type !== undefined) updates.type = req.body.type?.trim() || null;
    if (req.body.operator !== undefined) updates.operator = req.body.operator?.trim() || null;
    if (req.body.location !== undefined) updates.location = req.body.location?.trim() || null;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.last_service !== undefined) updates.last_service = req.body.last_service;
    if (req.body.utilization !== undefined) updates.utilization = parseFloat(req.body.utilization) || 0;
    if (req.body.planned_utilization !== undefined) updates.planned_utilization = parseFloat(req.body.planned_utilization) || 0;
    if (req.body.actual_utilization !== undefined) updates.actual_utilization = parseFloat(req.body.actual_utilization) || 0;

    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: 'No valid fields to update.' });

    try {
        const { data, error } = await supabase.from('equipment')
            .update(updates)
            .eq('id', parseInt(id))
            .select().single();
        
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Equipment not found.' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/equipment/:id
const deleteEquipment = async (req, res) => {
    try {
        const { error } = await supabase.from('equipment').delete().eq('id', parseInt(req.params.id));
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Equipment deleted successfully.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
    getAllEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment
};
