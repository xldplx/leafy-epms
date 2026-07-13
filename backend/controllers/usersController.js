const supabase       = require('../config/db');
const bcrypt         = require('bcryptjs');
const { writeAudit } = require('./auditController');

const VALID_ROLES = ['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management'];

const SELECT_COLS = 'id, username, role, is_active, email, full_name, created_by, created_at, updated_at';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

        const hashedPassword = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('users')
            .insert([{
                username:   username.trim(),
                password:   hashedPassword,
                role,
                is_active:  true,
                created_by: req.user.username,
            }])
            .select(SELECT_COLS)
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        await writeAudit(req, 'CREATE', 'user', data.id, { username: data.username, role: data.role });
        res.status(201).json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
// Route memakai authorizeSelfOr('Project Manager'):
//   • Semua role boleh mengubah profil MILIKNYA SENDIRI (email, full_name, password)
//   • Hanya Project Manager yang boleh mengubah user LAIN / username / role
const updateUser = async (req, res) => {
    const targetId = parseInt(req.params.id);
    const isSelf   = targetId === req.user.id;
    const isPM     = req.user.role === 'Project Manager';

    const updates = {};

    // ── email ──
    if (req.body.email !== undefined) {
        const email = (req.body.email || '').trim();
        if (email && !EMAIL_RE.test(email))
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        updates.email = email || null;
    }

    // ── full_name ──
    if (req.body.full_name !== undefined)
        updates.full_name = (req.body.full_name || '').trim() || null;

    // ── username (khusus PM) ──
    if (req.body.username !== undefined) {
        if (!isPM)
            return res.status(403).json({ success: false, message: 'Only a Project Manager can change usernames.' });
        if (!req.body.username.trim())
            return res.status(400).json({ success: false, message: 'Username cannot be empty.' });
        updates.username = req.body.username.trim();
    }

    // ── role (khusus PM, tidak boleh untuk diri sendiri) ──
    if (req.body.role !== undefined) {
        if (!isPM)
            return res.status(403).json({ success: false, message: 'Only a Project Manager can change roles.' });
        if (isSelf)
            return res.status(403).json({ success: false, message: 'You cannot change your own role.' });
        if (!VALID_ROLES.includes(req.body.role))
            return res.status(400).json({ success: false, message: `Role must be one of: ${VALID_ROLES.join(', ')}.` });
        updates.role = req.body.role;
    }

    // ── password (self atau PM) — di-hash dengan bcrypt ──
    if (req.body.password !== undefined && req.body.password !== '') {
        if (req.body.password.length < 6)
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        updates.password = await bcrypt.hash(req.body.password, 10);
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

        // Cek duplikat email (case-insensitive)
        if (updates.email) {
            const { data: existingEmail } = await supabase
                .from('users')
                .select('id')
                .ilike('email', updates.email)
                .neq('id', targetId)
                .maybeSingle();

            if (existingEmail)
                return res.status(409).json({ success: false, message: 'Email already in use by another account.' });
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', targetId)
            .select(SELECT_COLS)
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data)  return res.status(404).json({ success: false, message: 'User not found.' });

        await writeAudit(req, 'UPDATE', 'user', targetId, {
            fields: Object.keys(updates).filter(k => k !== 'updated_at' && k !== 'password'),
            self:   isSelf,
        });

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

        await writeAudit(req, 'UPDATE', 'user', targetId, { action: 'deactivate', username: data.username });
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

        await writeAudit(req, 'UPDATE', 'user', targetId, { action: 'activate', username: data.username });
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

        await writeAudit(req, 'DELETE', 'user', targetId, {});
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