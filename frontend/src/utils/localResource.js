/**
 * localResource.js — local-first resource store (API-ready).
 * Location: frontend/src/utils/localResource.js
 *
 * Backs the resource pages (Consumables, Tools, Budget, Audit) with localStorage
 * until the matching backend endpoints land. The methods are async and return the
 * same `{ success, data }` envelope as the api.js modules, so swapping to the real
 * server later is a one-line change per page:
 *
 *   const store = createLocalResource(KEY, SEED)   →   const store = consumablesApi
 *
 * `snapshot()` is the only sync extra — used for instant lazy useState init, since
 * localStorage needs no spinner. When moving to the DB, replace snapshot() with a
 * getAll() call in a useEffect.
 */
import { load, save } from './localStore';

export function createLocalResource(key, seed = []) {
    const read  = () => load(key, seed);
    const write = (items) => { save(key, items); return items; };
    const nextId = (items) => items.reduce((m, it) => Math.max(m, Number(it.id) || 0), 0) + 1;

    return {
        async getAll() {
            return { success: true, data: read() };
        },
        async create(payload) {
            const items = read();
            const now   = new Date().toISOString();
            const row   = { ...payload, id: nextId(items), created_at: now, updated_at: now };
            write([...items, row]);
            return { success: true, data: row };
        },
        async update(id, patch) {
            const now = new Date().toISOString();
            let updated = null;
            const next = read().map(it => {
                if (String(it.id) !== String(id)) return it;
                updated = { ...it, ...patch, id: it.id, updated_at: now };
                return updated;
            });
            write(next);
            return { success: !!updated, data: updated };
        },
        async remove(id) {
            write(read().filter(it => String(it.id) !== String(id)));
            return { success: true };
        },
        async replaceAll(items) {
            const now  = new Date().toISOString();
            const rows = items.map((it, i) => ({
                ...it,
                id:         it.id ?? i + 1,
                created_at: it.created_at ?? now,
                updated_at: now,
            }));
            write(rows);
            return { success: true, data: rows };
        },
        async reset() {
            write(Array.isArray(seed) ? seed : []);
            return { success: true, data: read() };
        },
        // Sync snapshot for lazy useState initializers (localStorage is synchronous).
        snapshot() { return read(); },
    };
}
