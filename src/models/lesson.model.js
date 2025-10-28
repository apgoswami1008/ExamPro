const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const lessonSchema = createSchema({
    title: {
        type: String,
        required: [true, 'Lesson title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    content: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: {
            values: ['video', 'pdf', 'quiz'],
            message: '{VALUE} is not a valid lesson type'
        }
    },
    resourceUrl: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^(http|https):\/\/[^ "]+$/.test(v);
            },
            message: props => `${props.value} is not a valid URL`
        }
    },
    duration: {
        type: Number,
        min: [0, 'Duration cannot be negative'],
        comment: 'Duration in minutes'
    },
    order: {
        type: Number,
        required: true,
        min: [0, 'Order must be a non-negative number']
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for quiz
lessonSchema.virtual('quiz', {
    ref: 'Quiz',
    localField: '_id',
    foreignField: 'lesson',
    justOne: true
});

// Pre-save middleware to handle publishing
lessonSchema.pre('save', function(next) {
    if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    next();
});

// Pre-save middleware to validate quiz requirement
lessonSchema.pre('save', async function(next) {
    if (this.isModified('type') && this.type === 'quiz') {
        const quiz = await this.populate('quiz');
        if (!quiz) {
            next(new Error('Quiz type lesson must have an associated quiz'));
            return;
        }
    }
    next();
});

// Static method to reorder lessons
lessonSchema.statics.reorderLessons = async function(courseId, newOrder) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        for (const [lessonId, order] of Object.entries(newOrder)) {
            await this.findByIdAndUpdate(lessonId, { order });
        }
        
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// Method to get next lesson
lessonSchema.methods.getNextLesson = function() {
    return this.model('Lesson')
        .findOne({
            course: this.course,
            order: { $gt: this.order },
            isPublished: true
        })
        .sort('order');
};

// Method to get previous lesson
lessonSchema.methods.getPreviousLesson = function() {
    return this.model('Lesson')
        .findOne({
            course: this.course,
            order: { $lt: this.order },
            isPublished: true
        })
        .sort('-order');
};

// Compound index for course and order
lessonSchema.index({ course: 1, order: 1 }, { unique: true });
lessonSchema.index({ title: 'text', description: 'text', content: 'text' });

const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;