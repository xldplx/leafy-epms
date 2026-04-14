const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const { PORT }                   = require('./config/constants');
const { authenticate, authorize } = require('./middleware/auth');

const authCtrl      = require('./controllers/authController');
const projectCtrl   = require('./controllers/projectsController');
const taskCtrl      = require('./controllers/tasksController');
const wbsCtrl       = require('./controllers/wbsController');
const daCtrl        = require('./controllers/dailyActualsController');
const personnelCtrl = require('./controllers/personnelController');
const {
    getAlerts, getThresholds, updateThresholds,
    getPortfolioOverview, getProjectEvm
} = require('./controllers/alertsEvmController');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
    status: 'OK',
    message: 'EPMS Enterprise System API is running.',
    timestamp: new Date().toISOString()
}));

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/login', authCtrl.login);
app.get('/api/me',     authenticate, authCtrl.getMe);

// ─── Projects ─────────────────────────────────────────────────────────────────
app.get('/api/projects',        authenticate, projectCtrl.getAllProjects);
app.get('/api/projects/:id',    authenticate, projectCtrl.getProjectById);
app.post('/api/projects',       authenticate, authorize('Project Manager'), projectCtrl.createProject);
app.put('/api/projects/:id',    authenticate, authorize('Project Manager'), projectCtrl.updateProject);
app.delete('/api/projects/:id', authenticate, authorize('Project Manager'), projectCtrl.deleteProject);

// ─── Tasks ────────────────────────────────────────────────────────────────────
app.get('/api/projects/:projectId/tasks',            authenticate, taskCtrl.getTasksByProject);
app.post('/api/projects/:projectId/tasks',           authenticate, authorize('Project Manager', 'Planner'), taskCtrl.createTask);
app.post('/api/projects/:projectId/tasks/import',    authenticate, authorize('Project Manager', 'Planner'), taskCtrl.bulkImportTasks);
app.post('/api/projects/:projectId/tasks/baseline',  authenticate, authorize('Project Manager'), taskCtrl.lockBaseline);
app.put('/api/tasks/:id',    authenticate, authorize('Project Manager', 'Planner'), taskCtrl.updateTask);
app.delete('/api/tasks/:id', authenticate, authorize('Project Manager', 'Planner'), taskCtrl.deleteTask);

// ─── WBS ──────────────────────────────────────────────────────────────────────
app.get('/api/projects/:projectId/wbs',        authenticate, wbsCtrl.getWbsByProject);
app.post('/api/projects/:projectId/wbs',       authenticate, authorize('Project Manager', 'Planner'), wbsCtrl.createWbsNode);
app.delete('/api/projects/:projectId/wbs/:id', authenticate, authorize('Project Manager'), wbsCtrl.deleteWbsNode);

// ─── Daily Actuals ────────────────────────────────────────────────────────────
app.get('/api/projects/:projectId/daily-actuals',  authenticate, daCtrl.getDailyActuals);
app.post('/api/projects/:projectId/daily-actuals', authenticate, authorize('Project Manager', 'Site Engineer'), daCtrl.submitDailyActuals);

// ─── Personnel ────────────────────────────────────────────────────────────────
app.get('/api/personnel',        authenticate, personnelCtrl.getAllPersonnel);
app.post('/api/personnel',       authenticate, authorize('Project Manager', 'Planner', 'Site Engineer'), personnelCtrl.createPersonnel);
app.put('/api/personnel/:id',    authenticate, authorize('Project Manager', 'Planner', 'Site Engineer'), personnelCtrl.updatePersonnel);
app.delete('/api/personnel/:id', authenticate, authorize('Project Manager'), personnelCtrl.deletePersonnel);

// ─── Alerts ───────────────────────────────────────────────────────────────────
app.get('/api/alerts',            authenticate, getAlerts);
app.get('/api/alerts/thresholds', authenticate, getThresholds);
app.put('/api/alerts/thresholds', authenticate, authorize('Project Manager'), updateThresholds);

// ─── EVM ──────────────────────────────────────────────────────────────────────
app.get('/api/evm/overview',   authenticate, getPortfolioOverview);
app.get('/api/evm/:projectId', authenticate, getProjectEvm);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` }));
app.use((err, req, res, next) => {
    console.error('[Error]', err.stack);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 EPMS Server running on http://localhost:${PORT}`);
    console.log(`📋 API ready at http://localhost:${PORT}/api\n`);
});