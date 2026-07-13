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

// ── GET /api/materials/receipts?project_id=&material_id= ─────────────────────
const getReceipts = async (req, res) => {
    try {
        let query = supabase
            .from('material_receipts')
            .select('*, materials(id, name, unit)')
            .order('date', { ascending: false });

        if (req.query.project_id)  query = query.eq('project_id',  parseInt(req.query.project_id));
        if (req.query.material_id) query = query.eq('material_id', parseInt(req.query.material_id));
        if (req.query.verified !== undefined)
            query = query.eq('verified', req.query.verified === 'true');

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── POST /api/materials/receipts ──────────────────────────────────────────────
const createReceipt = async (req, res) => {
    const { material_id, project_id, date, qty, unit, supplier, doc_no } = req.body;

    if (!material_id)
        return res.status(400).json({ success: false, message: 'material_id is required.' });
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0)
        return res.status(400).json({ success: false, message: 'qty must be > 0.' });

    try {
        const { data, error } = await supabase
            .from('material_receipts')
            .insert([{
                material_id: parseInt(material_id),
                project_id:  project_id ? parseInt(project_id) : null,
                date:        date || new Date().toISOString().slice(0, 10),
                qty:         qtyNum,
                unit:        unit     || null,
                supplier:    supplier || null,
                doc_no:      doc_no   || null,
                verified:    false,
            }])
            .select('*')
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        await writeAudit(req, 'CREATE', 'material', data.id, { receipt: true, material_id, qty: qtyNum });
        res.status(201).json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PUT /api/materials/receipts/:id ───────────────────────────────────────────
// Dipakai frontend untuk verifikasi receipt: body { verified: true }.
// Saat receipt diverifikasi, actual_qty material ikut ditambah qty receipt.
const verifyReceipt = async (req, res) => {
    const { id } = req.params;
    const verified = req.body.verified === true;

    try {
        const { data: receipt, error: findErr } = await supabase
            .from('material_receipts')
            .select('*')
            .eq('id', id)
            .single();

        if (findErr || !receipt)
            return res.status(404).json({ success: false, message: 'Receipt not found.' });
        if (verified && receipt.verified)
            return res.status(409).json({ success: false, message: 'Receipt already verified.' });

        const { data, error } = await supabase
            .from('material_receipts')
            .update({ verified })
            .eq('id', id)
            .select('*')
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        // Tambahkan qty ke actual_qty material saat diverifikasi
        if (verified && receipt.material_id) {
            const { data: mat } = await supabase
                .from('materials')
                .select('actual_qty')
                .eq('id', receipt.material_id)
                .single();

            if (mat) {
                await supabase
                    .from('materials')
                    .update({
                        actual_qty: (parseFloat(mat.actual_qty) || 0) + (parseFloat(receipt.qty) || 0),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', receipt.material_id);
            }
        }

        await writeAudit(req, 'UPDATE', 'material', id, { receipt: true, verified });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = {
    getAllMaterials, createMaterial, updateMaterial, deleteMaterial,
    getReceipts, createReceipt, verifyReceipt,
};