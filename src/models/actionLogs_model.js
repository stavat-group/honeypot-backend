const mongoose = require('mongoose');
const { Schema } = mongoose;

const actionLogSchema = new Schema({
    accessRequestTimestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true // For faster querying by time
    },
    ipAddress: {
        type: String,
        required: true,
        match: [/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
            'Invalid IP address format']
    },
    country: {
        type: String,
        maxlength: 100,
        trim: true
    },
    attackType: {
        type: String,
        required: true,
        // enum: [
        //   'SQLi', 
        //   'XSS', 
        //   'Brute Force', 
        //   'DDoS', 
        //   'Credential Stuffing',
        //   'API Abuse',
        //   'Path Traversal',
        //   'Suspicious Activity',
        //   'Unauthorized Access'
        // ],
        index: true
    },
    targetEndpoint: {
        type: String,
        required: true,
        maxlength: 500,
        trim: true
    },
    payloadPreview: {
        type: String,
        maxlength: 1000, // Truncate long payloads
        set: function (payload) {
            // Sanitize potentially dangerous content
            return payload.toString().substring(0, 1000).replace(/\0/g, '');
        }
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    actionTaken: {
        type: String,
        enum: ['Logged', 'Blocked IP', 'Rate Limited', 'Notified Admin', 'None'],
        default: 'Logged'
    },
    userAgent: {
        type: String,
        maxlength: 500
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    }

}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for common query patterns
actionLogSchema.index({ ipAddress: 1, accessRequestTimestamp: -1 });
actionLogSchema.index({ attackType: 1, accessRequestTimestamp: -1 });

// Virtual for formatted timestamp
actionLogSchema.virtual('formattedTime').get(function () {
    return this.accessRequestTimestamp.toISOString();
});

module.exports = mongoose.model('ActionLog', actionLogSchema);