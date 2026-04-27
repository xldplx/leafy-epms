// dotenv already loaded in server.js before this file is required
module.exports = {
    PORT:           process.env.PORT || 5000,
    JWT_SECRET:     process.env.JWT_SECRET || 'EPMS_SUPER_SECRET_KEY_2026',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
};