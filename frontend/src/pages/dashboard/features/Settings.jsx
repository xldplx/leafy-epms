import { useState, useMemo } from 'react';
import {
    ClipboardList, Search, Download, ShieldCheck, Activity, AlertTriangle, Users, Lock,
} from 'lucide-react';
import { load } from '../../../utils/localStore';
import { exportWorkbook, exportFilename } from '../../../utils/excelExport';
import { auditSeed, AUDIT_ACTIONS } from '../../../data/auditSeed';
// NOTE: when Ananta ships GET /audit-logs, swap the localStore read below for
// `import { auditApi } from '../../../utils/api'` + auditApi.getAll(filters).

const AUDIT_KEY = 'epms.audit_log.v1';

// Tab scaffold — July's "User Management" tab slots in here as one more entry.
const TABS = ['Audit Log'];

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

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-slate-50 text-slate-500 border-slate-200">
                            Demo Data
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
                    disabled={filtered.length === 0}
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
        </div>
    );
}
