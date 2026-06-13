import { useState, useMemo } from 'react';
import {
    ClipboardList, Search, Download, ShieldCheck, Activity, AlertTriangle, Users, Lock, UserPlus, X, Power,
} from 'lucide-react';
import { load } from '../../../utils/localStore';
import { exportWorkbook, exportFilename } from '../../../utils/excelExport';
import { createLocalResource } from '../../../utils/localResource';
import { recordAudit } from '../../../utils/auditLog';
import { auditSeed, AUDIT_ACTIONS } from '../../../data/auditSeed';
import { userSeed, USER_ROLES } from '../../../data/userSeed';
// NOTE: when Ananta ships GET /audit-logs and /users, swap the local reads below
// for auditApi.getAll(filters) and usersApi (see utils/api.js).

const AUDIT_KEY = 'epms.audit_log.v1';

const TABS = ['Audit Log', 'User Management'];

// User Management store — swap `userStore` for `usersApi` when /users ships.
const userStore = createLocalResource('epms.users.v1', userSeed);

const ROLE_BADGE = {
    'Project Manager': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Planner':         'bg-blue-50 text-blue-700 border-blue-100',
    'Cost Engineer':   'bg-violet-50 text-violet-700 border-violet-100',
    'Site Engineer':   'bg-amber-50 text-amber-700 border-amber-100',
    'Management':      'bg-slate-50 text-slate-600 border-slate-200',
};

const ACTION_BADGE = {
    CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    UPDATE: 'bg-blue-50 text-blue-700 border-blue-100',
    DELETE: 'bg-red-50 text-red-700 border-red-100',
    LOGIN:  'bg-slate-50 text-slate-600 border-slate-200',
    LOGOUT: 'bg-slate-50 text-slate-600 border-slate-200',
    EXPORT: 'bg-violet-50 text-violet-700 border-violet-100',
};

const ACTION_FILTERS = ['All', ...AUDIT_ACTIONS];

const fmtTimestamp = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

export default function Settings() {
    const [activeTab, setActiveTab] = useState('Audit Log');
    const [entries] = useState(() => load(AUDIT_KEY, auditSeed));

    const [actionFilter, setActionFilter] = useState('All');
    const [search, setSearch]             = useState('');

    // User Management
    const [users, setUsers]               = useState(() => userStore.snapshot());
    const [isUserModalOpen, setUserModal] = useState(false);
    const [userForm, setUserForm]         = useState({ username: '', role: 'Planner' });
    const [userError, setUserError]       = useState('');
    const [userToast, setUserToast]       = useState('');

    const userRole   = localStorage.getItem('userRole') || 'Guest';
    const isReadOnly = userRole !== 'Project Manager';

    // ── KPI counts ──────────────────────────────────────────────────────────────
    const counts = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return {
            total:   entries.length,
            today:   entries.filter(e => (e.created_at || '').slice(0, 10) === today).length,
            failed:  entries.filter(e => e.status === 'failed').length,
            users:   new Set(entries.map(e => e.username)).size,
        };
    }, [entries]);

    // ── Filtered rows (newest first) ────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return entries
            .filter(e => actionFilter === 'All' || e.action === actionFilter)
            .filter(e => {
                if (!q) return true;
                return [e.username, e.resource_type, e.resource_id, e.detail, e.action]
                    .some(v => String(v || '').toLowerCase().includes(q));
            })
            .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id));
    }, [entries, actionFilter, search]);

    const handleExport = () => {
        if (activeTab === 'User Management') {
            const rows = users.map(u => ({ 'Username': u.username, 'Role': u.role, 'Status': u.status, 'Created': u.created_at }));
            exportWorkbook(exportFilename('Users'), [{ name: 'Users', rows }]);
            return;
        }
        const rows = filtered.map(e => ({
            'Timestamp':     fmtTimestamp(e.created_at),
            'User':          e.username,
            'Role':          e.user_role,
            'Action':        e.action,
            'Resource Type': e.resource_type,
            'Resource':      e.resource_id,
            'Detail':        e.detail,
            'Status':        e.status,
        }));
        exportWorkbook(exportFilename('Audit_Log'), [{ name: 'Audit Log', rows }]);
    };

    // ── User Management actions (local-first; mirror usersApi later) ─────────────
    const reloadUsers   = () => userStore.getAll().then(r => setUsers(r.data));
    const showUserToast = (m) => { setUserToast(m); setTimeout(() => setUserToast(''), 2500); };

    const handleAddUser = (e) => {
        e.preventDefault();
        setUserError('');
        const name = userForm.username.trim();
        if (!name) { setUserError('Username is required.'); return; }
        if (users.some(u => u.username.toLowerCase() === name.toLowerCase())) { setUserError('Username already exists.'); return; }
        userStore.create({ username: name, role: userForm.role, status: 'active', created_at: new Date().toISOString().slice(0, 10) })
            .then(reloadUsers).then(() => {
                recordAudit({ action: 'CREATE', resource_type: 'user', resource_id: name, detail: `Created user "${name}" (${userForm.role})` });
                setUserModal(false);
                setUserForm({ username: '', role: 'Planner' });
                showUserToast('User added');
            });
    };
    const handleRoleChange = (u, role) => {
        userStore.update(u.id, { role }).then(reloadUsers).then(() => {
            recordAudit({ action: 'UPDATE', resource_type: 'user', resource_id: u.username, detail: `Changed role to ${role}` });
        });
    };
    const handleToggleStatus = (u) => {
        const status = u.status === 'active' ? 'inactive' : 'active';
        userStore.update(u.id, { status }).then(reloadUsers).then(() => {
            recordAudit({ action: 'UPDATE', resource_type: 'user', resource_id: u.username, detail: `${status === 'active' ? 'Reactivated' : 'Deactivated'} user` });
        });
    };

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-blue-50 text-blue-600 border-blue-100" title="Saved in this browser; syncs to the server when the backend is connected">
                            Local Data
                        </span>
                        {isReadOnly && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Read Only
                            </span>
                        )}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Settings</h2>
                    <p className="text-slate-500 mt-1">System activity and administration</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={activeTab === 'User Management' ? users.length === 0 : filtered.length === 0}
                    className="text-sm font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border shadow-sm text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none">
                    <Download className="w-4 h-4" /> Export
                </button>
            </div>

            {/* TAB BAR (scaffold — User Management lands here in July) */}
            <div className="flex gap-2 bg-white/60 p-2 rounded-2xl backdrop-blur-xl border border-slate-200/50 shadow-sm w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                            activeTab === tab
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'Audit Log' && (
                <>
                    {/* KPI STRIP */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-100 rounded-xl text-slate-500"><ClipboardList className="w-5 h-5" /></div>
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Events</h3>
                            <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{counts.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Activity className="w-5 h-5" /></div>
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Today</h3>
                            <p className="text-2xl font-black text-blue-600 tracking-tight mt-1">{counts.today}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-red-50 rounded-xl text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Failed</h3>
                            <p className="text-2xl font-black text-red-600 tracking-tight mt-1">{counts.failed}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Users className="w-5 h-5" /></div>
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Users</h3>
                            <p className="text-2xl font-black text-emerald-600 tracking-tight mt-1">{counts.users}</p>
                        </div>
                    </div>

                    {/* FILTER + SEARCH */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-sm overflow-x-auto no-scrollbar">
                            {ACTION_FILTERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setActionFilter(f)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
                                        actionFilter === f
                                            ? 'bg-white text-emerald-700 shadow-md shadow-emerald-500/5 border border-emerald-100'
                                            : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search user, resource, detail..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-emerald-500 transition-colors min-w-[260px]"
                            />
                        </div>
                    </div>

                    {/* AUDIT TABLE */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">Timestamp</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Action</th>
                                        <th className="px-6 py-4">Resource</th>
                                        <th className="px-6 py-4">Detail</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {filtered.length > 0 ? (
                                        filtered.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap font-mono">{fmtTimestamp(e.created_at)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-700">{e.username}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{e.user_role}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${ACTION_BADGE[e.action] || ACTION_BADGE.LOGIN}`}>
                                                        {e.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-600">{e.resource_type}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{e.resource_id}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={e.detail}>{e.detail}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                                                        e.status === 'failed'
                                                            ? 'bg-red-50 text-red-700 border-red-100'
                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    }`}>
                                                        {e.status === 'failed'
                                                            ? <AlertTriangle className="w-3 h-3" />
                                                            : <ShieldCheck className="w-3 h-3" />}
                                                        {e.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <ClipboardList className="w-12 h-12 text-slate-200" />
                                                    <p>No audit entries match the current filter.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                            <span className="text-xs text-slate-400">Showing {filtered.length} of {entries.length} events</span>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'User Management' && (
                <>
                    {userToast && (
                        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200">
                            <ShieldCheck className="w-4 h-4" /> {userToast}
                        </div>
                    )}

                    {/* TOOLBAR */}
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-slate-500">
                            {users.length} user{users.length === 1 ? '' : 's'} · {users.filter(u => u.status === 'active').length} active
                        </p>
                        {!isReadOnly && (
                            <button
                                onClick={() => { setUserError(''); setUserForm({ username: '', role: 'Planner' }); setUserModal(true); }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" /> Add User
                            </button>
                        )}
                    </div>

                    {/* USERS TABLE */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Created</th>
                                        {!isReadOnly && <th className="px-6 py-4 text-right">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {users.map(u => (
                                        <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.status === 'inactive' ? 'opacity-50' : ''}`}>
                                            <td className="px-6 py-4 font-semibold text-slate-700">{u.username}</td>
                                            <td className="px-6 py-4">
                                                {isReadOnly ? (
                                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${ROLE_BADGE[u.role] || ROLE_BADGE.Management}`}>{u.role}</span>
                                                ) : (
                                                    <select
                                                        value={u.role}
                                                        onChange={e => handleRoleChange(u, e.target.value)}
                                                        aria-label={`Role for ${u.username}`}
                                                        className="text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
                                                    >
                                                        {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs font-mono">{u.created_at}</td>
                                            {!isReadOnly && (
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleToggleStatus(u)}
                                                        title={u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                                                        className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${u.status === 'active' ? 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}
                                                    >
                                                        <Power className="w-3 h-3" /> {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
                            <span className="text-xs text-slate-400">{users.length} user{users.length === 1 ? '' : 's'}</span>
                        </div>
                    </div>

                    {/* ADD USER MODAL */}
                    {isUserModalOpen && (
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setUserModal(false)}>
                            <div role="dialog" aria-label="Add user" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-slate-800">Add User</h3>
                                    <button onClick={() => setUserModal(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                                </div>
                                {userError && (
                                    <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">{userError}</div>
                                )}
                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <div className="space-y-1">
                                        <label htmlFor="nu-username" className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                                        <input
                                            id="nu-username" type="text" required value={userForm.username}
                                            onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                            placeholder="e.g. budi"
                                            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-700 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="nu-role" className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Role</label>
                                        <select
                                            id="nu-role" value={userForm.role}
                                            onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-700 text-sm"
                                        >
                                            {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setUserModal(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200">Cancel</button>
                                        <button type="submit" className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700">Add User</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
