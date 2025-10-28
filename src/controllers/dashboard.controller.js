const User = require('../models/user.model');
const Exam = require('../models/exam.model');
const ExamAttempt = require('../models/examAttempt.model');
const Notification = require('../models/notification.model');
const Course = require('../models/course.model');
const CourseEnrollment = require('../models/courseEnrollment.model');
const mongoose = require('mongoose');

/**
 * Get the user's dashboard data and render the dashboard view
 */
exports.index = async (req, res) => {
        try {
            // Get all data in parallel for better performance
            const [
                upcomingExams,
                recentAttempts,
                notifications,
                courseEnrollments,
                performanceStats
            ] = await Promise.all([
                // Get available exams
                Exam.find({ 
                    isPublished: true,
                    startDate: { $lte: new Date() },
                    endDate: { $gte: new Date() }
                })
                .select('title duration totalMarks startDate endDate maxAttempts')
                .sort('endDate')
                .limit(5)
                .lean(),

                // Get recent exam attempts
                ExamAttempt.find({ 
                    user: req.user._id 
                })
                .populate('exam', 'title totalMarks passingMarks')
                .sort('-createdAt')
                .limit(5)
                .lean(),

                // Get unread notifications
                Notification.find({
                    user: req.user._id,
                    read: false
                })
                .sort('-createdAt')
                .limit(5)
                .lean(),

                // Get course enrollments
                CourseEnrollment.find({
                    user: req.user._id,
                    status: 'active'
                })
                .populate('course', 'title description')
                .limit(3)
                .lean(),

                // Get performance statistics
                ExamAttempt.aggregate([
                    { 
                        $match: { 
                            user: new mongoose.Types.ObjectId(req.user._id) 
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalAttempts: { $sum: 1 },
                            averageScore: { $avg: '$score' },
                            highestScore: { $max: '$score' },
                            totalPassed: {
                                $sum: {
                                    $cond: [{ $eq: ['$status', 'pass'] }, 1, 0]
                                }
                            }
                        }
                    }
                ])
            ]);

            // Calculate performance metrics
            const stats = performanceStats[0] || {
                totalAttempts: 0,
                averageScore: 0,
                highestScore: 0,
                totalPassed: 0
            };

            // Process exam attempts to add pass/fail status
            const processedAttempts = recentAttempts.map(attempt => ({
                ...attempt,
                status: attempt.score >= (attempt.exam.passingMarks || 0) ? 'pass' : 'fail',
                scorePercentage: ((attempt.score / attempt.exam.totalMarks) * 100).toFixed(1)
            }));

            // Get monthly performance data for chart
            const monthlyPerformance = await ExamAttempt.aggregate([
                {
                    $match: {
                        user: new mongoose.Types.ObjectId(req.user._id),
                        createdAt: { 
                            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        averageScore: { $avg: '$score' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            res.render('pages/dashboard', {
                title: 'Dashboard',
                user: req.user,
                upcomingExams,
                recentAttempts: processedAttempts,
                notifications,
                courseEnrollments: courseEnrollments.map(e => e.course),
                stats,
                monthlyPerformance,
                chartData: {
                    labels: monthlyPerformance.map(p => `${p._id.month}/${p._id.year}`),
                    scores: monthlyPerformance.map(p => p.averageScore)
                }
            });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Failed to load dashboard'
        });
    }
};