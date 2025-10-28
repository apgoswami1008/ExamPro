const User = require('../models/user.model');
const Exam = require('../models/exam.model');
const ExamAttempt = require('../models/examAttempt.model');
const Payment = require('../models/payment.model');
const Notification = require('../models/notification.model');
const mongoose = require('mongoose');

/**
 * Admin Dashboard
 */
exports.dashboard = async (req, res) => {
    try {
        // Fetch statistics
        const [totalUsers, totalExams, totalAttempts, totalRevenue] = await Promise.all([
            User.countDocuments(),
            Exam.countDocuments(),
            ExamAttempt.countDocuments(),
            Payment.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        // Get recent exam attempts
        const attempts = await ExamAttempt.find()
            .populate('user', 'name email')
            .populate('exam', 'title totalMarks')
            .sort('-createdAt')
            .limit(5)
            .lean();

        res.render('pages/admin/dashboard', {
            layout: 'layouts/admin',
            title: 'Dashboard',
            page: 'dashboard',
            user: req.user,
            stats: {
                totalUsers,
                totalExams,
                totalAttempts,
                totalRevenue: totalRevenue[0]?.total || 0
            },
            attempts: attempts.map(attempt => ({
                id: attempt._id,
                user: attempt.user.name,
                exam: attempt.exam.title,
                score: Math.round((attempt.score / attempt.exam.totalMarks) * 100),
                status: attempt.status,
                date: new Date(attempt.createdAt).toLocaleString()
            }))
        });
    } catch (error) {
        console.error('Admin Dashboard Error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load admin dashboard'
        });
    }
};

/**
 * User Management
 */
exports.users = async (req, res) => {
    try {
        const users = await User.find()
            .populate('role')
            .sort('-createdAt')
            .limit(50)
            .lean();

        res.render('pages/admin/users', {
            layout: 'layouts/admin',
            title: 'User Management',
            page: 'users',
            user: req.user,
            usersList: users.map(u => ({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.role?.name || 'user',
                status: u.isActive ? 'active' : 'inactive',
                joined: new Date(u.createdAt).toLocaleDateString(),
                exams: 0 // Will be populated from exam attempts
            }))
        });
    } catch (error) {
        console.error('User Management Error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load users'
        });
    }
};

/**
 * Exam Results Management
 */
exports.results = async (req, res) => {
    try {
        const results = await ExamAttempt.find()
            .populate('user', 'name email')
            .populate('exam', 'title totalMarks passingMarks')
            .sort('-createdAt')
            .limit(50)
            .lean();

        // Calculate stats
        const totalPassed = results.filter(r => r.status === 'pass').length;
        const totalFailed = results.filter(r => r.status === 'fail').length;
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length || 0;

        res.render('pages/admin/results', {
            layout: 'layouts/admin',
            title: 'Results Management',
            page: 'results',
            user: req.user,
            stats: {
                totalPassed,
                totalFailed,
                avgScore: avgScore.toFixed(1)
            }
        });
    } catch (error) {
        console.error('Results Management Error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load results'
        });
    }
};

/**
 * Notifications Management
 */
exports.notifications = async (req, res) => {
    try {
        res.render('pages/admin/notifications', {
            layout: 'layouts/admin',
            title: 'Notifications',
            page: 'notifications',
            user: req.user
        });
    } catch (error) {
        console.error('Notifications Error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load notifications'
        });
    }
};

/**
 * Settings Management
 */
exports.settings = async (req, res) => {
    try {
        res.render('pages/admin/settings', {
            layout: 'layouts/admin',
            title: 'Settings',
            page: 'settings',
            user: req.user
        });
    } catch (error) {
        console.error('Settings Error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load settings'
        });
    }
};

/**
 * Payment Management
 */
exports.payments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('user', 'name email')
            .sort('-createdAt')
            .limit(50)
            .lean();

        res.render('pages/admin/payments', {
            layout: 'layouts/admin',
            title: 'Payments',
            page: 'payments',
            user: req.user,
            payments
        });
    } catch (error) {
        console.error('Payments Error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load payments'
        });
    }
};

/**
 * Create User (AJAX)
 */
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, status } = req.body;
        
        const user = await User.create({
            name,
            email,
            password,
            role,
            isActive: status === 'active'
        });

        res.json({ success: true, message: 'User created successfully', user });
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update User (AJAX)
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, status } = req.body;

        const user = await User.findByIdAndUpdate(
            id,
            { name, email, role, isActive: status === 'active' },
            { new: true }
        );

        res.json({ success: true, message: 'User updated successfully', user });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete User (AJAX)
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Send Notification (AJAX)
 */
exports.sendNotification = async (req, res) => {
    try {
        const { type, title, message, recipients, priority } = req.body;
        
        let userIds = [];
        if (recipients === 'all') {
            const users = await User.find({}, '_id');
            userIds = users.map(u => u._id);
        }

        // Create notifications for all recipients
        const notifications = userIds.map(userId => ({
            user: userId,
            title,
            message,
            type,
            priority,
            read: false
        }));

        await Notification.insertMany(notifications);

        res.json({ success: true, message: 'Notifications sent successfully' });
    } catch (error) {
        console.error('Send Notification Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
