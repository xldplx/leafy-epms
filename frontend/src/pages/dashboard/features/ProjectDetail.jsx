import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Plus, ChevronRight, ChevronDown, ListTodo, X, Calendar, DollarSign, Clock, Loader2, GitBranch, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/evmHelpers';
import { STATUS_STYLES, INPUT_CLASS } from '../../../utils/uiConstants';
import { apiFetch } from '../../../utils/api';

// Recursive WBS node component
function WbsNode({ node, allNodes, expandedNodes, toggleExpand, selectedWbsId, setSelectedWbsId }) {
    const children    = allNodes.filter(n => n.parent_id === node.id);
    const hasChildren = children.length > 0;
    const isExpanded  = expandedNodes.has(node.id);
    const isSelected  = selectedWbsId === node.id;
    const indent      = (node.level - 1) * 16;

    return (
        <div>
            <button
                type="button"
                style={{ paddingLeft: `${indent + 8}px` }}
                onClick={() => setSelectedWbsId(node.id)}
                aria-expanded={hasChildren ? isExpanded : undefined}
                className={`w-full flex items-center gap-2 py-2 pr-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    isSelected ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
                {hasChildren ? (
                    <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); toggleExpand(node.id); } }}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        className="w-3.5 h-3.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                ) : (
                    <div className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="font-mono text-[10px] text-slate-400 shrink-0">{node.wbs_code}</span>
                <span className="truncate text-left">{node.name}</span>
            </button>
            {hasChildren && isExpanded && children.map(child => (
                <WbsNode
                    key={child.id}
                    node={child}
                    allNodes={allNodes}
                    expandedNodes={expandedNodes}
                    toggleExpand={toggleExpand}
                    selectedWbsId={selectedWbsId}
                    setSelectedWbsId={setSelectedWbsId}
                />
            ))}
        </div>
    );
}

export default function ProjectDetail({ project, onBack }) {
    const [tasks, setTasks]       = useState([]);
    const [wbsNodes, setWbsNodes] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    const [selectedWbsId, setSelectedWbsId] = useState(null);
    const [expandedNodes, setExpandedNodes]  = useState(new Set());

    // Task modal (add + edit share the same modal)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId]     = useState(null);
    const [taskForm, setTaskForm] = useState({
        task_name: '', wbs_id: '', planned_start: '', planned_end: '',
        planned_cost: '', planned_hours: '', weight: '',
    });
    const [taskError, setTaskError]   = useState('');
    const [savingTask, setSavingTask] = useState(false);

    // Delete task confirm
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [deletingTask, setDeletingTask]     = useState(false);
    const [deleteError, setDeleteError]       = useState('');

    // Add WBS Node modal
    const [isWbsModalOpen, setIsWbsModalOpen] = useState(false);
    const [wbsForm, setWbsForm] = useState({ wbs_code: '', name: '', parent_id: '', level: '1' });
    const [wbsError, setWbsError] = useState('');
    const [savingWbs, setSavingWbs] = useState(false);

    // Baseline
    const [isLocked, setIsLocked]             = useState(false);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);
    const [baselineName, setBaselineName]      = useState('');
    const [baseline, setBaseline]              = useState(null);
    const [lockingBaseline, setLockingBaseline] = useState(false);
    const [lockError, setLockError]             = useState('');

    const userRole = localStorage.getItem('userRole');
    const canEdit  = userRole === 'Project Manager' || userRole === 'Planner';

    const fetchData = async () => {
        setLoadingTasks(true);
        try {
            const [taskRes, wbsRes] = await Promise.all([
                apiFetch(`/projects/${project.id}/tasks`),
                apiFetch(`/projects/${project.id}/wbs`),
            ]);
            const fetchedTasks = taskRes.data || [];
            setTasks(fetchedTasks);
            setWbsNodes(wbsRes.data || []);
            setIsLocked(fetchedTasks.some(t => t.is_baseline_locked));
            const roots = (wbsRes.data || []).filter(n => n.parent_id === null);
            setExpandedNodes(new Set(roots.map(n => n.id)));
        } catch (e) { console.error(e); }
        finally { setLoadingTasks(false); }
    };

    useEffect(() => { fetchData(); }, [project.id]);

    // Close modals on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                setIsTaskModalOpen(false);
                setEditingTaskId(null);
                setIsLockModalOpen(false);
                setIsWbsModalOpen(false);
                setDeletingTaskId(null);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const resetTaskForm = () => setTaskForm({
        task_name: '', wbs_id: '', planned_start: '', planned_end: '',
        planned_cost: '', planned_hours: '', weight: '',
    });

    const closeTaskModal = () => {
        setIsTaskModalOpen(false);
        setEditingTaskId(null);
        setTaskError('');
        resetTaskForm();
    };

    const openAddTaskModal = () => {
        setEditingTaskId(null);
        setTaskError('');
        resetTaskForm();
        setIsTaskModalOpen(true);
    };

    const openEditTaskModal = (task) => {
        setEditingTaskId(task.id);
        setTaskError('');
        setTaskForm({
            task_name:     task.task_name || '',
            wbs_id:        String(task.wbs_id || ''),
            planned_start: (task.planned_start || '').slice(0, 10),
            planned_end:   (task.planned_end || '').slice(0, 10),
            planned_cost:  task.planned_cost  != null ? String(task.planned_cost)  : '',
            planned_hours: task.planned_hours != null ? String(task.planned_hours) : '',
            weight:        task.weight        != null ? String(task.weight)        : '',
        });
        setIsTaskModalOpen(true);
    };

    const toggleExpand = (id) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const leafNodes = wbsNodes.filter(n => !wbsNodes.some(m => m.parent_id === n.id));
    const rootNodes = wbsNodes.filter(n => n.parent_id === null);

    const getDescendantIds = (nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return [];
        visited.add(nodeId);
        const children = wbsNodes.filter(n => n.parent_id === nodeId);
        return [nodeId, ...children.flatMap(c => getDescendantIds(c.id, visited))];
    };
    const selectedIds   = selectedWbsId ? getDescendantIds(selectedWbsId) : null;
    const filteredTasks = selectedIds ? tasks.filter(t => selectedIds.includes(t.wbs_id)) : tasks;
    const selectedNode  = wbsNodes.find(n => n.id === selectedWbsId);

    const totalCost   = filteredTasks.reduce((s, t) => s + parseFloat(t.planned_cost   || 0), 0);
    const totalHours  = filteredTasks.reduce((s, t) => s + parseFloat(t.planned_hours  || 0), 0);
    const totalWeight = filteredTasks.reduce((s, t) => s + parseFloat(t.weight         || 0), 0);

    const durationDays = project.planned_start && project.planned_end
        ? Math.round((new Date(project.planned_end) - new Date(project.planned_start)) / (1000 * 60 * 60 * 24))
        : 0;

    // ── Add WBS Node ──────────────────────────────────────────────────────────
    const handleAddWbs = async (e) => {
        e.preventDefault();
        setWbsError('');
        if (!wbsForm.wbs_code.trim()) { setWbsError('WBS Code is required.'); return; }
        if (!wbsForm.name.trim())     { setWbsError('Node name is required.'); return; }

        // Check duplicate wbs_code within project
        if (wbsNodes.some(n => n.wbs_code === wbsForm.wbs_code.trim())) {
            setWbsError('WBS Code already exists in this project.'); return;
        }

        setSavingWbs(true);
        try {
            const parentId = wbsForm.parent_id ? parseInt(wbsForm.parent_id) : null;
            const level    = parentId
                ? (wbsNodes.find(n => n.id === parentId)?.level || 1) + 1
                : 1;

            const res = await apiFetch(`/projects/${project.id}/wbs`, {
                method: 'POST',
                body: JSON.stringify({
                    wbs_code:  wbsForm.wbs_code.trim(),
                    name:      wbsForm.name.trim(),
                    parent_id: parentId,
                    level,
                }),
            });
            if (!res.success) { setWbsError(res.message || 'Failed to add WBS node.'); return; }
            setIsWbsModalOpen(false);
            setWbsForm({ wbs_code: '', name: '', parent_id: '', level: '1' });
            fetchData();
        } catch (e) {
            setWbsError(e.message || 'Server error.');
        } finally {
            setSavingWbs(false);
        }
    };

    // ── Add / Edit Task ───────────────────────────────────────────────────────
    const handleSubmitTask = async (e) => {
        e.preventDefault();
        setTaskError('');
        if (!taskForm.wbs_id) { setTaskError('Please select a WBS node.'); return; }
        if (new Date(taskForm.planned_end) < new Date(taskForm.planned_start)) {
            setTaskError('End date must be on or after start date.'); return;
        }
        if (parseFloat(taskForm.planned_cost) <= 0 || isNaN(parseFloat(taskForm.planned_cost))) {
            setTaskError('Planned cost must be greater than zero.'); return;
        }
        if (parseFloat(taskForm.planned_hours) <= 0 || isNaN(parseFloat(taskForm.planned_hours))) {
            setTaskError('Planned hours must be greater than zero.'); return;
        }
        const w = parseFloat(taskForm.weight);
        if (isNaN(w) || w <= 0 || w > 1) {
            setTaskError('Weight must be between 0.01 and 1.00.'); return;
        }
        const currentTotal = tasks.reduce((s, t) => {
            if (editingTaskId && t.id === editingTaskId) return s;
            return s + parseFloat(t.weight || 0);
        }, 0);
        if (currentTotal + w > 1.001) {
            setTaskError(`Total weight would exceed 100%. Remaining: ${((1 - currentTotal) * 100).toFixed(1)}%`); return;
        }

        setSavingTask(true);
        try {
            const wbsNode  = wbsNodes.find(n => n.id === parseInt(taskForm.wbs_id));
            const duration = Math.round((new Date(taskForm.planned_end) - new Date(taskForm.planned_start)) / (1000 * 60 * 60 * 24));
            const body = JSON.stringify({
                wbs_id:           parseInt(taskForm.wbs_id),
                wbs_code:         wbsNode?.wbs_code || '',
                task_name:        taskForm.task_name,
                planned_start:    taskForm.planned_start,
                planned_end:      taskForm.planned_end,
                planned_duration: duration,
                planned_cost:     parseFloat(taskForm.planned_cost)  || 0,
                planned_hours:    parseFloat(taskForm.planned_hours) || 0,
                weight:           parseFloat(taskForm.weight)        || 0,
            });
            const res = editingTaskId
                ? await apiFetch(`/tasks/${editingTaskId}`,             { method: 'PUT',  body })
                : await apiFetch(`/projects/${project.id}/tasks`,        { method: 'POST', body });
            if (!res.success) {
                setTaskError(res.message || (editingTaskId ? 'Failed to update task.' : 'Failed to add task.'));
                return;
            }
            closeTaskModal();
            fetchData();
        } catch (e) {
            setTaskError(e.message || 'Server error.');
        } finally {
            setSavingTask(false);
        }
    };

    // ── Delete Task ───────────────────────────────────────────────────────────
    const handleDeleteTask = async () => {
        if (!deletingTaskId) return;
        setDeleteError('');
        setDeletingTask(true);
        try {
            const res = await apiFetch(`/tasks/${deletingTaskId}`, { method: 'DELETE' });
            if (!res.success) { setDeleteError(res.message || 'Failed to delete task.'); return; }
            setDeletingTaskId(null);
            fetchData();
        } catch (e) {
            setDeleteError(e.message || 'Server error.');
        } finally {
            setDeletingTask(false);
        }
    };

    const deletingTaskName = tasks.find(t => t.id === deletingTaskId)?.task_name;

    // ── Lock Baseline ─────────────────────────────────────────────────────────
    const handleLockBaseline = async () => {
        setLockError('');
        setLockingBaseline(true);
        try {
            const name = baselineName.trim() || 'Baseline Rev.0';
            const res  = await apiFetch(`/projects/${project.id}/tasks/baseline`, {
                method: 'POST',
                body: JSON.stringify({ baseline_name: name }),
            });
            if (!res.success) { setLockError(res.message || 'Failed to lock baseline.'); return; }
            setBaseline({ name, lockedAt: new Date() });
            setIsLocked(true);
            setIsLockModalOpen(false);
            setBaselineName('');
            fetchData();
        } catch (e) {
            setLockError(e.message || 'Server error.');
        } finally {
            setLockingBaseline(false);
        }
    };

    const currentStatus = isLocked ? 'active' : (project.status || 'planning');

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <button onClick={onBack} aria-label="Go back to projects"
                            className="mt-1 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
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
                                <Lock className="w-4 h-4" /> Baseline Locked
                            </div>
                        ) : (
                            <button
                                onClick={() => { if (tasks.length > 0) { setLockError(''); setIsLockModalOpen(true); } }}
                                disabled={tasks.length === 0}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-amber-100 ${tasks.length > 0 ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer' : 'bg-amber-500 text-white opacity-50 cursor-not-allowed'}`}
                            >
                                <Lock className="w-4 h-4" />
                                {tasks.length > 0 ? 'Lock Baseline' : 'Add tasks first'}
                            </button>
                        )
                    )}
                </div>

                {/* Info chips */}
                <div className="flex flex-wrap gap-2 ml-14">
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" /> Start: {project.planned_start ? formatDate(project.planned_start) : '—'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" /> End: {project.planned_end ? formatDate(project.planned_end) : '—'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> {durationDays} days
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
                        <DollarSign className="w-3.5 h-3.5" /> {formatCurrency(project.total_budget)}
                    </span>
                </div>

                {isLocked && baseline && (
                    <div className="ml-14 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-semibold w-fit">
                        <Lock className="w-3.5 h-3.5" />
                        {baseline.name} — locked {baseline.lockedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>

            {/* MAIN CONTENT: WBS Tree + Tasks Table */}
            <div className="flex gap-6 items-start">

                {/* LEFT: WBS Tree */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 w-72 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">WBS</h3>
                        {/* ADD WBS NODE BUTTON */}
                        {canEdit && !isLocked && (
                            <button
                                onClick={() => setIsWbsModalOpen(true)}
                                title="Add WBS Node"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {loadingTasks ? (
                        <div className="flex items-center justify-center h-16 gap-2 text-slate-300">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setSelectedWbsId(null)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedWbsId === null ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                All Tasks
                            </button>
                            {rootNodes.map(node => (
                                <WbsNode
                                    key={node.id}
                                    node={node}
                                    allNodes={wbsNodes}
                                    expandedNodes={expandedNodes}
                                    toggleExpand={toggleExpand}
                                    selectedWbsId={selectedWbsId}
                                    setSelectedWbsId={setSelectedWbsId}
                                />
                            ))}
                            {rootNodes.length === 0 && (
                                <div className="text-center py-6">
                                    <GitBranch className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">No WBS nodes yet.</p>
                                    {canEdit && !isLocked && (
                                        <button
                                            onClick={() => setIsWbsModalOpen(true)}
                                            className="mt-2 text-xs text-emerald-600 font-semibold hover:underline"
                                        >
                                            + Add first node
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT: Tasks Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-w-0">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-700">Tasks</h3>
                            {selectedNode ? (
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Showing: <span className="font-mono text-emerald-600">{selectedNode.wbs_code}</span> — {selectedNode.name}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-400 mt-0.5">All tasks in this project</p>
                            )}
                        </div>
                        {canEdit && !isLocked && (
                            <button
                                onClick={openAddTaskModal}
                                disabled={wbsNodes.length === 0}
                                title={wbsNodes.length === 0 ? 'Add a WBS node first' : 'Add task'}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                <Plus className="w-4 h-4" /> Add Task
                            </button>
                        )}
                        {isLocked && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                                <Lock className="w-3.5 h-3.5" /> Baseline Locked — Read-Only
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-4 py-4">Task Name</th>
                                    <th className="px-4 py-4">WBS</th>
                                    <th className="px-4 py-4">Start</th>
                                    <th className="px-4 py-4">End</th>
                                    <th className="px-4 py-4">Days</th>
                                    <th className="px-4 py-4">Planned Cost</th>
                                    <th className="px-4 py-4">Hours</th>
                                    <th className="px-4 py-4">Weight</th>
                                    <th className="px-4 py-4 text-right">{canEdit ? 'Actions' : ''}</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-50">
                                {loadingTasks ? (
                                    <tr><td colSpan="9" className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></td></tr>
                                ) : filteredTasks.length > 0 ? (
                                    filteredTasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3.5 font-semibold text-slate-700">{task.task_name}</td>
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
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditTaskModal(task)}
                                                            disabled={isLocked}
                                                            title={isLocked ? 'Locked under baseline' : 'Edit task'}
                                                            aria-label="Edit task"
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setDeleteError(''); setDeletingTaskId(task.id); }}
                                                            disabled={isLocked}
                                                            title={isLocked ? 'Locked under baseline' : 'Delete task'}
                                                            aria-label="Delete task"
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                                                        >
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
                                                <p>No tasks under this WBS node.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredTasks.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-50/50 text-sm font-bold text-slate-700 border-t border-slate-100">
                                        <td className="px-4 py-3.5" colSpan="5">Total</td>
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

            {/* ── ADD WBS NODE MODAL ─────────────────────────────────────────── */}
            {isWbsModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsWbsModalOpen(false)}>
                    <div role="dialog" aria-label="Add WBS node" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                                    <GitBranch className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Add WBS Node</h3>
                            </div>
                            <button onClick={() => setIsWbsModalOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {wbsError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">
                                {wbsError}
                            </div>
                        )}

                        <form onSubmit={handleAddWbs} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">WBS Code <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required value={wbsForm.wbs_code}
                                    onChange={e => setWbsForm({ ...wbsForm, wbs_code: e.target.value })}
                                    placeholder="e.g. 1.1 or 1.1.2"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Node Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required value={wbsForm.name}
                                    onChange={e => setWbsForm({ ...wbsForm, name: e.target.value })}
                                    placeholder="e.g. Foundation Works"
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Parent Node <span className="text-slate-300">(optional)</span></label>
                                <select
                                    value={wbsForm.parent_id}
                                    onChange={e => setWbsForm({ ...wbsForm, parent_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                >
                                    <option value="">— Root level node —</option>
                                    {wbsNodes.map(n => (
                                        <option key={n.id} value={n.id}>{n.wbs_code} — {n.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsWbsModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingWbs}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {savingWbs ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Add Node'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── ADD / EDIT TASK MODAL ──────────────────────────────────────── */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeTaskModal}>
                    <div role="dialog" aria-label={editingTaskId ? 'Edit task' : 'Add new task'} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h3>
                            <button onClick={closeTaskModal} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {taskError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">
                                {taskError}
                            </div>
                        )}

                        <form onSubmit={handleSubmitTask} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Task Name</label>
                                <input type="text" required value={taskForm.task_name}
                                    onChange={e => setTaskForm({ ...taskForm, task_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    placeholder="e.g. Bored Pile 600mm Dia."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">WBS Node</label>
                                <select required value={taskForm.wbs_id}
                                    onChange={e => setTaskForm({ ...taskForm, wbs_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                >
                                    <option value="">Select a WBS node...</option>
                                    {leafNodes.map(n => (
                                        <option key={n.id} value={n.id}>{n.wbs_code} — {n.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Start Date</label>
                                    <input type="date" required value={taskForm.planned_start}
                                        min={project.planned_start || undefined}
                                        max={project.planned_end || undefined}
                                        onChange={e => setTaskForm({ ...taskForm, planned_start: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">End Date</label>
                                    <input type="date" required value={taskForm.planned_end}
                                        min={taskForm.planned_start || project.planned_start || undefined}
                                        max={project.planned_end || undefined}
                                        onChange={e => setTaskForm({ ...taskForm, planned_end: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Cost (IDR)</label>
                                    <input type="number" value={taskForm.planned_cost}
                                        onChange={e => setTaskForm({ ...taskForm, planned_cost: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Hours</label>
                                    <input type="number" value={taskForm.planned_hours}
                                        onChange={e => setTaskForm({ ...taskForm, planned_hours: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Weight</label>
                                    <input type="number" step="0.01" min="0" max="1" value={taskForm.weight}
                                        onChange={e => setTaskForm({ ...taskForm, weight: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeTaskModal}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingTask}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                    {savingTask
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                        : (editingTaskId ? 'Save Changes' : 'Add Task')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── DELETE TASK CONFIRM MODAL ──────────────────────────────────── */}
            {deletingTaskId !== null && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !deletingTask && setDeletingTaskId(null)}>
                    <div role="dialog" aria-label="Delete task" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">Delete Task</h3>
                        </div>

                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Permanently remove <strong className="text-slate-700">{deletingTaskName || 'this task'}</strong>?
                            This cannot be undone.
                        </p>

                        {deleteError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">
                                {deleteError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setDeletingTaskId(null)} disabled={deletingTask}
                                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-60">
                                Cancel
                            </button>
                            <button onClick={handleDeleteTask} disabled={deletingTask}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {deletingTask
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                                    : <><Trash2 className="w-4 h-4" /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LOCK BASELINE MODAL ────────────────────────────────────────── */}
            {isLockModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsLockModalOpen(false)}>
                    <div role="dialog" aria-label="Lock baseline" className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><Lock className="w-5 h-5" /></div>
                            <h3 className="text-xl font-bold text-slate-800">Lock Baseline</h3>
                        </div>

                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            This will freeze all <strong>{tasks.length} tasks</strong> and their planned values as the reference baseline.
                            You will not be able to add or edit tasks after locking.
                        </p>

                        {lockError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50/80 border border-red-100 text-red-600 text-xs text-center font-bold uppercase">
                                {lockError}
                            </div>
                        )}

                        <div className="space-y-1 mb-6">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Baseline Name</label>
                            <input type="text" value={baselineName} onChange={e => setBaselineName(e.target.value)}
                                placeholder="Baseline Rev.0" className={INPUT_CLASS} />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setIsLockModalOpen(false)}
                                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleLockBaseline} disabled={lockingBaseline}
                                className="flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {lockingBaseline ? <><Loader2 className="w-4 h-4 animate-spin" /> Locking...</> : <><Lock className="w-4 h-4" /> Confirm Lock</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}