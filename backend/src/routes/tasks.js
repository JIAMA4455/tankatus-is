const router = require('express').Router();
const ctrl = require('../controllers/tasksController');
const commentCtrl = require('../controllers/commentsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/my', ctrl.getMyTasks);
router.get('/project/:projectId', ctrl.getByProject);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('admin','manager'), ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', authorize('admin','manager'), ctrl.remove);

router.post('/:taskId/comments', commentCtrl.addComment);
router.delete('/comments/:id', commentCtrl.deleteComment);

module.exports = router;
