const mongoose = require('mongoose');

const schoolProfileSchema = new mongoose.Schema({
  tagline: { type: String, trim: true, maxlength: 300, default: '' },
  schoolType: { type: String, trim: true, maxlength: 120, default: '' },
  crest: { type: String, trim: true, default: '' },
  heroImage: { type: String, trim: true, default: '' },
  stats: {
    students: { type: String, trim: true, maxlength: 40, default: '' },
    teachers: { type: String, trim: true, maxlength: 40, default: '' },
    years: { type: String, trim: true, maxlength: 40, default: '' },
    levels: { type: String, trim: true, maxlength: 40, default: '' }
  },
  mission: { type: String, trim: true, maxlength: 2000, default: '' },
  vision: { type: String, trim: true, maxlength: 2000, default: '' },
  levels: [{ name: String, description: String }],
  subjects: [{ name: String, icon: String }],
  facilities: [{ name: String, image: String }],
  staff: [{ name: String, role: String, bio: String }],
  admissions: {
    checklist: { type: [String], default: [] },
    steps: [{ title: String, description: String }]
  },
  fees: [{ name: String, amount: String, note: String, featured: Boolean }],
  activities: [{ name: String, icon: String }],
  calendar: [{ month: String, event: String }],
  awards: [{ name: String, detail: String, icon: String }],
  testimonials: [{ quote: String, author: String }],
  gallery: [{ image: String, caption: String }]
}, { _id: false, strict: true });

const universityProfileSchema = new mongoose.Schema({
  tagline: { type: String, trim: true, maxlength: 300, default: '' },
  institutionType: { type: String, trim: true, maxlength: 120, default: '' },
  logo: { type: String, trim: true, default: '' },
  heroImage: { type: String, trim: true, default: '' },
  established: { type: String, trim: true, maxlength: 40, default: '' },
  stats: {
    students: { type: String, trim: true, maxlength: 40, default: '' },
    faculties: { type: String, trim: true, maxlength: 40, default: '' },
    programmes: { type: String, trim: true, maxlength: 40, default: '' },
    ranking: { type: String, trim: true, maxlength: 80, default: '' },
    established: { type: String, trim: true, maxlength: 40, default: '' }
  },
  story: {
    image: { type: String, trim: true, default: '' },
    heading: { type: String, trim: true, maxlength: 300, default: '' },
    paragraphs: { type: [String], default: [] }
  },
  faculties: [{ name: String, icon: String, description: String }],
  programmes: [{ level: String, description: String, examples: [String] }],
  admissions: [{ title: String, description: String }],
  fees: [{ level: String, amount: String, note: String }],
  accreditations: [{ name: String, detail: String }],
  gallery: [{ image: String, caption: String }],
  alumni: [{ name: String, field: String, year: String, image: String }],
  research: [{ title: String, description: String }],
  partnerships: [{ name: String, detail: String }],
  studentLife: [{ title: String, image: String }]
}, { _id: false, strict: true });

const technicalProfileSchema = new mongoose.Schema({
  tagline: { type: String, trim: true, maxlength: 300, default: '' },
  institutionType: { type: String, trim: true, maxlength: 120, default: '' },
  crest: { type: String, trim: true, default: '' },
  heroImage: { type: String, trim: true, default: '' },
  established: { type: String, trim: true, maxlength: 40, default: '' },
  stats: {
    programmes: { type: String, trim: true, maxlength: 40, default: '' },
    students: { type: String, trim: true, maxlength: 40, default: '' },
    accreditation: { type: String, trim: true, maxlength: 120, default: '' }
  },
  overview: {
    heading: { type: String, trim: true, maxlength: 300, default: '' },
    paragraphs: { type: [String], default: [] },
    image: { type: String, trim: true, default: '' }
  },
  programmes: [{ level: String, name: String, duration: String, entryRoute: String }],
  departments: [{ name: String, description: String }],
  accreditation: [{ name: String, status: String, detail: String }],
  admissions: [{ title: String, description: String }],
  fees: [{ name: String, amount: String, note: String }],
  facilities: [{ name: String, image: String, description: String }],
  industry: { heading: String, description: String, placement: String },
  careers: [{ stage: String, title: String, description: String }],
  services: [{ name: String, icon: String, description: String }],
  gallery: [{ image: String, caption: String }],
  brochure: { type: String, trim: true, default: '' },
  footerNote: { type: String, trim: true, maxlength: 500, default: '' }
}, { _id: false, strict: true });

const learningProfileSchema = new mongoose.Schema({
  tagline: { type: String, trim: true, maxlength: 300, default: '' },
  institutionType: { type: String, trim: true, maxlength: 120, default: '' },
  logo: { type: String, trim: true, default: '' },
  heroImage: { type: String, trim: true, default: '' },
  stats: { collection: String, seats: String, events: String, openDays: String },
  mission: { heading: String, paragraphs: { type: [String], default: [] } },
  services: [{ name: String, icon: String, description: String }],
  resources: [{ count: String, name: String, description: String }],
  events: [{ day: String, month: String, tag: String, title: String, description: String }],
  membership: [{ name: String, price: String, description: String, benefits: [String] }],
  spaces: [{ name: String, image: String, description: String }],
  hours: [{ day: String, hours: String, services: String }],
  registration: [{ step: String, title: String, description: String }],
  digital: [{ title: String, url: String, description: String }],
  outreach: [{ title: String, image: String, description: String }],
  gallery: [{ image: String, caption: String }],
  footerNote: { type: String, trim: true, maxlength: 500, default: '' }
}, { _id: false, strict: true });

const healthcareProfileSchema = new mongoose.Schema({
  type: { type: String, enum: ['primaryCare', 'secondaryHospital', 'pharmacy'], default: 'primaryCare' },
  primaryCare: {
    facilityType: String, tagline: String, heroBadges: [String], stats: [{ label: String, value: String }],
    overview: { heading: String, paragraphs: [String], facts: [{ label: String, value: String }], history: [String] },
    todayServices: [String], coreServices: [{ name: String, desc: String, icon: String, cat: String }],
    maternalChild: [{ name: String, desc: String }], weeklySchedule: [{ day: String, services: [String] }],
    staff: [{ name: String, role: String, qual: String, img: String }],
    facilities: [{ name: String, desc: String, icon: String }],
    accessibility: [{ name: String, note: String, icon: String }],
    hoursData: [{ label: String, val: String }], faqs: [{ q: String, a: String }],
    location: { landmark: String, mapUrl: String }, footerNote: String
  },
  secondaryHospital: {
    facilityType: String, tagline: String, heroBadges: [String], stats: [{ label: String, value: String }],
    overview: { heading: String, paragraphs: [String], facts: [{ label: String, value: String }], history: [String] },
    departments: [{ id: String, name: String, icon: String, cat: String, desc: String, head: String, phone: String, hours: String }],
    services: [{ name: String, desc: String, icon: String }],
    doctors: [{ name: String, title: String, qual: String, dept: String, avail: String, img: String }],
    facilities: [{ name: String, desc: String, icon: String }], galleryImages: [{ src: String, cap: String }],
    emergency: { phone: String, hours: String, ambulanceStatus: String, notices: [String] },
    hoursData: [{ label: String, val: String, em: String }], faqs: [{ q: String, a: String }],
    location: { landmark: String, mapUrl: String }, footerNote: String
  },
  pharmacy: {
    facilityType: String, tagline: String, heroBadges: [String], statusItems: [{ label: String, value: String }],
    overview: { heading: String, paragraphs: [String], facts: [{ label: String, value: String }] },
    services: [{ name: String, desc: String, icon: String }],
    medCategories: [{ name: String, count: String, icon: String, rx: Boolean }],
    products: [{ id: String, name: String, cat: String, avail: Boolean, price: String, desc: String, rx: Boolean }],
    pharmacists: [{ name: String, role: String, qual: String, img: String }],
    healthChecks: [{ name: String, price: String, icon: String }],
    delivery: { available: String, details: String, phone: String, areas: [String], pickup: String, paymentOptions: [String] },
    medicineNotice: String, footerNote: String,
    hoursData: [{ label: String, val: String }], faqs: [{ q: String, a: String }],
    location: { landmark: String, mapUrl: String }, footerNote: String
  }
}, { _id: false, strict: true });

const navigationPlaceSchema = new mongoose.Schema({
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  displayName: { type: String, required: true, trim: true, maxlength: 180 },
  category: { type: String, required: true, trim: true, index: true },
  subcategory: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '', maxlength: 4000 },
  address: { type: String, trim: true, default: '' },
  area: { type: String, trim: true, default: 'Yola' },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  tags: { type: [String], default: [] },
  services: { type: [String], default: [] },
  highlights: { type: [String], default: [] },
  openingHours: { type: String, trim: true, default: '' },
  image: { type: String, trim: true, default: '' },
  heroImage: { type: String, trim: true, default: '' },
  galleryImages: { type: [String], default: [] },
  galleryCaptions: { type: [String], default: [] },
  menuItems: {
    type: [{
      name: { type: String, trim: true, maxlength: 180 },
      category: { type: String, trim: true, default: 'main', maxlength: 80 },
      description: { type: String, trim: true, maxlength: 1000, default: '' },
      price: { type: String, trim: true, maxlength: 40, default: '' },
      currency: { type: String, trim: true, maxlength: 8, default: 'NGN' },
      calories: { type: String, trim: true, maxlength: 40, default: '' },
      image: { type: String, trim: true, default: '' }
    }],
    default: []
  },
  contact: {
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    website: { type: String, trim: true, default: '' }
  },
  schoolProfile: { type: schoolProfileSchema, default: () => ({}) },
  universityProfile: { type: universityProfileSchema, default: () => ({}) },
  technicalProfile: { type: technicalProfileSchema, default: () => ({}) },
  learningProfile: { type: learningProfileSchema, default: () => ({}) },
  healthcareProfile: { type: healthcareProfileSchema, default: undefined },
  verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified'], default: 'unverified', index: true },
  ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['draft', 'pending', 'published', 'rejected', 'suspended'], default: 'draft', index: true },
  legacySource: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, strict: true });

navigationPlaceSchema.index({ status: 1, category: 1, area: 1, ratingAverage: -1 });
navigationPlaceSchema.index({ displayName: 'text', description: 'text', tags: 'text', area: 'text' });

module.exports = mongoose.models.NavigationPlace || mongoose.model('NavigationPlace', navigationPlaceSchema);
