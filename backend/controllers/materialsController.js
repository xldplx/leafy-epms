
const supabase = require('../config/db');

// GET /api/materials?project_id=X
const getAllMaterials = async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = supabase.from('materials').select('*');
        if (project_id) {
            query = query.eq('project_id', parseInt(project_id));
        }
        const { data, error } = await query;
        
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/materials
const createMaterial = async (req, res) => {
    const { project_id, name, unit, quantity, planned_qty, actual_qty, unit_cost, status, spec } = req.body;
    if (!project_id) return res.status(400).json({ success: false, message: 'project_id is required.' });
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'name is required.' });

    try {
        const { data, error } = await supabase.from('materials').insert([{
            project_id: parseInt(project_id),
            name: name.trim(),
            unit: unit?.trim() || null,
            quantity: parseFloat(quantity) || 0,
            planned_qty: parseFloat(planned_qty) || 0,
            actual_qty: parseFloat(actual_qty) || 0,
            unit_cost: parseFloat(unit_cost) || 0,
            status: status || 'on_track',
            spec: spec?.trim() || null
        }]).select().single();
        
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/materials/:id
const updateMaterial = async (req, res) => {
    const { id } = req.params;
    const updates = {};
    if (req.body.name !== undefined) {
        if (!req.body.name.trim()) return res.status(400).json({ success: false, message: 'name cannot be empty.' });
        updates.name = req.body.name.trim();
    }
    if (req.body.unit !== undefined) updates.unit = req.body.unit?.trim() || null;
    if (req.body.quantity !== undefined) updates.quantity = parseFloat(req.body.quantity) || 0;
    if (req.body.planned_qty !== undefined) updates.planned_qty = parseFloat(req.body.planned_qty) || 0;
    if (req.body.actual_qty !== undefined) updates.actual_qty = parseFloat(req.body.actual_qty) || 0;
    if (req.body.unit_cost !== undefined) updates.unit_cost = parseFloat(req.body.unit_cost) || 0;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.spec !== undefined) updates.spec = req.body.spec?.trim() || null;

    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: 'No valid fields to update.' });

    try {
        const { data, error } = await supabase.from('materials')
            .update(updates)
            .eq('id', parseInt(id))
            .select().single();
        
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Material not found.' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/materials/:id
const deleteMaterial = async (req, res) => {
    try {
        const { error } = await supabase.from('materials').delete().eq('id', parseInt(req.params.id));
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Material deleted successfully.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
    getAllMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial
};
