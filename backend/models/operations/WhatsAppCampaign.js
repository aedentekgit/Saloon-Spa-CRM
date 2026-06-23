const mongoose = require('mongoose');

const whatsAppCampaignSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  audience: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sentCount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Queued', 'Sent', 'Failed'],
    default: 'Sent'
  },
  date: {
    type: String,
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }
}, {
  timestamps: true
});

whatsAppCampaignSchema.index({ branch: 1, createdAt: -1 });

module.exports = mongoose.model('WhatsAppCampaign', whatsAppCampaignSchema);
