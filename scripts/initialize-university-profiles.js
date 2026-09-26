require('dotenv').config();

const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');

const defaults = {
  tagline: 'Knowledge, character and service for a changing world.',
  institutionType: 'University',
  logo: 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=400',
  heroImage: 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=1800',
  established: '1992',
  stats: { students: '18340', faculties: '12', programmes: '97', ranking: 'Top 20', established: '1992' },
  story: {
    image: 'https://images.pexels.com/photos/256381/pexels-photo-256381.jpeg?auto=compress&cs=tinysrgb&w=1200',
    heading: 'A campus built for discovery.',
    paragraphs: [
      'A fictional university profile for Yola AI Info Hub, designed to give administrators a complete starting point for verified institutional content.',
      'The university community supports ambitious learners through teaching, research, mentoring, enterprise and practical service to Adamawa State.'
    ]
  },
  faculties: [
    { name: 'Sciences', icon: '⌘', description: 'Research-led programmes in life, physical, environmental and computing sciences.' },
    { name: 'Arts and Social Sciences', icon: '⚖', description: 'Ideas, policy, culture and society explored with local and global relevance.' },
    { name: 'Engineering', icon: '✦', description: 'Design, infrastructure and technology for resilient communities and industry.' },
    { name: 'Health Sciences', icon: '✚', description: 'Professional learning and public-health innovation for healthier communities.' },
    { name: 'Agriculture', icon: '▤', description: 'Food systems, agribusiness, climate-smart farming and environmental stewardship.' },
    { name: 'Management Sciences', icon: '◈', description: 'Enterprise, leadership, finance and public administration for a changing economy.' }
  ],
  programmes: [
    { level: 'Undergraduate', description: 'Bachelor degrees with foundation and professional pathways across the academic community.', examples: ['Computer Science', 'Economics', 'Nursing', 'Law'] },
    { level: 'Postgraduate', description: 'Masters study for advanced professional practice, leadership and research skills.', examples: ['MSc Data Science', 'MBA', 'MEd', 'MPH'] },
    { level: 'Doctoral', description: 'Supervised research for original scholarly contribution and regional impact.', examples: ['PhD programmes subject to faculty availability'] }
  ],
  admissions: [
    { title: 'Explore', description: 'Choose a programme and check its requirements.' },
    { title: 'Apply', description: 'Submit your verified application online.' },
    { title: 'Screen', description: 'Complete required examinations or screening.' },
    { title: 'Enrol', description: 'Accept your offer and complete registration.' }
  ],
  fees: [
    { level: 'Undergraduate', amount: 'NGN 180,000 - 420,000', note: 'Fictional annual estimate; fees vary by faculty and residency.' },
    { level: 'Postgraduate', amount: 'NGN 260,000 - 650,000', note: 'Confirm research, professional and registration charges.' },
    { level: 'International', amount: 'NGN 850,000 - 1,400,000', note: 'Contact admissions for the current international schedule.' }
  ],
  accreditations: [
    { name: 'NUC', detail: 'Programme accreditation placeholder; verify before publishing.' },
    { name: 'ISO', detail: 'Quality management recognition placeholder.' },
    { name: 'Research', detail: 'Regional research impact recognition placeholder.' },
    { name: 'Community', detail: 'Service and innovation award placeholder.' }
  ],
  gallery: [
    { image: 'https://images.pexels.com/photos/159740/library-la-trobe-study-students-159740.jpeg?auto=compress&cs=tinysrgb&w=1200', caption: 'Central library and learning commons' },
    { image: 'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Collaborative learning space' },
    { image: 'https://images.pexels.com/photos/1181533/pexels-photo-1181533.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Science laboratory' },
    { image: 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Campus study garden' }
  ],
  alumni: [
    { name: 'Amina Yusuf', field: 'Public service', year: '2008', image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Bala Ibrahim', field: 'Technology and enterprise', year: '2012', image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Grace Danladi', field: 'Education and research', year: '2010', image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Musa Ahmed', field: 'Agriculture and development', year: '2005', image: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=300' }
  ],
  research: [
    { title: 'Climate-smart agriculture', description: 'Fictional cross-faculty research into resilient crops, water use and smallholder livelihoods.' },
    { title: 'Digital health access', description: 'A placeholder innovation lab exploring telehealth, records and rural care pathways.' },
    { title: 'Northern enterprise hub', description: 'Student ventures and community partnerships supporting local jobs and inclusive growth.' },
    { title: 'Education technology', description: 'Practical research into accessible digital learning for schools across Adamawa.' }
  ],
  partnerships: [
    { name: 'Adamawa Innovation Network', detail: 'Community enterprise and technology partnership placeholder.' },
    { name: 'Northern Research Consortium', detail: 'Regional research collaboration placeholder.' },
    { name: 'Partner University', detail: 'International exchange and academic mobility placeholder.' },
    { name: 'Yola Public Health Forum', detail: 'Applied health and community service partnership placeholder.' }
  ],
  studentLife: [
    { title: 'Sport and wellness', image: 'https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=800' },
    { title: 'Clubs and societies', image: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800' },
    { title: 'Leadership and service', image: 'https://images.pexels.com/photos/3184423/pexels-photo-3184423.jpeg?auto=compress&cs=tinysrgb&w=800' }
  ]
};

const universityFilter = {
  $or: [
    { category: /universit/i },
    { subcategory: /universit|polytechnic|institute of technology/i }
  ]
};

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const records = await NavigationPlace.find(universityFilter).select('displayName description image heroImage galleryImages galleryCaptions contact universityProfile');
  let updated = 0;
  for (const record of records) {
    const current = record.universityProfile ? record.universityProfile.toObject() : {};
    const hasContent = value => typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
    const hasUsefulItems = (items, placeholder) => Array.isArray(items) && items.length > 1 && !items.every(item => placeholder(item));
    const profile = {
      ...defaults,
      ...current,
      stats: { ...defaults.stats, ...(current.stats || {}) },
      story: { ...defaults.story, ...(current.story || {}) },
      faculties: hasUsefulItems(current.faculties, item => item && item.name === 'Academic faculty') ? current.faculties : defaults.faculties,
      programmes: hasUsefulItems(current.programmes, item => item && item.level === 'Undergraduate' && /pending|prepared/i.test(item.description || '')) ? current.programmes : defaults.programmes,
      admissions: hasUsefulItems(current.admissions, item => item && /explore|apply|screen|enrol/i.test(item.title || '') && /choose|submit|complete|accept/i.test(item.description || '')) ? current.admissions : defaults.admissions,
      fees: hasUsefulItems(current.fees, item => item && item.level === 'Programme level') ? current.fees : defaults.fees,
      accreditations: hasUsefulItems(current.accreditations, item => item && item.name === 'Accreditation') ? current.accreditations : defaults.accreditations,
      gallery: current.gallery?.length ? current.gallery : defaults.gallery,
      alumni: current.alumni?.length ? current.alumni : defaults.alumni,
      research: hasUsefulItems(current.research, item => item && item.title === 'Research and innovation') ? current.research : defaults.research,
      partnerships: hasUsefulItems(current.partnerships, item => item && item.name === 'Partner institution') ? current.partnerships : defaults.partnerships,
      studentLife: hasUsefulItems(current.studentLife, item => item && item.title === 'Student life') ? current.studentLife : defaults.studentLife
    };
    if (!hasContent(current.tagline)) profile.tagline = defaults.tagline;
    if (!hasContent(current.institutionType)) profile.institutionType = defaults.institutionType;
    if (!hasContent(current.logo)) profile.logo = defaults.logo;
    if (!hasContent(current.heroImage)) profile.heroImage = defaults.heroImage;
    if (!hasContent(current.established) || current.established === 'Not provided') profile.established = defaults.established;
    if (!hasContent(current.story?.image)) profile.story.image = defaults.story.image;
    if (!hasContent(current.story?.heading) || current.story.heading === 'A campus built for discovery.') profile.story.heading = defaults.story.heading;
    if (!current.story?.paragraphs?.length || current.story.paragraphs.some(item => /being prepared|will be added/i.test(item))) profile.story.paragraphs = defaults.story.paragraphs;
    for (const key of Object.keys(defaults.stats)) {
      if (!hasContent(current.stats?.[key]) || current.stats[key] === 'Not provided') profile.stats[key] = defaults.stats[key];
    }
    const updates = { universityProfile: profile };
    if (!record.description) updates.description = `${record.displayName} is a fictional university profile prepared for Yola AI Info Hub. Verify institutional information before publication.`;
    if (!record.image) updates.image = defaults.logo;
    if (!record.heroImage) updates.heroImage = defaults.heroImage;
    if (!record.galleryImages || !record.galleryImages.length) updates.galleryImages = defaults.gallery.map(item => item.image);
    if (!record.galleryCaptions || !record.galleryCaptions.length) updates.galleryCaptions = defaults.gallery.map(item => item.caption);
    const contact = record.contact && record.contact.toObject ? record.contact.toObject() : (record.contact || {});
    updates.contact = {
      phone: contact.phone || '+234 800 000 0192',
      email: contact.email || `admissions@${record.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.example`,
      website: contact.website || 'https://www.example.edu.ng'
    };
    await NavigationPlace.updateOne({ _id: record._id }, { $set: updates });
    updated += 1;
  }
  console.log(`University profile initialization complete: ${updated} records updated.`);
  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('University profile initialization failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
