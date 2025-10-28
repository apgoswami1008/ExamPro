/**
 * Error message constants and helper functions for consistent error handling
 */

const AUTH_ERRORS = {
    VALIDATION: {
        status: 400,
        title: 'Validation Error',
        message: 'Please check the form for errors'
    },
    EMAIL_EXISTS: {
        status: 400,
        title: 'Registration Error',
        message: 'This email is already registered. Please use a different email or try logging in.'
    },
    ROLE_NOT_FOUND: {
        status: 500,
        title: 'System Configuration Error',
        message: 'Unable to assign user role. Please contact the administrator.',
        debug: 'Default user role not found in database'
    },
    USER_NOT_FOUND: {
        status: 404,
        title: 'Authentication Error',
        message: 'No user found with this email address'
    },
    INVALID_PASSWORD: {
        status: 401,
        title: 'Authentication Error',
        message: 'Invalid password. Please try again.'
    },
    TOKEN_EXPIRED: {
        status: 401,
        title: 'Token Expired',
        message: 'Your verification/reset token has expired. Please request a new one.'
    },
    EMAIL_SEND_FAILED: {
        status: 500,
        title: 'Email Error',
        message: 'Failed to send email. Please try again later.'
    }
};

const EXAM_ERRORS = {
    NOT_FOUND: {
        status: 404,
        title: 'Not Found',
        message: 'The requested exam could not be found'
    },
    ACCESS_DENIED: {
        status: 403,
        title: 'Access Denied',
        message: 'You do not have permission to access this exam'
    },
    ALREADY_SUBMITTED: {
        status: 400,
        title: 'Submission Error',
        message: 'This exam has already been submitted'
    }
};

const QUESTION_ERRORS = {
    NOT_FOUND: {
        status: 404,
        title: 'Not Found',
        message: 'The requested question could not be found'
    },
    INVALID_TYPE: {
        status: 400,
        title: 'Invalid Question Type',
        message: 'The question type provided is not valid'
    },
    FILE_UPLOAD: {
        status: 400,
        title: 'Upload Error',
        message: 'Error uploading question file. Please check the file and try again.'
    }
};

const COURSE_ERRORS = {
    NOT_FOUND: {
        status: 404,
        title: 'Not Found',
        message: 'The requested course could not be found'
    },
    ENROLLMENT_FAILED: {
        status: 400,
        title: 'Enrollment Error',
        message: 'Unable to enroll in this course'
    },
    ALREADY_ENROLLED: {
        status: 400,
        title: 'Already Enrolled',
        message: 'You are already enrolled in this course'
    }
};

const PAYMENT_ERRORS = {
    PROCESSING_FAILED: {
        status: 400,
        title: 'Payment Failed',
        message: 'Unable to process payment. Please try again.'
    },
    GATEWAY_ERROR: {
        status: 500,
        title: 'Payment Gateway Error',
        message: 'Error communicating with payment provider. Please try again later.'
    },
    REFUND_FAILED: {
        status: 400,
        title: 'Refund Failed',
        message: 'Unable to process refund. Please contact support.'
    }
};

const GENERAL_ERRORS = {
    SERVER_ERROR: {
        status: 500,
        title: 'Server Error',
        message: 'An unexpected error occurred. Please try again later.'
    },
    NOT_AUTHORIZED: {
        status: 401,
        title: 'Not Authorized',
        message: 'You must be logged in to access this resource'
    },
    FORBIDDEN: {
        status: 403,
        title: 'Access Denied',
        message: 'You do not have permission to perform this action'
    }
};

/**
 * Format error response for consistent error handling
 * @param {Object} error - Error object from constants
 * @param {String} [customMessage] - Optional custom message to override default
 * @param {Error} [debug] - Optional debug error object for logging
 * @returns {Object} Formatted error response
 */
const formatError = (error, customMessage = null, debug = null) => {
    if (debug) {
        console.error('[Error Debug]:', debug);
    }

    return {
        title: error.title,
        message: customMessage || error.message,
        status: error.status,
        error: true
    };
};

/**
 * Render error page with consistent formatting
 * @param {Object} res - Express response object
 * @param {Object} error - Error object from constants
 * @param {String} [customMessage] - Optional custom message
 * @param {Error} [debug] - Optional debug error object
 */
const renderError = (res, error, customMessage = null, debug = null) => {
    if (debug) {
        console.error('[Error Debug]:', debug);
    }

    res.status(error.status).render('pages/error', {
        title: error.title,
        message: customMessage || error.message,
        error: true
    });
};

/**
 * Send JSON error response with consistent formatting
 * @param {Object} res - Express response object
 * @param {Object} error - Error object from constants
 * @param {String} [customMessage] - Optional custom message
 * @param {Error} [debug] - Optional debug error object
 */
const sendError = (res, error, customMessage = null, debug = null) => {
    if (debug) {
        console.error('[Error Debug]:', debug);
    }

    res.status(error.status).json({
        title: error.title,
        message: customMessage || error.message,
        error: true
    });
};

module.exports = {
    AUTH_ERRORS,
    EXAM_ERRORS,
    QUESTION_ERRORS,
    COURSE_ERRORS,
    PAYMENT_ERRORS,
    GENERAL_ERRORS,
    formatError,
    renderError,
    sendError
};