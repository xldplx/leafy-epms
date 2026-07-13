const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

const authenticate = (req, res, next) => {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token required.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role))
        return res.status(403).json({ success: false, message: `Access denied. Required: ${roles.join(', ')}` });
    next();
};

/**
 * authorizeSelfOr(...roles)
 * Izinkan request jika:
 *   a) :id pada URL == id user yang login (self), ATAU
 *   b) role user termasuk dalam daftar roles (mis. 'Project Manager')
 *
 * Dipakai untuk PUT /api/users/:id agar halaman My Profile
 * bisa dipakai SEMUA role untuk mengubah profilnya sendiri,
 * sementara PM tetap bisa mengelola semua user.
 */
const authorizeSelfOr = (...roles) => (req, res, next) => {
    const targetId = parseInt(req.params.id);
    const isSelf   = Number.isInteger(targetId) && targetId === req.user?.id;
    if (isSelf || roles.includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: 'Access denied. You can only edit your own profile.' });
};

module.exports = { authenticate, authorize, authorizeSelfOr };