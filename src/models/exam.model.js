const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const examSchema = createSchema({
    title: {
        type: String,
        required: [true, 'Exam title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    duration: {
        type: Number,
        required: [true, 'Exam duration is required'],
        min: [1, 'Duration must be at least 1 minute']
    },
    totalMarks: {
        type: Number,
        required: [true, 'Total marks are required'],
        min: [0, 'Total marks cannot be negative']
    },
    passingMarks: {
        type: Number,
        required: [true, 'Passing marks are required'],
        min: [0, 'Passing marks cannot be negative'],
        validate: {
            validator: function(value) {
                return value <= this.totalMarks;
            },
            message: 'Passing marks cannot be greater than total marks'
        }
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date,
        validate: {
            validator: function(value) {
                return !this.startTime || value > this.startTime;
            },
            message: 'End time must be after start time'
        }
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    instructions: {
        type: String,
        trim: true
    },
    shuffleQuestions: {
        type: Boolean,
        default: true
    },
    showResult: {
        type: Boolean,
        default: true
    },
    price: {
        type: Number,
        default: 0,
        min: [0, 'Price cannot be negative']
    },
    attempts: {
        type: Number,
        default: 1,
        validate: {
            validator: function(value) {
                return value === -1 || value > 0;
            },
            message: 'Attempts must be -1 (unlimited) or greater than 0'
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for questions
examSchema.virtual('questions', {
    ref: 'Question',
    localField: '_id',
    foreignField: 'exam'
});

// Virtual populate for exam attempts
examSchema.virtual('examAttempts', {
    ref: 'ExamAttempt',
    localField: '_id',
    foreignField: 'exam'
});

// Middleware to cascade soft delete to related questions
examSchema.pre('save', async function(next) {
    if (this.isModified('isDeleted') && this.isDeleted) {
        await this.model('Question').updateMany(
            { exam: this._id },
            { isDeleted: true, deletedAt: new Date() }
        );
    }
    next();
});

const Exam = mongoose.model('Exam', examSchema);
module.exports = Exam;