const supabase = require('../config/db');

/**
 * GET /api/projects/:projectId/wbs
 * Returns all WBS nodes for a project ordered by wbs_code.
 */
const getWbsByProject = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('wbs')
            .select('*')
            .eq('project_id', req.params.projectId)
            .order('wbs_code');

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/projects/:projectId/wbs
 * Creates a new WBS node. Requires Project Manager or Planner role.
 */
const createWbsNode = async (req, res) => {
    const { parent_id, wbs_code, name, level } = req.body;

    if (!wbs_code || !name) {
        return res.status(400).json({ success: false, message: 'wbs_code and name are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('wbs')
            .insert([{
                project_id: parseInt(req.params.projectId),
                parent_id:  parent_id || null,
                wbs_code,
                name,
                level:      level || 1,
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
 * DELETE /api/projects/:projectId/wbs/:id
 * Deletes a WBS node. Requires Project Manager role.
 */
const deleteWbsNode = async (req, res) => {
    try {
        // Check if any tasks reference this WBS node
        const { data: linkedTasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('wbs_id', req.params.id)
            .limit(1);

        if (linkedTasks && linkedTasks.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete WBS node — it has tasks assigned to it. Reassign or delete tasks first.'
            });
        }

        const { error } = await supabase
            .from('wbs')
            .delete()
            .eq('id', req.params.id);

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, message: 'WBS node deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getWbsByProject, createWbsNode, deleteWbsNode };