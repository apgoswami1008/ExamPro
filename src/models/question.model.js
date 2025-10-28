const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const optionSchema = new mongoose.Schema({
    id: String,
    text: String,
    isCorrect: Boolean,
    imageUrl: String
}, { _id: false });

const matchOptionSchema = new mongoose.Schema({
    id: String,
    left: String,
    right: String
}, { _id: false });

const questionSchema = createSchema({
    text: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Question type is required'],
        enum: {
            values: ['mcq', 'true-false', 'match', 'descriptive'],
            message: '{VALUE} is not a valid question type'
        }
    },
    options: {
        type: [optionSchema],
        validate: {
            validator: function(options) {
                if (this.type === 'mcq') {
                    return options && options.length >= 2;
                }
                if (this.type === 'match') {
                    return options && options.length >= 1;
                }
                return true;
            },
            message: 'MCQ questions must have at least 2 options, Match questions must have at least 1 pair'
        }
    },
    matchPairs: {
        type: [matchOptionSchema],
        validate: {
            validator: function(pairs) {
                return this.type !== 'match' || (pairs && pairs.length >= 1);
            },
            message: 'Match type questions must have at least 1 pair'
        }
    },
    correctAnswer: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'Correct answer is required'],
        validate: {
            validator: function(answer) {
                switch(this.type) {
                    case 'mcq':
                        return Array.isArray(answer) && answer.length > 0;
                    case 'true-false':
                        return typeof answer === 'boolean';
                    case 'match':
                        return Array.isArray(answer) && answer.length > 0;
                    case 'descriptive':
                        return typeof answer === 'string';
                    default:
                        return false;
                }
            },
            message: 'Invalid correct answer format for question type'
        }
    },
    marks: {
        type: Number,
        required: [true, 'Marks are required'],
        min: [0, 'Marks cannot be negative'],
        default: 1
    },
    negativeMarks: {
        type: Number,
        required: true,
        min: [0, 'Negative marks cannot be negative'],
        default: 0
    },
    explanation: {
        type: String,
        trim: true
    },
    difficulty: {
        type: String,
        enum: {
            values: ['easy', 'medium', 'hard'],
            message: '{VALUE} is not a valid difficulty level'
        },
        default: 'medium'
    },
    imageUrl: String,
    isActive: {
        type: Boolean,
        default: true
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam'
    },
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for answers
questionSchema.virtual('answers', {
    ref: 'Answer',
    localField: '_id',
    foreignField: 'question'
});

// Pre-save middleware to validate based on question type
questionSchema.pre('save', function(next) {
    if (this.type === 'true-false') {
        this.options = undefined;
        this.matchPairs = undefined;
    } else if (this.type === 'descriptive') {
        this.options = undefined;
        this.matchPairs = undefined;
    }
    next();
});

// Index for better query performance
questionSchema.index({ exam: 1, isActive: 1 });
questionSchema.index({ quiz: 1, isActive: 1 });

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;