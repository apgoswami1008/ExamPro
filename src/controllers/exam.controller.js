const { Exam, Question, User, ExamAttempt } = require('../models');
const mongoose = require('mongoose');

/**
 * Exam Controller
 */
class ExamController {
    /**
     * Display a listing of exams.
     */
    async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;

            // Build query
            let query = Exam.find()
                .populate('questions', '_id')
                .sort('-createdAt')
                .lean();

            // Apply search filters
            if (req.query.search) {
                query = query.where({
                    $or: [
                        { title: new RegExp(req.query.search, 'i') },
                        { description: new RegExp(req.query.search, 'i') }
                    ]
                });
            }

            // Apply status filter
            if (req.query.status === 'published') {
                query = query.where('isPublished', true);
            } else if (req.query.status === 'draft') {
                query = query.where('isPublished', false);
            }

            // Apply date filter
            if (req.query.date) {
                const date = new Date(req.query.date);
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                query = query.where('createdAt').gte(date).lt(nextDay);
            }

            // Execute query with pagination
            const [exams, totalExams] = await Promise.all([
                query.skip((page - 1) * limit).limit(limit),
                Exam.countDocuments(query.getQuery())
            ]);

            res.render('pages/admin/exams/index', {
                title: 'Manage Exams',
                exams,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalExams / limit),
                    totalItems: totalExams
                },
                query: req.query
            });
        } catch (error) {
            console.error('Error in ExamController.index:', error);
            req.flash('error', 'Failed to load exams');
            res.redirect('back');
        }
    }

    /**
     * Show the form for creating a new exam.
     */
    async create(req, res) {
        res.render('pages/admin/exams/create', {
            title: 'Create New Exam'
        });
    }

    /**
     * Store a newly created exam in storage.
     */
    async store(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const examData = {
                ...req.body,
                creator: req.user._id,
                isPublished: req.body.action === 'publish',
                shuffleQuestions: Boolean(req.body.shuffleQuestions),
                showResult: Boolean(req.body.showResult),
                totalMarks: 0, // Will be updated when questions are added
                questionCount: 0,
                createdBy: req.user._id,
                attempts: req.body.attempts || -1
            };

            // Create exam with session
            const exam = await Exam.create([examData], { session });

            if (req.body.action === 'publish') {
                // Validate exam before publishing
                if (!await exam[0].validateForPublishing()) {
                    throw new Error('Exam cannot be published without required settings');
                }
                exam[0].publishedAt = new Date();
            }

            await session.commitTransaction();
            session.endSession();

            req.flash('success', `Exam "${exam[0].title}" created successfully`);
            
            if (req.body.action === 'publish') {
                res.redirect(`/admin/exams/${exam[0]._id}`);
            } else {
                res.redirect(`/admin/exams/${exam[0]._id}/questions`);
            }
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error('Error in ExamController.store:', error);
            if (error.name === 'ValidationError') {
                req.flash('error', Object.values(error.errors).map(err => err.message));
            } else {
                req.flash('error', error.message || 'Failed to create exam');
            }
            res.redirect('back');
        }
    }

    /**
     * Display the specified exam.
     */
    async show(req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(req.params.id)
                .populate('questions', 'text type marks options')
                .populate('creator', 'name email')
                .populate({
                    path: 'examAttempts',
                    select: 'score status startTime endTime user',
                    populate: {
                        path: 'user',
                        select: 'name email'
                    }
                })
                .lean();

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            // Calculate exam statistics
            const stats = {
                totalAttempts: exam.examAttempts.length,
                averageScore: 0,
                highestScore: 0,
                passRate: 0
            };

            if (stats.totalAttempts > 0) {
                const scores = exam.examAttempts.map(attempt => attempt.score || 0);
                stats.averageScore = scores.reduce((a, b) => a + b) / scores.length;
                stats.highestScore = Math.max(...scores);
                stats.passRate = exam.examAttempts.filter(
                    attempt => attempt.score >= exam.passingScore
                ).length / stats.totalAttempts * 100;
            }

            res.render('pages/admin/exams/view', {
                title: exam.title,
                exam,
                stats
            });
        } catch (error) {
            console.error('Error in ExamController.show:', error);
            req.flash('error', 'Failed to load exam details');
            res.redirect('/admin/exams');
        }
    }

    /**
     * Show the form for editing the specified exam.
     */
    async edit(req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(req.params.id)
                .populate('questions', '_id text type marks')
                .populate({
                    path: 'examAttempts',
                    select: 'status',
                    match: { status: { $ne: 'completed' } }
                })
                .lean();

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            // Check if exam can be edited
            if (exam.examAttempts && exam.examAttempts.length > 0) {
                req.flash('error', 'Cannot edit exam with active attempts');
                return res.redirect(`/admin/exams/${exam._id}`);
            }

            res.render('pages/admin/exams/edit', {
                title: `Edit ${exam.title}`,
                exam
            });
        } catch (error) {
            console.error('Error in ExamController.edit:', error);
            req.flash('error', 'Failed to load exam');
            res.redirect('/admin/exams');
        }
    }

    /**
     * Update the specified exam in storage.
     */
    async update(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(req.params.id)
                .populate({
                    path: 'examAttempts',
                    select: 'status',
                    match: { status: { $ne: 'completed' } }
                });

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            // Check if exam can be edited
            if (exam.examAttempts && exam.examAttempts.length > 0) {
                throw new Error('Cannot edit exam with active attempts');
            }

            const examData = {
                ...req.body,
                shuffleQuestions: Boolean(req.body.shuffleQuestions),
                showResult: Boolean(req.body.showResult),
                updatedBy: req.user._id,
                lastModifiedAt: new Date()
            };

            // Update exam with session
            const updatedExam = await Exam.findByIdAndUpdate(
                req.params.id,
                examData,
                { 
                    new: true,
                    runValidators: true,
                    session
                }
            );

            // Log the update
            await exam.updateLog.push({
                updatedBy: req.user._id,
                updatedAt: new Date(),
                changes: Object.keys(req.body).join(', '),
                ipAddress: req.ip
            });

            await session.commitTransaction();
            session.endSession();

            req.flash('success', 'Exam updated successfully');
            res.redirect(`/admin/exams/${updatedExam._id}`);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error('Error in ExamController.update:', error);
            if (error.name === 'ValidationError') {
                req.flash('error', Object.values(error.errors).map(err => err.message));
            } else {
                req.flash('error', error.message || 'Failed to update exam');
            }
            res.redirect('back');
        }
    }

    /**
     * Remove the specified exam from storage.
     */
    async destroy(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(req.params.id)
                .populate('examAttempts', 'status')
                .session(session);

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            if (exam.isPublished) {
                throw new Error('Cannot delete a published exam');
            }

            // Check for any attempts
            if (exam.examAttempts && exam.examAttempts.length > 0) {
                throw new Error('Cannot delete exam with existing attempts');
            }

            // Delete associated questions
            await Question.deleteMany({ exam: exam._id }).session(session);

            // Soft delete the exam
            exam.deleted = true;
            exam.deletedAt = new Date();
            exam.deletedBy = req.user._id;
            await exam.save({ session });

            await session.commitTransaction();
            session.endSession();

            req.flash('success', 'Exam deleted successfully');
            res.redirect('/admin/exams');
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error('Error in ExamController.destroy:', error);
            req.flash('error', error.message || 'Failed to delete exam');
            res.redirect('back');
        }
    }

    /**
     * Publish the specified exam.
     */
    async publish(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(req.params.id)
                .populate('questions')
                .session(session);

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            // Validate exam before publishing
            if (!await exam.validateForPublishing()) {
                throw new Error('Exam is not ready for publishing');
            }

            // Update exam status
            exam.isPublished = true;
            exam.publishedAt = new Date();
            exam.publishedBy = req.user._id;
            
            // Update publish history
            exam.publishHistory.push({
                action: 'publish',
                by: req.user._id,
                at: new Date(),
                ipAddress: req.ip
            });

            await exam.save({ session });
            await session.commitTransaction();
            session.endSession();

            req.flash('success', 'Exam published successfully');
            res.redirect(`/admin/exams/${exam._id}`);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error('Error in ExamController.publish:', error);
            req.flash('error', error.message || 'Failed to publish exam');
            res.redirect('back');
        }
    }

    /**
     * Unpublish the specified exam.
     */
    async unpublish(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(req.params.id)
                .populate({
                    path: 'examAttempts',
                    match: { status: 'in-progress' }
                })
                .session(session);

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            // Check for active attempts
            if (exam.examAttempts && exam.examAttempts.length > 0) {
                throw new Error('Cannot unpublish exam with active attempts');
            }

            // Update exam status
            exam.isPublished = false;
            exam.unpublishedAt = new Date();
            
            // Update publish history
            exam.publishHistory.push({
                action: 'unpublish',
                by: req.user._id,
                at: new Date(),
                ipAddress: req.ip,
                reason: req.body.reason || 'No reason provided'
            });

            await exam.save({ session });
            await session.commitTransaction();
            session.endSession();

            req.flash('success', 'Exam unpublished successfully');
            res.redirect(`/admin/exams/${exam._id}`);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error('Error in ExamController.unpublish:', error);
            req.flash('error', error.message || 'Failed to unpublish exam');
            res.redirect('back');
        }
    }

    /**
     * Create a duplicate of the specified exam.
     */
    async duplicate(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(req.params.id)
                .populate('questions')
                .session(session);

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            // Create new exam without questions
            const newExamData = {
                title: `Copy of ${exam.title}`,
                description: exam.description,
                instructions: exam.instructions,
                duration: exam.duration,
                passingScore: exam.passingScore,
                totalMarks: exam.totalMarks,
                attempts: exam.attempts,
                shuffleQuestions: exam.shuffleQuestions,
                showResult: exam.showResult,
                creator: req.user._id,
                createdBy: req.user._id,
                isPublished: false,
                tags: exam.tags,
                category: exam.category,
                difficultyLevel: exam.difficultyLevel
            };

            const newExam = await Exam.create([newExamData], { session });

            // Duplicate questions with updated references
            const questions = exam.questions.map(q => ({
                text: q.text,
                type: q.type,
                marks: q.marks,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                exam: newExam[0]._id,
                creator: req.user._id,
                createdBy: req.user._id
            }));

            const duplicatedQuestions = await Question.create(questions, { session });

            // Update exam with question references and counts
            newExam[0].questions = duplicatedQuestions.map(q => q._id);
            newExam[0].questionCount = duplicatedQuestions.length;
            newExam[0].totalMarks = duplicatedQuestions.reduce((sum, q) => sum + q.marks, 0);
            await newExam[0].save({ session });

            await session.commitTransaction();
            session.endSession();

            req.flash('success', 'Exam duplicated successfully');
            res.redirect(`/admin/exams/${newExam[0]._id}/edit`);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error('Error in ExamController.duplicate:', error);
            req.flash('error', error.message || 'Failed to duplicate exam');
            res.redirect('back');
        }
    }

    /**
     * Preview the specified exam.
     */
    async preview(req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(req.params.id)
                .populate({
                    path: 'questions',
                    select: '-correctAnswer -createdBy -updatedBy',
                    options: { sort: { order: 1 } }
                })
                .populate('creator', 'name')
                .lean();

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            // Track preview access
            await Exam.findByIdAndUpdate(req.params.id, {
                $push: {
                    previewHistory: {
                        by: req.user._id,
                        at: new Date(),
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                }
            });

            // If exam is published, shuffle questions if enabled
            if (exam.isPublished && exam.shuffleQuestions) {
                exam.questions = exam.questions.sort(() => Math.random() - 0.5);
            }

            res.render('pages/admin/exams/preview', {
                title: `Preview: ${exam.title}`,
                exam,
                previewMode: true
            });
        } catch (error) {
            console.error('Error in ExamController.preview:', error);
            req.flash('error', 'Failed to load exam preview');
            res.redirect('back');
        }
    }
}

module.exports = new ExamController();