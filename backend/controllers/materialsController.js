/**
 * materialsController.js
 * CRUD untuk tabel public.materials
 *
 * Kolom tabel:
 *   id, name, unit, quantity, planned_qty, actual_qty,
 *   unit_cost, status, spec, category, project_id,
 *   created_at, updated_at
 *
 * Routes yang dipakai frontend (Materials.jsx):
 *   GET    /api/materials?project_id=:id   → getAllMaterials
 *   POST   /api/materials                  → createMaterial
 *   PUT    /api/materials/:id              → updateMaterial
 *   DELETE /api/materials/:id              → deleteMaterial
 */

const supabase   = require('../config/db');
const { writeAudit } = require('./auditController');

// ── GET /api/materials?project_id=:id ─────────────────────────────────────────
const getAllMaterials = async (req, res) => {
    try {
        let query = supabase
            .from('materials')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.project_id) {
            query = query.eq('project_id', parseInt(req.query.project_id));
        }

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── POST /api/materials ───────────────────────────────────────────────────────
const createMaterial = async (req, res) => {
    const {
        name, unit, quantity, planned_qty, actual_qty,
        unit_cost, status, spec, project_id, category,
    } = req.body;

    if (!name || !String(name).trim())
        return res.status(400).json({ success: false, message: 'name is required.' });
    if (!project_id)
        return res.status(400).json({ success: false, message: 'project_id is required.' });

    try {
        const { data, error } = await supabase
            .from('materials')
            .insert([{
                name:        String(name).trim(),
                unit:        unit        || null,
                quantity:    quantity    != null ? parseFloat(quantity)    : 0,
                planned_qty: planned_qty != null ? parseFloat(planned_qty) : 0,
                actual_qty:  actual_qty  != null ? parseFloat(actual_qty)  : 0,
                unit_cost:   unit_cost   != null ? parseFloat(unit_cost)   : 0,
                status:      status      || 'on_track',
                spec:        spec        || null,
                category:    category    || null,
                project_id:  parseInt(project_id),
            }])
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        await writeAudit(req, 'CREATE', 'material', data.id, { name: data.name, project_id });
        res.status(201).json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PUT /api/materials/:id ────────────────────────────────────────────────────
const updateMaterial = async (req, res) => {
    const { id } = req.params;
    const {
        name, unit, quantity, planned_qty, actual_qty,
        unit_cost, status, spec, project_id, category,
    } = req.body;

    if (!name || !String(name).trim())
        return res.status(400).json({ success: false, message: 'name is required.' });

    try {
        const updates = {
            name:       String(name).trim(),
            unit:       unit     || null,
            status:     status   || 'on_track',
            spec:       spec     || null,
            category:   category || null,
            updated_at: new Date().toISOString(),
        };

        if (quantity    != null) updates.quantity    = parseFloat(quantity);
        if (planned_qty != null) updates.planned_qty = parseFloat(planned_qty);
        if (actual_qty  != null) updates.actual_qty  = parseFloat(actual_qty);
        if (unit_cost   != null) updates.unit_cost   = parseFloat(unit_cost);
        if (project_id  != null) updates.project_id  = parseInt(project_id);

        const { data, error } = await supabase
            .from('materials')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Material not found.' });

        await writeAudit(req, 'UPDATE', 'material', id, { name: data.name });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── DELETE /api/materials/:id ─────────────────────────────────────────────────
const deleteMaterial = async (req, res) => {
    const { id } = req.params;
    try {
        // Ambil nama dulu untuk keperluan audit log
        const { data: existing } = await supabase
            .from('materials')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('materials')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ success: false, message: error.message });

        await writeAudit(req, 'DELETE', 'material', id, { name: existing?.name });
        res.json({ success: true, message: 'Material deleted.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = { getAllMaterials, createMaterial, updateMaterial, deleteMaterial };
