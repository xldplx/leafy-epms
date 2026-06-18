const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors    = require('cors');
const { PORT } = require('./config/constants');
const { authenticate, authorize } = require('./middleware/auth');

const auth        = require('./controllers/authController');
const projects    = require('./controllers/projectsController');
const tasks       = require('./controllers/tasksController');
const wbs         = require('./controllers/wbsController');
const daily       = require('./controllers/dailyActualsController');
const personnel   = require('./controllers/personnelController');
const alertsEvm   = require('./controllers/alertsEvmController');
const users       = require('./controllers/usersController');
const consumables = require('./controllers/consumablesController');
const budget      = require('./controllers/budgetController');

const app = express();
app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/login', auth.login);
app.get ('/api/me',    authenticate, auth.getMe);

// ── Users ─────────────────────────────────────────────────────────────────────
app.get   ('/api/users',                authenticate, authorize('Project Manager'), users.getAllUsers);
app.get   ('/api/users/:id',            authenticate, authorize('Project Manager'), users.getUserById);
app.post  ('/api/users',                authenticate, authorize('Project Manager'), users.createUser);
app.put   ('/api/users/:id',            authenticate, authorize('Project Manager'), users.updateUser);
app.patch ('/api/users/:id/deactivate', authenticate, authorize('Project Manager'), users.deactivateUser);
app.patch ('/api/users/:id/activate',   authenticate, authorize('Project Manager'), users.activateUser);
app.delete('/api/users/:id',            authenticate, authorize('Project Manager'), users.deleteUser);

// ── Projects ──────────────────────────────────────────────────────────────────
app.get   ('/api/projects',     authenticate, projects.getAllProjects);
app.get   ('/api/projects/:id', authenticate, projects.getProjectById);
app.post  ('/api/projects',     authenticate, authorize('Project Manager'), projects.createProject);
app.put   ('/api/projects/:id', authenticate, authorize('Project Manager'), projects.updateProject);
app.delete('/api/projects/:id', authenticate, authorize('Project Manager'), projects.deleteProject);

// ── WBS ───────────────────────────────────────────────────────────────────────
app.get   ('/api/projects/:projectId/wbs',     authenticate, wbs.getWbsByProject);
app.post  ('/api/projects/:projectId/wbs',     authenticate, authorize('Project Manager','Planner'), wbs.createWbsNode);
app.delete('/api/projects/:projectId/wbs/:id', authenticate, authorize('Project Manager'), wbs.deleteWbsNode);

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get   ('/api/projects/:projectId/tasks',          authenticate, tasks.getTasksByProject);
app.post  ('/api/projects/:projectId/tasks',          authenticate, authorize('Project Manager','Planner'), tasks.createTask);
app.post  ('/api/projects/:projectId/tasks/import',   authenticate, authorize('Project Manager','Planner'), tasks.bulkImportTasks);
app.post  ('/api/projects/:projectId/tasks/baseline', authenticate, authorize('Project Manager'), tasks.lockBaseline);
app.put   ('/api/tasks/:id',                          authenticate, authorize('Project Manager','Planner','Cost Engineer'), tasks.updateTask);
app.delete('/api/tasks/:id',                          authenticate, authorize('Project Manager'), tasks.deleteTask);

// ── Daily Actuals ─────────────────────────────────────────────────────────────
app.get ('/api/projects/:projectId/daily-actuals', authenticate, daily.getDailyActuals);
app.post('/api/projects/:projectId/daily-actuals', authenticate, authorize('Project Manager','Site Engineer'), daily.submitDailyActuals);

// ── Personnel ─────────────────────────────────────────────────────────────────
app.get   ('/api/personnel',     authenticate, personnel.getAllPersonnel);
app.post  ('/api/personnel',     authenticate, authorize('Project Manager','Planner','Site Engineer'), personnel.createPersonnel);
app.put   ('/api/personnel/:id', authenticate, authorize('Project Manager','Planner','Site Engineer'), personnel.updatePersonnel);
app.delete('/api/personnel/:id', authenticate, authorize('Project Manager'), personnel.deletePersonnel);

// ── Consumables ───────────────────────────────────────────────────────────────
app.get   ('/api/consumables',     authenticate, consumables.getAllConsumables);
app.post  ('/api/consumables',     authenticate, authorize('Project Manager','Planner'), consumables.createConsumable);
app.put   ('/api/consumables/:id', authenticate, authorize('Project Manager','Planner'), consumables.updateConsumable);
app.delete('/api/consumables/:id', authenticate, authorize('Project Manager'), consumables.deleteConsumable);

// ── Consumable Logs ───────────────────────────────────────────────────────────
app.get ('/api/consumable-logs', authenticate, consumables.getLogs);
app.post('/api/consumable-logs', authenticate, authorize('Project Manager','Planner','Site Engineer'), consumables.logConsumption);

// ── Budget ────────────────────────────────────────────────────────────────────
app.get   ('/api/budget',     authenticate, budget.getBudgetByProject);
app.post  ('/api/budget',     authenticate, authorize('Project Manager','Cost Engineer'), budget.createBudgetCategory);
app.put   ('/api/budget/:id', authenticate, authorize('Project Manager','Cost Engineer'), budget.updateBudgetCategory);
app.delete('/api/budget/:id', authenticate, authorize('Project Manager'), budget.deleteBudgetCategory);

// ── Alerts & EVM ─────────────────────────────────────────────────────────────
app.get('/api/alerts/raw',        authenticate, alertsEvm.getAlertsRaw);
app.get('/api/alerts/thresholds', authenticate, alertsEvm.getThresholds);
app.put('/api/alerts/thresholds', authenticate, authorize('Project Manager'), alertsEvm.updateThresholds);
app.get('/api/alerts',            authenticate, alertsEvm.getAlerts);
app.get('/api/evm/overview',      authenticate, alertsEvm.getPortfolioOverview);
app.get('/api/evm/:projectId',    authenticate, alertsEvm.getProjectEvm);

// ── 404 & Error ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `${req.method} ${req.path} not found.` }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ success: false, message: 'Server error.' }); });

app.listen(PORT, () => console.log(`🚀 EPMS backend on http://localhost:${PORT}`));
module.exports = app;