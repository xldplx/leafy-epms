/**
 * Centralized dummy data — single source of truth.
 * When Ananta's backend APIs are ready, replace these exports
 * with API fetch calls in a services/api.js module.
 */

// Full project objects (used by Projects.jsx, Overview.jsx)
export const dummyProjects = [
    {
        id: 1,
        project_name: 'Industrial Complex Phase 2',
        project_code: 'PRJ-2026-001',
        description: 'Construction of Phase 2 industrial facilities including structural, electrical, and MEP works.',
        planned_start: '2025-10-01',
        planned_end: '2026-06-30',
        total_budget: 1935000000,
        status: 'active',
        created_by: 'admin_pm',
    },
    {
        id: 2,
        project_name: 'Office Tower Renovation',
        project_code: 'PRJ-2026-002',
        description: 'Full renovation of floors 3–12 including structural assessment, interior fit-out, and MEP upgrades.',
        planned_start: '2026-01-15',
        planned_end: '2026-08-31',
        total_budget: 435000000,
        status: 'active',
        created_by: 'admin_pm',
    },
    {
        id: 3,
        project_name: 'Warehouse Expansion Block C',
        project_code: 'PRJ-2026-003',
        description: 'New warehouse block construction with loading dock, fire suppression, and electrical installation.',
        planned_start: '2026-03-01',
        planned_end: '2026-12-31',
        total_budget: 870000000,
        status: 'planning',
        created_by: 'admin_pm',
    },
];

// Slim project objects with schedule_pct (used by PlanVsActual, Alerts, Overview EVM)
export const dummyProjectsEvm = [
    { id: 1, project_name: 'Industrial Complex Phase 2',  project_code: 'PRJ-2026-001', schedule_pct: 0.75 },
    { id: 2, project_name: 'Office Tower Renovation',     project_code: 'PRJ-2026-002', schedule_pct: 0.50 },
    { id: 3, project_name: 'Warehouse Expansion Block C', project_code: 'PRJ-2026-003', schedule_pct: 0.25 },
];

// Full task data with actuals (used by PlanVsActual, Alerts, Overview, DailyActuals reference)
export const dummyTaskData = [
    // PRJ-2026-001
    { id: 1,  project_id: 1, wbs_code: '1.1.1', task_name: 'Bored Pile 600mm Dia.',       planned_cost: 450000000, planned_hours: 320, actual_cost: 480000000, actual_hours: 340, pct_complete: 100 },
    { id: 2,  project_id: 1, wbs_code: '1.1.2', task_name: 'Pile Cap Type PC-1',          planned_cost: 180000000, planned_hours: 140, actual_cost: 175000000, actual_hours: 135, pct_complete: 100 },
    { id: 3,  project_id: 1, wbs_code: '1.2',   task_name: 'Column & Beam Erection',      planned_cost: 920000000, planned_hours: 580, actual_cost: 580000000, actual_hours: 360, pct_complete:  60 },
    { id: 4,  project_id: 1, wbs_code: '2.1',   task_name: 'Main Distribution Board',     planned_cost: 210000000, planned_hours: 160, actual_cost:  65000000, actual_hours:  50, pct_complete:  30 },
    { id: 5,  project_id: 1, wbs_code: '2.2',   task_name: 'Fire Suppression System',     planned_cost: 175000000, planned_hours: 120, actual_cost:          0, actual_hours:   0, pct_complete:   0 },
    // PRJ-2026-002
    { id: 6,  project_id: 2, wbs_code: '1.0',   task_name: 'Structural Assessment',       planned_cost:  95000000, planned_hours:  80, actual_cost: 100000000, actual_hours:  85, pct_complete: 100 },
    { id: 7,  project_id: 2, wbs_code: '2.0',   task_name: 'Interior Fit-Out',            planned_cost: 340000000, planned_hours: 260, actual_cost: 160000000, actual_hours: 120, pct_complete:  45 },
    // PRJ-2026-003
    { id: 8,  project_id: 3, wbs_code: '1.0',   task_name: 'Site Preparation & Earthworks', planned_cost:  95000000, planned_hours: 120, actual_cost:  98000000, actual_hours: 115, pct_complete: 100 },
    { id: 9,  project_id: 3, wbs_code: '2.0',   task_name: 'Foundation & Pile Works',     planned_cost: 280000000, planned_hours: 240, actual_cost: 130000000, actual_hours: 110, pct_complete:  40 },
    { id: 10, project_id: 3, wbs_code: '3.0',   task_name: 'Structural Steel Frame',      planned_cost: 320000000, planned_hours: 280, actual_cost:          0, actual_hours:   0, pct_complete:   0 },
    { id: 11, project_id: 3, wbs_code: '4.0',   task_name: 'Electrical Installation',     planned_cost: 175000000, planned_hours: 160, actual_cost:          0, actual_hours:   0, pct_complete:   0 },
];

// WBS hierarchy (used by ProjectDetail)
export const dummyWbs = [
    { id: 1, parent_id: null, wbs_code: '1.0',   name: 'Civil Works',        level: 1 },
    { id: 2, parent_id: 1,    wbs_code: '1.1',   name: 'Foundation',          level: 2 },
    { id: 3, parent_id: 2,    wbs_code: '1.1.1', name: 'Piling Works',        level: 3 },
    { id: 4, parent_id: 2,    wbs_code: '1.1.2', name: 'Pile Cap',            level: 3 },
    { id: 5, parent_id: 1,    wbs_code: '1.2',   name: 'Structural Frame',    level: 2 },
    { id: 6, parent_id: null, wbs_code: '2.0',   name: 'MEP Works',           level: 1 },
    { id: 7, parent_id: 6,    wbs_code: '2.1',   name: 'Electrical',          level: 2 },
    { id: 8, parent_id: 6,    wbs_code: '2.2',   name: 'Plumbing',            level: 2 },
];

// Planning tasks with dates and weights (used by ProjectDetail)
export const dummyPlanTasks = [
    { id: 1, wbs_id: 3, wbs_code: '1.1.1', task_name: 'Bored Pile 600mm Dia.',   planned_start: '2026-01-15', planned_end: '2026-02-28', planned_duration: 44, planned_cost: 450000000, planned_hours: 320, weight: 0.23 },
    { id: 2, wbs_id: 4, wbs_code: '1.1.2', task_name: 'Pile Cap Type PC-1',      planned_start: '2026-03-01', planned_end: '2026-03-20', planned_duration: 19, planned_cost: 180000000, planned_hours: 140, weight: 0.17 },
    { id: 3, wbs_id: 5, wbs_code: '1.2',   task_name: 'Column & Beam Erection',  planned_start: '2026-03-21', planned_end: '2026-05-31', planned_duration: 71, planned_cost: 920000000, planned_hours: 580, weight: 0.32 },
    { id: 4, wbs_id: 7, wbs_code: '2.1',   task_name: 'Main Distribution Board', planned_start: '2026-04-01', planned_end: '2026-04-30', planned_duration: 29, planned_cost: 210000000, planned_hours: 160, weight: 0.16 },
    { id: 5, wbs_id: 8, wbs_code: '2.2',   task_name: 'Fire Suppression System', planned_start: '2026-04-15', planned_end: '2026-05-15', planned_duration: 30, planned_cost: 175000000, planned_hours: 120, weight: 0.12 },
];
