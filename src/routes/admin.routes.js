const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');
const adminController = require('../controllers/admin.controller');

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.dashboard);

// User Management
router.get('/users', adminController.users);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Results Management
router.get('/results', adminController.results);

// Notifications
router.get('/notifications', adminController.notifications);
router.post('/notifications/send', adminController.sendNotification);

// Settings
router.get('/settings', adminController.settings);

// Payments
router.get('/payments', adminController.payments);

module.exports = router;
