/**
 * auditSeed.js — demo audit-log rows for the Settings → Audit Log tab.
 *
 * Shaped EXACTLY to the planned backend `audit_logs` table so the swap to
 * Ananta's real GET /audit-logs endpoint is a one-line change in Settings.jsx:
 *   { id, created_at, username, user_role, action, resource_type, resource_id, detail, status }
 *
 * action:        CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT
 * status:        success | failed
 * resource_type: project | task | wbs | baseline | daily_actual | threshold |
 *                personnel | consumable | tool | budget | auth
 */

export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'];

export const auditSeed = [
    { id: 1,  created_at: '2026-06-13T09:14:00', username: 'auzan',   user_role: 'Project Manager', action: 'CREATE', resource_type: 'project',      resource_id: 'PRJ-2026-004', detail: 'Created project "Coastal Bridge Retrofit"',          status: 'success' },
    { id: 2,  created_at: '2026-06-13T08:51:00', username: 'auzan',   user_role: 'Project Manager', action: 'LOGIN',  resource_type: 'auth',         resource_id: '—',            detail: 'Signed in',                                          status: 'success' },
    { id: 3,  created_at: '2026-06-12T17:32:00', username: 'sari',    user_role: 'Cost Engineer',   action: 'EXPORT', resource_type: 'budget',       resource_id: 'PRJ-2026-002', detail: 'Exported budget categories to Excel',                status: 'success' },
    { id: 4,  created_at: '2026-06-12T16:05:00', username: 'ananta',  user_role: 'Planner',         action: 'UPDATE', resource_type: 'threshold',    resource_id: 'PRJ-2026-001', detail: 'Set CPI red threshold to 0.90',                      status: 'success' },
    { id: 5,  created_at: '2026-06-12T15:48:00', username: 'rudi',    user_role: 'Site Engineer',   action: 'CREATE', resource_type: 'daily_actual', resource_id: 'PRJ-2026-001', detail: 'Submitted daily actuals for 12 Jun',                 status: 'success' },
    { id: 6,  created_at: '2026-06-12T14:20:00', username: 'mgmt',    user_role: 'Management',      action: 'LOGIN',  resource_type: 'auth',         resource_id: '—',            detail: 'Signed in',                                          status: 'success' },
    { id: 7,  created_at: '2026-06-12T11:30:00', username: 'alden',   user_role: 'Planner',         action: 'DELETE', resource_type: 'task',         resource_id: '#88',          detail: 'Deleted task "Temporary Access Road"',               status: 'success' },
    { id: 8,  created_at: '2026-06-12T10:12:00', username: 'rudi',    user_role: 'Site Engineer',   action: 'LOGIN',  resource_type: 'auth',         resource_id: '—',            detail: 'Failed sign-in — wrong password',                    status: 'failed'  },
    { id: 9,  created_at: '2026-06-12T09:40:00', username: 'auzan',   user_role: 'Project Manager', action: 'UPDATE', resource_type: 'task',         resource_id: '#74',          detail: 'Renamed WBS task to "Pile Cap Casting"',             status: 'success' },
    { id: 10, created_at: '2026-06-11T16:58:00', username: 'sari',    user_role: 'Cost Engineer',   action: 'EXPORT', resource_type: 'project',      resource_id: '—',            detail: 'Exported project portfolio to Excel',                status: 'success' },
    { id: 11, created_at: '2026-06-11T15:14:00', username: 'ananta',  user_role: 'Planner',         action: 'CREATE', resource_type: 'wbs',          resource_id: 'PRJ-2026-003', detail: 'Added WBS node "3.2 Mechanical"',                    status: 'success' },
    { id: 12, created_at: '2026-06-11T13:02:00', username: 'auzan',   user_role: 'Project Manager', action: 'CREATE', resource_type: 'baseline',     resource_id: 'PRJ-2026-002', detail: 'Locked baseline "Rev B"',                            status: 'success' },
    { id: 13, created_at: '2026-06-11T11:25:00', username: 'rudi',    user_role: 'Site Engineer',   action: 'UPDATE', resource_type: 'consumable',   resource_id: 'Diesel Fuel',  detail: 'Logged 120 L consumption',                           status: 'success' },
    { id: 14, created_at: '2026-06-11T09:08:00', username: 'alden',   user_role: 'Planner',         action: 'LOGIN',  resource_type: 'auth',         resource_id: '—',            detail: 'Signed in',                                          status: 'success' },
    { id: 15, created_at: '2026-06-10T17:45:00', username: 'sari',    user_role: 'Cost Engineer',   action: 'UPDATE', resource_type: 'budget',       resource_id: 'PRJ-2026-001', detail: 'Adjusted "Structural Works" planned amount',         status: 'success' },
    { id: 16, created_at: '2026-06-10T16:20:00', username: 'auzan',   user_role: 'Project Manager', action: 'UPDATE', resource_type: 'personnel',    resource_id: 'EMP-031',      detail: 'Reassigned to Zone B',                               status: 'success' },
    { id: 17, created_at: '2026-06-10T14:33:00', username: 'rudi',    user_role: 'Site Engineer',   action: 'UPDATE', resource_type: 'tool',         resource_id: 'Power Drill',  detail: 'Checked out to Andi Wijaya',                         status: 'success' },
    { id: 18, created_at: '2026-06-10T10:51:00', username: 'ananta',  user_role: 'Planner',         action: 'UPDATE', resource_type: 'task',         resource_id: '#61',          detail: 'Set predecessors for "Slab Pour L3"',                status: 'success' },
    { id: 19, created_at: '2026-06-09T16:12:00', username: 'mgmt',    user_role: 'Management',      action: 'EXPORT', resource_type: 'project',      resource_id: '—',            detail: 'Exported EVM report (PRJ-2026-001)',                 status: 'success' },
    { id: 20, created_at: '2026-06-09T13:44:00', username: 'auzan',   user_role: 'Project Manager', action: 'DELETE', resource_type: 'wbs',          resource_id: 'PRJ-2026-003', detail: 'Removed empty WBS node "4.0 Spare"',                 status: 'success' },
    { id: 21, created_at: '2026-06-09T11:30:00', username: 'sari',    user_role: 'Cost Engineer',   action: 'LOGIN',  resource_type: 'auth',         resource_id: '—',            detail: 'Signed in',                                          status: 'success' },
    { id: 22, created_at: '2026-06-09T09:05:00', username: 'rudi',    user_role: 'Site Engineer',   action: 'CREATE', resource_type: 'daily_actual', resource_id: 'PRJ-2026-002', detail: 'Submitted daily actuals for 08 Jun',                 status: 'success' },
    { id: 23, created_at: '2026-06-08T18:02:00', username: 'auzan',   user_role: 'Project Manager', action: 'LOGOUT', resource_type: 'auth',         resource_id: '—',            detail: 'Signed out',                                         status: 'success' },
    { id: 24, created_at: '2026-06-08T15:39:00', username: 'alden',   user_role: 'Planner',         action: 'UPDATE', resource_type: 'task',         resource_id: '#52',          detail: 'Updated planned duration to 14 days',                status: 'success' },
    { id: 25, created_at: '2026-06-08T10:17:00', username: 'unknown', user_role: 'Guest',           action: 'LOGIN',  resource_type: 'auth',         resource_id: '—',            detail: 'Failed sign-in — unknown user',                      status: 'failed'  },
    { id: 26, created_at: '2026-06-08T08:55:00', username: 'ananta',  user_role: 'Planner',         action: 'CREATE', resource_type: 'task',         resource_id: '#90',          detail: 'Imported 24 tasks from Excel',                       status: 'success' },
];
