const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const courseSchema = createSchema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        default: 0.00,
        min: [0, 'Price cannot be negative'],
        get: v => parseFloat(v.toFixed(2))
    },
    thumbnail: {
        type: String,
        trim: true
    },
    duration: {
        type: Number,
        min: [0, 'Duration cannot be negative'],
        comment: 'Duration in minutes'
    },
    level: {
        type: String,
        enum: {
            values: ['beginner', 'intermediate', 'advanced'],
            message: '{VALUE} is not a valid level'
        },
        default: 'beginner'
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: Date,
    enrollmentCount: {
        type: Number,
        default: 0,
        min: [0, 'Enrollment count cannot be negative']
    },
    rating: {
        type: Number,
        default: 0.00,
        min: [0, 'Rating cannot be negative'],
        max: [5, 'Rating cannot exceed 5'],
        get: v => parseFloat(v.toFixed(2))
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true }
});

// Virtual populate for lessons
courseSchema.virtual('lessons', {
    ref: 'Lesson',
    localField: '_id',
    foreignField: 'course'
});

// Virtual populate for enrollments
courseSchema.virtual('enrollments', {
    ref: 'CourseEnrollment',
    localField: '_id',
    foreignField: 'course'
});

// Pre-save middleware to handle publishing
courseSchema.pre('save', function(next) {
    if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    next();
});

// Method to calculate average rating
courseSchema.methods.calculateAverageRating = async function() {
    const enrollments = await this.model('CourseEnrollment')
        .find({ course: this._id, rating: { $exists: true } })
        .select('rating');
    
    if (enrollments.length === 0) {
        this.rating = 0;
    } else {
        const totalRating = enrollments.reduce((sum, enrollment) => sum + enrollment.rating, 0);
        this.rating = totalRating / enrollments.length;
    }
    
    return this.save();
};

// Method to update enrollment count
courseSchema.methods.updateEnrollmentCount = async function() {
    const count = await this.model('CourseEnrollment')
        .countDocuments({ course: this._id });
    
    this.enrollmentCount = count;
    return this.save();
};

// Indexes for better query performance
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ isPublished: 1, level: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ rating: -1 });

// Create Course model
const Course = mongoose.model('Course', courseSchema);

// Export model
module.exports = Course;