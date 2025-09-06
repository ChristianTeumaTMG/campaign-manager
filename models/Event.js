const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  campaignId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Campaign', 
    required: true 
  },
  eventType: { 
    type: String, 
    enum: ['cookie_set', 'registration', 'ftd'], 
    required: true 
  },
  userAgent: { type: String },
  referrer: { type: String },
  ipAddress: { type: String },
  cookieData: {
    cookieA: { type: String },
    cookieB: { type: String }
  },
  postbackData: {
    // For registration and FTD events
    playerId: { type: String },
    amount: { type: Number },
    currency: { type: String },
    timestamp: { type: Date }
  },
  metadata: {
    // Additional tracking data
    sessionId: { type: String },
    campaignName: { type: String },
    casino: { type: String }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
eventSchema.index({ campaignId: 1, eventType: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ eventType: 1, createdAt: -1 });

// Compound index for reporting queries
eventSchema.index({ 
  campaignId: 1, 
  eventType: 1, 
  createdAt: -1 
});

module.exports = mongoose.model('Event', eventSchema);
