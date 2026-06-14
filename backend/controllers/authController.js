const jwt      = require('jsonwebtoken');
const supabase = require('../config/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

// POST /api/login
const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ success: false, message: 'Username and password required.' });
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, password, is_active')
            .eq('username', username)
            .maybeSingle();

        if (error)          return res.status(500).json({ success: false, message: error.message });
        if (!data)          return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        if (data.password !== password)
                            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        if (data.is_active === false)
                            return res.status(403).json({ success: false, message: 'Account deactivated. Contact your administrator.' });

        // id here is the INTEGER id (not uuid)
        const token = jwt.sign(
            { id: data.id, username: data.username, role: data.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        res.json({ success: true, token, id: data.id, role: data.role, username: data.username });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// GET /api/me
const getMe = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, email, is_active, created_at')
            .eq('id', req.user.id)   // integer id from JWT
            .single();

        if (error || !data) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = { login, getMe };