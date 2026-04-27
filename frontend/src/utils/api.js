/**
 * api.js — Central API client (fully connected to backend)
 */
const BASE_URL = 'http://localhost:5000/api';

function getToken() { return localStorage.getItem('token'); }

async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
    return data;
}

export const authApi = {
    login: (username, password) => apiFetch('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    getMe: () => apiFetch('/me'),
};
export const projectsApi = {
    getAll:  ()           => apiFetch('/projects'),
    getById: (id)         => apiFetch(`/projects/${id}`),
    create:  (payload)    => apiFetch('/projects', { method: 'POST', body: JSON.stringify(payload) }),
    update:  (id,payload) => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete:  (id)         => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
};
export const tasksApi = {
    getByProject: (projectId)              => apiFetch(`/projects/${projectId}/tasks`),
    create:       (projectId, payload)     => apiFetch(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
    update:       (taskId, payload)        => apiFetch(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete:       (taskId)                 => apiFetch(`/tasks/${taskId}`, { method: 'DELETE' }),
    bulkImport:   (projectId, tasks)       => apiFetch(`/projects/${projectId}/tasks/import`, { method: 'POST', body: JSON.stringify({ tasks }) }),
    lockBaseline: (projectId, baselineName)=> apiFetch(`/projects/${projectId}/tasks/baseline`, { method: 'POST', body: JSON.stringify({ baseline_name: baselineName }) }),
};
export const wbsApi = {
    getByProject: (projectId)        => apiFetch(`/projects/${projectId}/wbs`),
    create:       (projectId,payload) => apiFetch(`/projects/${projectId}/wbs`, { method: 'POST', body: JSON.stringify(payload) }),
    delete:       (projectId,wbsId)  => apiFetch(`/projects/${projectId}/wbs/${wbsId}`, { method: 'DELETE' }),
};
export const dailyActualsApi = {
    getByProject: (projectId, date) => apiFetch(`/projects/${projectId}/daily-actuals${date ? `?date=${date}` : ''}`),
    submit: (projectId, entryDate, entries) => apiFetch(`/projects/${projectId}/daily-actuals`, { method: 'POST', body: JSON.stringify({ entry_date: entryDate, entries }) }),
};
export const personnelApi = {
    getAll:  (projectId) => apiFetch(`/personnel${projectId ? `?project_id=${projectId}` : ''}`),
    create:  (payload)   => apiFetch('/personnel', { method: 'POST', body: JSON.stringify(payload) }),
    update:  (id,payload)=> apiFetch(`/personnel/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete:  (id)        => apiFetch(`/personnel/${id}`, { method: 'DELETE' }),
};
export const alertsApi = {
    getAlerts:       (projectId) => apiFetch(`/alerts${projectId ? `?project_id=${projectId}` : ''}`),
    getThresholds:   (projectId) => apiFetch(`/alerts/thresholds${projectId ? `?project_id=${projectId}` : ''}`),
    updateThresholds:(payload)   => apiFetch('/alerts/thresholds', { method: 'PUT', body: JSON.stringify(payload) }),
};
export const evmApi = {
    getOverview:    ()          => apiFetch('/evm/overview'),
    getByProject:   (projectId) => apiFetch(`/evm/${projectId}`),
};
export const equipmentApi = {
    getAll:  (filters={}) => apiFetch(`/equipment${Object.keys(filters).length ? '?'+new URLSearchParams(filters) : ''}`),
    create:  (payload)    => apiFetch('/equipment', { method: 'POST', body: JSON.stringify(payload) }),
    update:  (id,payload) => apiFetch(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete:  (id)         => apiFetch(`/equipment/${id}`, { method: 'DELETE' }),
};
export const consumablesApi = {
    getAll:  (filters={}) => apiFetch(`/consumables${Object.keys(filters).length ? '?'+new URLSearchParams(filters) : ''}`),
    create:  (payload)    => apiFetch('/consumables', { method: 'POST', body: JSON.stringify(payload) }),
    update:  (id,payload) => apiFetch(`/consumables/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete:  (id)         => apiFetch(`/consumables/${id}`, { method: 'DELETE' }),
};
export const materialsApi = {
    getAll:        (filters={}) => apiFetch(`/materials${Object.keys(filters).length ? '?'+new URLSearchParams(filters) : ''}`),
    create:        (payload)    => apiFetch('/materials', { method: 'POST', body: JSON.stringify(payload) }),
    update:        (id,payload) => apiFetch(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete:        (id)         => apiFetch(`/materials/${id}`, { method: 'DELETE' }),
    getReceipts:   (filters={}) => apiFetch(`/materials/receipts${Object.keys(filters).length ? '?'+new URLSearchParams(filters) : ''}`),
    createReceipt: (payload)    => apiFetch('/materials/receipts', { method: 'POST', body: JSON.stringify(payload) }),
    verifyReceipt: (id)         => apiFetch(`/materials/receipts/${id}`, { method: 'PUT', body: JSON.stringify({ verified: true }) }),
};