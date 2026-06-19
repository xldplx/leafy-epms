const supabase = require('../config/db');

const VALID_CONDITIONS = ['good', 'fair', 'needs_repair'];
const SELECT_COLS = 'id, name, category, condition, assigned_to, checkout_date, return_date, created_at, updated_at';

// Helper: derive status from fields
const deriveStatus = (row) => {
    if (row.condition === 'needs_repair') return 'Needs Repair';
    if (row.assigned_to && !row.return_date) return 'Checked Out';
    return 'Available';
};

// GET /api/tools
const getAllTools = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tools')
            .select(SELECT_COLS)
            .order('created_at', { ascending: false });
        if (error) return res.status(500).json({ success: false, message: error.message });

        const enriched = (data || []).map(t => ({ ...t, status: deriveStatus(t) }));
        res.json({ success: true, data: enriched });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/tools — add new tool
const createTool = async (req, res) => {
    const { name, category, condition } = req.body;
    if (!name?.trim())
        return res.status(400).json({ success: false, message: 'Name is required.' });
    if (condition && !VALID_CONDITIONS.includes(condition))
        return res.status(400).json({ success: false, message: `condition must be one of: ${VALID_CONDITIONS.join(', ')}.` });

    try {
        const { data, error } = await supabase.from('tools').insert([{
            name:      name.trim(),
            category:  category?.trim() || null,
            condition: condition || 'good',
            assigned_to:   null,
            checkout_date: null,
            return_date:   null,
        }]).select(SELECT_COLS).single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data: { ...data, status: deriveStatus(data) } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/tools/:id — edit tool (name, category, condition)
const updateTool = async (req, res) => {
    const updates = {};
    if (req.body.name !== undefined) {
        if (!req.body.name.trim()) return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
        updates.name = req.body.name.trim();
    }
    if (req.body.category !== undefined) updates.category  = req.body.category?.trim() || null;
    if (req.body.condition !== undefined) {
        if (!VALID_CONDITIONS.includes(req.body.condition))
            return res.status(400).json({ success: false, message: `condition must be one of: ${VALID_CONDITIONS.join(', ')}.` });
        updates.condition = req.body.condition;
    }
    if (Object.keys(updates).length === 0)
        return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase.from('tools')
            .update(updates).eq('id', req.params.id).select(SELECT_COLS).single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Tool not found.' });
        res.json({ success: true, data: { ...data, status: deriveStatus(data) } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/tools/:id
const deleteTool = async (req, res) => {
    try {
        const { error } = await supabase.from('tools').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Tool deleted.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /api/tools/:id/checkout — check out tool
const checkoutTool = async (req, res) => {
    const { assigned_to, checkout_date } = req.body;
    if (!assigned_to?.trim())
        return res.status(400).json({ success: false, message: 'assigned_to is required.' });
    if (!checkout_date)
        return res.status(400).json({ success: false, message: 'checkout_date is required.' });

    try {
        // Cek tool tidak sedang dipinjam
        const { data: existing } = await supabase.from('tools')
            .select('assigned_to, condition').eq('id', req.params.id).single();
        if (!existing) return res.status(404).json({ success: false, message: 'Tool not found.' });
        if (existing.condition === 'needs_repair')
            return res.status(400).json({ success: false, message: 'Tool is under repair and cannot be checked out.' });
        if (existing.assigned_to)
            return res.status(400).json({ success: false, message: 'Tool is already checked out.' });

        const { data, error } = await supabase.from('tools')
            .update({ assigned_to: assigned_to.trim(), checkout_date, return_date: null, updated_at: new Date().toISOString() })
            .eq('id', req.params.id).select(SELECT_COLS).single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: { ...data, status: deriveStatus(data) } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /api/tools/:id/return — return tool
const returnTool = async (req, res) => {
    const returnDate = req.body.return_date || new Date().toISOString().slice(0, 10);
    try {
        const { data: existing } = await supabase.from('tools')
            .select('assigned_to').eq('id', req.params.id).single();
        if (!existing) return res.status(404).json({ success: false, message: 'Tool not found.' });
        if (!existing.assigned_to)
            return res.status(400).json({ success: false, message: 'Tool is not currently checked out.' });

        const { data, error } = await supabase.from('tools')
            .update({ assigned_to: null, return_date: returnDate, updated_at: new Date().toISOString() })
            .eq('id', req.params.id).select(SELECT_COLS).single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: { ...data, status: deriveStatus(data) } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAllTools, createTool, updateTool, deleteTool, checkoutTool, returnTool };