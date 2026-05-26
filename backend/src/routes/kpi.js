const router = require('express').Router();
const ctrl = require('../controllers/kpiController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/dashboard', ctrl.getDashboardStats);
router.get('/project/:projectId', ctrl.getByProject);
router.get('/project/:projectId/summary', ctrl.getProjectSummary);
router.get('/project/:projectId/auto', ctrl.autoCalculate);
router.post('/project/:projectId', authorize('admin','manager'), ctrl.addSnapshot);
router.post('/project/:projectId/auto-snapshot', authorize('admin','manager'), ctrl.autoSnapshot);

module.exports = router;
