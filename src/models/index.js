const mongoose = require('mongoose');

// Import models
const User = require('./user.model');
const Role = require('./role.model');
const Course = require('./course.model');
const Lesson = require('./lesson.model');
const Exam = require('./exam.model');
const Question = require('./question.model');
const Answer = require('./answer.model');
const Payment = require('./payment.model');
const CourseEnrollment = require('./courseEnrollment.model');
const ExamAttempt = require('./examAttempt.model');
const Quiz = require('./quiz.model');
const Notification = require('./notification.model');

// Create a models object for convenience
const models = {
    User,
    Role,
    Course,
    Notification,
    Lesson,
    Exam,
    Question,
    Answer,
    Payment,
    CourseEnrollment,
    ExamAttempt,
    Quiz
};

// Export all models
module.exports = {
    ...models,
    mongoose,
    
    // Helper method to close database connection
    disconnect: async () => {
        await mongoose.disconnect();
    },
    
    // Helper method to clear all collections (useful for testing)
    clearCollections: async () => {
        const collections = mongoose.connections[0].collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    },
    
    // Helper method to drop database (useful for testing)
    dropDatabase: async () => {
        await mongoose.connection.dropDatabase();
    },
    
    // Helper method to check connection status
    isConnected: () => {
        return mongoose.connection.readyState === 1;
    },
    
    // Helper method to get model by name
    getModel: (modelName) => {
        return mongoose.model(modelName);
    }
};