const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const supabase = require('../config/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');
const { writeAudit } = require('./auditController');

// Refresh token store — in production use Redis or DB table
// For this project we store in Supabase users table refresh_token column
// But to avoid schema change: store in memory Map with TTL (per-process, clears on restart)
const refreshTokenStore = new Map(); // token -> { userId, username, role, expiresAt }
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_EXPIRES     = '15m'; // short-lived access token

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

        if (error)              return res.status(500).json({ success: false, message: error.message });
        if (!data)              return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        if (data.password !== password) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        if (data.is_active === false)   return res.status(403).json({ success: false, message: 'Account deactivated. Contact your administrator.' });

        // Short-lived access token
        const accessToken = jwt.sign(
            { id: data.id, username: data.username, role: data.role },
            JWT_SECRET,
            { expiresIn: ACCESS_EXPIRES }
        );

        // Long-lived refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');
        refreshTokenStore.set(refreshToken, {
            userId:    data.id,
            username:  data.username,
            role:      data.role,
            expiresAt: Date.now() + REFRESH_EXPIRES_MS,
        });

        // Audit
        await writeAudit(
            { user: { id: data.id, username: data.username }, ip: req.ip, headers: req.headers, requestId: req.requestId },
            'LOGIN', 'user', data.id, { username: data.username }
        );

        res.json({
            success:      true,
            token:        accessToken,
            refreshToken: refreshToken,
            role:         data.role,
            username:     data.username,
            expiresIn:    ACCESS_EXPIRES,
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/refresh — exchange refresh token for new access token
const refreshToken = async (req, res) => {
    const { refreshToken: token } = req.body;
    if (!token)
        return res.status(400).json({ success: false, message: 'refreshToken is required.' });

    const stored = refreshTokenStore.get(token);
    if (!stored)
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    if (Date.now() > stored.expiresAt) {
        refreshTokenStore.delete(token);
        return res.status(401).json({ success: false, message: 'Refresh token expired. Please login again.' });
    }

    // Verify user still active
    try {
        const { data } = await supabase
            .from('users')
            .select('id, username, role, is_active')
            .eq('id', stored.userId)
            .single();

        if (!data || data.is_active === false) {
            refreshTokenStore.delete(token);
            return res.status(403).json({ success: false, message: 'Account deactivated.' });
        }

        const newAccessToken = jwt.sign(
            { id: data.id, username: data.username, role: data.role },
            JWT_SECRET,
            { expiresIn: ACCESS_EXPIRES }
        );

        res.json({
            success:   true,
            token:     newAccessToken,
            role:      data.role,
            username:  data.username,
            expiresIn: ACCESS_EXPIRES,
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/logout — revoke refresh token
const logout = async (req, res) => {
    const { refreshToken: token } = req.body;
    if (token) refreshTokenStore.delete(token);

    if (req.user) {
        await writeAudit(req, 'LOGOUT', 'user', req.user.id, { username: req.user.username });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
};

// GET /api/me
const getMe = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, is_active, created_at')
            .eq('id', req.user.id)
            .single();
        if (error || !data) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { login, refreshToken, logout, getMe };