const jwt      = require('jsonwebtoken');
const supabase = require('../config/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

/**
 * POST /api/login
 * Authenticates a user and returns a JWT token.
 */
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, password')
            .eq('username', username)
            .single();

        if (error || !data || data.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: data.id, username: data.username, role: data.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            success:  true,
            token,
            role:     data.role,
            username: data.username,
        });

    } catch (err) {
        console.error('[Login Error]', err.message);
        return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

/**
 * GET /api/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, created_at')
            .eq('id', req.user.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[GetMe Error]', err.message);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { login, getMe };