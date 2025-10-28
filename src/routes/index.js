const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const examRoutes = require('./exam.routes');
const questionRoutes = require('./question.routes');
const dashboardRoutes = require('./dashboard.routes');
const adminRoutes = require('./admin.routes');

// Home page
router.get('/', (req, res) => {
    res.render('pages/home', {
        title: 'Welcome',
        user: req.user
    });
});

// Register routes
router.use('/auth', authRoutes);
router.use('/admin/exams', examRoutes);
router.use('/admin', adminRoutes);
router.use('/', questionRoutes);
router.use('/', dashboardRoutes);

module.exports = router;