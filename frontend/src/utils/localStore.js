// Tiny localStorage wrapper used for frontend-only persistence of UI state
// (WBS node name overrides, demo data, etc.) until the matching backend
// endpoint is available.

export const load = (key, fallback = null) => {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

export const save = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage quota or unavailable — fail silently; caller still has in-memory state.
    }
};

export const remove = (key) => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
};
