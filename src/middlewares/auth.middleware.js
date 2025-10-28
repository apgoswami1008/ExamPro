const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

exports.requireAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).render('pages/error', {
                title: 'Unauthorized',
                message: 'Please login to access this resource'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id)
            .select('-password')
            .populate('role');

        if (!user) {
            return res.status(401).render('pages/error', {
                title: 'Unauthorized',
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).render('pages/error', {
            title: 'Unauthorized',
            message: 'Invalid token'
        });
    }
};

exports.requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role.name !== 'admin') {
        return res.status(403).render('pages/error', {
            title: 'Forbidden',
            message: 'This action requires administrator privileges'
        });
    }
    next();
};