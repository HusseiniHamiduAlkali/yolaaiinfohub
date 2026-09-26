require('dotenv').config();

const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');

const slugs = [
  'national-library-of-nigeria-nln-yola-branch',
  'bindir-knowledge-center-bkc-yola',
  'karatu-library-yola',
  'cosmotech-learning-center-yola',
  'gateway-educational-hub-yola',
  'nothern-intelligence-hub-yola'
];

const image = 'https://images.pexels.com/photos/159740/library-la-trobe-study-students-159740.jpeg?auto=compress&cs=tinysrgb&w=1400';

function profileFor(record) {
  const current = record.learningProfile && record.learningProfile.toObject ? record.learningProfile.toObject() : (record.learningProfile || {});
  const fallback = value => value || '';
  return {
    tagline: fallback(current.tagline) || 'An open community space for reading, research, practical learning and connection.',
    institutionType: fallback(current.institutionType) || 'Library / Knowledge Center / Learning Hub',
    logo: fallback(current.logo) || (record.displayName || 'LH').slice(0, 2).toUpperCase(),
    heroImage: fallback(current.heroImage) || image,
    stats: { collection: current.stats?.collection || '25,000', seats: current.stats?.seats || '120', events: current.stats?.events || '34', openDays: current.stats?.openDays || '6' },
    mission: { heading: current.mission?.heading || 'Ideas deserve room to grow.', paragraphs: current.mission?.paragraphs?.length ? current.mission.paragraphs : [`${record.displayName} is a fictional database profile prepared for Yola AI Info Hub. Replace this text with verified history and community purpose.`, 'The centre connects learners with trusted resources, welcoming spaces, useful skills and opportunities to share knowledge.'] },
    services: current.services?.length ? current.services : [
      { name: 'Study spaces', icon: '▣', description: 'Quiet desks, group tables and reservable rooms.' }, { name: 'Digital resources', icon: '⌘', description: 'Computers, internet and supported online access.' }, { name: 'Workshops', icon: '✦', description: 'Practical sessions for school, work and life.' }, { name: 'Maker space', icon: '⚙', description: 'Tools and guided experimentation for creators.' }
    ],
    resources: current.resources?.length ? current.resources : [
      { count: '12,400', name: 'Books', description: 'Fiction, non-fiction and reference.' }, { count: '2,100', name: 'E-books', description: 'Read from anywhere with membership.' }, { count: '36', name: 'Journals', description: 'Research and current affairs titles.' }, { count: '680', name: 'Archives', description: 'Local history and special collections.' }
    ],
    events: current.events?.length ? current.events : [
      { day: '12', month: 'OCT', tag: 'WORKSHOP', title: 'Introduction to coding', description: 'Beginner-friendly digital skills session.' }, { day: '18', month: 'OCT', tag: 'CHILDREN', title: 'Saturday story circle', description: 'Read, imagine and create together.' }, { day: '25', month: 'OCT', tag: 'COMMUNITY', title: 'Local history talk', description: 'Meet a guest speaker and explore the archive.' }, { day: '02', month: 'NOV', tag: 'CAREER', title: 'CV and job-search clinic', description: 'Bring your questions and work with a mentor.' }
    ],
    membership: current.membership?.length ? current.membership : [
      { name: 'Community membership', price: 'Free', description: 'Reading spaces, borrowing access and selected programmes.', benefits: ['Local registration', 'Public computers', 'Events access'] }, { name: 'Extended membership', price: 'NGN 8,000 / year', description: 'Enhanced access for researchers, creators or partner members.', benefits: ['Extended borrowing', 'Room booking', 'Premium databases'] }
    ],
    spaces: current.spaces?.length ? current.spaces : [
      { name: 'Reading rooms', image, description: 'Comfortable, well-lit spaces for focused reading and research.' }, { name: 'Computer lab', image, description: 'Supported access to digital tools, connectivity and learning platforms.' }, { name: 'Children’s corner', image, description: 'A playful, safe space for early readers and family programmes.' }
    ],
    hours: current.hours?.length ? current.hours : [
      { day: 'Monday-Tuesday', hours: '9:00 am - 6:00 pm', services: 'All services' }, { day: 'Wednesday-Friday', hours: '9:00 am - 6:00 pm', services: 'All services' }, { day: 'Saturday', hours: '10:00 am - 3:00 pm', services: 'Selected services' }, { day: 'Sunday', hours: 'Closed', services: 'None' }
    ],
    registration: current.registration?.length ? current.registration : [
      { step: '1', title: 'Visit', description: 'Come to the centre or begin online.' }, { step: '2', title: 'Identify', description: 'Bring the required identification.' }, { step: '3', title: 'Register', description: 'Complete the membership form.' }, { step: '4', title: 'Explore', description: 'Start borrowing and joining in.' }
    ],
    digital: current.digital?.length ? current.digital : [
      { title: 'Digital catalogue', url: 'https://example.com/digital-catalogue', description: 'Search the fictional collection records.' }, { title: 'Research portal', url: 'https://example.com/research-portal', description: 'Explore verified online journals.' }, { title: 'Learning platform', url: 'https://example.com/learning-platform', description: 'Join courses and skill sessions.' }
    ],
    outreach: current.outreach?.length ? current.outreach : [
      { title: 'Mobile reading programme', image, description: 'Take books and reading activities into neighbourhoods.' }, { title: 'Digital confidence sessions', image, description: 'Build practical digital skills with community learners.' }, { title: 'Community partnerships', image, description: 'Work with local groups on useful learning projects.' }
    ],
    gallery: current.gallery?.length ? current.gallery : [{ image, caption: 'Quiet study areas' }, { image, caption: 'Community shelf' }, { image, caption: 'Workshop moment' }],
    footerNote: current.footerNote || 'Verify opening hours, membership fees, services and programmes before publishing.'
  };
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  let updated = 0;
  for (const slug of slugs) {
    const record = await NavigationPlace.findOne({ slug }).select('displayName description address openingHours image heroImage galleryImages galleryCaptions contact learningProfile');
    if (!record) continue;
    const profile = profileFor(record);
    const updates = { learningProfile: profile, address: record.address || `${record.displayName}, Yola, Adamawa State`, openingHours: record.openingHours || 'Monday-Friday, 9:00 am-6:00 pm', image: record.image || profile.heroImage, heroImage: record.heroImage || profile.heroImage };
    if (!record.description) updates.description = `${record.displayName} is a fictional library and learning hub profile. Verify information before publication.`;
    if (!record.galleryImages?.length) updates.galleryImages = profile.gallery.map(item => item.image);
    if (!record.galleryCaptions?.length) updates.galleryCaptions = profile.gallery.map(item => item.caption);
    const contact = record.contact && record.contact.toObject ? record.contact.toObject() : (record.contact || {});
    updates.contact = { phone: contact.phone || '+234 800 000 0310', email: contact.email || `hello@${slug}.example`, website: contact.website || 'https://example.com/learning-hub' };
    await NavigationPlace.updateOne({ _id: record._id }, { $set: updates });
    updated += 1;
  }
  console.log(`Learning hub profile initialization complete: ${updated} records updated.`);
  await mongoose.disconnect();
}

run().catch(async error => { console.error('Learning hub profile initialization failed:', error.message); await mongoose.disconnect().catch(() => {}); process.exitCode = 1; });
