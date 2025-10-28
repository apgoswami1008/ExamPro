const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { User } = require('../models');

const router = express.Router();

// Registration validation rules
const registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain a number'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match')
];

// Login validation rules
const loginValidation = [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

// Registration Routes
router.get('/register', (req, res) => {
    res.render('pages/auth/register', { title: 'Register' });
});
router.post('/register', registerValidation, authController.register);

// Login Routes
router.get('/login', (req, res) => {
    res.render('pages/auth/login', { title: 'Login' });
});
router.post('/login', loginValidation, authController.login);

// Logout Route
router.get('/logout', authController.logout);

// Email Verification Route
router.get('/verify-email/:token', authController.verifyEmail);

// Password Reset Routes
router.get('/forgot-password', (req, res) => {
    res.render('pages/auth/forgot-password', { title: 'Forgot Password' });
});
router.post('/forgot-password', 
    body('email').isEmail().withMessage('Please enter a valid email'),
    authController.forgotPassword
);

router.get('/reset-password/:token', (req, res) => {
    res.render('pages/auth/reset-password', { 
        title: 'Reset Password',
        token: req.params.token
    });
});
router.post('/reset-password/:token',
    [
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .matches(/\d/)
            .withMessage('Password must contain a number'),
        body('confirmPassword')
            .custom((value, { req }) => value === req.body.password)
            .withMessage('Passwords do not match')
    ],
    authController.resetPassword
);

// Email Verification Route
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;