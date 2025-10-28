const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Admin routes for question management
router.get('/admin/exams/:examId/questions', authMiddleware.requireAdmin, questionController.index);
router.get('/admin/exams/:examId/questions/create', authMiddleware.requireAdmin, questionController.create);
router.post('/admin/exams/:examId/questions', authMiddleware.requireAdmin, questionController.store);
router.get('/admin/exams/:examId/questions/:id/edit', authMiddleware.requireAdmin, questionController.edit);
router.put('/admin/exams/:examId/questions/:id', authMiddleware.requireAdmin, questionController.update);
router.delete('/admin/exams/:examId/questions/:id', authMiddleware.requireAdmin, questionController.destroy);

module.exports = router;