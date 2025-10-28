const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const examAttemptSchema = createSchema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime: {
        type: Date,
        validate: {
            validator: function(value) {
                return !value || value > this.startTime;
            },
            message: 'End time must be after start time'
        }
    },
    score: {
        type: Number,
        min: [0, 'Score cannot be negative'],
        validate: {
            validator: async function(value) {
                if (!this.exam) return true;
                await this.populate('exam');
                return value <= this.exam.totalMarks;
            },
            message: 'Score cannot exceed total marks'
        }
    },
    status: {
        type: String,
        enum: {
            values: ['in-progress', 'completed', 'submitted', 'evaluated'],
            message: '{VALUE} is not a valid status'
        },
        default: 'in-progress'
    },
    ipAddress: String,
    browserInfo: String,
    submittedAt: Date,
    evaluatedAt: Date,
    timeSpent: {
        type: Number, // in seconds
        default: 0
    },
    autoSubmitted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Model is already extended with soft delete functionality

// Virtual populate for answers
examAttemptSchema.virtual('answers', {
    ref: 'Answer',
    localField: '_id',
    foreignField: 'attempt'
});

// Pre-save middleware to update timestamps based on status
examAttemptSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'submitted') {
            this.submittedAt = new Date();
            if (this.startTime) {
                this.timeSpent = Math.floor((this.submittedAt - this.startTime) / 1000);
            }
        } else if (this.status === 'evaluated') {
            this.evaluatedAt = new Date();
        }
    }
    next();
});

// Method to calculate score
examAttemptSchema.methods.calculateScore = async function() {
    await this.populate('answers');
    const answers = this.answers || [];
    let totalScore = 0;
    
    for (const answer of answers) {
        if (answer.marks) {
            totalScore += answer.marks;
        }
    }
    
    this.score = totalScore;
    return this.save();
};

// Check if attempt is allowed
examAttemptSchema.statics.isAttemptAllowed = async function(userId, examId) {
    const attemptCount = await this.countDocuments({ user: userId, exam: examId });
    const exam = await mongoose.model('Exam').findById(examId);
    
    if (!exam) return false;
    return exam.attempts === -1 || attemptCount < exam.attempts;
};

// Indexes for better query performance
examAttemptSchema.index({ user: 1, exam: 1 });
examAttemptSchema.index({ status: 1 });
examAttemptSchema.index({ evaluatedAt: 1 });

// Export the model
const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
module.exports = ExamAttempt;