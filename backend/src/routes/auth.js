const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/users', authenticate, authorize('admin'), ctrl.createUser);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
