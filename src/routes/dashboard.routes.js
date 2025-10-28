const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

router.get('/dashboard', requireAuth, dashboardController.index);

module.exports = router;
