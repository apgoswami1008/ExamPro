const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createSchema } = require('./base.model');

const userSchema = createSchema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false
    },
    profileImage: {
        type: String,
        default: null
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    notificationPreferences: {
        email: {
            type: Boolean,
            default: true
        },
        browser: {
            type: Boolean,
            default: true
        }
    },
    privacySettings: {
        profileVisibility: {
            type: Boolean,
            default: true
        },
        showOnlineStatus: {
            type: Boolean,
            default: true
        },
        shareActivityHistory: {
            type: Boolean,
            default: true
        }
    },
    loginHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        ip: String,
        userAgent: String,
        location: String,
        status: {
            type: String,
            enum: ['success', 'failed'],
            default: 'success'
        }
    }],
    activeSessions: [{
        token: String,
        device: String,
        lastActive: {
            type: Date,
            default: Date.now
        },
        expiresAt: Date
    }]
}, {
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            return ret;
        }
    }
});

// Virtual populate for relationships
userSchema.virtual('examAttempts', {
    ref: 'ExamAttempt',
    localField: '_id',
    foreignField: 'user'
});

userSchema.virtual('courseEnrollments', {
    ref: 'CourseEnrollment',
    localField: '_id',
    foreignField: 'user'
});

userSchema.virtual('payments', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'user'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error(error);
    }
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(20).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
        
    return verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
        
    this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;