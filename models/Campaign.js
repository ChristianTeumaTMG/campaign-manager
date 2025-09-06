const mongoose = require('mongoose');

const cookieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  domain: { type: String, required: true },
  expiry: { type: Date, required: true }
});

const templateConfigSchema = new mongoose.Schema({
  templateType: { 
    type: String, 
    enum: ['Myaffiliates'], 
    default: 'Myaffiliates' 
  },
  cookieA: cookieSchema,
  cookieB: cookieSchema,
  referrerRegex: { type: String, required: true },
  cookieARegex: { type: String, required: true }
});

const campaignSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100 
  },
  casino: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100 
  },
  templateConfig: templateConfigSchema,
  postbackUrl: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Postback URL must be a valid HTTP/HTTPS URL'
    }
  },
  scriptUrl: { 
    type: String, 
    unique: true,
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: String, 
    required: true 
  },
  stats: {
    cookieSets: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 },
    ftds: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
campaignSchema.index({ name: 1 });
campaignSchema.index({ casino: 1 });
campaignSchema.index({ isActive: 1 });
campaignSchema.index({ createdAt: -1 });

// Virtual for conversion rates
campaignSchema.virtual('conversionRates').get(function() {
  const cookieSets = this.stats.cookieSets || 0;
  const ftds = this.stats.ftds || 0;
  const registrations = this.stats.registrations || 0;
  
  return {
    cookieToFtd: cookieSets > 0 ? ((ftds / cookieSets) * 100).toFixed(2) : 0,
    regToFtd: registrations > 0 ? ((ftds / registrations) * 100).toFixed(2) : 0
  };
});

// Method to generate unique script URL
campaignSchema.methods.generateScriptUrl = function() {
  const crypto = require('crypto');
  const randomId = crypto.randomBytes(16).toString('hex');
  this.scriptUrl = `/api/scripts/${randomId}.js`;
  return this.scriptUrl;
};

// Method to update stats
campaignSchema.methods.updateStats = function(type, increment = 1) {
  if (['cookieSets', 'registrations', 'ftds'].includes(type)) {
    this.stats[type] = (this.stats[type] || 0) + increment;
    return this.save();
  }
  throw new Error('Invalid stat type');
};

module.exports = mongoose.model('Campaign', campaignSchema);
