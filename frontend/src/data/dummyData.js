/**
 * Centralized dummy data — single source of truth.
 * When backend APIs are ready, replace these exports
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

// Planning tasks with dates and weights (used by ProjectDetail, Analytics/Gantt/CPM)
export const dummyPlanTasks = [
    { id: 1, wbs_code: '1.1.1', task_name: 'Bored Pile 600mm Dia.',   planned_start: '2026-01-15', planned_end: '2026-02-28', planned_duration: 44, planned_cost: 450000000, planned_hours: 320, actual_hours: 340, pct_complete: 100, weight: 0.23, predecessors: [] },
    { id: 2, wbs_code: '1.1.2', task_name: 'Pile Cap Type PC-1',      planned_start: '2026-03-01', planned_end: '2026-03-20', planned_duration: 19, planned_cost: 180000000, planned_hours: 140, actual_hours: 135, pct_complete: 100, weight: 0.17, predecessors: [1] },
    { id: 3, wbs_code: '1.2',   task_name: 'Column & Beam Erection',  planned_start: '2026-03-21', planned_end: '2026-05-31', planned_duration: 71, planned_cost: 920000000, planned_hours: 580, actual_hours: 360, pct_complete:  60, weight: 0.32, predecessors: [2] },
    { id: 4, wbs_code: '2.1',   task_name: 'Main Distribution Board', planned_start: '2026-04-01', planned_end: '2026-04-30', planned_duration: 29, planned_cost: 210000000, planned_hours: 160, actual_hours:  50, pct_complete:  30, weight: 0.16, predecessors: [2] },
    { id: 5, wbs_code: '2.2',   task_name: 'Fire Suppression System', planned_start: '2026-04-15', planned_end: '2026-05-15', planned_duration: 30, planned_cost: 175000000, planned_hours: 120, actual_hours:   0, pct_complete:   0, weight: 0.12, predecessors: [4] },
];

// ─── Equipment ───────────────────────────────────────────────────────────────
export const dummyEquipment = [
    { id: 1, name: 'Crawler Crane CC-100',     type: 'Crane',       status: 'in_use',     project_id: 1, project_code: 'PRJ-2026-001', daily_rate: 8500000,  utilized_hours: 210, capacity: '100T' },
    { id: 2, name: 'Excavator CAT 320',        type: 'Excavator',   status: 'in_use',     project_id: 1, project_code: 'PRJ-2026-001', daily_rate: 4200000,  utilized_hours: 185, capacity: '20T' },
    { id: 3, name: 'Tower Crane TC-80',        type: 'Crane',       status: 'maintenance',project_id: 2, project_code: 'PRJ-2026-002', daily_rate: 7800000,  utilized_hours: 320, capacity: '80T' },
    { id: 4, name: 'Concrete Pump KCP 52',     type: 'Pump',        status: 'in_use',     project_id: 1, project_code: 'PRJ-2026-001', daily_rate: 3600000,  utilized_hours: 140, capacity: '52m' },
    { id: 5, name: 'Bulldozer D6T',            type: 'Bulldozer',   status: 'available',  project_id: null, project_code: '—',          daily_rate: 3900000,  utilized_hours:   0, capacity: '15T' },
    { id: 6, name: 'Vibratory Roller VR-12',   type: 'Compactor',   status: 'in_use',     project_id: 3, project_code: 'PRJ-2026-003', daily_rate: 2800000,  utilized_hours:  95, capacity: '12T' },
    { id: 7, name: 'Mobile Crane MC-50',       type: 'Crane',       status: 'available',  project_id: null, project_code: '—',          daily_rate: 5500000,  utilized_hours:   0, capacity: '50T' },
    { id: 8, name: 'Generator Set 500kVA',     type: 'Generator',   status: 'in_use',     project_id: 2, project_code: 'PRJ-2026-002', daily_rate: 1800000,  utilized_hours: 260, capacity: '500kVA' },
];

// ─── Consumables ─────────────────────────────────────────────────────────────
export const dummyConsumables = [
    { id: 1, name: 'Diesel Fuel',       unit: 'Liter',   qty_on_hand: 4200,  qty_used: 8800,  reorder_threshold: 1000, unit_cost:  9800,  project_id: 1, supplier: 'Pertamina' },
    { id: 2, name: 'Hydraulic Oil',     unit: 'Liter',   qty_on_hand:  320,  qty_used:  480,  reorder_threshold:  200, unit_cost: 85000,  project_id: 1, supplier: 'Shell Lubricants' },
    { id: 3, name: 'Welding Rod E6013', unit: 'Box',     qty_on_hand:   45,  qty_used:  210,  reorder_threshold:   50, unit_cost: 95000,  project_id: 1, supplier: 'Lucky Welding' },
    { id: 4, name: 'Grease (Lithium)',  unit: 'Kg',      qty_on_hand:  180,  qty_used:  220,  reorder_threshold:  100, unit_cost: 42000,  project_id: 2, supplier: 'Shell Lubricants' },
    { id: 5, name: 'Cutting Disc 14"', unit: 'Pcs',     qty_on_hand:   28,  qty_used:  155,  reorder_threshold:   30, unit_cost: 35000,  project_id: 2, supplier: 'Bosch Distributor' },
    { id: 6, name: 'Concrete Admixture',unit: 'Liter',  qty_on_hand: 1100,  qty_used: 3400,  reorder_threshold:  500, unit_cost: 28000,  project_id: 3, supplier: 'Sika Indonesia' },
    { id: 7, name: 'Engine Oil 15W-40', unit: 'Liter',  qty_on_hand:  250,  qty_used:  680,  reorder_threshold:  150, unit_cost: 62000,  project_id: 3, supplier: 'Castrol' },
    { id: 8, name: 'Safety Gloves',     unit: 'Pair',   qty_on_hand:  150,  qty_used:  320,  reorder_threshold:  100, unit_cost: 18500,  project_id: 1, supplier: 'Safety First Co.' },
];

// ─── Materials ───────────────────────────────────────────────────────────────
export const dummyMaterials = [
    { id: 1, name: 'Ready Mix Concrete K-400', spec: 'K-400 / f\'c 33 MPa', unit: 'm³',  planned_qty: 2800, actual_qty: 1920, unit_cost: 1250000,  project_id: 1, status: 'on_track' },
    { id: 2, name: 'Steel Rebar D22',           spec: 'BJTS 420B, D22mm',   unit: 'Ton',  planned_qty:  420, actual_qty:  380, unit_cost: 14500000, project_id: 1, status: 'on_track' },
    { id: 3, name: 'Steel Rebar D16',           spec: 'BJTS 420B, D16mm',   unit: 'Ton',  planned_qty:  210, actual_qty:  195, unit_cost: 14200000, project_id: 1, status: 'on_track' },
    { id: 4, name: 'Structural H-Beam 200x200', spec: 'BJ37, H200x200x8x12',unit: 'Ton',  planned_qty:   85, actual_qty:   40, unit_cost: 18900000, project_id: 2, status: 'delayed'  },
    { id: 5, name: 'Floor Tiles 60x60',         spec: 'Porcelain, Grade A',  unit: 'm²',  planned_qty: 3200, actual_qty: 1100, unit_cost:   185000, project_id: 2, status: 'on_track' },
    { id: 6, name: 'Hollow Block 10cm',         spec: '10x20x40cm, K-70',   unit: 'Pcs', planned_qty:12000, actual_qty: 3500, unit_cost:     4800, project_id: 3, status: 'on_track' },
    { id: 7, name: 'Corrugated Steel Roof',     spec: 'BJLS 0.4mm, Zincalum',unit:'m²',  planned_qty: 2400, actual_qty:    0, unit_cost:   125000, project_id: 3, status: 'not_started'},
    { id: 8, name: 'Conduit PVC 20mm',          spec: 'Medium Duty, SNI',    unit: 'm',   planned_qty: 4800, actual_qty: 1200, unit_cost:     8500, project_id: 3, status: 'on_track' },
];

// Incoming material deliveries (for Materials inventory tab)
export const dummyMaterialReceipts = [
    { id: 1, material_id: 1, date: '2026-04-01', qty: 450, unit: 'm³',  supplier: 'PT Holcim Indonesia', doc_no: 'DO-2026-0401', verified: true  },
    { id: 2, material_id: 2, date: '2026-04-02', qty:  80, unit: 'Ton', supplier: 'PT Krakatau Steel',   doc_no: 'DO-2026-0402', verified: true  },
    { id: 3, material_id: 1, date: '2026-04-05', qty: 380, unit: 'm³',  supplier: 'PT Holcim Indonesia', doc_no: 'DO-2026-0405', verified: true  },
    { id: 4, material_id: 3, date: '2026-04-06', qty:  45, unit: 'Ton', supplier: 'PT Krakatau Steel',   doc_no: 'DO-2026-0406', verified: false },
    { id: 5, material_id: 5, date: '2026-04-03', qty: 400, unit: 'm²',  supplier: 'PT Roman Ceramic',    doc_no: 'DO-2026-0403', verified: true  },
];

// ─── Tools ───────────────────────────────────────────────────────────────────
export const dummyTools = [
    { id: 1, name: 'Total Station Leica TS06', category: 'Survey',      condition: 'good', assigned_to: 'Budi Santoso',    checkout_date: '2026-03-20', return_date: '2026-05-10', project_id: 1 },
    { id: 2, name: 'Rotary Hammer SDS+ 32mm',  category: 'Power Tool',  condition: 'good', assigned_to: 'Ahmad Fauzi',     checkout_date: '2026-04-01', return_date: '2026-04-30', project_id: 1 },
    { id: 3, name: 'Concrete Vibrator 40mm',   category: 'Concrete',    condition: 'fair', assigned_to: 'Rudi Hartono',    checkout_date: '2026-03-15', return_date: '2026-05-31', project_id: 1 },
    { id: 4, name: 'Laser Level 3D',           category: 'Survey',      condition: 'good', assigned_to: 'Dewi Rahayu',     checkout_date: '2026-04-02', return_date: '2026-04-25', project_id: 2 },
    { id: 5, name: 'Multimeter Fluke 87V',     category: 'Electrical',  condition: 'good', assigned_to: 'Soni Wijaya',     checkout_date: '2026-04-03', return_date: '2026-04-30', project_id: 2 },
    { id: 6, name: 'Angle Grinder 9"',         category: 'Power Tool',  condition: 'poor', assigned_to: null,              checkout_date: null,         return_date: null,         project_id: null },
    { id: 7, name: 'Pipe Wrench 24"',          category: 'Hand Tool',   condition: 'good', assigned_to: 'Agus Setiawan',   checkout_date: '2026-04-05', return_date: '2026-05-05', project_id: 3 },
    { id: 8, name: 'Theodolite Nikon NE-101',  category: 'Survey',      condition: 'fair', assigned_to: 'Rina Kusuma',     checkout_date: '2026-03-28', return_date: '2026-06-30', project_id: 3 },
    { id: 9, name: 'Pressure Test Pump',       category: 'MEP',         condition: 'good', assigned_to: null,              checkout_date: null,         return_date: null,         project_id: null },
];

// ─── Budget ──────────────────────────────────────────────────────────────────
export const dummyBudget = [
    // PRJ-2026-001
    { id: 1,  project_id: 1, category: 'Labor',     type: 'OPEX', planned: 320000000,  actual: 290000000  },
    { id: 2,  project_id: 1, category: 'Materials',  type: 'CAPEX',planned: 980000000,  actual: 750000000  },
    { id: 3,  project_id: 1, category: 'Equipment',  type: 'OPEX', planned: 460000000,  actual: 420000000  },
    { id: 4,  project_id: 1, category: 'Consumables',type: 'OPEX', planned:  95000000,  actual:  88000000  },
    { id: 5,  project_id: 1, category: 'Tools',      type: 'CAPEX',planned:  45000000,  actual:  38000000  },
    { id: 6,  project_id: 1, category: 'Overhead',   type: 'OPEX', planned:  35000000,  actual:  32000000  },
    // PRJ-2026-002
    { id: 7,  project_id: 2, category: 'Labor',     type: 'OPEX', planned: 110000000,  actual:  85000000  },
    { id: 8,  project_id: 2, category: 'Materials',  type: 'CAPEX',planned: 210000000,  actual: 105000000  },
    { id: 9,  project_id: 2, category: 'Equipment',  type: 'OPEX', planned:  65000000,  actual:  58000000  },
    { id: 10, project_id: 2, category: 'Consumables',type: 'OPEX', planned:  28000000,  actual:  22000000  },
    { id: 11, project_id: 2, category: 'Overhead',   type: 'OPEX', planned:  22000000,  actual:  18000000  },
    // PRJ-2026-003
    { id: 12, project_id: 3, category: 'Labor',     type: 'OPEX', planned: 200000000,  actual:  95000000  },
    { id: 13, project_id: 3, category: 'Materials',  type: 'CAPEX',planned: 480000000,  actual: 140000000  },
    { id: 14, project_id: 3, category: 'Equipment',  type: 'OPEX', planned: 120000000,  actual:  58000000  },
    { id: 15, project_id: 3, category: 'Consumables',type: 'OPEX', planned:  42000000,  actual:  18000000  },
    { id: 16, project_id: 3, category: 'Overhead',   type: 'OPEX', planned:  28000000,  actual:  12000000  },
];
