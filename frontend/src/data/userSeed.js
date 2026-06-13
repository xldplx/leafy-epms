/**
 * userSeed.js — demo users for the Settings → User Management tab.
 * Shaped to the planned `users` table so the swap to Ananta's userController is trivial:
 *   { id, username, role, status, created_at }
 */
export const USER_ROLES = ['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management'];

export const userSeed = [
    { id: 1, username: 'auzan',  role: 'Project Manager', status: 'active', created_at: '2026-04-02' },
    { id: 2, username: 'ananta', role: 'Planner',         status: 'active', created_at: '2026-04-02' },
    { id: 3, username: 'alden',  role: 'Planner',         status: 'active', created_at: '2026-04-02' },
    { id: 4, username: 'sari',   role: 'Cost Engineer',   status: 'active', created_at: '2026-04-10' },
    { id: 5, username: 'rudi',   role: 'Site Engineer',   status: 'active', created_at: '2026-04-10' },
    { id: 6, username: 'mgmt',   role: 'Management',      status: 'active', created_at: '2026-04-15' },
];
