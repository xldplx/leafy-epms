module.exports = {
    PORT:           process.env.PORT           || 5000,
    JWT_SECRET:     process.env.JWT_SECRET     || 'EPMS_SECRET',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
};