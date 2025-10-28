const { User } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('role');

        res.render('pages/profile', {
            title: 'My Profile',
            user
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        req.flash('error', 'Could not fetch profile data');
        res.redirect('/');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('pages/profile', {
                title: 'My Profile',
                user: req.user,
                errors: errors.array()
            });
        }

        const { name, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');

        // Update basic info
        user.name = name;

        // If changing password
        if (currentPassword && newPassword) {
            // Verify current password
            if (!(await user.comparePassword(currentPassword))) {
                return res.status(400).render('pages/profile', {
                    title: 'My Profile',
                    user: req.user,
                    error: 'Current password is incorrect'
                });
            }

            user.password = newPassword;
        }

        // Handle profile image upload if included
        if (req.file) {
            // Assuming you have a file upload middleware set up
            user.profileImage = req.file.path;
        }

        await user.save();

        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        req.flash('error', 'Could not update profile');
        res.redirect('/profile');
    }
};

exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('email notificationPreferences');

        res.render('pages/settings', {
            title: 'Settings',
            user
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        req.flash('error', 'Could not fetch settings');
        res.redirect('/profile');
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { notificationPreferences } = req.body;

        await User.findByIdAndUpdate(req.user._id, {
            notificationPreferences: {
                email: notificationPreferences.includes('email'),
                browser: notificationPreferences.includes('browser')
            }
        });

        req.flash('success', 'Settings updated successfully');
        res.redirect('/settings');
    } catch (error) {
        console.error('Error updating settings:', error);
        req.flash('error', 'Could not update settings');
        res.redirect('/settings');
    }
};