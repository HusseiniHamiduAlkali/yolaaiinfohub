const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema({
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  displayName: { type: String, required: true, trim: true, maxlength: 160 },
  profession: { type: String, required: true, trim: true, maxlength: 160 },
  bio: { type: String, trim: true, default: '', maxlength: 3000 },
  category: { type: String, required: true, trim: true, index: true },
  serviceTags: { type: [String], default: [] },
  services: {
    type: [{ name: { type: String, trim: true, maxlength: 160 }, price: { type: String, trim: true, maxlength: 80 } }],
    default: []
  },
  areas: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  yearsExperience: { type: Number, min: 0, max: 100, default: 0 },
  pricing: {
    label: { type: String, trim: true, default: '' },
    from: { type: Number, min: 0 },
    to: { type: Number, min: 0 },
    currency: { type: String, trim: true, default: 'NGN' }
  },
  availability: { type: String, enum: ['available', 'busy', 'closed'], default: 'available', index: true },
  hours: { type: String, trim: true, default: '' },
  image: { type: String, trim: true, default: '' },
  contact: {
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    website: { type: String, trim: true, default: '' }
  },
  verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified'], default: 'unverified', index: true },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  reviews: {
    type: [{
      reviewer: { type: String, trim: true, maxlength: 120 },
      rating: { type: Number, min: 1, max: 5 },
      date: { type: String, trim: true, maxlength: 40 },
      comment: { type: String, trim: true, maxlength: 1000 }
    }],
    default: []
  },
  status: { type: String, enum: ['draft', 'pending', 'published', 'rejected', 'suspended'], default: 'draft', index: true },
  legacySource: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, strict: true });

professionalSchema.index({ status: 1, category: 1, areas: 1, ratingAverage: -1 });
professionalSchema.index({ displayName: 'text', profession: 'text', bio: 'text', serviceTags: 'text', areas: 'text' });

module.exports = mongoose.models.Professional || mongoose.model('Professional', professionalSchema);