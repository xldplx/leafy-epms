const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express  = require('express');
const multer   = require('multer');

const { PORT } = require('./config/constants');
const { authenticate, authorize } = require('./middleware/auth');

const authCtrl      = require('./controllers/authController');
const projectCtrl   = require('./controllers/projectsController');
const taskCtrl      = require('./controllers/tasksController');
const wbsCtrl       = require('./controllers/wbsController');
const daCtrl        = require('./controllers/dailyActualsController');
const personnelCtrl = require('./controllers/personnelController');
const {
    getAlertsRaw,
    getAlerts,
    getThresholds,
    updateThresholds,
    getPortfolioOverview,
    getProjectEvm,
} = require('./controllers/alertsEvmController');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/',           (_, res) => res.json({ status: 'OK', message: 'EPMS API running.', timestamp: new Date().toISOString() }));
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/login', authCtrl.login);
app.get ('/api/me',    authenticate, authCtrl.getMe);

// ─── Projects ─────────────────────────────────────────────────────────────────
app.get   ('/api/projects',     authenticate, projectCtrl.getAllProjects);
app.get   ('/api/projects/:id', authenticate, projectCtrl.getProjectById);
app.post  ('/api/projects',     authenticate, authorize('Project Manager'), projectCtrl.createProject);
app.put   ('/api/projects/:id', authenticate, authorize('Project Manager'), projectCtrl.updateProject);
app.delete('/api/projects/:id', authenticate, authorize('Project Manager'), projectCtrl.deleteProject);

// ─── Tasks ────────────────────────────────────────────────────────────────────
app.get   ('/api/projects/:projectId/tasks',          authenticate, taskCtrl.getTasksByProject);
app.post  ('/api/projects/:projectId/tasks',          authenticate, authorize('Project Manager', 'Planner'), taskCtrl.createTask);
app.post  ('/api/projects/:projectId/tasks/import',   authenticate, authorize('Project Manager', 'Planner'), taskCtrl.bulkImportTasks);
app.post  ('/api/projects/:projectId/tasks/baseline',      authenticate, authorize('Project Manager'), taskCtrl.lockBaseline);
app.get   ('/api/projects/:projectId/tasks/baseline-info', authenticate, taskCtrl.getBaselineInfo);
app.put   ('/api/tasks/:id',                          authenticate, authorize('Project Manager', 'Planner', 'Cost Engineer'), taskCtrl.updateTask);
app.delete('/api/tasks/:id',                          authenticate, authorize('Project Manager'), taskCtrl.deleteTask);

// ─── WBS ──────────────────────────────────────────────────────────────────────
app.get   ('/api/projects/:projectId/wbs',     authenticate, wbsCtrl.getWbsByProject);
app.post  ('/api/projects/:projectId/wbs',     authenticate, authorize('Project Manager', 'Planner'), wbsCtrl.createWbsNode);
app.put   ('/api/projects/:projectId/wbs/:id', authenticate, authorize('Project Manager', 'Planner'), wbsCtrl.updateWbsNode);
app.delete('/api/projects/:projectId/wbs/:id', authenticate, authorize('Project Manager'), wbsCtrl.deleteWbsNode);

// ─── Daily Actuals ────────────────────────────────────────────────────────────
app.get ('/api/projects/:projectId/daily-actuals',        authenticate, daCtrl.getDailyActuals);
app.post('/api/projects/:projectId/daily-actuals',        authenticate, authorize('Project Manager', 'Site Engineer'), daCtrl.submitDailyActuals);
app.post('/api/projects/:projectId/daily-actuals/upload', authenticate, authorize('Project Manager', 'Site Engineer'), upload.single('photo'), daCtrl.uploadEvidencePhoto);

// ─── Personnel ────────────────────────────────────────────────────────────────
app.get   ('/api/personnel',     authenticate, personnelCtrl.getAllPersonnel);
app.post  ('/api/personnel',     authenticate, authorize('Project Manager', 'Planner', 'Site Engineer'), personnelCtrl.createPersonnel);
app.put   ('/api/personnel/:id', authenticate, authorize('Project Manager', 'Planner', 'Site Engineer'), personnelCtrl.updatePersonnel);
app.delete('/api/personnel/:id', authenticate, authorize('Project Manager'), personnelCtrl.deletePersonnel);

// ─── Alerts & EVM ─────────────────────────────────────────────────────────────
app.get('/api/alerts/raw',        authenticate, getAlertsRaw);
app.get('/api/alerts/thresholds', authenticate, getThresholds);
app.put('/api/alerts/thresholds', authenticate, authorize('Project Manager'), updateThresholds);
app.get('/api/alerts',            authenticate, getAlerts);
app.get('/api/evm/overview',      authenticate, getPortfolioOverview);
app.get('/api/evm/:projectId',    authenticate, getProjectEvm);

// ─── 404 & Error ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `${req.method} ${req.path} not found.` }));
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 EPMS Server running on http://localhost:${PORT}`);
    console.log(`📋 API ready at http://localhost:${PORT}/api\n`);
});