const mongoose = require('mongoose');

const localizedTextSchema = new mongoose.Schema({
  en: { type: String, trim: true, default: '' },
  ha: { type: String, trim: true, default: '' },
  ff: { type: String, trim: true, default: '' },
  yo: { type: String, trim: true, default: '' },
  ig: { type: String, trim: true, default: '' },
  pcm: { type: String, trim: true, default: '' },
  ar: { type: String, trim: true, default: '' },
  fr: { type: String, trim: true, default: '' }
}, { _id: false });

const localizedSectionSchema = new mongoose.Schema({
  heading: { type: localizedTextSchema, default: () => ({}) },
  body: { type: localizedTextSchema, default: () => ({}) },
  items: { type: [localizedTextSchema], default: [] }
}, { _id: false });

const contentItemSchema = new mongoose.Schema({
  category: { type: String, enum: ['school', 'hospital', 'hotel', 'professional'], required: true, index: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  title: { type: localizedTextSchema, required: true },
  summary: { type: localizedTextSchema, default: () => ({}) },
  tagline: { type: localizedTextSchema, default: () => ({}) },
  image: { type: String, trim: true, default: '' },
  sections: { type: [localizedSectionSchema], default: [] },
  tags: { type: [String], default: [] },
  location: {
    address: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: 'Adamawa' },
    lga: { type: String, trim: true, default: 'Yola' },
    latitude: Number,
    longitude: Number
  },
  contact: {
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' }
  },
  published: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, strict: true });

contentItemSchema.index({ category: 1, slug: 1 }, { unique: true });
contentItemSchema.index({ category: 1, published: 1, sortOrder: 1, title: 1 });
contentItemSchema.index({ 'title.en': 'text', 'summary.en': 'text', tags: 'text' });

module.exports = mongoose.models.ContentItem || mongoose.model('ContentItem', contentItemSchema);
