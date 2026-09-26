require('dotenv').config();

const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const schoolFilter = {
    $or: [
      { category: /school/i },
      { category: /religious/i, subcategory: /school|primary|secondary|academy/i },
      { subcategory: /primary|secondary|nursery|elementary|high school|grammar school|academy/i }
    ]
  };
  const defaults = {
    tagline: 'Nurturing curious minds and confident futures.',
    schoolType: 'Primary and secondary school',
    crest: 'SN',
    heroImage: '',
    stats: { students: '680', teachers: '48', years: '18', levels: '4' },
    mission: 'To provide a joyful, inclusive education that equips every child for meaningful contribution.',
    vision: 'To be a trusted community of thoughtful learners, compassionate leaders and lifelong explorers.',
    levels: [
      { name: 'Nursery and early years', description: 'Play-based foundations in language, movement, creativity and social development.' },
      { name: 'Primary school', description: 'Strong literacy, numeracy, discovery and character education.' },
      { name: 'Junior secondary', description: 'Broad subject exploration and confident transition to secondary learning.' },
      { name: 'Senior secondary', description: 'Focused academic preparation, guidance and leadership opportunities.' }
    ],
    subjects: ['Sciences', 'Languages', 'Mathematics', 'Arts', 'Humanities', 'Digital skills'].map(name => ({ name, icon: '•' })),
    facilities: ['Library', 'Classrooms', 'Creative studio'].map(name => ({ name, image: '' })),
    staff: [
      { name: 'Teacher Name', role: 'Early years', bio: 'Supporting the first joyful steps into learning.' },
      { name: 'Teacher Name', role: 'Primary', bio: 'Building strong foundations for curious learners.' },
      { name: 'Teacher Name', role: 'Secondary', bio: 'Guiding achievement, confidence and purpose.' }
    ],
    admissions: {
      checklist: ['Completed application form', 'Child birth certificate', 'Previous school record where applicable', 'Parent or guardian identification'],
      steps: [
        { title: 'Enquire', description: 'Book a visit or request an information pack.' },
        { title: 'Apply', description: 'Send the required documents and application.' },
        { title: 'Meet us', description: 'Complete an age-appropriate assessment or interview.' }
      ]
    },
    fees: ['Early years', 'Primary', 'Secondary'].map(name => ({ name, amount: 'NGN amount to verify', note: 'Per term - verify with school', featured: name === 'Primary' })),
    activities: ['Sport', 'Drama', 'Chess', 'Music', 'Eco club', 'STEM club'].map(name => ({ name, icon: '•' })),
    calendar: [
      { month: 'September', event: 'New term welcome' },
      { month: 'November', event: 'Learning showcase' },
      { month: 'March', event: 'Sports festival' },
      { month: 'July', event: 'Celebration day' }
    ],
    awards: [
      { name: 'Academic award', detail: 'Verify with school', icon: '★' },
      { name: 'Sport award', detail: 'Verify with school', icon: '★' },
      { name: 'Community award', detail: 'Verify with school', icon: '★' }
    ],
    testimonials: [{ quote: 'The school makes every child feel seen, supported and excited to learn.', author: 'Parent testimonial - Placeholder' }],
    gallery: [
      { image: '', caption: 'School life' },
      { image: '', caption: 'Learning spaces' },
      { image: '', caption: 'Community moments' },
      { image: '', caption: 'Activities' }
    ]
  };
  const schools = await NavigationPlace.find(schoolFilter).select('schoolProfile');
  let updated = 0;
  for (const school of schools) {
    const current = school.schoolProfile ? school.schoolProfile.toObject() : {};
    const profile = {
      ...defaults,
      ...current,
      stats: { ...defaults.stats, ...(current.stats || {}) },
      admissions: { ...defaults.admissions, ...(current.admissions || {}) },
      levels: current.levels && current.levels.length ? current.levels : defaults.levels,
      subjects: current.subjects && current.subjects.length ? current.subjects : defaults.subjects,
      facilities: current.facilities && current.facilities.length ? current.facilities : defaults.facilities,
      staff: current.staff && current.staff.length ? current.staff : defaults.staff,
      fees: current.fees && current.fees.length ? current.fees : defaults.fees,
      activities: current.activities && current.activities.length ? current.activities : defaults.activities,
      calendar: current.calendar && current.calendar.length ? current.calendar : defaults.calendar,
      awards: current.awards && current.awards.length ? current.awards : defaults.awards,
      testimonials: current.testimonials && current.testimonials.length ? current.testimonials : defaults.testimonials,
      gallery: current.gallery && current.gallery.length ? current.gallery : defaults.gallery
    };
    await NavigationPlace.updateOne({ _id: school._id }, { $set: { schoolProfile: profile } });
    updated += 1;
  }
  console.log(`School profile initialization complete: ${updated} records updated.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('School profile initialization failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
