/**
 * auditLog.js — append real app activity to the local audit store that the
 * Settings → Audit Log tab reads. Swap `recordAudit` for a POST /audit-logs
 * call when Ananta's endpoint ships.
 * Location: frontend/src/utils/auditLog.js
 */
import { load, save } from './localStore';
import { auditSeed } from '../data/auditSeed';

const AUDIT_KEY = 'epms.audit_log.v1';
const MAX = 500;

export function recordAudit({ action, resource_type, resource_id = '—', detail = '', status = 'success' }) {
    try {
        const log    = load(AUDIT_KEY, auditSeed);
        const nextId = log.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0) + 1;
        const entry  = {
            id:            nextId,
            created_at:    new Date().toISOString().slice(0, 19),
            username:      localStorage.getItem('userName') || 'unknown',
            user_role:     localStorage.getItem('userRole') || 'Guest',
            action,
            resource_type,
            resource_id,
            detail,
            status,
        };
        save(AUDIT_KEY, [entry, ...log].slice(0, MAX));
    } catch {
        // Audit logging must never break a user action.
    }
}
