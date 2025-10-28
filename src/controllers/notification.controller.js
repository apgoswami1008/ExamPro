const { Notification } = require('../models');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort('-createdAt')
            .limit(20);
            
        res.render('pages/notifications', {
            title: 'Notifications',
            notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        req.flash('error', 'Could not fetch notifications');
        res.redirect('back');
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );
        
        if (req.xhr) {
            return res.json({ success: true });
        }
        
        res.redirect(req.body.returnUrl || '/notifications');
    } catch (error) {
        console.error('Error marking notification as read:', error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Could not mark notification as read' });
        }
        req.flash('error', 'Could not mark notification as read');
        res.redirect('back');
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, read: false },
            { read: true }
        );
        
        if (req.xhr) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'All notifications marked as read');
        res.redirect('/notifications');
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Could not mark notifications as read' });
        }
        req.flash('error', 'Could not mark notifications as read');
        res.redirect('back');
    }
};

exports.delete = async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        
        if (req.xhr) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Notification deleted');
        res.redirect('/notifications');
    } catch (error) {
        console.error('Error deleting notification:', error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Could not delete notification' });
        }
        req.flash('error', 'Could not delete notification');
        res.redirect('back');
    }
};