const router = require('express').Router();
const ctrl = require('../controllers/projectsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('admin','manager'), ctrl.create);
router.put('/:id', authorize('admin','manager'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);
router.post('/:id/members', authorize('admin','manager'), ctrl.addMember);
router.delete('/:id/members/:userId', authorize('admin','manager'), ctrl.removeMember);

module.exports = router;
