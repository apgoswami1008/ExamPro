const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const courseEnrollmentSchema = createSchema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    enrollmentDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    completionDate: {
        type: Date,
        validate: {
            validator: function(value) {
                return !value || value >= this.enrollmentDate;
            },
            message: 'Completion date must be after enrollment date'
        }
    },
    progress: {
        type: Number,
        default: 0,
        min: [0, 'Progress cannot be negative'],
        max: [100, 'Progress cannot exceed 100%']
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'completed', 'dropped'],
            message: '{VALUE} is not a valid status'
        },
        default: 'active'
    },
    certificateIssued: {
        type: Boolean,
        default: false
    },
    certificateUrl: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^(http|https):\/\/[^ "]+$/.test(v);
            },
            message: props => `${props.value} is not a valid URL`
        }
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    completedLessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    }],
    rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    review: {
        text: String,
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Model is already extended with soft delete functionality

// Pre-save middleware to handle completion
courseEnrollmentSchema.pre('save', function(next) {
    if (this.isModified('progress') && this.progress === 100 && !this.completionDate) {
        this.completionDate = new Date();
        this.status = 'completed';
    }
    next();
});

// Method to update progress
courseEnrollmentSchema.methods.updateProgress = async function() {
    await this.populate('course');
    if (!this.course) return;
    
    const totalLessons = await this.model('Lesson')
        .countDocuments({ course: this.course._id });
        
    if (totalLessons === 0) return;
    
    const completedCount = this.completedLessons.length;
    this.progress = Math.round((completedCount / totalLessons) * 100);
    
    if (this.progress === 100 && !this.completionDate) {
        this.completionDate = new Date();
        this.status = 'completed';
    }
    
    return this.save();
};

// Method to mark lesson as completed
courseEnrollmentSchema.methods.completedLesson = async function(lessonId) {
    if (!this.completedLessons.includes(lessonId)) {
        this.completedLessons.push(lessonId);
        await this.updateProgress();
    }
    this.lastAccessedAt = new Date();
    return this.save();
};

// Method to add review
courseEnrollmentSchema.methods.addReview = async function(rating, text) {
    this.review = { rating, text };
    await this.save();
    
    // Update course rating
    await this.populate('course');
    if (this.course) {
        await this.course.calculateAverageRating();
    }
};

// Static method to check if user is enrolled
courseEnrollmentSchema.statics.isEnrolled = async function(userId, courseId) {
    const enrollment = await this.findOne({
        user: userId,
        course: courseId,
        status: { $ne: 'dropped' }
    });
    return !!enrollment;
};

// Indexes for better query performance
courseEnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
courseEnrollmentSchema.index({ status: 1 });
courseEnrollmentSchema.index({ progress: 1 });
courseEnrollmentSchema.index({ enrollmentDate: -1 });
courseEnrollmentSchema.index({ lastAccessedAt: -1 });

const CourseEnrollment = mongoose.model('CourseEnrollment', courseEnrollmentSchema);
module.exports = CourseEnrollment;