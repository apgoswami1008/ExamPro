const mongoose = require('mongoose');

// Base schema fields that will be inherited by other models
const baseFields = {
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
};

// Base schema options for all models
const baseOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
};

// Base methods for all models
const baseMethods = {
    softDelete: async function(userId) {
        this.deletedAt = new Date();
        this.deletedBy = userId;
        this.isActive = false;
        return await this.save();
    },
    restore: async function(userId) {
        this.deletedAt = null;
        this.deletedBy = null;
        this.isActive = true;
        this.updatedBy = userId;
        return await this.save();
    }
};

// Create a new schema with base fields and methods
const createSchema = (fields = {}, options = {}) => {
    const schema = new mongoose.Schema({
        ...baseFields,
        ...fields
    }, {
        ...baseOptions,
        ...options
    });

    // Add methods
    Object.assign(schema.methods, baseMethods);

    // Add middleware
    schema.pre('save', function(next) {
        if (this.isNew) {
            this.isActive = true;
        }
        next();
    });

    schema.pre('find', function() {
        if (!this.getQuery().includeSoftDeleted) {
            this.where({ isActive: true });
        }
    });

    return schema;
};

module.exports = {
    createSchema,
    baseFields,
    baseOptions,
    baseMethods
};
