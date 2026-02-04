const jwt = require('jsonwebtoken');
const { findUserByCredentials } = require('../models/userModel');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

const login = (req, res) => {
    const { username, password } = req.body;

    // 1. Check User in "Database"
    const user = findUserByCredentials(username, password);

    // 2. Handle Invalid Login
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials.'
        });
    }

    // 3. Generate Token
    const token = jwt.sign(
        { id: user.id, role: user.role, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    // 4. Send Success Response
    res.status(200).json({
        success: true,
        token: token,
        role: user.role,
        username: user.username
    });
};

module.exports = { login };