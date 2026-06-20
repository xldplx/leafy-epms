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
            .select('*, wbs:wbs_id(id, wbs_code, name)')
            .eq('project_id', parseInt(project_id))
            .order('type').order('category');
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/budget
const createBudgetCategory = async (req, res) => {
    const { project_id, category, type, planned, wbs_id } = req.body;
    if (!project_id)      return res.status(400).json({ success: false, message: 'project_id is required.' });
    if (!category?.trim()) return res.status(400).json({ success: false, message: 'category is required.' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ success: false, message: 'type must be CAPEX or OPEX.' });
    const plannedNum = parseFloat(planned);
    if (isNaN(plannedNum) || plannedNum < 0) return res.status(400).json({ success: false, message: 'planned must be non-negative.' });
    try {
        const { data: existing } = await supabase.from('budget').select('id')
            .eq('project_id', parseInt(project_id)).eq('category', category.trim()).maybeSingle();
        if (existing) return res.status(409).json({ success: false, message: `Category "${category.trim()}" already exists.` });

        const { data, error } = await supabase.from('budget').insert([{
            project_id: parseInt(project_id),
            category:   category.trim(),
            type,
            planned:    plannedNum,
            actual:     0,
            wbs_id:     wbs_id ? parseInt(wbs_id) : null,
        }]).select('*, wbs:wbs_id(id, wbs_code, name)').single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/budget/:id — update planned / actual (manual) / category / type / wbs_id
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
    if (req.body.wbs_id !== undefined) {
        updates.wbs_id = req.body.wbs_id ? parseInt(req.body.wbs_id) : null;
    }
    if (Object.keys(updates).length === 0)
        return res.status(400).json({ success: false, message: 'No valid fields to update.' });

    updates.updated_at = new Date().toISOString();
    try {
        const { data, error } = await supabase.from('budget')
            .update(updates).eq('id', req.params.id)
            .select('*, wbs:wbs_id(id, wbs_code, name)').single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'Budget category not found.' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/budget/:id
const deleteBudgetCategory = async (req, res) => {
    try {
        const { error } = await supabase.from('budget').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Budget category deleted.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /api/budget/:id/sync — sync actual dari sum(tasks.actual_cost) per WBS node
const syncActualFromTasks = async (req, res) => {
    try {
        // Ambil budget row
        const { data: row, error: rowErr } = await supabase.from('budget')
            .select('id, project_id, wbs_id, category').eq('id', req.params.id).single();
        if (rowErr || !row) return res.status(404).json({ success: false, message: 'Budget category not found.' });

        let totalActual = 0;

        if (row.wbs_id) {
            // Sum actual_cost dari tasks yang ada di WBS node ini dan semua descendant
            const { data: wbsNodes } = await supabase.from('wbs')
                .select('id, parent_id').eq('project_id', row.project_id);

            // Recursive: dapatkan semua descendant wbs_id
            const getAllDescendants = (rootId, nodes) => {
                const result = [rootId];
                const children = nodes.filter(n => n.parent_id === rootId);
                children.forEach(c => result.push(...getAllDescendants(c.id, nodes)));
                return result;
            };
            const wbsIds = getAllDescendants(row.wbs_id, wbsNodes || []);

            const { data: tasks } = await supabase.from('tasks')
                .select('actual_cost').eq('project_id', row.project_id).in('wbs_id', wbsIds);
            totalActual = (tasks || []).reduce((s, t) => s + parseFloat(t.actual_cost || 0), 0);
        } else {
            // Tidak ada WBS link — sum semua tasks di project
            const { data: tasks } = await supabase.from('tasks')
                .select('actual_cost').eq('project_id', row.project_id);
            totalActual = (tasks || []).reduce((s, t) => s + parseFloat(t.actual_cost || 0), 0);
        }

        const { data, error } = await supabase.from('budget')
            .update({ actual: totalActual, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select('*, wbs:wbs_id(id, wbs_code, name)').single();
        if (error) return res.status(500).json({ success: false, message: error.message });

        res.json({ success: true, data, synced_actual: totalActual });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /api/budget/sync-all?project_id=X — sync semua kategori sekaligus
const syncAllActuals = async (req, res) => {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ success: false, message: 'project_id is required.' });
    try {
        const { data: budgetRows } = await supabase.from('budget')
            .select('id, wbs_id').eq('project_id', parseInt(project_id));
        const { data: wbsNodes } = await supabase.from('wbs')
            .select('id, parent_id').eq('project_id', parseInt(project_id));
        const { data: tasks } = await supabase.from('tasks')
            .select('wbs_id, actual_cost').eq('project_id', parseInt(project_id));

        const getAllDescendants = (rootId, nodes) => {
            const result = [rootId];
            nodes.filter(n => n.parent_id === rootId)
                 .forEach(c => result.push(...getAllDescendants(c.id, nodes)));
            return result;
        };

        const totalAllTasks = (tasks || []).reduce((s, t) => s + parseFloat(t.actual_cost || 0), 0);

        const updates = await Promise.all((budgetRows || []).map(async row => {
            let actual = 0;
            if (row.wbs_id) {
                const wbsIds = getAllDescendants(row.wbs_id, wbsNodes || []);
                actual = (tasks || [])
                    .filter(t => wbsIds.includes(t.wbs_id))
                    .reduce((s, t) => s + parseFloat(t.actual_cost || 0), 0);
            } else {
                actual = totalAllTasks;
            }
            const { data } = await supabase.from('budget')
                .update({ actual, updated_at: new Date().toISOString() })
                .eq('id', row.id)
                .select('*, wbs:wbs_id(id, wbs_code, name)').single();
            return data;
        }));

        res.json({ success: true, data: updates.filter(Boolean), synced_count: updates.length });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
    getBudgetByProject,
    createBudgetCategory,
    updateBudgetCategory,
    deleteBudgetCategory,
    syncActualFromTasks,
    syncAllActuals,
};