const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Index for efficient time-based queries
    },
    level: {
        type: String,
        required: true,
        enum: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'], // Standard Winston levels
        index: true // Index for filtering by log level
    },
    message: {
        type: String,
        required: true
    },
    meta: {
        type: mongoose.Schema.Types.Mixed 
    },
    environment: {
        type: String,
        required: true,
        enum: ['development', 'production', 'test'], // Or other environments you use
        default: process.env.NODE_ENV || 'development',
        index: true // Index for filtering by environment
    },
    userId: { // Denormalized for easier querying, or just rely on meta.userId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        // Using a custom setter to populate it from meta if present
        set: function(v) { return v; }, // Keep value if explicitly set
        get: function(v) { return this.meta && this.meta.userId ? this.meta.userId : v; }
    },
    userRole: { // Denormalized for easier querying
        type: String,
        index: true,
        set: function(v) { return v; },
        get: function(v) { return this.meta && this.meta.role ? this.meta.role : v; }
    },
    ipAddress: { // Denormalized
        type: String,
        index: true,
        set: function(v) { return v; },
        get: function(v) { return this.meta && this.meta.ip ? this.meta.ip : v; }
    },
    method: { // Denormalized for API hits
        type: String,
        index: true,
        set: function(v) { return v; },
        get: function(v) { return this.meta && this.meta.method ? this.meta.method : v; }
    },
    url: { // Denormalized for API hits
        type: String,
        index: true,
        set: function(v) { return v; },
        get: function(v) { return this.meta && this.meta.url ? this.meta.url : v; }
    },
}, {
    // Add custom toJSON/toObject transformations if needed for output
    // For getters to work, ensure toObject({ getters: true }) is used when querying if not default.
    // For direct use with winston-mongodb, simple schema is usually enough.
});

// Ensure indexes are created
logSchema.index({ timestamp: 1, level: 1 });
logSchema.index({ environment: 1, timestamp: -1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
