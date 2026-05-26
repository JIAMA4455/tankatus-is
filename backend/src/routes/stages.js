const router = require('express').Router();
const ctrl = require('../controllers/stagesController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/project/:projectId', ctrl.getByProject);
router.post('/', authorize('admin','manager'), ctrl.create);
router.put('/:id', authorize('admin','manager'), ctrl.update);
router.delete('/:id', authorize('admin','manager'), ctrl.remove);

module.exports = router;
