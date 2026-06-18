const supabase = require('../config/db');

const VALID_TYPES = ['CAPEX', 'OPEX'];

// GET /api/budget?project_id=X
const getBudgetByProject = async (req, res) => {
    const { project_id } = req.query;
    if (!project_id)
        return res.status(400).json({ success: false, message: 'project_id is required.' });
    try {
        const { data, error } = await supabase
            .from('budget')
            .select('*')
            .eq('project_id', parseInt(project_id))
            .order('type')
            .order('category');
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/budget
const createBudgetCategory = async (req, res) => {
    const { project_id, category, type, planned } = req.body;
    if (!project_id) return res.status(400).json({ success: false, message: 'project_id is required.' });
    if (!category?.trim()) return res.status(400).json({ success: false, message: 'category is required.' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ success: false, message: 'type must be CAPEX or OPEX.' });
    const plannedNum = parseFloat(planned);
    if (isNaN(plannedNum) || plannedNum < 0) return res.status(400).json({ success: false, message: 'planned must be a non-negative number.' });

    try {
        // Cek duplikat kategori dalam project
        const { data: existing } = await supabase
            .from('budget')
            .select('id')
            .eq('project_id', parseInt(project_id))
            .eq('category', category.trim())
            .maybeSingle();
        if (existing) return res.status(409).json({ success: false, message: `Category "${category.trim()}" already exists in this project.` });

        const { data, error } = await supabase
            .from('budget')
            .insert([{
                project_id: parseInt(project_id),
                category:   category.trim(),
                type,
                planned:    plannedNum,
                actual:     0,
            }])
            .select()
            .single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/budget/:id — update planned / actual / category / type
const updateBudgetCategory = async (req, res) => {
    const updates = {};
    if (req.body.category !== undefined) {
        if (!req.body.category.trim()) return res.status(400).json({ success: false, message: 'category cannot be empty.' });
        updates.category = req.body.category.trim();
    }
    if (req.body.type !== undefined) {
        if (!VALID_TYPES.includes(req.body.type)) return res.status(400).json({ success: false, message: 'type must be CAPEX or OPEX.' });
        updates.type = req.body.type;
    }
    if (req.body.planned !== undefined) {
        const v = parseFloat(req.body.planned);
        if (isNaN(v) || v < 0) return res.status(400).json({ success: false, message: 'planned must be non-negative.' });
        updates.planned = v;
    }
    if (req.body.actual !== undefined) {
        const v = parseFloat(req.body.actual);
        if (isNaN(v) || v < 0) return res.status(400).json({ success: false, message: 'actual must be non-negative.' });
        updates.actual = v;
    }
    if (Object.keys(updates).length === 0)
        return res.status(400).json({ success: false, message: 'No valid fields to update.' });

    updates.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('budget')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Budget category not found.' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/budget/:id
const deleteBudgetCategory = async (req, res) => {
    try {
        const { error } = await supabase
            .from('budget')
            .delete()
            .eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Budget category deleted.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getBudgetByProject, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory };