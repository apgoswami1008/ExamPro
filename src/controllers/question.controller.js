const path = require('path');
const fs = require('fs').promises;
const { Question, Exam, Answer } = require('../models');
const mongoose = require('mongoose');
const fileUpload = require('../utils/fileUpload');
const { validationResult } = require('express-validator');

/**
 * Question Controller for managing exam questions
 */
class QuestionController {
    /**
     * Display a listing of questions for an exam
     */
    async index(req, res) {
        try {
            const examId = req.params.examId;

            if (!mongoose.Types.ObjectId.isValid(examId)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            // Handle pagination
            const page = parseInt(req.query.page) || 1;
            const limit = 10;

            // Build query conditions
            const queryConditions = this._buildQueryConditions(req.query);

            // Execute queries in parallel
            const [exam, questions, totalQuestions] = await Promise.all([
                Exam.findById(examId)
                    .populate('creator', 'name')
                    .lean(),
                Question.find({ exam: examId, ...queryConditions })
                    .sort('-createdAt')
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .populate('lastModifiedBy', 'name')
                    .lean(),
                Question.countDocuments({ exam: examId, ...queryConditions })
            ]);

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            // Calculate statistics
            const stats = {
                totalQuestions,
                totalMarks: await Question.aggregate([
                    { $match: { exam: mongoose.Types.ObjectId(examId) } },
                    { $group: { _id: null, total: { $sum: '$marks' } } }
                ]).then(result => result[0]?.total || 0),
                byType: await Question.aggregate([
                    { $match: { exam: mongoose.Types.ObjectId(examId) } },
                    { $group: { _id: '$type', count: { $sum: 1 } } }
                ]),
                byDifficulty: await Question.aggregate([
                    { $match: { exam: mongoose.Types.ObjectId(examId) } },
                    { $group: { _id: '$difficulty', count: { $sum: 1 } } }
                ])
            };

            const totalPages = Math.ceil(totalQuestions / limit);

            res.render('pages/admin/questions/index', {
                exam,
                questions,
                stats,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    totalItems: totalQuestions
                },
                query: req.query
            });
        } catch (error) {
            console.error('Error in questions.index:', error);
            req.flash('error', 'Failed to load questions');
            res.redirect('/admin/exams');
        }
    }

    /**
     * Show the form for creating a new question
     */
    async create(req, res) {
        try {
            const examId = req.params.examId;

            if (!mongoose.Types.ObjectId.isValid(examId)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(examId)
                .select('title isPublished questionCount totalMarks')
                .lean();

            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            if (exam.isPublished) {
                req.flash('error', 'Cannot add questions to a published exam');
                return res.redirect(`/admin/exams/${examId}/questions`);
            }

            // Get unique question types and difficulties for dropdown
            const [types, difficulties] = await Promise.all([
                Question.distinct('type'),
                Question.distinct('difficulty')
            ]);

            res.render('pages/admin/questions/create', {
                exam,
                type: req.query.type || 'mcq',
                types,
                difficulties,
                defaultDifficulty: 'medium'
            });
        } catch (error) {
            console.error('Error in questions.create:', error);
            req.flash('error', 'Failed to load question creation form');
            res.redirect(`/admin/exams/${req.params.examId}/questions`);
        }
    }

    /**
     * Store a newly created question
     */
    async store(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const examId = req.params.examId;

            if (!mongoose.Types.ObjectId.isValid(examId)) {
                req.flash('error', 'Invalid exam ID');
                return res.redirect('/admin/exams');
            }

            const exam = await Exam.findById(examId).session(session);
            
            if (!exam) {
                req.flash('error', 'Exam not found');
                return res.redirect('/admin/exams');
            }

            if (exam.isPublished) {
                throw new Error('Cannot add questions to a published exam');
            }

            let imageUrl = null;
            if (req.files && req.files.image) {
                imageUrl = await fileUpload.uploadQuestionImage(req.files.image);
            }

            // Process and validate question data
            const questionData = this._processQuestionData(req.body, imageUrl);
            questionData.exam = examId;
            questionData.creator = req.user._id;
            questionData.createdBy = req.user._id;
            questionData.order = await Question.countDocuments({ exam: examId }) + 1;

            // Create question with session
            const question = await Question.create([questionData], { session });

            // Update exam statistics
            await Exam.findByIdAndUpdate(
                examId,
                {
                    $inc: { 
                        questionCount: 1,
                        totalMarks: questionData.marks
                    },
                    $push: {
                        updateLog: {
                            action: 'add_question',
                            by: req.user._id,
                            at: new Date(),
                            details: `Added question: ${questionData.text.substring(0, 50)}...`
                        }
                    }
                },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            req.flash('success', 'Question created successfully');
            res.redirect(`/admin/exams/${examId}/questions`);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            // Clean up uploaded image if exists
            if (req.uploadedImagePath) {
                await fs.unlink(req.uploadedImagePath).catch(() => {});
            }

            console.error('Error in questions.store:', error);
            if (error.name === 'ValidationError') {
                req.flash('error', Object.values(error.errors).map(err => err.message));
            } else {
                req.flash('error', error.message || 'Failed to create question');
            }
            res.redirect(`/admin/exams/${req.params.examId}/questions/create`);
        }
    }

    /**
     * Show the form for editing a question
     */
    async edit(req, res) {
        try {
            const { examId, id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(id)) {
                req.flash('error', 'Invalid exam or question ID');
                return res.redirect('/admin/exams');
            }

            const [exam, question] = await Promise.all([
                Exam.findById(examId)
                    .select('title isPublished')
                    .lean(),
                Question.findOne({ _id: id, exam: examId })
                    .populate('lastModifiedBy', 'name')
                    .lean()
            ]);

            if (!exam || !question) {
                req.flash('error', 'Question or exam not found');
                return res.redirect('/admin/exams');
            }

            if (exam.isPublished) {
                req.flash('error', 'Cannot edit questions in a published exam');
                return res.redirect(`/admin/exams/${examId}/questions`);
            }

            // Get unique question types and difficulties for dropdown
            const [types, difficulties] = await Promise.all([
                Question.distinct('type'),
                Question.distinct('difficulty')
            ]);

            res.render('pages/admin/questions/edit', {
                exam,
                question,
                types,
                difficulties
            });
        } catch (error) {
            console.error('Error in questions.edit:', error);
            req.flash('error', 'Failed to load question edit form');
            res.redirect(`/admin/exams/${req.params.examId}/questions`);
        }
    }

    /**
     * Update the specified question
     */
    async update(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { examId, id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(id)) {
                req.flash('error', 'Invalid exam or question ID');
                return res.redirect('/admin/exams');
            }

            const [exam, question] = await Promise.all([
                Exam.findById(examId).session(session),
                Question.findOne({ _id: id, exam: examId }).session(session)
            ]);

            if (!exam || !question) {
                req.flash('error', 'Question or exam not found');
                return res.redirect('/admin/exams');
            }

            if (exam.isPublished) {
                throw new Error('Cannot update questions in a published exam');
            }

            const oldMarks = question.marks;
            let imageUrl = question.imageUrl;

            if (req.files && req.files.image) {
                // Handle image upload with error handling
                try {
                    const newImageUrl = await fileUpload.uploadQuestionImage(req.files.image);
                    if (question.imageUrl) {
                        await fileUpload.deleteQuestionImage(question.imageUrl);
                    }
                    imageUrl = newImageUrl;
                } catch (error) {
                    console.error('Image upload error:', error);
                    throw new Error('Failed to process image upload');
                }
            }

            // Process and validate question data
            const questionData = this._processQuestionData(req.body, imageUrl);
            
            // Update question with audit trail
            const updatedQuestion = await Question.findByIdAndUpdate(
                id,
                {
                    ...questionData,
                    lastModifiedBy: req.user._id,
                    lastModifiedAt: new Date(),
                    $push: {
                        modificationHistory: {
                            modifiedBy: req.user._id,
                            modifiedAt: new Date(),
                            changes: this._getChanges(question, questionData)
                        }
                    }
                },
                { new: true, session }
            );

            // Update exam statistics if marks changed
            if (oldMarks !== questionData.marks) {
                await Exam.findByIdAndUpdate(
                    examId,
                    {
                        $inc: { 
                            totalMarks: questionData.marks - oldMarks
                        },
                        $push: {
                            updateLog: {
                                action: 'update_question',
                                by: req.user._id,
                                at: new Date(),
                                details: `Updated question marks from ${oldMarks} to ${questionData.marks}`
                            }
                        }
                    },
                    { session }
                );
            }

            await session.commitTransaction();
            session.endSession();

            req.flash('success', 'Question updated successfully');
            res.redirect(`/admin/exams/${examId}/questions`);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error('Error in questions.update:', error);
            if (error.name === 'ValidationError') {
                req.flash('error', Object.values(error.errors).map(err => err.message));
            } else {
                req.flash('error', error.message || 'Failed to update question');
            }
            res.redirect(`/admin/exams/${req.params.examId}/questions/${req.params.id}/edit`);
        }
    }

    /**
     * Delete the specified question
     */
    async destroy(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { examId, id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(id)) {
                req.flash('error', 'Invalid exam or question ID');
                return res.redirect('/admin/exams');
            }

            const [exam, question] = await Promise.all([
                Exam.findById(examId).session(session),
                Question.findOne({ _id: id, exam: examId }).session(session)
            ]);

            if (!exam || !question) {
                req.flash('error', 'Question or exam not found');
                return res.redirect('/admin/exams');
            }

            if (exam.isPublished) {
                throw new Error('Cannot delete questions from a published exam');
            }

            // Check if question has any associated answers
            const hasAnswers = await Answer.exists({ question: id });
            if (hasAnswers) {
                throw new Error('Cannot delete question with existing answers');
            }

            // Delete image if exists
            if (question.imageUrl) {
                await fileUpload.deleteQuestionImage(question.imageUrl);
            }

            // Delete question and update exam statistics
            await Promise.all([
                Question.findByIdAndDelete(id, { session }),
                Exam.findByIdAndUpdate(
                    examId,
                    {
                        $inc: { 
                            questionCount: -1,
                            totalMarks: -question.marks
                        },
                        $push: {
                            updateLog: {
                                action: 'delete_question',
                                by: req.user._id,
                                at: new Date(),
                                details: `Deleted question worth ${question.marks} marks`
                            }
                        }
                    },
                    { session }
                )
            ]);

            // Reorder remaining questions
            await Question.updateMany(
                { exam: examId, order: { $gt: question.order } },
                { $inc: { order: -1 } },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            req.flash('success', 'Question deleted successfully');
            res.redirect(`/admin/exams/${examId}/questions`);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error('Error in questions.destroy:', error);
            req.flash('error', error.message || 'Failed to delete question');
            res.redirect(`/admin/exams/${req.params.examId}/questions`);
        }
    }

    /**
     * Build query conditions for question filtering
     */
    _buildQueryConditions(query) {
        const conditions = {};

        if (query.search) {
            conditions.text = { [Op.iLike]: `%${query.search}%` };
        }

        if (query.type) {
            conditions.type = query.type;
        }

        if (query.difficulty) {
            conditions.difficulty = query.difficulty;
        }

        return conditions;
    }

    /**
     * Process and validate question data from request body
     */
    _processQuestionData(body, imageUrl) {
        const questionData = {
            type: body.type,
            text: body.text,
            marks: parseFloat(body.marks),
            negativeMarks: parseFloat(body.negativeMarks) || 0,
            difficulty: body.difficulty,
            explanation: body.explanation,
            imageUrl
        };

        switch (body.type) {
            case 'mcq':
                questionData.options = body.options;
                questionData.correctAnswer = [parseInt(body.correctAnswer)];
                break;

            case 'true-false':
                questionData.correctAnswer = body.trueFalseAnswer === 'true';
                break;

            case 'match':
                questionData.options = {
                    left: body.leftOptions,
                    right: body.rightOptions
                };
                break;

            case 'descriptive':
                questionData.modelAnswer = body.modelAnswer;
                break;
        }

        return questionData;
    }
}

module.exports = new QuestionController();