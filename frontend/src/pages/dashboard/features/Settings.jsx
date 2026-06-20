import { useState, useEffect, useMemo } from 'react';
import {
    Users, Plus, Search, X, Loader2, CheckCircle2,
    AlertTriangle, ShieldCheck, UserX, UserCheck,
    Pencil, Trash2, KeyRound, Eye, EyeOff, Shield,
    Globe, Languages, ScrollText, Download
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { INPUT_CLASS } from '../../../utils/uiConstants';
import { exportWorkbook, exportFilename } from '../../../utils/excelExport';
import { useTranslation } from '../../../utils/i18n';

const VALID_ROLES = ['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management'];

const ROLE_BADGE = {
    'Project Manager': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Planner':         'bg-blue-50 text-blue-700 border-blue-100',
    'Cost Engineer':   'bg-violet-50 text-violet-700 border-violet-100',
    'Site Engineer':   'bg-amber-50 text-amber-700 border-amber-100',
    'Management':      'bg-slate-50 text-slate-700 border-slate-200',
};

const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const EMPTY_FORM = { username: '', password: '', role: 'Planner' };

// ── LANGUAGE TAB ──────────────────────────────────────────────────────────────
function LanguageTab() {
    const { t, lang, setLang } = useTranslation();
    const [selected, setSelected] = useState(lang);
    const [saved, setSaved]       = useState(false);

    const handleSave = () => {
        setLang(selected);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const LANGUAGES = [
        {
            code:  'en',
            label: 'English',
            nativeLabel: 'English',
            flag:  '🇬🇧',
            desc:  t('settings.lang.enDesc'),
        },
        {
            code:  'id',
            label: 'Bahasa Indonesia',
            nativeLabel: 'Bahasa Indonesia',
            flag:  '🇮🇩',
            desc:  t('settings.lang.idDesc'),
        },
    ];

    return (
        <div className="space-y-8 max-w-2xl">

            {/* Header */}
            <div>
                <h3 className="text-xl font-bold text-slate-800">{t('settings.lang.title')}</h3>
                <p className="text-slate-500 text-sm mt-1">{t('settings.lang.subtitle')}</p>
            </div>

            {/* Language options */}
            <div className="space-y-3">
                {LANGUAGES.map((lng) => (
                    <button
                        key={lng.code}
                        onClick={() => setSelected(lng.code)}
                        className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                            selected === lng.code
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm shadow-emerald-100'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                    >
                        {/* Flag */}
                        <span className="text-3xl shrink-0">{lng.flag}</span>

                        {/* Labels */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800">{lng.nativeLabel}</p>
                                {lang === lng.code && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                                        {t('settings.lang.current')}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{lng.desc}</p>
                        </div>

                        {/* Radio */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            selected === lng.code
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-slate-300'
                        }`}>
                            {selected === lng.code && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Preview note */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Globe className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                        {t('settings.lang.previewTitle')}
                    </p>
                    <p className="text-xs text-slate-400">{t('settings.lang.previewNote')}</p>
                </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleSave}
                    disabled={selected === lang}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
                >
                    {t('common.save')}
                </button>
                {saved && (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold animate-in fade-in slide-in-from-left-2 duration-300">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('settings.lang.saved')}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── USER MANAGEMENT TAB ───────────────────────────────────────────────────────
function UserManagementTab({ t }) {
    const [users, setUsers]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [filterRole, setFilterRole]     = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    const [isModalOpen, setIsModalOpen]   = useState(false);
    const [editingUser, setEditingUser]   = useState(null);
    const [form, setForm]                 = useState(EMPTY_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving]             = useState(false);
    const [formError, setFormError]       = useState('');

    const [deletingUser, setDeletingUser] = useState(null);
    const [deleting, setDeleting]         = useState(false);
    const [deleteError, setDeleteError]   = useState('');

    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

    const currentUserId = useMemo(() => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            // parseInt ensures integer comparison with user.id from Supabase
            return parseInt(payload.id);
        } catch { return null; }
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/users');
            setUsers(res.data || []);
        } catch (e) {
            showToast(e.message || 'Failed to load users.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    useEffect(() => {
        const handler = (e) => {
            if (e.key !== 'Escape') return;
            setIsModalOpen(false);
            setDeletingUser(null);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const showToast = (msg, type = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
    };

    const kpi = useMemo(() => ({
        total:    users.length,
        active:   users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        roles:    new Set(users.map(u => u.role)).size,
    }), [users]);

    const filtered = useMemo(() => users.filter(u => {
        if (filterRole !== 'All' && u.role !== filterRole) return false;
        if (filterStatus === t('common.active')   && !u.is_active) return false;
        if (filterStatus === t('common.inactive') &&  u.is_active) return false;
        if (filterStatus === 'Active'   && !u.is_active) return false;
        if (filterStatus === 'Inactive' &&  u.is_active) return false;
        if (search && !u.username.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }), [users, filterRole, filterStatus, search, t]);

    const openAddModal = () => {
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setForm({ username: user.username, password: '', role: user.role });
        setFormError('');
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.username.trim())                                 { setFormError(t('settings.users.username') + ' ' + t('common.required') + '.'); return; }
        if (!editingUser && form.password.length < 6)             { setFormError(t('settings.users.minPassword') + '.'); return; }
        if (editingUser && form.password && form.password.length < 6) { setFormError(t('settings.users.minPassword') + '.'); return; }

        setSaving(true);
        try {
            if (editingUser) {
                const payload = { username: form.username.trim(), role: form.role };
                if (form.password) payload.password = form.password;
                await apiFetch(`/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast(`"${form.username}" ${t('settings.users.updatedSuccess')}`);
            } else {
                await apiFetch('/users', {
                    method: 'POST',
                    body: JSON.stringify({ username: form.username.trim(), password: form.password, role: form.role }),
                });
                showToast(`"${form.username}" ${t('settings.users.createdSuccess')}`);
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (e) {
            setFormError(e.message || 'An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (user) => {
        try {
            const endpoint = user.is_active
                ? `/users/${user.id}/deactivate`
                : `/users/${user.id}/activate`;
            await apiFetch(endpoint, { method: 'PATCH' });
            showToast(`"${user.username}" ${user.is_active ? t('settings.users.deactivatedSuccess') : t('settings.users.activatedSuccess')}`);
            fetchUsers();
        } catch (e) {
            showToast(e.message || 'Failed to update status.', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;
        setDeleteError('');
        setDeleting(true);
        try {
            await apiFetch(`/users/${deletingUser.id}`, { method: 'DELETE' });
            showToast(`"${deletingUser.username}" ${t('settings.users.deletedSuccess')}`);
            setDeletingUser(null);
            fetchUsers();
        } catch (e) {
            setDeleteError(e.message || 'Failed to delete user.');
        } finally {
            setDeleting(false);
        }
    };

    const roleDescMap = {
        'Project Manager': t('settings.users.pmDesc'),
        'Planner':         t('settings.users.plannerDesc'),
        'Cost Engineer':   t('settings.users.costDesc'),
        'Site Engineer':   t('settings.users.siteDesc'),
        'Management':      t('settings.users.mgmtDesc'),
    };

    return (
        <div className="space-y-8">

            {/* TOAST */}
            {toast.show && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200 ${
                    toast.type === 'error' ? 'bg-red-600 text-white shadow-red-200' : 'bg-emerald-600 text-white shadow-emerald-200'
                }`}>
                    {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{t('settings.users.title')}</h3>
                    <p className="text-slate-500 text-sm mt-1">{t('settings.users.subtitle')}</p>
                </div>
                <button onClick={openAddModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                    <Plus className="w-5 h-5" /> {t('settings.users.addUser')}
                </button>
            </div>

            {/* KPI STRIP */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500 w-fit mb-3"><Users className="w-4 h-4" /></div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('settings.users.totalUsers')}</h3>
                    <p className="text-2xl font-black text-slate-800 mt-1">{kpi.total}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 w-fit mb-3"><UserCheck className="w-4 h-4" /></div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('settings.users.active')}</h3>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{kpi.active}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-2.5 bg-red-50 rounded-xl text-red-500 w-fit mb-3"><UserX className="w-4 h-4" /></div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('settings.users.inactive')}</h3>
                    <p className="text-2xl font-black text-red-500 mt-1">{kpi.inactive}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-2.5 bg-violet-50 rounded-xl text-violet-600 w-fit mb-3"><Shield className="w-4 h-4" /></div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('settings.users.rolesInUse')}</h3>
                    <p className="text-2xl font-black text-violet-600 mt-1">{kpi.roles}</p>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
                        {['All', 'Active', 'Inactive'].map(f => (
                            <button key={f} onClick={() => setFilterStatus(f)}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                    filterStatus === f ? 'bg-white text-emerald-700 shadow-md border border-emerald-100' : 'text-slate-400 hover:text-slate-700'
                                }`}>
                                {f === 'All' ? t('common.all') : f === 'Active' ? t('common.active') : t('common.inactive')}
                            </button>
                        ))}
                    </div>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                        className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-600 shadow-sm">
                        <option value="All">{t('settings.users.allRoles')}</option>
                        {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder={t('settings.users.searchPlaceholder')}
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 outline-none focus:border-emerald-500 transition-colors min-w-[240px] shadow-sm" />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                        <p className="text-xs font-bold uppercase tracking-widest">{t('common.loading')}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">{t('settings.users.colUser')}</th>
                                        <th className="px-6 py-4">{t('settings.users.colRole')}</th>
                                        <th className="px-6 py-4">{t('settings.users.colCreatedBy')}</th>
                                        <th className="px-6 py-4">{t('settings.users.colJoined')}</th>
                                        <th className="px-6 py-4">{t('settings.users.colStatus')}</th>
                                        <th className="px-6 py-4 text-right">{t('settings.users.colActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {filtered.length > 0 ? filtered.map(user => {
                                        const isSelf = parseInt(user.id) === currentUserId;
                                        return (
                                            <tr key={user.id} className={`transition-colors ${!user.is_active ? 'opacity-50' : 'hover:bg-slate-50/50'}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black uppercase text-sm shadow-md shrink-0 ${user.is_active ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-300'}`}>
                                                            {user.username.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{user.username}</p>
                                                            {isSelf && (
                                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                                    {t('settings.users.you')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${ROLE_BADGE[user.role] || ROLE_BADGE['Management']}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-xs">{user.created_by || '—'}</td>
                                                <td className="px-6 py-4 text-slate-400 text-xs">{fmtDate(user.created_at)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                        {user.is_active ? t('common.active') : t('common.inactive')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => openEditModal(user)} title={t('common.edit')}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        {!isSelf && (
                                                            <button onClick={() => handleToggleActive(user)}
                                                                title={user.is_active ? t('settings.users.deactivate') : t('settings.users.activate')}
                                                                className={`p-2 rounded-lg transition-colors ${user.is_active ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                                                                {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                        {!isSelf && (
                                                            <button onClick={() => { setDeleteError(''); setDeletingUser(user); }}
                                                                title={t('common.delete')}
                                                                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Users className="w-12 h-12 text-slate-200" />
                                                    <p className="text-sm">{t('settings.users.noMatch')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-400">{t('common.showing')} {filtered.length} {t('common.of')} {users.length}</span>
                            <span className="text-xs text-slate-400">{kpi.active} {t('common.active')} · {kpi.inactive} {t('common.inactive')}</span>
                        </div>
                    </>
                )}
            </div>

            {/* ADD / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${editingUser ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {editingUser ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{editingUser ? t('settings.users.editUser') : t('settings.users.addNewUser')}</h3>
                                    {editingUser && <p className="text-xs text-slate-400 mt-0.5 font-mono">{editingUser.username}</p>}
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {formError && (
                            <div className="p-3 mb-5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                    {t('settings.users.username')} <span className="text-red-500">*</span>
                                </label>
                                <input type="text" required value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    placeholder="e.g. john_doe" className={INPUT_CLASS} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                    {t('settings.users.role')} <span className="text-red-500">*</span>
                                </label>
                                <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={INPUT_CLASS}>
                                    {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                    {editingUser ? t('settings.users.newPassword') : t('settings.users.password')}{' '}
                                    {editingUser
                                        ? <span className="text-slate-300 normal-case font-normal">({t('settings.users.passwordHint')})</span>
                                        : <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><KeyRound className="w-4 h-4" /></div>
                                    <input type={showPassword ? 'text' : 'password'} required={!editingUser}
                                        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                        placeholder={editingUser ? '••••••••' : t('settings.users.minPassword')}
                                        className={`${INPUT_CLASS} pl-11 pr-11`} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Role permissions */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5" /> {t('settings.users.rolePerms')}
                                </p>
                                <div className="space-y-1">
                                    {VALID_ROLES.map(r => (
                                        <div key={r} className={`flex items-start gap-2 px-2 py-1 rounded-lg text-[10px] transition-colors ${form.role === r ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                            <span className="font-bold w-28 shrink-0">{r}</span>
                                            <span className="opacity-80">{roleDescMap[r]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : (editingUser ? t('settings.users.saveChanges') : t('settings.users.createUser'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deletingUser && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !deleting && setDeletingUser(null)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><Trash2 className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">{t('settings.users.deleteUser')}</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-2 leading-relaxed">
                            {t('settings.users.deleteConfirm')} <strong className="text-slate-700">{deletingUser.username}</strong>? {t('settings.users.deleteCannotUndo')}
                        </p>
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl mb-6 font-medium">
                            {t('settings.users.deactivateTip')}
                        </p>
                        {deleteError && (
                            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {deleteError}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingUser(null)} disabled={deleting}
                                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-60">
                                {t('common.cancel')}
                            </button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.deleting')}</> : <><Trash2 className="w-4 h-4" /> {t('common.delete')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── AUDIT LOG TAB ─────────────────────────────────────────────────────────────
const ACTION_BADGE = {
    CREATE:   'bg-emerald-50 text-emerald-700 border-emerald-100',
    UPDATE:   'bg-blue-50 text-blue-700 border-blue-100',
    DELETE:   'bg-red-50 text-red-600 border-red-100',
    LOGIN:    'bg-violet-50 text-violet-700 border-violet-100',
    LOGOUT:   'bg-slate-50 text-slate-600 border-slate-200',
    CHECKOUT: 'bg-amber-50 text-amber-700 border-amber-100',
    RETURN:   'bg-teal-50 text-teal-700 border-teal-100',
    SYNC:     'bg-cyan-50 text-cyan-700 border-cyan-100',
    LOCK:     'bg-orange-50 text-orange-700 border-orange-100',
    IMPORT:   'bg-indigo-50 text-indigo-700 border-indigo-100',
};

const fmtDateTime = (d) => d
    ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

const summarizeDetail = (detail) => {
    if (!detail || typeof detail !== 'object') return '—';
    const entries = Object.entries(detail);
    if (!entries.length) return '—';
    return entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ');
};

function AuditLogTab({ t }) {
    const [logs, setLogs]       = useState([]);
    const [meta, setMeta]       = useState({ usernames: [], actions: [], resource_types: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const [fUser, setFUser]         = useState('');
    const [fAction, setFAction]     = useState('');
    const [fResource, setFResource] = useState('');
    const [fFrom, setFFrom]         = useState('');
    const [fTo, setFTo]             = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (fUser)     params.set('username', fUser);
            if (fAction)   params.set('action', fAction);
            if (fResource) params.set('resource_type', fResource);
            if (fFrom)     params.set('date_from', fFrom);
            if (fTo)       params.set('date_to', fTo);
            const qs = params.toString();
            const res = await apiFetch(`/audit${qs ? `?${qs}` : ''}`);
            setLogs(res.data || []);
        } catch (e) {
            setError(e.message || 'Failed to load audit log.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        apiFetch('/audit/meta')
            .then(r => setMeta(r.data || { usernames: [], actions: [], resource_types: [] }))
            .catch(() => {});
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchLogs(); }, [fUser, fAction, fResource, fFrom, fTo]);

    const clearFilters = () => { setFUser(''); setFAction(''); setFResource(''); setFFrom(''); setFTo(''); };
    const hasFilters = fUser || fAction || fResource || fFrom || fTo;

    const handleExport = () => {
        const rows = logs.map(l => ({
            Time:          fmtDateTime(l.created_at),
            User:          l.username,
            Action:        l.action,
            Resource:      l.resource_type,
            'Resource ID': l.resource_id || '',
            Details:       summarizeDetail(l.detail),
            IP:            l.ip_address || '',
        }));
        exportWorkbook(exportFilename('Audit_Log'), [{ name: 'Audit Log', rows }]);
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{t('settings.audit.title')}</h3>
                    <p className="text-slate-500 text-sm mt-1">{t('settings.audit.subtitle')}</p>
                </div>
                <button onClick={handleExport} disabled={logs.length === 0}
                    className="bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 px-5 py-2 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Download className="w-4 h-4" /> {t('common.export')}
                </button>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap items-center gap-2">
                <select value={fUser} onChange={e => setFUser(e.target.value)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-600 shadow-sm">
                    <option value="">{t('settings.audit.allUsers')}</option>
                    {meta.usernames.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select value={fAction} onChange={e => setFAction(e.target.value)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-600 shadow-sm">
                    <option value="">{t('settings.audit.allActions')}</option>
                    {meta.actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={fResource} onChange={e => setFResource(e.target.value)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-600 shadow-sm">
                    <option value="">{t('settings.audit.allResources')}</option>
                    {meta.resource_types.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-600 shadow-sm" />
                <span className="text-slate-400 text-xs">→</span>
                <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-600 shadow-sm" />
                {hasFilters && (
                    <button onClick={clearFilters} className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> {t('common.clear')}
                    </button>
                )}
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                        <p className="text-xs font-bold uppercase tracking-widest">{t('common.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                        <AlertTriangle className="w-10 h-10 text-red-300" />
                        <p className="text-sm">{error}</p>
                        <button onClick={fetchLogs} className="text-xs font-bold text-emerald-600 hover:underline">{t('common.retry')}</button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">{t('settings.audit.colTime')}</th>
                                        <th className="px-6 py-4">{t('settings.audit.colUser')}</th>
                                        <th className="px-6 py-4">{t('settings.audit.colAction')}</th>
                                        <th className="px-6 py-4">{t('settings.audit.colResource')}</th>
                                        <th className="px-6 py-4">{t('settings.audit.colDetails')}</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                    {logs.length > 0 ? logs.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(l.created_at)}</td>
                                            <td className="px-6 py-3 font-bold text-slate-700">{l.username}</td>
                                            <td className="px-6 py-3">
                                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${ACTION_BADGE[l.action] || ACTION_BADGE.LOGOUT}`}>
                                                    {l.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-xs">
                                                <span className="font-semibold text-slate-600">{l.resource_type}</span>
                                                {l.resource_id && <span className="text-slate-400"> #{l.resource_id}</span>}
                                            </td>
                                            <td className="px-6 py-3 text-xs text-slate-400 max-w-md truncate" title={summarizeDetail(l.detail)}>{summarizeDetail(l.detail)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <ScrollText className="w-12 h-12 text-slate-200" />
                                                    <p className="text-sm">{hasFilters ? t('settings.audit.noMatch') : t('settings.audit.empty')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-400">{t('common.showing')} {logs.length}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── MAIN SETTINGS PAGE ────────────────────────────────────────────────────────
export default function Settings() {
    const { t } = useTranslation();
    const userRole  = localStorage.getItem('userRole') || '';
    const isPM      = userRole === 'Project Manager';

    // If PM: start on Language tab. Others: only Language tab visible
    const [activeTab, setActiveTab] = useState('language');

    const TABS = [
        { id: 'language', label: t('settings.tabLanguage'), icon: <Languages className="w-4 h-4" />, roles: 'all' },
        ...(isPM ? [
            { id: 'users', label: t('settings.tabUsers'), icon: <Users className="w-4 h-4" />, roles: 'pm' },
            { id: 'audit', label: t('settings.tabAudit'), icon: <ScrollText className="w-4 h-4" />, roles: 'pm' },
        ] : []),
    ];

    return (
        <div className="space-y-8">
            {/* PAGE HEADER */}
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{t('settings.title')}</h2>
                <p className="text-slate-500 mt-1">{t('settings.subtitle')}</p>
            </div>

            {/* TAB BAR */}
            <div className="flex gap-2 bg-white/60 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/50 shadow-sm w-fit">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                            activeTab === tab.id
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 -translate-y-0.5'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                        }`}>
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'language' && <LanguageTab />}
                {activeTab === 'users'    && isPM && <UserManagementTab t={t} />}
                {activeTab === 'audit'    && isPM && <AuditLogTab t={t} />}
            </div>
        </div>
    );
}