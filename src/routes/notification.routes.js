const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Protect all notification routes
router.use(authMiddleware.requireAuth);

// Get all notifications
router.get('/', notificationController.getNotifications);

// Mark single notification as read
router.post('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.post('/mark-all-read', notificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', notificationController.delete);

module.exports = router;