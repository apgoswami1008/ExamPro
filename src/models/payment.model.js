const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const paymentSchema = createSchema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative'],
        get: v => parseFloat(v.toFixed(2))
    },
    currency: {
        type: String,
        required: true,
        uppercase: true,
        minlength: [3, 'Currency code must be 3 characters'],
        maxlength: [3, 'Currency code must be 3 characters'],
        default: 'USD'
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'completed', 'failed', 'refunded'],
            message: '{VALUE} is not a valid status'
        },
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: {
            values: ['razorpay', 'stripe', 'paypal'],
            message: '{VALUE} is not a supported payment method'
        }
    },
    paymentGatewayResponse: {
        type: mongoose.Schema.Types.Mixed
    },
    transactionId: {
        type: String,
        index: { unique: true, sparse: true }
    },
    paymentFor: {
        type: String,
        required: true,
        enum: {
            values: ['course', 'exam'],
            message: '{VALUE} is not a valid payment type'
        }
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'paymentFor'
    },
    refund: {
        reason: String,
        amount: {
            type: Number,
            min: [0, 'Refund amount cannot be negative'],
            get: v => v ? parseFloat(v.toFixed(2)) : null
        },
        requestedAt: Date,
        processedAt: Date,
        status: {
            type: String,
            enum: ['pending', 'processed', 'rejected'],
            default: 'pending'
        }
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: String,
    userAgent: String,
    error: {
        code: String,
        message: String,
        details: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true }
});

// Pre-save middleware to validate refund
paymentSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'refunded') {
        if (!this.refund || !this.refund.reason) {
            next(new Error('Refund reason is required'));
            return;
        }
        if (!this.refund.amount || this.refund.amount <= 0) {
            next(new Error('Valid refund amount is required'));
            return;
        }
        if (this.refund.amount > this.amount) {
            next(new Error('Refund amount cannot exceed payment amount'));
            return;
        }
        this.refund.processedAt = new Date();
    }
    next();
});

// Method to process refund
paymentSchema.methods.processRefund = async function(reason, amount) {
    if (this.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
    }
    
    if (!reason || !amount || amount <= 0 || amount > this.amount) {
        throw new Error('Invalid refund parameters');
    }
    
    this.status = 'refunded';
    this.refund = {
        reason,
        amount,
        requestedAt: new Date(),
        status: 'pending'
    };
    
    return this.save();
};

// Static method to get payment statistics
paymentSchema.statics.getStatistics = async function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: {
                    paymentFor: '$paymentFor',
                    currency: '$currency'
                },
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);
};

// Indexes for better query performance
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentFor: 1, item: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;