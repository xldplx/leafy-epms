/**
 * api.js — Central API client
 * Semua request ke backend melewati file ini.
 * Base URL: http://localhost:5000
 */

const BASE_URL = 'http://localhost:5000/api';

// ─── Helper: ambil token dari localStorage ────────────────────────────────────
function getToken() {
    return localStorage.getItem('token');
}

// ─── Helper: base fetch dengan Authorization header ───────────────────────────
async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || `Request failed: ${res.status}`);
    }

    return data;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authApi = {
    login: (username, password) =>
        apiFetch('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

    getMe: () => apiFetch('/me'),
};

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
export const projectsApi = {
    getAll: () => apiFetch('/projects'),

    getById: (id) => apiFetch(`/projects/${id}`),

    create: (payload) =>
        apiFetch('/projects', { method: 'POST', body: JSON.stringify(payload) }),

    update: (id, payload) =>
        apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

    delete: (id) =>
        apiFetch(`/projects/${id}`, { method: 'DELETE' }),
};

// ─── TASKS ────────────────────────────────────────────────────────────────────
export const tasksApi = {
    getByProject: (projectId) => apiFetch(`/projects/${projectId}/tasks`),

    create: (projectId, payload) =>
        apiFetch(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),

    update: (taskId, payload) =>
        apiFetch(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(payload) }),

    delete: (taskId) =>
        apiFetch(`/tasks/${taskId}`, { method: 'DELETE' }),

    bulkImport: (projectId, tasks) =>
        apiFetch(`/projects/${projectId}/tasks/import`, { method: 'POST', body: JSON.stringify({ tasks }) }),

    lockBaseline: (projectId, baselineName) =>
        apiFetch(`/projects/${projectId}/tasks/baseline`, {
            method: 'POST',
            body: JSON.stringify({ baseline_name: baselineName }),
        }),
};

// ─── WBS ──────────────────────────────────────────────────────────────────────
export const wbsApi = {
    getByProject: (projectId) => apiFetch(`/projects/${projectId}/wbs`),

    create: (projectId, payload) =>
        apiFetch(`/projects/${projectId}/wbs`, { method: 'POST', body: JSON.stringify(payload) }),

    delete: (projectId, wbsId) =>
        apiFetch(`/projects/${projectId}/wbs/${wbsId}`, { method: 'DELETE' }),
};

// ─── DAILY ACTUALS ────────────────────────────────────────────────────────────
export const dailyActualsApi = {
    getByProject: (projectId, date) => {
        const query = date ? `?date=${date}` : '';
        return apiFetch(`/projects/${projectId}/daily-actuals${query}`);
    },

    submit: (projectId, entryDate, entries) =>
        apiFetch(`/projects/${projectId}/daily-actuals`, {
            method: 'POST',
            body: JSON.stringify({ entry_date: entryDate, entries }),
        }),
};

// ─── PERSONNEL / MANPOWER ─────────────────────────────────────────────────────
export const personnelApi = {
    getAll: (projectId) => {
        const query = projectId ? `?project_id=${projectId}` : '';
        return apiFetch(`/personnel${query}`);
    },

    create: (payload) =>
        apiFetch('/personnel', { method: 'POST', body: JSON.stringify(payload) }),

    update: (id, payload) =>
        apiFetch(`/personnel/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

    delete: (id) =>
        apiFetch(`/personnel/${id}`, { method: 'DELETE' }),
};

// ─── ALERTS & THRESHOLDS ──────────────────────────────────────────────────────
export const alertsApi = {
    getAlerts: (projectId) => {
        const query = projectId ? `?project_id=${projectId}` : '';
        return apiFetch(`/alerts${query}`);
    },

    getThresholds: (projectId) => {
        const query = projectId ? `?project_id=${projectId}` : '';
        return apiFetch(`/alerts/thresholds${query}`);
    },

    updateThresholds: (payload) =>
        apiFetch('/alerts/thresholds', { method: 'PUT', body: JSON.stringify(payload) }),
};

// ─── EVM ──────────────────────────────────────────────────────────────────────
export const evmApi = {
    getOverview: () => apiFetch('/evm/overview'),

    getByProject: (projectId) => apiFetch(`/evm/${projectId}`),
};