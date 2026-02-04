const users = [
    { id: 1, username: 'admin_pm', password: 'password123', role: 'Project Manager' },
    { id: 2, username: 'planner_user', password: 'password123', role: 'Planner' },
    { id: 3, username: 'cost_eng', password: 'password123', role: 'Cost Engineer' },
    { id: 4, username: 'site_eng', password: 'password123', role: 'Site Engineer' },
    { id: 5, username: 'mgmt_user', password: 'password123', role: 'Management' }
];

// Simulate a database query
const findUserByCredentials = (username, password) => {
    // Note: In production, compare hashed passwords (e.g., using bcrypt)
    return users.find(u => u.username === username && u.password === password);
};

module.exports = { findUserByCredentials };