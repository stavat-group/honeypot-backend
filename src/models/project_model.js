const mongoose = require('mongoose');
const { Schema } = mongoose;


const projectSchema = new Schema({
    
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },

    // Ownership & Access
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teamMembers: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'developer', 'viewer'],
            default: 'developer'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],

    
    apiKeys: {
        type: String,
        required: false,
        default: null,
    },

    techStack: {
        frontend: [{
            name: String,
            version: String
        }],
        backend: [{
            name: String,
            framework: String
        }],
        database: {
            primary: {
                name: String,
                version: String
            }
        }
    },

    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    blocked: {
        type: Boolean,
        default: false
    },  
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Indexes for performance
projectSchema.index({ name: 'text', description: 'text' });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ 'teamMembers.user': 1 });

module.exports = mongoose.model('Project', projectSchema);