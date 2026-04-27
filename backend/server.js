const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors    = require('cors');
const { PORT } = require('./config/constants');
const { authenticate, authorize } = require('./middleware/auth');

const authCtrl        = require('./controllers/authController');
const projectsCtrl    = require('./controllers/projectsController');
const tasksCtrl       = require('./controllers/tasksController');
const wbsCtrl         = require('./controllers/wbsController');
const dailyCtrl       = require('./controllers/dailyActualsController');
const personnelCtrl   = require('./controllers/personnelController');
const alertsEvmCtrl   = require('./controllers/alertsEvmController');
const equipmentCtrl   = require('./controllers/equipmentController');
const consumablesCtrl = require('./controllers/consumablesController');
const materialsCtrl   = require('./controllers/materialsController');
const toolsCtrl       = require('./controllers/toolsController');
const budgetCtrl      = require('./controllers/budgetController');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.post('/api/login', authCtrl.login);
app.get ('/api/me',    authenticate, authCtrl.getMe);

app.get   ('/api/projects',     authenticate, projectsCtrl.getAllProjects);
app.get   ('/api/projects/:id', authenticate, projectsCtrl.getProjectById);
app.post  ('/api/projects',     authenticate, authorize('Project Manager'), projectsCtrl.createProject);
app.put   ('/api/projects/:id', authenticate, authorize('Project Manager'), projectsCtrl.updateProject);
app.delete('/api/projects/:id', authenticate, authorize('Project Manager'), projectsCtrl.deleteProject);

app.get   ('/api/projects/:projectId/wbs',     authenticate, wbsCtrl.getWbsByProject);
app.post  ('/api/projects/:projectId/wbs',     authenticate, authorize('Project Manager','Planner'), wbsCtrl.createWbsNode);
app.delete('/api/projects/:projectId/wbs/:id', authenticate, authorize('Project Manager'), wbsCtrl.deleteWbsNode);

app.get   ('/api/projects/:projectId/tasks',          authenticate, tasksCtrl.getTasksByProject);
app.post  ('/api/projects/:projectId/tasks',          authenticate, authorize('Project Manager','Planner'), tasksCtrl.createTask);
app.post  ('/api/projects/:projectId/tasks/import',   authenticate, authorize('Project Manager','Planner'), tasksCtrl.bulkImportTasks);
app.post  ('/api/projects/:projectId/tasks/baseline', authenticate, authorize('Project Manager'), tasksCtrl.lockBaseline);
app.put   ('/api/tasks/:id',                          authenticate, authorize('Project Manager','Planner','Cost Engineer'), tasksCtrl.updateTask);
app.delete('/api/tasks/:id',                          authenticate, authorize('Project Manager'), tasksCtrl.deleteTask);

app.get ('/api/projects/:projectId/daily-actuals', authenticate, dailyCtrl.getDailyActuals);
app.post('/api/projects/:projectId/daily-actuals', authenticate, authorize('Project Manager','Site Engineer'), dailyCtrl.submitDailyActuals);

app.get   ('/api/personnel',     authenticate, personnelCtrl.getAllPersonnel);
app.get   ('/api/personnel/:id', authenticate, personnelCtrl.getPersonnelById);
app.post  ('/api/personnel',     authenticate, authorize('Project Manager','Planner','Site Engineer'), personnelCtrl.createPersonnel);
app.put   ('/api/personnel/:id', authenticate, authorize('Project Manager','Planner','Site Engineer'), personnelCtrl.updatePersonnel);
app.delete('/api/personnel/:id', authenticate, authorize('Project Manager'), personnelCtrl.deletePersonnel);

app.get('/api/alerts',            authenticate, alertsEvmCtrl.getAlerts);
app.get('/api/alerts/thresholds', authenticate, alertsEvmCtrl.getThresholds);
app.put('/api/alerts/thresholds', authenticate, authorize('Project Manager'), alertsEvmCtrl.updateThresholds);

app.get('/api/evm/overview',   authenticate, alertsEvmCtrl.getPortfolioOverview);
app.get('/api/evm/:projectId', authenticate, alertsEvmCtrl.getProjectEvm);

app.get   ('/api/equipment',     authenticate, equipmentCtrl.getAllEquipment);
app.post  ('/api/equipment',     authenticate, authorize('Project Manager','Site Engineer'), equipmentCtrl.createEquipment);
app.put   ('/api/equipment/:id', authenticate, authorize('Project Manager','Site Engineer'), equipmentCtrl.updateEquipment);
app.delete('/api/equipment/:id', authenticate, authorize('Project Manager'), equipmentCtrl.deleteEquipment);

app.get   ('/api/consumables',     authenticate, consumablesCtrl.getAllConsumables);
app.post  ('/api/consumables',     authenticate, authorize('Project Manager','Site Engineer'), consumablesCtrl.createConsumable);
app.put   ('/api/consumables/:id', authenticate, authorize('Project Manager','Site Engineer'), consumablesCtrl.updateConsumable);
app.delete('/api/consumables/:id', authenticate, authorize('Project Manager'), consumablesCtrl.deleteConsumable);

app.get   ('/api/materials',              authenticate, materialsCtrl.getAllMaterials);
app.post  ('/api/materials',              authenticate, authorize('Project Manager','Planner'), materialsCtrl.createMaterial);
app.put   ('/api/materials/:id',          authenticate, authorize('Project Manager','Planner'), materialsCtrl.updateMaterial);
app.delete('/api/materials/:id',          authenticate, authorize('Project Manager'), materialsCtrl.deleteMaterial);
app.get   ('/api/materials/receipts',     authenticate, materialsCtrl.getAllReceipts);
app.post  ('/api/materials/receipts',     authenticate, authorize('Project Manager','Site Engineer','Planner'), materialsCtrl.createReceipt);
app.put   ('/api/materials/receipts/:id', authenticate, authorize('Project Manager','Cost Engineer'), materialsCtrl.verifyReceipt);

app.get   ('/api/tools',     authenticate, toolsCtrl.getAllTools);
app.post  ('/api/tools',     authenticate, authorize('Project Manager','Planner','Site Engineer'), toolsCtrl.createTool);
app.put   ('/api/tools/:id', authenticate, authorize('Project Manager','Planner','Site Engineer'), toolsCtrl.updateTool);
app.delete('/api/tools/:id', authenticate, authorize('Project Manager'), toolsCtrl.deleteTool);

app.get   ('/api/budget',     authenticate, budgetCtrl.getAllBudget);
app.post  ('/api/budget',     authenticate, authorize('Project Manager','Cost Engineer'), budgetCtrl.createBudget);
app.put   ('/api/budget/:id', authenticate, authorize('Project Manager','Cost Engineer'), budgetCtrl.updateBudget);
app.delete('/api/budget/:id', authenticate, authorize('Project Manager','Cost Engineer'), budgetCtrl.deleteBudget);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` }));
app.use((err, req, res, next) => { console.error('[Error]', err.stack); res.status(500).json({ success: false, message: 'Internal server error.' }); });

app.listen(PORT, () => {
    console.log('🚀 EPMS Backend running on http://localhost:' + PORT);
});

module.exports = app;