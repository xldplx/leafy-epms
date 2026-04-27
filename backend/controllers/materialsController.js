const supabase = require('../config/db');

/**
 * GET /api/materials
 * Returns all materials with optional filtering.
 */
const getAllMaterials = async (req, res) => {
    try {
        let query = supabase
            .from('materials')
            .select('*, projects(project_code, project_name)')
            .order('name');

        if (req.query.project_id) query = query.eq('project_id', req.query.project_id);
        if (req.query.status)     query = query.eq('status', req.query.status);

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/materials
 * Creates a new material record.
 */
const createMaterial = async (req, res) => {
    const { name, spec, unit, planned_qty, actual_qty, unit_cost, status, project_id } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'name is required.' });
    }

    try {
        const { data, error } = await supabase
            .from('materials')
            .insert([{
                name,
                spec:        spec || null,
                unit:        unit || null,
                planned_qty: parseFloat(planned_qty) || 0,
                actual_qty:  parseFloat(actual_qty) || 0,
                unit_cost:   parseFloat(unit_cost) || 0,
                status:      status || 'not_started',
                project_id:  project_id || null,
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
 * PUT /api/materials/:id
 * Updates a material record.
 */
const updateMaterial = async (req, res) => {
    const updates = {};
    const fields = ['name', 'spec', 'unit', 'planned_qty', 'actual_qty', 'unit_cost', 'status', 'project_id'];
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('materials')
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
 * DELETE /api/materials/:id
 */
const deleteMaterial = async (req, res) => {
    try {
        const { error } = await supabase
            .from('materials')
            .delete()
            .eq('id', req.params.id);

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Material deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── MATERIAL RECEIPTS ────────────────────────────────────────────────────────

/**
 * GET /api/materials/receipts
 * Returns all material receipts with material info.
 */
const getAllReceipts = async (req, res) => {
    try {
        let query = supabase
            .from('material_receipts')
            .select('*, materials(name, unit, spec)')
            .order('date', { ascending: false });

        if (req.query.project_id)  query = query.eq('project_id', req.query.project_id);
        if (req.query.material_id) query = query.eq('material_id', req.query.material_id);

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/materials/receipts
 * Records a material delivery receipt and updates actual_qty on the material.
 */
const createReceipt = async (req, res) => {
    const { material_id, project_id, date, qty, unit, supplier, doc_no, verified } = req.body;

    if (!material_id || !date || !qty) {
        return res.status(400).json({ success: false, message: 'material_id, date, and qty are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('material_receipts')
            .insert([{
                material_id: parseInt(material_id),
                project_id:  project_id || null,
                date,
                qty:         parseFloat(qty),
                unit:        unit || null,
                supplier:    supplier || null,
                doc_no:      doc_no || null,
                verified:    verified || false,
            }])
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        // Update actual_qty on the material
        const { data: mat } = await supabase
            .from('materials')
            .select('actual_qty')
            .eq('id', material_id)
            .single();

        if (mat) {
            await supabase
                .from('materials')
                .update({
                    actual_qty:  (parseFloat(mat.actual_qty) || 0) + parseFloat(qty),
                    updated_at:  new Date().toISOString(),
                })
                .eq('id', material_id);
        }

        res.status(201).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * PUT /api/materials/receipts/:id
 * Verifies a receipt.
 */
const verifyReceipt = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('material_receipts')
            .update({ verified: true })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getAllMaterials, createMaterial, updateMaterial, deleteMaterial,
    getAllReceipts, createReceipt, verifyReceipt
};