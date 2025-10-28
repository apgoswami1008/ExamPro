const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const answerSchema = createSchema({
    answer: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'Answer is required'],
        validate: {
            validator: function(answer) {
                const question = this.question;
                if (!question) return true; // Skip validation if no question attached

                switch(question.type) {
                    case 'mcq':
                        return Array.isArray(answer) && answer.length > 0;
                    case 'true-false':
                        return typeof answer === 'boolean';
                    case 'match':
                        return Array.isArray(answer) && answer.every(pair => 
                            pair.hasOwnProperty('left') && pair.hasOwnProperty('right'));
                    case 'descriptive':
                        return typeof answer === 'string' && answer.trim().length > 0;
                    default:
                        return false;
                }
            },
            message: 'Invalid answer format for question type'
        }
    },
    isCorrect: {
        type: Boolean,
        default: null
    },
    marks: {
        type: Number,
        validate: {
            validator: function(value) {
                const question = this.question;
                return !question || value <= question.marks;
            },
            message: 'Marks cannot exceed question marks'
        }
    },
    feedback: {
        type: String,
        trim: true
    },
    reviewStatus: {
        type: String,
        enum: {
            values: ['pending', 'reviewed'],
            message: '{VALUE} is not a valid review status'
        },
        default: 'pending'
    },
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    attempt: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamAttempt',
        required: true
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Model is already extended with soft delete functionality

// Pre-save middleware to validate marks
answerSchema.pre('save', async function(next) {
    if (this.isModified('marks')) {
        await this.populate('question');
        if (this.marks > this.question.marks) {
            next(new Error('Marks cannot exceed question marks'));
        }
    }
    next();
});

// Pre-save middleware to update reviewedAt
answerSchema.pre('save', function(next) {
    if (this.isModified('reviewStatus') && this.reviewStatus === 'reviewed') {
        this.reviewedAt = new Date();
    }
    next();
});

// Indexes for better query performance
answerSchema.index({ question: 1, attempt: 1 }, { unique: true });
answerSchema.index({ reviewStatus: 1, reviewedBy: 1 });

const Answer = mongoose.model('Answer', answerSchema);
module.exports = Answer;