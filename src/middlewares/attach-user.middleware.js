const jwt = require('jsonwebtoken');
const models = require('../models');
const { User } = models;

/**
 * Middleware to attach user data and notifications to response locals for all templates
 */
const attachUser = async (req, res, next) => {
    try {
        // Initialize empty notifications array
        res.locals.notifications = [];
        
        // Get token from cookie
        const token = req.cookies.token;
        
        if (token) {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user data
            const user = await User.findById(decoded.id)
                .select('-password')
                .populate('role');
                
            if (user) {
                // Get unread notifications if the Notification model exists
                if (models.Notification) {
                    const notifications = await models.Notification.find({
                        user: user._id,
                        read: false
                    })
                    .sort('-createdAt')
                    .limit(5)
                    .lean();
                    
                    // Attach notifications to response locals
                    res.locals.notifications = notifications || [];
                }
                
                // Attach user to response locals and request object
                res.locals.user = user;
                req.user = user;
            }
        }
        
        // Always continue to next middleware
        next();
    } catch (error) {
        console.error('Error in attachUser middleware:', error);
        // On any error, just continue without user data
        res.locals.user = null;
        res.locals.notifications = [];
        next();
    }
};

module.exports = attachUser;