require('dotenv').config();

const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');

const seeds = {
  'federal-college-of-education': { type: 'College of Education', established: '1977', programmes: ['NCE Primary Education', 'NCE English Education', 'NCE Mathematics Education'], departments: ['Arts and Social Sciences Education', 'Science Education', 'Vocational Education'] },
  'state-polytechnic': { type: 'State Polytechnic', established: '1991', programmes: ['ND Computer Science', 'ND Accountancy', 'HND Business Administration'], departments: ['Applied Sciences', 'Business Studies', 'Engineering Technology'] },
  'federal-polytechnic': { type: 'Federal Polytechnic', established: '1979', programmes: ['ND Electrical Engineering', 'ND Science Laboratory Technology', 'HND Computer Science'], departments: ['Engineering Technology', 'Applied Sciences', 'Environmental Studies'] },
  'central-college-of-health-sciences-and-technology-yola': { type: 'College of Health Sciences and Technology', established: '2004', programmes: ['Diploma Community Health', 'Diploma Environmental Health', 'Certificate Pharmacy Technician'], departments: ['Community Health', 'Environmental Health', 'Pharmaceutical Technology'] },
  'college-of-nursing-sciences-yola-consy': { type: 'College of Nursing Sciences', established: '2010', programmes: ['Basic Nursing', 'Basic Midwifery', 'Post-basic Nursing'], departments: ['Nursing Sciences', 'Midwifery', 'Public Health Nursing'] },
  'college-for-legal-studies-yola': { type: 'College for Legal Studies', established: '2005', programmes: ['Diploma Law', 'Paralegal Studies', 'Legal Secretary Studies'], departments: ['Legal Studies', 'Advocacy and Practice', 'General Studies'] }
};

const image = 'https://images.pexels.com/photos/3862132/pexels-photo-3862132.jpeg?auto=compress&cs=tinysrgb&w=1200';

function profileFor(record, seed) {
  const current = record.technicalProfile && record.technicalProfile.toObject ? record.technicalProfile.toObject() : (record.technicalProfile || {});
  const programmes = seed.programmes.map((name, index) => ({ level: index === 0 ? 'ND / Diploma' : index === 1 ? 'HND / Professional' : 'Certificate / NCE', name, duration: '2 years', entryRoute: 'Relevant O-level credits and institution screening' }));
  const departments = seed.departments.map(name => ({ name, description: `Practical teaching, supervised projects and career preparation in ${name.toLowerCase()}.` }));
  return {
    tagline: current.tagline || 'Practice-led education, professional preparation and skills for a changing economy.',
    institutionType: current.institutionType || seed.type,
    crest: current.crest || (record.displayName || 'TI').slice(0, 2).toUpperCase(),
    heroImage: current.heroImage || image,
    established: current.established || seed.established,
    stats: { programmes: current.stats?.programmes || String(seed.programmes.length * 9), students: current.stats?.students || '4,800', accreditation: current.stats?.accreditation || 'Verify current status' },
    overview: { heading: current.overview?.heading || 'Learning with a clear purpose.', paragraphs: current.overview?.paragraphs?.length ? current.overview.paragraphs : [`${record.displayName} is a fictional database profile prepared for Yola AI Info Hub. Replace this content with verified institutional history and mission.`, 'Learners combine classroom teaching, practical projects, supervised field experience and professional guidance for a changing economy.'], image: current.overview?.image || image },
    programmes: current.programmes?.length ? current.programmes : programmes,
    departments: current.departments?.length ? current.departments : departments,
    accreditation: current.accreditation?.length ? current.accreditation : [{ name: 'Regulatory accreditation', status: 'Verify', detail: 'Confirm current programme accreditation before publication.' }, { name: 'Quality assurance', status: 'Active review', detail: 'Publish the latest institutional quality statement here.' }],
    admissions: current.admissions?.length ? current.admissions : [{ title: 'Entry requirements', description: 'Review the programme-specific O-level and professional requirements.' }, { title: 'Application', description: 'Submit the application, credentials and screening information.' }, { title: 'Registration', description: 'Complete acceptance, medical and registration steps after admission.' }],
    fees: current.fees?.length ? current.fees : [{ name: 'Tuition and registration', amount: 'NGN 185,000 - 420,000', note: 'Fictional estimate; verify the current schedule with admissions.' }, { name: 'Technology and practical levy', amount: 'NGN 35,000', note: 'Fictional session charge for workshops, laboratories and ICT support.' }],
    facilities: current.facilities?.length ? current.facilities : [{ name: 'ICT and library centre', image, description: 'Study and digital learning support.' }, { name: 'Teaching workshops', image, description: 'Practice-led technical learning spaces.' }],
    industry: { heading: current.industry?.heading || 'Industrial training and SIWES', description: current.industry?.description || 'Supervised practice, placement partners and community projects connect classroom learning with real work.', placement: current.industry?.placement || 'Placement information to be verified' },
    careers: current.careers?.length ? current.careers : [{ stage: 'Study', title: seed.programmes[0], description: 'Build foundational knowledge and practical confidence.' }, { stage: 'Practice', title: 'Industrial training', description: 'Apply skills through supervised field or workshop experience.' }, { stage: 'Career', title: 'Professional pathway', description: 'Progress into employment, enterprise or further study.' }],
    services: current.services?.length ? current.services : [{ name: 'Guidance', icon: '•', description: 'Academic and career support.' }, { name: 'ICT help', icon: '⌘', description: 'Digital learning and student support.' }, { name: 'Entrepreneurship', icon: '✦', description: 'Enterprise and employability development.' }],
    gallery: current.gallery?.length ? current.gallery : [{ image, caption: 'Learning and workshop spaces' }, { image, caption: 'Student collaboration' }, { image, caption: 'Library and ICT support' }],
    brochure: current.brochure || 'https://example.com/yola-technical-institution-brochure.pdf',
    footerNote: current.footerNote || 'Verify programmes, fees, admissions and accreditation before publishing.'
  };
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  let updated = 0;
  for (const [slug, seed] of Object.entries(seeds)) {
    const record = await NavigationPlace.findOne({ slug }).select('displayName description address openingHours image heroImage galleryImages galleryCaptions contact technicalProfile');
    if (!record) continue;
    const profile = profileFor(record, seed);
    const updates = { technicalProfile: profile };
    if (!record.description) updates.description = `${record.displayName} offers practical, professional and technical education. Verify institutional information before publication.`;
    if (!record.image) updates.image = profile.heroImage;
    if (!record.heroImage) updates.heroImage = profile.heroImage;
    if (!record.address) updates.address = `${record.displayName}, Yola, Adamawa State`;
    if (!record.openingHours) updates.openingHours = 'Monday-Friday, 8:00 am-4:00 pm';
    if (!record.galleryImages?.length) updates.galleryImages = profile.gallery.map(item => item.image);
    if (!record.galleryCaptions?.length) updates.galleryCaptions = profile.gallery.map(item => item.caption);
    const contact = record.contact && record.contact.toObject ? record.contact.toObject() : (record.contact || {});
    updates.contact = {
      phone: contact.phone || '+234 800 000 0240',
      email: contact.email || `admissions@${slug}.example`,
      website: contact.website || 'https://example.com/technical-institution'
    };
    await NavigationPlace.updateOne({ _id: record._id }, { $set: updates });
    updated += 1;
  }
  console.log(`Technical institution profile initialization complete: ${updated} records updated.`);
  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Technical institution profile initialization failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
