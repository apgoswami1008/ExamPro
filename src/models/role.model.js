const mongoose = require('mongoose');
const { createSchema } = require('./base.model');

const roleSchema = createSchema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return v === v.toLowerCase();
            },
            message: 'Role name must be lowercase'
        }
    },
    displayName: {
        type: String,
        required: [true, 'Display name is required']
    },
    description: {
        type: String,
        default: null
    },
    permissions: [{
        type: String,
        required: true
    }],
    isSystem: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// No need for soft delete plugin as it's included in base schema

// Static method to check if a role exists
roleSchema.statics.checkExists = async function(name) {
    const role = await this.findOne({ name: name.toLowerCase() });
    return !!role;
};

// Virtual populate for users
roleSchema.virtual('users', {
    ref: 'User',
    localField: '_id',
    foreignField: 'role'
});

// Pre-save middleware to ensure role name is lowercase
roleSchema.pre('save', function(next) {
    if (this.name) {
        this.name = this.name.toLowerCase();
    }
    next();
});

// Pre-findOne middleware to ensure query name is lowercase
roleSchema.pre('findOne', function(next) {
    if (this._conditions.name) {
        this._conditions.name = this._conditions.name.toLowerCase();
    }
    next();
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;