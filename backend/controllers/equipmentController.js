/**
 * equipmentController.js
 * CRUD untuk tabel public.equipment
 *
 * Kolom tabel:
 *   id, name, type, operator, location, status, last_service,
 *   utilization, planned_utilization, actual_utilization,
 *   project_id, created_at, updated_at
 *
 * Status yang valid (sesuai Equipment.jsx):
 *   available | in_use | maintenance | out_of_service
 *
 * Routes:
 *   GET    /api/equipment?project_id=:id  → getAllEquipment
 *   POST   /api/equipment                 → createEquipment
 *   PUT    /api/equipment/:id             → updateEquipment
 *   DELETE /api/equipment/:id             → deleteEquipment
 */

const supabase       = require('../config/db');
const { writeAudit } = require('./auditController');

// ── GET /api/equipment?project_id=:id ─────────────────────────────────────────
const getAllEquipment = async (req, res) => {
    try {
        let query = supabase
            .from('equipment')
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

// ── POST /api/equipment ───────────────────────────────────────────────────────
const createEquipment = async (req, res) => {
    const {
        name, type, operator, location, status, last_service,
        utilization, planned_utilization, actual_utilization, project_id,
    } = req.body;

    if (!name || !String(name).trim())
        return res.status(400).json({ success: false, message: 'name is required.' });

    try {
        const { data, error } = await supabase
            .from('equipment')
            .insert([{
                name:                String(name).trim(),
                type:                type        || null,
                operator:            operator    || null,
                location:            location    || null,
                status:              status      || 'available',
                last_service:        last_service || null,
                utilization:         utilization         != null ? parseFloat(utilization)         : 0,
                planned_utilization: planned_utilization != null ? parseFloat(planned_utilization) : 0,
                actual_utilization:  actual_utilization  != null ? parseFloat(actual_utilization)  : 0,
                project_id:          project_id != null ? parseInt(project_id) : null,
            }])
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        await writeAudit(req, 'CREATE', 'equipment', data.id, { name: data.name, project_id });
        res.status(201).json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PUT /api/equipment/:id ────────────────────────────────────────────────────
const updateEquipment = async (req, res) => {
    const { id } = req.params;
    const {
        name, type, operator, location, status, last_service,
        utilization, planned_utilization, actual_utilization, project_id,
    } = req.body;

    if (!name || !String(name).trim())
        return res.status(400).json({ success: false, message: 'name is required.' });

    try {
        const updates = {
            name:         String(name).trim(),
            type:         type     || null,
            operator:     operator || null,
            location:     location || null,
            status:       status   || 'available',
            last_service: last_service || null,
            updated_at:   new Date().toISOString(),
        };

        if (utilization         != null) updates.utilization         = parseFloat(utilization);
        if (planned_utilization != null) updates.planned_utilization = parseFloat(planned_utilization);
        if (actual_utilization  != null) updates.actual_utilization  = parseFloat(actual_utilization);
        if (project_id          != null) updates.project_id          = parseInt(project_id);

        const { data, error } = await supabase
            .from('equipment')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Equipment not found.' });

        await writeAudit(req, 'UPDATE', 'equipment', id, { name: data.name });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── DELETE /api/equipment/:id ─────────────────────────────────────────────────
const deleteEquipment = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: existing } = await supabase
            .from('equipment')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('equipment')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ success: false, message: error.message });

        await writeAudit(req, 'DELETE', 'equipment', id, { name: existing?.name });
        res.json({ success: true, message: 'Equipment deleted.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = { getAllEquipment, createEquipment, updateEquipment, deleteEquipment };