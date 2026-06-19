const supabase = require('../config/db');

const VALID_ACTIONS        = ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','CHECKOUT','RETURN','SYNC','LOCK','IMPORT'];
const VALID_RESOURCE_TYPES = ['user','project','task','wbs','budget','consumable','consumable_log','tool','personnel','daily_actual','baseline','threshold'];

/**
 * Utility — call this from any controller to write an audit entry.
 * Usage: await writeAudit(req, 'CREATE', 'project', projectId, { name: project.project_name });
 */
const writeAudit = async (req, action, resourceType, resourceId = null, detail = {}) => {
    try {
        await supabase.from('audit_logs').insert([{
            user_id:       req.user?.id       || null,
            username:      req.user?.username  || 'system',
            action:        action.toUpperCase(),
            resource_type: resourceType,
            resource_id:   resourceId ? String(resourceId) : null,
            detail:        detail || {},
            ip_address:    req.ip || req.headers['x-forwarded-for'] || null,
            user_agent:    req.headers['user-agent'] || null,
            request_id:    req.requestId || null,
        }]);
    } catch (e) {
        // Audit write failure should NOT break the main request
        console.error('[audit] write failed:', e.message);
    }
};

// GET /api/audit — filterable list (Project Manager only)
const getAuditLogs = async (req, res) => {
    try {
        const {
            username,
            action,
            resource_type,
            date_from,
            date_to,
            limit  = 100,
            offset = 0,
        } = req.query;

        let query = supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(Math.min(parseInt(limit) || 100, 500))
            .range(parseInt(offset) || 0, (parseInt(offset) || 0) + (Math.min(parseInt(limit) || 100, 500)) - 1);

        // Filters
        if (username)      query = query.ilike('username', `%${username}%`);
        if (action)        query = query.eq('action', action.toUpperCase());
        if (resource_type) query = query.eq('resource_type', resource_type);
        if (date_from)     query = query.gte('created_at', new Date(date_from).toISOString());
        if (date_to) {
            const end = new Date(date_to);
            end.setHours(23, 59, 59, 999);
            query = query.lte('created_at', end.toISOString());
        }

        const { data, error, count } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });

        res.json({
            success: true,
            data:    data || [],
            total:   count || 0,
            limit:   parseInt(limit) || 100,
            offset:  parseInt(offset) || 0,
            filters: { username, action, resource_type, date_from, date_to },
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/audit/meta — get distinct values for filter dropdowns
const getAuditMeta = async (req, res) => {
    try {
        const { data: users } = await supabase
            .from('audit_logs')
            .select('username')
            .order('username');
        const { data: resources } = await supabase
            .from('audit_logs')
            .select('resource_type')
            .order('resource_type');

        const uniqueUsers     = [...new Set((users     || []).map(r => r.username))].filter(Boolean);
        const uniqueResources = [...new Set((resources || []).map(r => r.resource_type))].filter(Boolean);

        res.json({
            success: true,
            data: {
                usernames:      uniqueUsers,
                actions:        VALID_ACTIONS,
                resource_types: uniqueResources,
            },
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { writeAudit, getAuditLogs, getAuditMeta };