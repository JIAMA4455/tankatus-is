const router = require('express').Router();
const ctrl = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/load', ctrl.getLoad);
router.put('/:id', authorize('admin'), ctrl.update);

module.exports = router;
