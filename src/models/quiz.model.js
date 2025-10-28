const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const quizSchema = createSchema({
    title: {
        type: String,
        required: [true, 'Quiz title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    duration: {
        type: Number,
        min: [0, 'Duration cannot be negative'],
        comment: 'Duration in minutes'
    },
    passingScore: {
        type: Number,
        required: true,
        default: 60,
        min: [0, 'Passing score cannot be negative'],
        max: [100, 'Passing score cannot exceed 100'],
        validate: {
            validator: function(v) {
                return v <= this.totalMarks;
            },
            message: 'Passing score cannot exceed total marks'
        }
    },
    totalMarks: {
        type: Number,
        required: true,
        default: 100,
        min: [0, 'Total marks cannot be negative']
    },
    shuffleQuestions: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    attemptsAllowed: {
        type: Number,
        default: -1,
        validate: {
            validator: function(v) {
                return v === -1 || v > 0;
            },
            message: 'Attempts allowed must be -1 (unlimited) or a positive number'
        }
    },
    showResults: {
        type: Boolean,
        default: true
    },
    showAnswers: {
        type: Boolean,
        default: false
    },
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for questions
quizSchema.virtual('questions', {
    ref: 'Question',
    localField: '_id',
    foreignField: 'quiz'
});

// Method to get random questions
quizSchema.methods.getRandomQuestions = async function(limit) {
    await this.populate('questions');
    let questions = this.questions || [];
    
    if (this.shuffleQuestions && questions.length > 0) {
        questions = questions.sort(() => Math.random() - 0.5);
    }
    
    return limit ? questions.slice(0, limit) : questions;
};

// Method to check if attempt is allowed
quizSchema.methods.isAttemptAllowed = async function(userId) {
    if (this.attemptsAllowed === -1) return true;
    
    const attemptCount = await this.model('QuizAttempt')
        .countDocuments({ quiz: this._id, user: userId });
        
    return attemptCount < this.attemptsAllowed;
};

// Method to calculate stats
quizSchema.methods.calculateStats = async function() {
    const attempts = await this.model('QuizAttempt')
        .find({ quiz: this._id });
        
    const stats = {
        totalAttempts: attempts.length,
        averageScore: 0,
        passRate: 0,
        highestScore: 0,
        lowestScore: this.totalMarks
    };
    
    if (attempts.length > 0) {
        const scores = attempts.map(a => a.score);
        stats.averageScore = scores.reduce((a, b) => a + b) / attempts.length;
        stats.highestScore = Math.max(...scores);
        stats.lowestScore = Math.min(...scores);
        stats.passRate = attempts.filter(a => a.score >= this.passingScore).length / attempts.length;
    }
    
    return stats;
};

// Indexes for better query performance
quizSchema.index({ lesson: 1 });
quizSchema.index({ isActive: 1 });
quizSchema.index({ title: 'text', description: 'text' });

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;