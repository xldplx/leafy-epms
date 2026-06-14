const supabase = require('../config/db');

const VALID_CATEGORIES = ['Fuel', 'Lubricant', 'Welding', 'Cleaning', 'Other'];
const VALID_UNITS      = ['L', 'kg', 'pcs'];

// GET /api/consumables — semua item (tidak per-project, stok adalah global)
const getAllConsumables = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('consumables')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/consumables — tambah item baru
const createConsumable = async (req, res) => {
    const { name, category, unit, current_stock, reorder_threshold } = req.body;
    if (!name?.trim())
        return res.status(400).json({ success: false, message: 'Name is required.' });
    try {
        const { data, error } = await supabase.from('consumables').insert([{
            name:              name.trim(),
            category:          category || 'Other',
            unit:              unit     || 'pcs',
            current_stock:     parseFloat(current_stock)     || 0,
            reorder_threshold: parseFloat(reorder_threshold) || 0,
            last_used_at:      null,
        }]).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/consumables/:id
const updateConsumable = async (req, res) => {
    const updates = {};
    ['name','category','unit','current_stock','reorder_threshold','last_used_at']
        .forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();
    try {
        const { data, error } = await supabase.from('consumables')
            .update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Not found.' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/consumables/:id
const deleteConsumable = async (req, res) => {
    try {
        const { error } = await supabase.from('consumables').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Consumable deleted.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/consumable-logs?project_id=X — log konsumsi per project
const getLogs = async (req, res) => {
    const { project_id } = req.query;
    try {
        let query = supabase.from('consumable_logs')
            .select('*, consumables(name, unit)')
            .order('date', { ascending: false })
            .order('id',   { ascending: false })
            .limit(50);
        if (project_id) query = query.eq('project_id', parseInt(project_id));
        const { data, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/consumable-logs — catat konsumsi & kurangi stok
const logConsumption = async (req, res) => {
    const { item_id, project_id, qty, date, note } = req.body;
    if (!item_id || !project_id)
        return res.status(400).json({ success: false, message: 'item_id and project_id are required.' });
    const used = parseFloat(qty);
    if (isNaN(used) || used <= 0)
        return res.status(400).json({ success: false, message: 'qty must be greater than zero.' });
    if (!date)
        return res.status(400).json({ success: false, message: 'date is required.' });
    try {
        // Cek stok cukup
        const { data: item, error: fetchErr } = await supabase
            .from('consumables').select('*').eq('id', item_id).single();
        if (fetchErr || !item)
            return res.status(404).json({ success: false, message: 'Consumable not found.' });
        if (parseFloat(item.current_stock) < used)
            return res.status(400).json({ success: false, message: `Only ${item.current_stock} ${item.unit} in stock.` });

        // Kurangi stok
        const newStock = parseFloat(item.current_stock) - used;
        await supabase.from('consumables').update({
            current_stock: newStock,
            last_used_at:  date,
            updated_at:    new Date().toISOString(),
        }).eq('id', item_id);

        // Simpan log
        const { data: log, error: logErr } = await supabase.from('consumable_logs').insert([{
            item_id:      parseInt(item_id),
            project_id:   parseInt(project_id),
            qty:          used,
            date,
            note:         note?.trim() || null,
            submitted_by: req.user.username,
        }]).select().single();
        if (logErr) return res.status(500).json({ success: false, message: logErr.message });

        res.status(201).json({ success: true, data: log, new_stock: newStock });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAllConsumables, createConsumable, updateConsumable, deleteConsumable, getLogs, logConsumption };