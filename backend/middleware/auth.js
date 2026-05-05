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

module.exports = { authenticate, authorize };