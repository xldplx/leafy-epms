import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Plus, ChevronRight, ChevronDown, ListTodo, X, Calendar, DollarSign, Clock, Loader2, GitBranch, Pencil, Trash2, AlertTriangle, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/evmHelpers';
import { STATUS_STYLES, INPUT_CLASS } from '../../../utils/uiConstants';
import { apiFetch } from '../../../utils/api';
import { load, save } from '../../../utils/localStore';
import { useTranslation } from '../../../utils/i18n';

function WbsNode({ node, allNodes, expandedNodes, toggleExpand, selectedWbsId, setSelectedWbsId, overrides, canRename, editingId, setEditingId, onRename, t }) {
    const children    = allNodes.filter(n => n.parent_id === node.id);
    const hasChildren = children.length > 0;
    const isExpanded  = expandedNodes.has(node.id);
    const isSelected  = selectedWbsId === node.id;
    const indent      = (node.level - 1) * 16;
    const displayName = (overrides && overrides[node.id]) || node.name;
    const isEditing   = editingId === node.id;
    const [draft, setDraft] = useState(displayName);

    useEffect(() => { if (isEditing) setDraft(displayName); }, [isEditing, displayName]);

    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed === '' || trimmed === node.name) { onRename(node.id, ''); } else { onRename(node.id, trimmed); }
        setEditingId(null);
    };

    return (
        <div>
            <div style={{ paddingLeft: `${indent + 8}px` }}
                className={`group w-full flex items-center gap-2 py-2 pr-2 rounded-lg text-sm transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'} ${isEditing ? '' : 'cursor-pointer'}`}
                onClick={() => { if (!isEditing) setSelectedWbsId(node.id); }}
                role={isEditing ? undefined : 'button'}>
                {hasChildren ? (
                    <span role="button" tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); toggleExpand(node.id); } }}
                        className="w-3.5 h-3.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                ) : <div className="w-3.5 h-3.5 shrink-0" />}
                <span className="font-mono text-[10px] text-slate-400 shrink-0">{node.wbs_code}</span>
                {isEditing ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                        <input type="text" autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); } }}
                            className="flex-1 min-w-0 px-2 py-0.5 text-sm bg-white border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        <button type="button" onClick={commit} className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Check className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => setEditingId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                    </div>
                ) : (
                    <>
                        <span className="truncate text-left flex-1 min-w-0">{displayName}</span>
                        {canRename && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setEditingId(node.id); }}
                                title="Rename" className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                    </>
                )}
            </div>
            {hasChildren && isExpanded && children.map(child => (
                <WbsNode key={child.id} node={child} allNodes={allNodes} expandedNodes={expandedNodes} toggleExpand={toggleExpand}
                    selectedWbsId={selectedWbsId} setSelectedWbsId={setSelectedWbsId} overrides={overrides}
                    canRename={canRename} editingId={editingId} setEditingId={setEditingId} onRename={onRename} t={t} />
            ))}
        </div>
    );
}

export default function ProjectDetail({ project, onBack }) {
    const { t } = useTranslation();
    const [tasks, setTasks]             = useState([]);
    const [wbsNodes, setWbsNodes]       = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [selectedWbsId, setSelectedWbsId] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId]     = useState(null);
    const [taskForm, setTaskForm] = useState({ task_name: '', wbs_id: '', planned_start: '', planned_end: '', planned_cost: '', planned_hours: '', weight: '' });
    const [taskError, setTaskError]   = useState('');
    const [savingTask, setSavingTask] = useState(false);

    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [deletingTask, setDeletingTask]     = useState(false);
    const [deleteError, setDeleteError]       = useState('');

    const [isWbsModalOpen, setIsWbsModalOpen] = useState(false);
    const [wbsForm, setWbsForm] = useState({ wbs_code: '', name: '', parent_id: '', level: '1' });
    const [wbsError, setWbsError]   = useState('');
    const [savingWbs, setSavingWbs] = useState(false);

    const [isLocked, setIsLocked]               = useState(false);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);
    const [baselineName, setBaselineName]       = useState('Baseline Rev.0');
    const [baseline, setBaseline]               = useState(null);
    const [lockingBaseline, setLockingBaseline] = useState(false);
    const [lockError, setLockError]             = useState('');
    const baselineCacheKey = `epms.baseline.v1.${project.id}`;

    const wbsOverrideKey = `epms.wbs_name_overrides.v1.${project.id}`;
    const [wbsOverrides, setWbsOverrides] = useState({});
    const [editingWbsId, setEditingWbsId] = useState(null);

    const userRole = localStorage.getItem('userRole');
    const canEdit  = userRole === 'Project Manager' || userRole === 'Planner';

    const fetchData = async () => {
        setLoadingTasks(true);
        try {
            const [taskRes, wbsRes] = await Promise.all([apiFetch(`/projects/${project.id}/tasks`), apiFetch(`/projects/${project.id}/wbs`)]);
            const fetchedTasks = taskRes.data || [];
            setTasks(fetchedTasks);
            setWbsNodes(wbsRes.data || []);
            setIsLocked(fetchedTasks.some(task => task.is_baseline_locked));
            const roots = (wbsRes.data || []).filter(n => n.parent_id === null);
            setExpandedNodes(new Set(roots.map(n => n.id)));
        } catch (e) { console.error(e); } finally { setLoadingTasks(false); }
    };

    useEffect(() => { fetchData(); }, [project.id]);
    useEffect(() => { setWbsOverrides(load(wbsOverrideKey, {})); setEditingWbsId(null); }, [wbsOverrideKey]);
    useEffect(() => {
        const cached = load(baselineCacheKey, null);
        if (cached?.name) setBaseline({ name: cached.name, lockedAt: new Date(cached.lockedAt) });
        else setBaseline(null);
    }, [baselineCacheKey]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') { setIsTaskModalOpen(false); setEditingTaskId(null); setIsLockModalOpen(false); setIsWbsModalOpen(false); setDeletingTaskId(null); } };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const renameWbsNode = (id, newName) => {
        setWbsOverrides(prev => {
            const next = { ...prev };
            const trimmed = (newName || '').trim();
            const original = wbsNodes.find(n => n.id === id)?.name;
            if (!trimmed || trimmed === original) delete next[id]; else next[id] = trimmed;
            save(wbsOverrideKey, next); return next;
        });
    };

    const resetTaskForm = () => setTaskForm({ task_name: '', wbs_id: '', planned_start: '', planned_end: '', planned_cost: '', planned_hours: '', weight: '' });
    const closeTaskModal = () => { setIsTaskModalOpen(false); setEditingTaskId(null); setTaskError(''); resetTaskForm(); };
    const openAddTaskModal = () => { setEditingTaskId(null); setTaskError(''); resetTaskForm(); setIsTaskModalOpen(true); };
    const openEditTaskModal = (task) => {
        setEditingTaskId(task.id); setTaskError('');
        setTaskForm({ task_name: task.task_name || '', wbs_id: String(task.wbs_id || ''), planned_start: (task.planned_start || '').slice(0, 10), planned_end: (task.planned_end || '').slice(0, 10), planned_cost: task.planned_cost != null ? String(task.planned_cost) : '', planned_hours: task.planned_hours != null ? String(task.planned_hours) : '', weight: task.weight != null ? String(task.weight) : '' });
        setIsTaskModalOpen(true);
    };

    const toggleExpand = (id) => setExpandedNodes(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

    const leafNodes = wbsNodes.filter(n => !wbsNodes.some(m => m.parent_id === n.id));
    const rootNodes = wbsNodes.filter(n => n.parent_id === null);

    const getDescendantIds = (nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return [];
        visited.add(nodeId);
        const children = wbsNodes.filter(n => n.parent_id === nodeId);
        return [nodeId, ...children.flatMap(c => getDescendantIds(c.id, visited))];
    };
    const selectedIds   = selectedWbsId ? getDescendantIds(selectedWbsId) : null;
    const filteredTasks = selectedIds ? tasks.filter(task => selectedIds.includes(task.wbs_id)) : tasks;
    const selectedNode  = wbsNodes.find(n => n.id === selectedWbsId);

    const totalCost   = filteredTasks.reduce((s, task) => s + parseFloat(task.planned_cost   || 0), 0);
    const totalHours  = filteredTasks.reduce((s, task) => s + parseFloat(task.planned_hours  || 0), 0);
    const totalWeight = filteredTasks.reduce((s, task) => s + parseFloat(task.weight         || 0), 0);

    const durationDays = project.planned_start && project.planned_end
        ? Math.round((new Date(project.planned_end) - new Date(project.planned_start)) / (1000 * 60 * 60 * 24)) : 0;

    const handleAddWbs = async (e) => {
        e.preventDefault(); setWbsError('');
        if (!wbsForm.wbs_code.trim()) { setWbsError(t('projects.wbsCode') + ' ' + t('common.required') + '.'); return; }
        if (!wbsForm.name.trim())     { setWbsError(t('projects.nodeName') + ' ' + t('common.required') + '.'); return; }
        if (wbsNodes.some(n => n.wbs_code === wbsForm.wbs_code.trim())) { setWbsError(t('projects.wbsCode') + ' already exists.'); return; }
        setSavingWbs(true);
        try {
            const parentId = wbsForm.parent_id ? parseInt(wbsForm.parent_id) : null;
            const level = parentId ? (wbsNodes.find(n => n.id === parentId)?.level || 1) + 1 : 1;
            const res = await apiFetch(`/projects/${project.id}/wbs`, { method: 'POST', body: JSON.stringify({ wbs_code: wbsForm.wbs_code.trim(), name: wbsForm.name.trim(), parent_id: parentId, level }) });
            if (!res.success) { setWbsError(res.message || 'Failed.'); return; }
            setIsWbsModalOpen(false); setWbsForm({ wbs_code: '', name: '', parent_id: '', level: '1' }); fetchData();
        } catch (e) { setWbsError(e.message || 'Server error.'); } finally { setSavingWbs(false); }
    };

    const handleSubmitTask = async (e) => {
        e.preventDefault(); setTaskError('');
        if (!taskForm.wbs_id)                                                         { setTaskError(t('projects.wbsNode') + ' ' + t('common.required') + '.'); return; }
        if (new Date(taskForm.planned_end) < new Date(taskForm.planned_start))        { setTaskError(t('projects.plannedEnd') + ' must be on or after ' + t('projects.plannedStart') + '.'); return; }
        if (parseFloat(taskForm.planned_cost) <= 0 || isNaN(parseFloat(taskForm.planned_cost)))   { setTaskError(t('projects.plannedCost') + ' must be greater than zero.'); return; }
        if (parseFloat(taskForm.planned_hours) <= 0 || isNaN(parseFloat(taskForm.planned_hours))) { setTaskError(t('projects.plannedHours') + ' must be greater than zero.'); return; }
        const w = parseFloat(taskForm.weight);
        if (isNaN(w) || w <= 0 || w > 1) { setTaskError(t('projects.weight') + ' must be between 0.01 and 1.00.'); return; }
        const currentTotal = tasks.reduce((s, task) => { if (editingTaskId && task.id === editingTaskId) return s; return s + parseFloat(task.weight || 0); }, 0);
        if (currentTotal + w > 1.001) { setTaskError(`Total weight would exceed 100%. ${t('projects.weightRemaining')}: ${((1 - currentTotal) * 100).toFixed(1)}%`); return; }

        setSavingTask(true);
        try {
            const wbsNode  = wbsNodes.find(n => n.id === parseInt(taskForm.wbs_id));
            const duration = Math.round((new Date(taskForm.planned_end) - new Date(taskForm.planned_start)) / (1000 * 60 * 60 * 24));
            const body = JSON.stringify({ wbs_id: parseInt(taskForm.wbs_id), wbs_code: wbsNode?.wbs_code || '', task_name: taskForm.task_name, planned_start: taskForm.planned_start, planned_end: taskForm.planned_end, planned_duration: duration, planned_cost: parseFloat(taskForm.planned_cost) || 0, planned_hours: parseFloat(taskForm.planned_hours) || 0, weight: parseFloat(taskForm.weight) || 0 });
            const res = editingTaskId
                ? await apiFetch(`/tasks/${editingTaskId}`, { method: 'PUT', body })
                : await apiFetch(`/projects/${project.id}/tasks`, { method: 'POST', body });
            if (!res.success) { setTaskError(res.message || 'Failed.'); return; }
            closeTaskModal(); fetchData();
        } catch (e) { setTaskError(e.message || 'Server error.'); } finally { setSavingTask(false); }
    };

    const handleDeleteTask = async () => {
        if (!deletingTaskId) return; setDeleteError(''); setDeletingTask(true);
        try {
            const res = await apiFetch(`/tasks/${deletingTaskId}`, { method: 'DELETE' });
            if (!res.success) { setDeleteError(res.message || 'Failed.'); return; }
            setDeletingTaskId(null); fetchData();
        } catch (e) { setDeleteError(e.message || 'Server error.'); } finally { setDeletingTask(false); }
    };

    const deletingTaskName = tasks.find(task => task.id === deletingTaskId)?.task_name;

    const handleLockBaseline = async () => {
        setLockError(''); setLockingBaseline(true);
        try {
            const name = baselineName.trim() || 'Baseline Rev.0';
            const res  = await apiFetch(`/projects/${project.id}/tasks/baseline`, { method: 'POST', body: JSON.stringify({ baseline_name: name }) });
            if (!res.success) { setLockError(res.message || 'Failed.'); return; }
            const lockedAt = new Date();
            setBaseline({ name, lockedAt });
            save(baselineCacheKey, { name, lockedAt: lockedAt.toISOString() });
            setIsLocked(true); setIsLockModalOpen(false); fetchData();
        } catch (e) { setLockError(e.message || 'Server error.'); } finally { setLockingBaseline(false); }
    };

    const currentStatus = isLocked ? 'active' : (project.status || 'planning');
    const inputCls = "w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm";

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <button onClick={onBack} className="mt-1 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{project.project_name}</h2>
                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${STATUS_STYLES[currentStatus] || STATUS_STYLES.planning}`}>
                                    {currentStatus.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-slate-400 font-mono text-xs mt-1">{project.project_code}</p>
                        </div>
                    </div>
                    {userRole === 'Project Manager' && (
                        isLocked ? (
                            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-semibold text-sm">
                                <Lock className="w-4 h-4" /> {t('projects.baselineLocked')}
                            </div>
                        ) : (
                            <button onClick={() => { if (tasks.length > 0) { setLockError(''); setIsLockModalOpen(true); } }}
                                disabled={tasks.length === 0}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-amber-100 ${tasks.length > 0 ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer' : 'bg-amber-500 text-white opacity-50 cursor-not-allowed'}`}>
                                <Lock className="w-4 h-4" />
                                {tasks.length > 0 ? t('projects.lockBaseline') : t('projects.addTasksFirst')}
                            </button>
                        )
                    )}
                </div>

                {/* Info chips */}
                <div className="flex flex-wrap gap-2 ml-14">
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" /> {t('projects.plannedStart')}: {project.planned_start ? formatDate(project.planned_start) : '—'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" /> {t('projects.plannedEnd')}: {project.planned_end ? formatDate(project.planned_end) : '—'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> {durationDays} {t('common.date')}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                        <DollarSign className="w-3.5 h-3.5" /> {formatCurrency(project.total_budget)}
                    </span>
                </div>

                {isLocked && baseline && (
                    <div className="ml-14 flex items-center gap-3 px-4 py-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl w-fit">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700"><Lock className="w-4 h-4" /></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">{t('projects.activeBaseline')}</span>
                            <span className="text-sm font-bold text-emerald-800">{baseline.name}</span>
                            <span className="text-[11px] text-emerald-700/80">
                                {tasks.length} {t('projects.tasksLocked')} {baseline.lockedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div className="flex gap-6 items-start">
                {/* WBS Tree */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 w-72 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{t('projects.wbs')}</h3>
                        {canEdit && !isLocked && (
                            <button onClick={() => setIsWbsModalOpen(true)} title={t('projects.addWbs')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {loadingTasks ? (
                        <div className="flex items-center justify-center h-16 gap-2 text-slate-300"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : (
                        <div className="space-y-0.5">
                            <button onClick={() => setSelectedWbsId(null)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedWbsId === null ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                                {t('projects.allTasks')}
                            </button>
                            {rootNodes.map(node => (
                                <WbsNode key={node.id} node={node} allNodes={wbsNodes} expandedNodes={expandedNodes} toggleExpand={toggleExpand}
                                    selectedWbsId={selectedWbsId} setSelectedWbsId={setSelectedWbsId} overrides={wbsOverrides}
                                    canRename={canEdit && !isLocked} editingId={editingWbsId} setEditingId={setEditingWbsId} onRename={renameWbsNode} t={t} />
                            ))}
                            {rootNodes.length === 0 && (
                                <div className="text-center py-6">
                                    <GitBranch className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">{t('projects.noWbs')}</p>
                                    {canEdit && !isLocked && (
                                        <button onClick={() => setIsWbsModalOpen(true)} className="mt-2 text-xs text-emerald-600 font-semibold hover:underline">
                                            {t('projects.addFirstNode')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tasks Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-w-0">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-700">{t('projects.tasks')}</h3>
                            {selectedNode ? (
                                <p className="text-xs text-slate-400 mt-0.5">
                                    <span className="font-mono text-emerald-600">{selectedNode.wbs_code}</span> — {wbsOverrides[selectedNode.id] || selectedNode.name}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-400 mt-0.5">{t('projects.showingAll')}</p>
                            )}
                        </div>
                        {canEdit && !isLocked && (
                            <button onClick={openAddTaskModal} disabled={wbsNodes.length === 0}
                                title={wbsNodes.length === 0 ? t('projects.addWbs') : t('projects.addTask')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                                <Plus className="w-4 h-4" /> {t('projects.addTask')}
                            </button>
                        )}
                        {isLocked && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                                <Lock className="w-3.5 h-3.5" /> {t('projects.readOnly')}
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-4 py-4">{t('projects.taskName')}</th>
                                    <th className="px-4 py-4">{t('projects.wbs')}</th>
                                    <th className="px-4 py-4">{t('projects.plannedStart')}</th>
                                    <th className="px-4 py-4">{t('projects.plannedEnd')}</th>
                                    <th className="px-4 py-4">{t('common.date')}</th>
                                    <th className="px-4 py-4">{t('projects.plannedCost')}</th>
                                    <th className="px-4 py-4">{t('projects.plannedHours')}</th>
                                    <th className="px-4 py-4">{t('projects.weight')}</th>
                                    <th className="px-4 py-4 text-right">{canEdit ? t('common.actions') : ''}</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                {loadingTasks ? (
                                    <tr><td colSpan="9" className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></td></tr>
                                ) : filteredTasks.length > 0 ? (
                                    filteredTasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3.5 font-semibold text-slate-700">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {isLocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
                                                    {task.task_name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{task.wbs_code}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{task.planned_start ? formatDate(task.planned_start) : '—'}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{task.planned_end   ? formatDate(task.planned_end)   : '—'}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{task.planned_duration || '—'}</td>
                                            <td className="px-4 py-3.5 text-slate-700">{formatCurrency(task.planned_cost)}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{task.planned_hours}</td>
                                            <td className="px-4 py-3.5">
                                                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-bold px-2 py-0.5 rounded-lg">
                                                    {(parseFloat(task.weight || 0) * 100).toFixed(0)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                {canEdit && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button type="button" onClick={() => openEditTaskModal(task)} disabled={isLocked}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button type="button" onClick={() => { setDeleteError(''); setDeletingTaskId(task.id); }} disabled={isLocked}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <ListTodo className="w-10 h-10 text-slate-200" />
                                                <p>{t('projects.noTasks')}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredTasks.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-50/50 text-sm font-bold text-slate-700 border-t border-slate-100">
                                        <td className="px-4 py-3.5" colSpan="5">{t('common.total')}</td>
                                        <td className="px-4 py-3.5">{formatCurrency(totalCost)}</td>
                                        <td className="px-4 py-3.5">{totalHours} hrs</td>
                                        <td className={`px-4 py-3.5 ${totalWeight > 1.001 ? 'text-red-600 font-bold' : ''}`}>{(totalWeight * 100).toFixed(1)}%</td>
                                        <td className="px-4 py-3.5"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>

            {/* ADD WBS NODE MODAL */}
            {isWbsModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsWbsModalOpen(false)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><GitBranch className="w-5 h-5" /></div>
                                <h3 className="text-xl font-bold text-slate-800">{t('projects.addWbs')}</h3>
                            </div>
                            <button onClick={() => setIsWbsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        {wbsError && <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">{wbsError}</div>}
                        <form onSubmit={handleAddWbs} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('projects.wbsCode')} <span className="text-red-500">*</span></label>
                                <input type="text" required value={wbsForm.wbs_code} onChange={e => setWbsForm({ ...wbsForm, wbs_code: e.target.value })} placeholder="e.g. 1.1 or 1.1.2" className={inputCls} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('projects.nodeName')} <span className="text-red-500">*</span></label>
                                <input type="text" required value={wbsForm.name} onChange={e => setWbsForm({ ...wbsForm, name: e.target.value })} placeholder="e.g. Foundation Works" className={inputCls} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('projects.parentNode')} <span className="text-slate-300">(optional)</span></label>
                                <select value={wbsForm.parent_id} onChange={e => setWbsForm({ ...wbsForm, parent_id: e.target.value })} className={inputCls}>
                                    <option value="">{t('projects.rootLevel')}</option>
                                    {wbsNodes.map(n => <option key={n.id} value={n.id}>{n.wbs_code} — {wbsOverrides[n.id] || n.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsWbsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">{t('common.cancel')}</button>
                                <button type="submit" disabled={savingWbs} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {savingWbs ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : t('projects.addWbs')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD / EDIT TASK MODAL */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeTaskModal}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingTaskId ? t('projects.editTask') : t('projects.addTask')}</h3>
                            <button onClick={closeTaskModal} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        {taskError && <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">{taskError}</div>}
                        <form onSubmit={handleSubmitTask} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('projects.taskName')}</label>
                                <input type="text" required value={taskForm.task_name} onChange={e => setTaskForm({ ...taskForm, task_name: e.target.value })}
                                    className={inputCls} placeholder="e.g. Bored Pile 600mm Dia." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('projects.wbsNode')}</label>
                                <select required value={taskForm.wbs_id} onChange={e => setTaskForm({ ...taskForm, wbs_id: e.target.value })} className={inputCls}>
                                    <option value="">{t('pva.selectPlaceholder')}</option>
                                    {leafNodes.map(n => <option key={n.id} value={n.id}>{n.wbs_code} — {wbsOverrides[n.id] || n.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('projects.plannedStart')}</label>
                                    <input type="date" required value={taskForm.planned_start} min={project.planned_start || undefined} max={project.planned_end || undefined}
                                        onChange={e => setTaskForm({ ...taskForm, planned_start: e.target.value })} className={inputCls} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{t('projects.plannedEnd')}</label>
                                    <input type="date" required value={taskForm.planned_end} min={taskForm.planned_start || project.planned_start || undefined} max={project.planned_end || undefined}
                                        onChange={e => setTaskForm({ ...taskForm, planned_end: e.target.value })} className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { key: 'planned_cost',  label: t('projects.plannedCost'),  placeholder: '0' },
                                    { key: 'planned_hours', label: t('projects.plannedHours'), placeholder: '0' },
                                    { key: 'weight',        label: t('projects.weight'),        placeholder: '0.00', step: '0.01', min: '0', max: '1' },
                                ].map(field => (
                                    <div key={field.key} className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{field.label}</label>
                                        <input type="number" value={taskForm[field.key]} step={field.step} min={field.min} max={field.max}
                                            onChange={e => setTaskForm({ ...taskForm, [field.key]: e.target.value })}
                                            className={inputCls} placeholder={field.placeholder} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeTaskModal} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">{t('common.cancel')}</button>
                                <button type="submit" disabled={savingTask} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {savingTask ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : (editingTaskId ? t('projects.saveChanges') : t('projects.addTask'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE TASK MODAL */}
            {deletingTaskId !== null && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !deletingTask && setDeletingTaskId(null)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">{t('projects.deleteTask')}</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            {t('projects.deleteTaskConfirm')} <strong className="text-slate-700">{deletingTaskName || 'this task'}</strong>? {t('settings.users.deleteCannotUndo')}
                        </p>
                        {deleteError && <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">{deleteError}</div>}
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingTaskId(null)} disabled={deletingTask} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-60">{t('common.cancel')}</button>
                            <button onClick={handleDeleteTask} disabled={deletingTask} className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {deletingTask ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.deleting')}</> : <><Trash2 className="w-4 h-4" /> {t('common.delete')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LOCK BASELINE MODAL */}
            {isLockModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsLockModalOpen(false)}>
                    <div role="dialog" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><Lock className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">{t('projects.lockBaseline')}</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            {t('projects.lockConfirm').replace('{count}', tasks.length)}
                        </p>
                        {lockError && <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">{lockError}</div>}
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('projects.baselineName')}</p>
                            <p className="text-base font-bold text-slate-800 mt-0.5">{baselineName.trim() || 'Baseline Rev.0'}</p>
                            <details className="mt-3 group">
                                <summary className="text-xs font-semibold text-slate-500 hover:text-emerald-600 cursor-pointer select-none list-none flex items-center gap-1">
                                    <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" /> {t('projects.customizeName')}
                                </summary>
                                <input type="text" value={baselineName} onChange={e => setBaselineName(e.target.value)} placeholder="Baseline Rev.0" className={`${INPUT_CLASS} mt-2`} />
                            </details>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsLockModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">{t('common.cancel')}</button>
                            <button onClick={handleLockBaseline} disabled={lockingBaseline} className="flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {lockingBaseline ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('projects.locking')}</> : <><Lock className="w-4 h-4" /> {t('projects.confirmLock')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}