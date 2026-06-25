/**
 * consumablesController.js
 * CRUD untuk tabel public.consumables + public.consumable_logs
 *
 * Kolom consumables:
 *   id, name, category, unit, current_stock, reorder_threshold,
 *   last_used_at, updated_at, created_at
 *
 * Kolom consumable_logs:
 *   id, item_id, project_id, qty, date, note, submitted_by, created_at
 *
 * Routes (sesuai Consumables.jsx & server.js):
 *   GET    /api/consumables                       → getAllConsumables
 *   POST   /api/consumables                       → createConsumable
 *   PUT    /api/consumables/:id                   → updateConsumable
 *   DELETE /api/consumables/:id                   → deleteConsumable
 *   GET    /api/consumable-logs?project_id=:id    → getLogs
 *   POST   /api/consumable-logs                   → logConsumption
 */

const supabase       = require('../config/db');
const { writeAudit } = require('./auditController');

// ── GET /api/consumables ──────────────────────────────────────────────────────
const getAllConsumables = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('consumables')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── POST /api/consumables ─────────────────────────────────────────────────────
const createConsumable = async (req, res) => {
    const { name, category, unit, current_stock, reorder_threshold } = req.body;

    if (!name || !String(name).trim())
        return res.status(400).json({ success: false, message: 'name is required.' });

    const stock     = parseFloat(current_stock);
    const threshold = parseFloat(reorder_threshold);

    if (isNaN(stock) || stock < 0)
        return res.status(400).json({ success: false, message: 'current_stock must be >= 0.' });
    if (isNaN(threshold) || threshold < 0)
        return res.status(400).json({ success: false, message: 'reorder_threshold must be >= 0.' });

    try {
        const { data, error } = await supabase
            .from('consumables')
            .insert([{
                name:              String(name).trim(),
                category:          category  || 'Other',
                unit:              unit      || 'pcs',
                current_stock:     stock,
                reorder_threshold: threshold,
            }])
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        await writeAudit(req, 'CREATE', 'consumable', data.id, { name: data.name });
        res.status(201).json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PUT /api/consumables/:id ──────────────────────────────────────────────────
const updateConsumable = async (req, res) => {
    const { id } = req.params;
    const { name, category, unit, current_stock, reorder_threshold } = req.body;

    if (!name || !String(name).trim())
        return res.status(400).json({ success: false, message: 'name is required.' });

    try {
        const updates = {
            name:       String(name).trim(),
            category:   category || 'Other',
            unit:       unit     || 'pcs',
            updated_at: new Date().toISOString(),
        };

        if (current_stock     != null) updates.current_stock     = parseFloat(current_stock);
        if (reorder_threshold != null) updates.reorder_threshold = parseFloat(reorder_threshold);

        const { data, error } = await supabase
            .from('consumables')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Consumable not found.' });

        await writeAudit(req, 'UPDATE', 'consumable', id, { name: data.name });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── DELETE /api/consumables/:id ───────────────────────────────────────────────
const deleteConsumable = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: existing } = await supabase
            .from('consumables')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('consumables')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ success: false, message: error.message });

        await writeAudit(req, 'DELETE', 'consumable', id, { name: existing?.name });
        res.json({ success: true, message: 'Consumable deleted.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── GET /api/consumable-logs?project_id=:id ───────────────────────────────────
const getLogs = async (req, res) => {
    try {
        let query = supabase
            .from('consumable_logs')
            // join ke consumables untuk dapat name & unit (dipakai di Consumables.jsx tabel history)
            .select('*, consumables(name, unit, category)')
            .order('created_at', { ascending: false });

        if (req.query.project_id) query = query.eq('project_id', parseInt(req.query.project_id));
        if (req.query.item_id)    query = query.eq('item_id',    parseInt(req.query.item_id));

        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── POST /api/consumable-logs ─────────────────────────────────────────────────
// Body: { item_id, project_id, qty, date, note }
// Setelah insert log → kurangi current_stock item secara otomatis
const logConsumption = async (req, res) => {
    const { item_id, project_id, qty, date, note } = req.body;

    if (!item_id)    return res.status(400).json({ success: false, message: 'item_id is required.' });
    if (!project_id) return res.status(400).json({ success: false, message: 'project_id is required.' });

    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0)
        return res.status(400).json({ success: false, message: 'qty must be > 0.' });

    try {
        // 1. Cek item ada dan cukup stok
        const { data: item, error: itemErr } = await supabase
            .from('consumables')
            .select('id, name, current_stock, unit')
            .eq('id', parseInt(item_id))
            .single();

        if (itemErr || !item)
            return res.status(404).json({ success: false, message: 'Consumable item not found.' });

        const currentStock = parseFloat(item.current_stock);
        if (qtyNum > currentStock)
            return res.status(409).json({
                success: false,
                message: `Insufficient stock. Only ${currentStock} ${item.unit} available.`,
            });

        // 2. Insert log
        const { data: logData, error: logErr } = await supabase
            .from('consumable_logs')
            .insert([{
                item_id:      parseInt(item_id),
                project_id:   parseInt(project_id),
                qty:          qtyNum,
                date:         date || new Date().toISOString().slice(0, 10),
                note:         note ? String(note).trim() : null,
                submitted_by: req.user?.username || 'system',
            }])
            .select()
            .single();

        if (logErr) return res.status(500).json({ success: false, message: logErr.message });

        // 3. Kurangi current_stock dan update last_used_at.
        // NOTE: not atomic — concurrent logs for the same item can lose updates.
        // A true fix needs a Postgres RPC (current_stock = current_stock - qty).
        // Here we at least check the error and compensate by deleting the log, so
        // we never report success with the stock left un-decremented.
        const newStock = Math.max(0, currentStock - qtyNum);
        const { error: decErr } = await supabase
            .from('consumables')
            .update({
                current_stock: newStock,
                last_used_at:  date || new Date().toISOString().slice(0, 10),
                updated_at:    new Date().toISOString(),
            })
            .eq('id', parseInt(item_id));

        if (decErr) {
            // Compensate: remove the orphan log so the ledger and stock stay consistent.
            await supabase.from('consumable_logs').delete().eq('id', logData.id);
            return res.status(500).json({ success: false, message: decErr.message });
        }

        await writeAudit(req, 'CREATE', 'consumable_log', logData.id, {
            item_id,
            item_name: item.name,
            project_id,
            qty: qtyNum,
        });

        res.status(201).json({ success: true, data: logData });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = {
    getAllConsumables,
    createConsumable,
    updateConsumable,
    deleteConsumable,
    getLogs,
    logConsumption,
};