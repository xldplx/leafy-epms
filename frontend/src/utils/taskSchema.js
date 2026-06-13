/**
 * taskSchema.js — single source of truth for task import/export columns.
 * Location: frontend/src/utils/taskSchema.js
 *
 * Both the Excel export (ProjectDetail → Tasks sheet) and the import template +
 * auto-mapping use these definitions, so a task sheet round-trips cleanly:
 * export a project's tasks → re-import the same file → identical rows.
 */

export const TASK_COLUMNS = [
    { key: 'task_name',     label: 'Task Name',     required: true,  type: 'string' },
    { key: 'wbs_code',      label: 'WBS Code',      required: true,  type: 'string' },
    { key: 'planned_cost',  label: 'Planned Cost',  required: true,  type: 'number' },
    { key: 'planned_hours', label: 'Planned Hours', required: true,  type: 'number' },
    { key: 'planned_start', label: 'Planned Start', required: false, type: 'date'   },
    { key: 'planned_end',   label: 'Planned End',   required: false, type: 'date'   },
    { key: 'weight',        label: 'Weight',        required: false, type: 'weight' },
];

const LABEL = Object.fromEntries(TASK_COLUMNS.map(c => [c.key, c.label]));

/** Convert a task object (API shape) → a label-keyed row for export. */
export function taskToRow(t) {
    return {
        [LABEL.task_name]:     t.task_name ?? '',
        [LABEL.wbs_code]:      t.wbs_code ?? '',
        [LABEL.planned_cost]:  Number(t.planned_cost)  || 0,
        [LABEL.planned_hours]: Number(t.planned_hours) || 0,
        [LABEL.planned_start]: (t.planned_start || '').slice(0, 10),
        [LABEL.planned_end]:   (t.planned_end   || '').slice(0, 10),
        [LABEL.weight]:        Number(t.weight) || 0,
    };
}

/** Sample rows for the downloadable import template (same columns as export). */
export const TASK_TEMPLATE_ROWS = [
    { [LABEL.task_name]: 'Excavation Works', [LABEL.wbs_code]: '1.1.1', [LABEL.planned_cost]: 250000000, [LABEL.planned_hours]: 160, [LABEL.planned_start]: '2026-04-01', [LABEL.planned_end]: '2026-04-30', [LABEL.weight]: 0.15 },
    { [LABEL.task_name]: 'Concrete Pouring', [LABEL.wbs_code]: '1.1.2', [LABEL.planned_cost]: 180000000, [LABEL.planned_hours]: 120, [LABEL.planned_start]: '2026-05-01', [LABEL.planned_end]: '2026-05-20', [LABEL.weight]: 0.10 },
];
