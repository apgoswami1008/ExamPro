const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Role } = require('../models');
const { validationResult } = require('express-validator');
const sendEmail = require('../utils/sendEmail');
const { AUTH_ERRORS, renderError } = require('../utils/errors');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// Register User
exports.register = async (req, res) => {
    const session = await User.startSession();
    session.startTransaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(AUTH_ERRORS.VALIDATION.status).render('pages/auth/register', {
                title: 'Register',
                error: AUTH_ERRORS.VALIDATION.message,
                errors: errors.array(),
                input: req.body
            });
        }

        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(AUTH_ERRORS.EMAIL_EXISTS.status).render('pages/auth/register', {
                title: 'Register',
                error: AUTH_ERRORS.EMAIL_EXISTS.message,
                input: req.body
            });
        }

        // Get default user role
        console.log('Looking up user role...');
        const userRole = await Role.findOne({ name: 'user' }).lean();
        console.log('Role lookup result:', userRole);
        
        if (!userRole) {
            console.error('Default user role not found in database');
            // Also log all available roles for debugging
            const allRoles = await Role.find().lean();
            console.error('Available roles:', allRoles.map(r => ({ name: r.name, id: r._id.toString() })));
            
            return renderError(res, AUTH_ERRORS.ROLE_NOT_FOUND, 
                'Unable to complete registration. Please contact support.', 
                'Default user role missing from database');
        }

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create user with role reference
        const user = await User.create([{
            name,
            email,
            password,
            role: userRole._id,
            emailVerificationToken: verificationToken,
            verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            emailVerified: false
        }], { session });

        // Send verification email
        const verificationUrl = `${req.protocol}://${req.get('host')}/auth/verify-email/${verificationToken}`;
        try {
            await sendEmail({
                email: user[0].email,
                subject: 'Email Verification',
                template: 'emailVerification',
                data: {
                    name: user[0].name,
                    verificationUrl,
                    expiresIn: '24 hours'
                }
            });

            await session.commitTransaction();
            session.endSession();

            // Instead of setting token and redirecting to dashboard,
            // show a success message about email verification
            res.render('pages/auth/verification-pending', {
                title: 'Verify Your Email',
                email: user[0].email,
                message: 'Registration successful! Please check your email to verify your account.',
                resendUrl: `/auth/resend-verification/${user[0]._id}`
            });
        } catch (emailError) {
            // If email fails, rollback the transaction
            await session.abortTransaction();
            session.endSession();

            // Log the error for debugging
            console.error('Email sending error:', emailError);

            // Return a user-friendly error
            return renderError(res, AUTH_ERRORS.EMAIL_SEND_FAILED, 
                'We could not send the verification email. Please try again or contact support.', 
                emailError);
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        let errorMessage = 'An error occurred during registration.';
        
        // Handle specific error cases
        if (error.name === 'ValidationError') {
            errorMessage = 'Please check your registration details and try again.';
        } else if (error.code === 11000) { // Duplicate key error
            errorMessage = 'This email address is already registered.';
        } else if (error.message.includes('email')) {
            errorMessage = 'There was a problem with the email verification system.';
        }

        console.error('Registration error:', {
            error: error.message,
            stack: error.stack,
            code: error.code
        });

        renderError(res, {
            ...AUTH_ERRORS.SERVER_ERROR,
            message: errorMessage
        }, null, error);
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('pages/auth/login', {
                title: 'Login',
                errors: errors.array(),
                input: req.body
            });
        }

        const { email, password } = req.body;

        // Find user and populate role
        const user = await User.findOne({ email })
            .select('+password')  // Include password field which is select: false by default
            .populate('role');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).render('pages/auth/login', {
                title: 'Login',
                error: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).render('pages/auth/login', {
                title: 'Login',
                error: 'Your account has been deactivated'
            });
        }

        // Check if email is verified
        if (!user.emailVerified) {
            return res.status(401).render('pages/auth/login', {
                title: 'Login',
                error: 'Please verify your email before logging in'
            });
        }

        // Update last login with atomic operation
        await User.findByIdAndUpdate(user._id, {
            $set: { lastLogin: new Date() },
            $inc: { loginCount: 1 }
        });

        // Create and send token
        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            sameSite: 'strict'  // Protect against CSRF
        });

        // Log login activity
        await User.updateOne(
            { _id: user._id },
            {
                $push: {
                    loginHistory: {
                        timestamp: new Date(),
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                }
            }
        );

        // Set a flash message for successful login
        req.flash('success', 'Welcome back, ' + user.name + '!');

        // Redirect based on role and requested page
        const redirectTo = req.session.returnTo || '/';  // Default to home page
        delete req.session.returnTo;  // Clear the stored path

        switch (user.role.name) {
            case 'superadmin':
                res.redirect('/superadmin/dashboard');
                break;
            case 'admin':
                res.redirect('/admin/dashboard');
                break;
            default:
                res.redirect(redirectTo);
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error during login'
        });
    }
};

// Logout User
exports.logout = (req, res) => {
    try {
        // Clear the token cookie
        res.cookie('token', '', {
            expires: new Date(0),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Clear session if it exists
        if (req.session) {
            req.session.destroy();
        }

        // Flash a success message
        req.flash('success', 'You have been logged out successfully');

        // Redirect to login page
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/');
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    const session = await User.startSession();
    session.startTransaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('pages/auth/forgot-password', {
                title: 'Forgot Password',
                errors: errors.array()
            });
        }

        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).render('pages/auth/forgot-password', {
                title: 'Forgot Password',
                error: 'User not found'
            });
        }

        // Check for existing recent reset request
        if (user.resetPasswordExpires && user.resetPasswordExpires > Date.now()) {
            const waitTime = Math.ceil((user.resetPasswordExpires - Date.now()) / 1000 / 60);
            return res.status(400).render('pages/auth/forgot-password', {
                title: 'Forgot Password',
                error: `Please wait ${waitTime} minutes before requesting another reset`
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Update user with reset token
        await User.findByIdAndUpdate(user._id, {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: Date.now() + 30 * 60 * 1000, // 30 minutes
            $push: {
                passwordResetHistory: {
                    requestedAt: new Date(),
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                }
            }
        }, { session });

        // Send reset email
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            template: 'passwordReset',
            data: {
                name: user.name,
                resetUrl,
                expiresIn: '30 minutes'
            }
        });

        await session.commitTransaction();
        session.endSession();

        res.render('pages/auth/forgot-password', {
            title: 'Forgot Password',
            success: 'Password reset instructions sent to your email'
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Forgot password error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error processing password reset'
        });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    const session = await User.startSession();
    session.startTransaction();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('pages/auth/reset-password', {
                title: 'Reset Password',
                errors: errors.array(),
                token: req.params.token
            });
        }

        // Hash the token from params to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).session(session);

        if (!user) {
            return res.status(400).render('pages/auth/reset-password', {
                title: 'Reset Password',
                error: 'Invalid or expired reset token',
                token: req.params.token
            });
        }

        // Ensure new password is different from the last 3 passwords
        const isSameAsOld = await user.comparePassword(req.body.password);
        if (isSameAsOld) {
            return res.status(400).render('pages/auth/reset-password', {
                title: 'Reset Password',
                error: 'New password must be different from current password',
                token: req.params.token
            });
        }

        // Update password and clear reset token
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.passwordChangedAt = Date.now();
        user.passwordHistory.push({
            password: user.password,
            changedAt: new Date()
        });
        
        // Keep only last 3 password entries
        if (user.passwordHistory.length > 3) {
            user.passwordHistory = user.passwordHistory.slice(-3);
        }

        await user.save({ session });
        await session.commitTransaction();
        session.endSession();

        // Send password change notification
        await sendEmail({
            email: user.email,
            subject: 'Password Changed Successfully',
            template: 'passwordChanged',
            data: {
                name: user.name,
                changeTime: new Date().toLocaleString()
            }
        });

        res.redirect('/auth/login');
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Reset password error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error resetting password'
        });
    }
};

// Logout User
exports.logout = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (token) {
            // Decode token to get user ID
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Log logout activity
            await User.findByIdAndUpdate(decoded.id, {
                $push: {
                    logoutHistory: {
                        timestamp: new Date(),
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                }
            });
        }

        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.redirect('/auth/login');
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/auth/login');
    }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
    const session = await User.startSession();
    session.startTransaction();

    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token
        }).session(session);

        if (!user) {
            return res.status(400).render('pages/error', {
                title: 'Email Verification Failed',
                message: 'Invalid verification token. Please try registering again.'
            });
        }

        // Check if verification has expired
        if (!user.verificationExpires || user.verificationExpires < Date.now()) {
            return res.status(400).render('pages/error', {
                title: 'Verification Link Expired',
                message: 'Your verification link has expired. Please register again to get a new verification link.'
            });
        }

        // Update user status
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.verificationExpires = undefined;
        user.verifiedAt = Date.now();

        await user.save({ session });

        // Log verification
        await User.updateOne(
            { _id: user._id },
            {
                $push: {
                    verificationHistory: {
                        verifiedAt: new Date(),
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                }
            }
        ).session(session);

        await session.commitTransaction();
        session.endSession();

        try {
            // Send welcome email
            await sendEmail({
                email: user.email,
                subject: 'Welcome to Online Examination System',
                template: 'welcome',
                data: {
                    name: user.name
                }
            });
        } catch (emailError) {
            // Log email error but don't fail the verification
            console.error('Welcome email sending error:', emailError);
        }

        res.render('pages/auth/login', {
            title: 'Login',
            success: 'Email verified successfully. Please login to continue.'
        });
    } catch (error) {
        if (session) {
            try {
                await session.abortTransaction();
            } catch (transactionError) {
                console.error('Transaction abort error:', transactionError);
            }
            session.endSession();
        }

        console.error('Email verification error:', error);
        return res.status(500).render('pages/error', {
            title: 'Verification Error',
            message: 'An error occurred while verifying your email. Please try again or contact support.'
        });
    }
};