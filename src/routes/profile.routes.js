const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const profileController = require('../controllers/profile.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Protect all profile routes
router.use(authMiddleware.requireAuth);

// Profile update validation rules
const profileUpdateValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('currentPassword')
        .if(body('newPassword').exists({ checkFalsy: true }))
        .notEmpty()
        .withMessage('Current password is required to set a new password'),
    body('newPassword')
        .if(body('newPassword').exists({ checkFalsy: true }))
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('New password must contain a number'),
    body('confirmNewPassword')
        .if(body('newPassword').exists({ checkFalsy: true }))
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match')
];

// Profile Routes
router.get('/profile', profileController.getProfile);
router.post('/profile', profileUpdateValidation, profileController.updateProfile);

// Settings Routes
router.get('/settings', profileController.getSettings);
router.post('/settings', profileController.updateSettings);

module.exports = router;