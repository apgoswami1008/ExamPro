const express = require('express');
const router = express.Router();
const examController = require('../controllers/exam.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All exam routes require authentication and admin privileges
router.use(authMiddleware.requireAuth, authMiddleware.requireAdmin);

// Exam Routes
router.get('/', examController.index);
router.get('/create', examController.create);
router.post('/', examController.store);
router.get('/:id', examController.show);
router.get('/:id/edit', examController.edit);
router.put('/:id', examController.update);
router.delete('/:id', examController.destroy);

// Additional exam actions
router.patch('/:id/publish', examController.publish);
router.patch('/:id/unpublish', examController.unpublish);
router.post('/:id/duplicate', examController.duplicate);
router.get('/:id/preview', examController.preview);

module.exports = router;