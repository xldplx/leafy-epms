const supabase = require('../config/db');
const { writeAudit } = require('./auditController');

const VALID_ROLES = ['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management'];

const SELECT_COLS = 'id, username, role, is_active, email, full_name, created_by, created_at, updated_at';

// ── GET /api/users ────────────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(SELECT_COLS)
            .order('id', { ascending: true });

        if (error) return res.status(500).json({ success: false, message: error.message });
        res.json({ success: true, data: data || [] });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── GET /api/users/:id ────────────────────────────────────────────────────────
const getUserById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(SELECT_COLS)
            .eq('id', parseInt(req.params.id))
            .single();

        if (error || !data) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── POST /api/users ───────────────────────────────────────────────────────────
const createUser = async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !username.trim())
        return res.status(400).json({ success: false, message: 'Username is required.' });
    if (!password || password.length < 6)
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    if (!role || !VALID_ROLES.includes(role))
        return res.status(400).json({ success: false, message: `Role must be one of: ${VALID_ROLES.join(', ')}.` });

    try {
        // Cek duplikat username
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username.trim())
            .maybeSingle();

        if (existing)
            return res.status(409).json({ success: false, message: 'Username already exists.' });

        const { data, error } = await supabase
            .from('users')
            .insert([{
                username:   username.trim(),
                password,
                role,
                is_active:  true,
                created_by: req.user.username,
            }])
            .select(SELECT_COLS)
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        await writeAudit(req, 'CREATE', 'user', data.id, { username: data.username });
        res.status(201).json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
    const targetId = parseInt(req.params.id);
    const isSelf   = targetId === req.user.id;

    const updates = {};

    if (req.body.email     !== undefined) updates.email     = req.body.email     || null;
    if (req.body.full_name !== undefined) updates.full_name = req.body.full_name || null;

    if (req.body.username !== undefined) {
        if (!req.body.username.trim())
            return res.status(400).json({ success: false, message: 'Username cannot be empty.' });
        updates.username = req.body.username.trim();
    }
    if (req.body.role !== undefined) {
        // PM tidak boleh mengubah role akunnya sendiri
        if (isSelf)
            return res.status(403).json({ success: false, message: 'You cannot change your own role.' });
        if (!VALID_ROLES.includes(req.body.role))
            return res.status(400).json({ success: false, message: `Role must be one of: ${VALID_ROLES.join(', ')}.` });
        updates.role = req.body.role;
    }
    if (req.body.password !== undefined && req.body.password !== '') {
        if (req.body.password.length < 6)
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        updates.password = req.body.password;
    }

    if (Object.keys(updates).length === 0)
        return res.status(400).json({ success: false, message: 'No valid fields to update.' });

    updates.updated_at = new Date().toISOString();

    try {
        // Cek duplikat username
        if (updates.username) {
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('username', updates.username)
                .neq('id', targetId)
                .maybeSingle();

            if (existing)
                return res.status(409).json({ success: false, message: 'Username already taken.' });
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', targetId)
            .select(SELECT_COLS)
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'User not found.' });
        await writeAudit(req, 'UPDATE', 'user', data.id, { username: data.username });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PATCH /api/users/:id/deactivate ──────────────────────────────────────────
const deactivateUser = async (req, res) => {
    const targetId = parseInt(req.params.id);

    if (targetId === req.user.id)
        return res.status(403).json({ success: false, message: 'You cannot deactivate your own account.' });

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', targetId)
            .select('id, username, role, is_active')
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'User not found.' });
        await writeAudit(req, 'UPDATE', 'user', targetId, { username: data.username, status: 'deactivated' });
        res.json({ success: true, message: `User "${data.username}" has been deactivated.`, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PATCH /api/users/:id/activate ────────────────────────────────────────────
const activateUser = async (req, res) => {
    const targetId = parseInt(req.params.id);

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', targetId)
            .select('id, username, role, is_active')
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'User not found.' });
        await writeAudit(req, 'UPDATE', 'user', targetId, { username: data.username, status: 'activated' });
        res.json({ success: true, message: `User "${data.username}" has been activated.`, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
    const targetId = parseInt(req.params.id);

    if (targetId === req.user.id)
        return res.status(403).json({ success: false, message: 'You cannot delete your own account.' });

    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', targetId);

        if (error) return res.status(500).json({ success: false, message: error.message });
        await writeAudit(req, 'DELETE', 'user', targetId, { username: `user_id_${targetId}` });
        res.json({ success: true, message: 'User permanently deleted.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deactivateUser,
    activateUser,
    deleteUser,
};