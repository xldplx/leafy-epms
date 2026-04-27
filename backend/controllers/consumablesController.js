const supabase = require('../config/db');

/**
 * GET /api/consumables
 * Returns all consumables, optionally filtered by project_id.
 */
const getAllConsumables = async (req, res) => {
    try {
        let query = supabase
            .from('consumables')
            .select('*')
            .order('name');

        if (req.query.project_id) query = query.eq('project_id', req.query.project_id);

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/consumables
 * Creates a new consumable record.
 */
const createConsumable = async (req, res) => {
    const { name, unit, supplier, qty_used, qty_on_hand, reorder_threshold, unit_cost, project_id } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'name is required.' });
    }

    try {
        const { data, error } = await supabase
            .from('consumables')
            .insert([{
                name,
                unit:               unit || null,
                supplier:           supplier || null,
                qty_used:           parseFloat(qty_used) || 0,
                qty_on_hand:        parseFloat(qty_on_hand) || 0,
                reorder_threshold:  parseFloat(reorder_threshold) || 0,
                unit_cost:          parseFloat(unit_cost) || 0,
                project_id:         project_id || null,
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
 * PUT /api/consumables/:id
 * Updates a consumable record.
 */
const updateConsumable = async (req, res) => {
    const updates = {};
    const fields = ['name', 'unit', 'supplier', 'qty_used', 'qty_on_hand', 'reorder_threshold', 'unit_cost', 'project_id'];
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('consumables')
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
 * DELETE /api/consumables/:id
 * Deletes a consumable record.
 */
const deleteConsumable = async (req, res) => {
    try {
        const { error } = await supabase
            .from('consumables')
            .delete()
            .eq('id', req.params.id);

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Consumable deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllConsumables, createConsumable, updateConsumable, deleteConsumable };