require('dotenv').config();

const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');

const primarySlugs = [
  'yola-central-dispensary', 'valli-clinic-jimeta-yola', 'malamre-phcc-yola', 'bako-phcc-yola',
  'yolde-pate-phcc-yola', 'bakari-mbamoi-phcc-yola', 'adarawo-phcc-yola',
  'nana-asma-u-maternity-yola', 'karewa-phcc-yola'
];
const hospitalSlugs = [
  'specialist-hospital-yola', 'adamawa-german-hospital-yola', 'meddy-specialists-clinic-yola',
  'fortland-orthopaedic-hospital-yola', 'new-boshang-clinic-yola', 'galbose-specialists-clinic-yola',
  'modibbo-adama-teaching-hospital-mauth-yola'
];
const pharmacySlugs = [
  'shekinah-pharmacy', 'meddy-pharmacy', 'kingblaise-pharmacy-yola', 'alfijr-pharmacy-yola',
  'mufami-pharmacy-store', 'jds-pharmacy-yola', 'lekki-pharmacy-and-pharmaceuticals-yola',
  'jasar-pharmacy-yola', 'kerion-pharmacy-yola'
];
const staffImage = 'https://images.pexels.com/photos/5531446/pexels-photo-5531446.jpeg?auto=compress&cs=tinysrgb&w=500';
const facilityImage = 'https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1200';

function primaryProfile(name) {
  return {
    facilityType: 'Primary Healthcare Centre', tagline: `Community-based first-contact care for ${name} and nearby residents.`,
    heroBadges: ['Primary care', 'Community health'],
    stats: [{ label: 'Care level', value: 'Primary' }, { label: 'Service area', value: 'Yola, Adamawa' }, { label: 'Access', value: 'Walk-in' }],
    overview: {
      heading: 'Community care, close to home',
      paragraphs: [`${name} is a fictional sample profile prepared for the Navi directory. Replace this overview with verified facility information.`, 'The centre is represented as a first-contact care point for preventive services, basic consultations, maternal and child health, and referral support.'],
      facts: [{ label: 'Facility type', value: 'Primary healthcare centre' }, { label: 'Ownership', value: 'Confirm with facility' }, { label: 'Community served', value: 'Nearby Yola communities' }, { label: 'Care level', value: 'Primary care' }],
      history: ['Sample history entry: add verified opening date, community milestones, and service changes.']
    },
    todayServices: ['General consultation', 'Maternal health', 'Child health and immunization', 'Family planning', 'Basic diagnostics', 'Health education'],
    coreServices: [
      { name: 'General Consultation', desc: 'Initial assessment and basic care for common health concerns.', icon: 'stethoscope', cat: 'general' },
      { name: 'Antenatal Care', desc: 'Pregnancy check-ups, counselling, and referral support.', icon: 'heart', cat: 'maternal' },
      { name: 'Postnatal Care', desc: 'Follow-up support for mothers and newborns after delivery.', icon: 'baby', cat: 'maternal' },
      { name: 'Immunization', desc: 'Routine vaccination services according to the local programme.', icon: 'syringe', cat: 'child' },
      { name: 'Family Planning', desc: 'Confidential information and family-planning support.', icon: 'heart', cat: 'maternal' },
      { name: 'Child Healthcare', desc: 'Child wellness checks and growth monitoring.', icon: 'baby', cat: 'child' },
      { name: 'Nutrition', desc: 'Basic nutrition advice and assessment.', icon: 'apple', cat: 'general' },
      { name: 'Malaria Assessment', desc: 'Initial assessment and referral or treatment as available.', icon: 'thermometer', cat: 'general' },
      { name: 'Basic Laboratory', desc: 'Selected point-of-care tests; confirm availability.', icon: 'test', cat: 'diagnostic' },
      { name: 'Health Education', desc: 'Practical health information for individuals and families.', icon: 'book', cat: 'general' },
      { name: 'Preventive Screening', desc: 'Basic screening and referral for further assessment.', icon: 'shield', cat: 'general' },
      { name: 'Mental Health Referral', desc: 'Initial support and referral to appropriate services.', icon: 'brain', cat: 'general' }
    ],
    maternalChild: [
      { name: 'Antenatal Care (ANC)', desc: 'Routine pregnancy visits and referral when additional care is needed.' },
      { name: 'Postnatal Care (PNC)', desc: 'Mother and newborn follow-up after delivery.' },
      { name: 'Immunization', desc: 'Childhood vaccines according to the current local schedule.' },
      { name: 'Child Welfare Clinic', desc: 'Growth monitoring and child wellness support.' },
      { name: 'Family Planning', desc: 'Counselling and information about available options.' },
      { name: 'Pregnancy Services', desc: 'Pregnancy testing and referral for higher-risk cases.' }
    ],
    weeklySchedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => ({ day, services: index === 6 ? ['Emergency referral information'] : ['General consultation', index % 2 ? 'Family planning' : 'Maternal and child health'] })),
    staff: [
      { name: 'Sample Medical Officer', role: 'Medical Officer', qual: 'Qualifications to be verified', img: staffImage },
      { name: 'Sample Midwife', role: 'Nurse and Midwife', qual: 'Professional registration to be verified', img: staffImage },
      { name: 'Sample Community Health Officer', role: 'Community Health Officer', qual: 'Qualifications to be verified', img: staffImage },
      { name: 'Sample Laboratory Officer', role: 'Laboratory Officer', qual: 'Qualifications to be verified', img: staffImage }
    ],
    facilities: [
      { name: 'Consultation Rooms', desc: 'Room count and equipment to be confirmed.', icon: 'stethoscope' }, { name: 'Maternity Area', desc: 'Confirm available maternal-care facilities.', icon: 'baby' },
      { name: 'Basic Laboratory', desc: 'Confirm tests and operating hours.', icon: 'test' }, { name: 'Dispensary', desc: 'Confirm essential medicines and availability.', icon: 'pill' },
      { name: 'Waiting Area', desc: 'Patient waiting space.', icon: 'chair' }, { name: 'Water Supply', desc: 'Confirm facility water arrangements.', icon: 'droplet' },
      { name: 'Power Supply', desc: 'Confirm grid, generator, or solar provision.', icon: 'zap' }, { name: 'Cold-Chain Equipment', desc: 'Confirm vaccine storage equipment.', icon: 'snow' }
    ],
    accessibility: [
      { name: 'Wheelchair Access', note: 'Confirm step-free entrance and accessible rooms.', icon: 'accessibility' }, { name: 'Parking', note: 'Confirm visitor parking availability.', icon: 'parking' },
      { name: 'Public Transport', note: 'Add the nearest public transport point.', icon: 'bus' }, { name: 'Nearest Major Road', note: 'Add verified road directions.', icon: 'road' },
      { name: 'Nearby Landmark', note: 'Add a verified community landmark.', icon: 'pin' }
    ],
    hoursData: [
      { label: 'Monday – Friday', val: 'Confirm facility hours' }, { label: 'Saturday', val: 'Confirm availability' },
      { label: 'Sunday', val: 'Confirm emergency arrangements' }, { label: 'Immunization Clinic', val: 'Confirm clinic day and time' },
      { label: 'Antenatal Clinic', val: 'Confirm clinic day and time' }
    ],
    faqs: [
      { q: 'Do I need to register before receiving care?', a: 'Ask reception about registration and any documents needed for your first visit.' },
      { q: 'Are immunization services available?', a: 'Contact the facility to confirm current clinic days and vaccine availability.' },
      { q: 'Can I get family-planning support?', a: 'Ask the facility team about confidential counselling and currently available services.' },
      { q: 'What should I bring for antenatal care?', a: 'Bring available medical records and ask the care team what documents are required.' },
      { q: 'Is the centre open on weekends?', a: 'Weekend hours and emergency arrangements should be confirmed directly with the facility.' }
    ],
    location: { landmark: 'Add a verified nearby landmark', mapUrl: '' },
    footerNote: 'Confirm services, hours, contact numbers, and referral arrangements directly with this facility.'
  };
}

function hospitalProfile(name) {
  const deptNames = ['Emergency Medicine', 'General Medicine', 'Surgery', 'Paediatrics', 'Obstetrics and Gynaecology', 'Orthopaedics', 'Radiology and Imaging', 'Laboratory Services'];
  return {
    facilityType: name.toLowerCase().includes('teaching') ? 'Teaching Hospital' : 'Secondary Healthcare Facility',
    tagline: `Hospital and specialist services profile for ${name}.`, heroBadges: ['Hospital services', 'Yola, Adamawa'],
    stats: [{ label: 'Care level', value: name.toLowerCase().includes('teaching') ? 'Tertiary' : 'Secondary' }, { label: 'Departments', value: '8 sample departments' }, { label: 'Emergency', value: 'Confirm availability' }],
    overview: {
      heading: 'Hospital care and specialist services',
      paragraphs: [`${name} is represented with fictional sample content for editing in Admin Navi. Replace every operational detail with information verified by the institution.`, 'Add the facility’s history, ownership, catchment area, accreditation and referral pathways here.'],
      facts: [{ label: 'Ownership', value: 'Confirm with institution' }, { label: 'Care level', value: 'Confirm current designation' }, { label: 'Catchment area', value: 'Yola and surrounding communities' }, { label: 'Accreditation', value: 'Confirm current status' }],
      history: ['Sample history entry: replace with verified establishment date and milestones.']
    },
    departments: deptNames.map((name, index) => ({ id: name.toLowerCase().replace(/[^a-z]+/g, '-'), name, icon: ['siren', 'stethoscope', 'scissors', 'baby', 'heart', 'activity', 'scan', 'test'][index], cat: index === 0 ? 'emergency' : index > 5 ? 'diagnostic' : index < 5 ? 'specialist' : 'general', desc: `${name} information and service availability should be confirmed with the facility.`, head: 'Sample department lead', phone: `+234 800 000 01${String(index).padStart(2, '0')}`, hours: index === 0 ? 'Confirm emergency service hours' : 'Confirm clinic hours' })),
    services: ['Outpatient Consultation', 'Emergency Services', 'Laboratory Services', 'Radiology and Imaging', 'Surgical Services', 'In-house Pharmacy'].map((name, index) => ({ name, desc: `${name} availability and details should be confirmed with the facility.`, icon: ['stethoscope', 'siren', 'test', 'scan', 'scissors', 'pill'][index] })),
    doctors: [
      { name: 'Sample Consultant One', title: 'Consultant Physician', qual: 'Qualifications and registration to be verified', dept: 'General Medicine', avail: 'Confirm schedule', img: staffImage },
      { name: 'Sample Consultant Two', title: 'Consultant Paediatrician', qual: 'Qualifications and registration to be verified', dept: 'Paediatrics', avail: 'Confirm schedule', img: staffImage },
      { name: 'Sample Consultant Three', title: 'Consultant Surgeon', qual: 'Qualifications and registration to be verified', dept: 'Surgery', avail: 'Confirm schedule', img: staffImage },
      { name: 'Sample Consultant Four', title: 'Emergency Physician', qual: 'Qualifications and registration to be verified', dept: 'Emergency Medicine', avail: 'Confirm schedule', img: staffImage }
    ],
    facilities: [
      { name: 'Operating Theatres', desc: 'Confirm number and services.', icon: 'scissors' }, { name: 'Intensive Care Unit', desc: 'Confirm current capacity.', icon: 'heart' },
      { name: 'Maternity Ward', desc: 'Confirm available services.', icon: 'baby' }, { name: 'Laboratory', desc: 'Confirm diagnostic services.', icon: 'test' },
      { name: 'Pharmacy', desc: 'Confirm operating hours.', icon: 'pill' }, { name: 'Imaging Centre', desc: 'Confirm available equipment.', icon: 'scan' },
      { name: 'Blood Bank', desc: 'Confirm availability and contact process.', icon: 'droplet' }, { name: 'Ambulance Service', desc: 'Confirm dispatch availability and phone.', icon: 'truck' }
    ],
    galleryImages: Array.from({ length: 8 }, (_, index) => ({ src: facilityImage, cap: ['Facility exterior', 'Patient reception', 'Clinical service area', 'Diagnostic area', 'Patient care', 'Staff workspace', 'Waiting area', 'Facility grounds'][index] })),
    emergency: { phone: '+234 800 000 0199', hours: 'Sample schedule: confirm emergency operating hours', ambulanceStatus: 'Sample status: confirm ambulance availability', notices: ['Fictional sample information. Confirm emergency arrangements before travel.', 'Emergency contact details are fictional placeholders.'] },
    hoursData: [
      { label: 'General Services', val: 'Confirm facility hours', em: '' }, { label: 'Emergency', val: 'Confirm availability', em: 'emergency' },
      { label: 'Outpatient', val: 'Confirm clinic hours', em: '' }, { label: 'Laboratory', val: 'Confirm service hours', em: '' },
      { label: 'Radiology', val: 'Confirm service hours', em: '' }, { label: 'Pharmacy', val: 'Confirm service hours', em: '' },
      { label: 'Visiting Hours', val: 'Confirm current policy', em: '' }
    ],
    faqs: [
      { q: 'Do specialist consultations require an appointment?', a: 'Contact the relevant department to confirm its current appointment process.' },
      { q: 'What documents should I bring?', a: 'Bring identification and available medical records; confirm any additional requirements with the facility.' },
      { q: 'Is emergency care available around the clock?', a: 'Contact the facility directly to confirm current emergency service arrangements.' },
      { q: 'Which insurance plans are accepted?', a: 'Ask the facility billing office to confirm accepted insurance plans.' },
      { q: 'What are the visiting hours?', a: 'Confirm the current visiting policy with the hospital before travelling.' }
    ],
    location: { landmark: 'Add a verified nearby landmark', mapUrl: '' },
    footerNote: 'Confirm all service, emergency, and visiting information directly with the hospital.'
  };
}

function pharmacyProfile(name) {
  const categoryNames = ['Pain Relief', 'Antimalarials', 'Antibiotics', 'Antihistamines', 'Vitamins and Supplements', 'Maternal Health', 'Paediatric Medicines', 'Diabetes Supplies', 'Hypertension', 'First Aid', 'Personal Care', 'Respiratory'];
  const productNames = ['Paracetamol 500mg', 'Artemether/Lumefantrine', 'Amoxicillin 250mg', 'Vitamin C 1000mg', 'Loratadine 10mg', 'Blood Glucose Test Strips', 'Folic Acid 5mg', 'Paediatric Paracetamol Syrup', 'Digital Blood Pressure Monitor', 'First Aid Kit', 'Hand Sanitiser', 'Salbutamol Inhaler'];
  return {
    facilityType: 'Community Pharmacy', tagline: `Pharmacy services and medicine information for ${name}.`, heroBadges: ['Pharmacy', 'Yola, Adamawa'],
    statusItems: [{ label: 'Licensing', value: 'Confirm current registration' }, { label: 'Pharmacist on duty', value: 'Confirm with pharmacy' }, { label: 'Delivery', value: 'Confirm availability' }, { label: 'Prescription service', value: 'Ask pharmacist' }, { label: 'Hours', value: 'Confirm current schedule' }],
    overview: { heading: 'Pharmacy information', paragraphs: [`${name} has a fictional sample profile for directory editing. Replace service, stock, price, licensing, staff, and opening-hour information with verified details.`, 'A registered pharmacist can advise on appropriate medicine use and prescription requirements.'], facts: [{ label: 'Pharmacy type', value: 'Confirm with facility' }, { label: 'Pharmacist', value: 'Confirm current team' }, { label: 'Delivery', value: 'Confirm service areas' }, { label: 'Location', value: 'Yola, Adamawa State' }] },
    services: ['Prescription Filling', 'OTC Medicines', 'Health Consultation', 'Medicine Refill', 'Home Delivery', 'Blood Pressure Check', 'Blood Sugar Check', 'First Aid Supplies', 'Health Products'].map((name, index) => ({ name, desc: `${name} availability and any charges should be confirmed with the pharmacy.`, icon: ['file', 'pill', 'stethoscope', 'refresh', 'truck', 'heart', 'droplet', 'shield', 'apple'][index] })),
    medCategories: categoryNames.map((name, index) => ({ name, count: String([24, 18, 32, 12, 45, 15, 20, 18, 22, 30, 40, 14][index]), icon: ['thermometer', 'thermometer', 'pill', 'wind', 'apple', 'baby', 'baby', 'droplet', 'heart', 'shield', 'sparkles', 'wind'][index], rx: index === 2 || index === 8 || index === 11 })),
    products: productNames.map((name, index) => ({ id: `sample-${index + 1}`, name, cat: categoryNames[index], avail: index !== 7, price: 'Confirm price', desc: 'Fictional catalogue entry. Confirm product availability, price, and pharmacist guidance before use.', rx: [2, 8, 11].includes(index) })),
    pharmacists: [
      { name: 'Sample Superintendent Pharmacist', role: 'Superintendent Pharmacist', qual: 'Name, qualifications, and registration to be verified', img: staffImage },
      { name: 'Sample Pharmacist', role: 'Pharmacist', qual: 'Name, qualifications, and registration to be verified', img: staffImage },
      { name: 'Sample Pharmacy Technician', role: 'Pharmacy Technician', qual: 'Name and qualifications to be verified', img: staffImage }
    ],
    healthChecks: [
      { name: 'Blood Pressure', price: 'Confirm price', icon: 'heart' }, { name: 'Blood Glucose', price: 'Confirm price', icon: 'droplet' },
      { name: 'Weight Check', price: 'Confirm price', icon: 'scale' }, { name: 'Temperature', price: 'Confirm price', icon: 'thermometer' },
      { name: 'BMI Assessment', price: 'Confirm price', icon: 'activity' }
    ],
    delivery: { available: 'Sample service: confirm availability', details: 'Fictional delivery profile; confirm coverage and charges.', phone: '+234 800 000 0299', areas: ['Yola', 'Jimeta', 'Confirm additional delivery areas'], pickup: 'Sample pickup service: confirm with pharmacy', paymentOptions: ['Cash', 'Bank transfer', 'POS'] },
    medicineNotice: 'Medicine availability and sample product information may change. Consult a qualified healthcare professional. Prescription medicines require a valid prescription.',
    hoursData: [{ label: 'Monday – Friday', val: 'Confirm pharmacy hours' }, { label: 'Saturday', val: 'Confirm pharmacy hours' }, { label: 'Sunday', val: 'Confirm pharmacy hours' }, { label: 'Public Holidays', val: 'Confirm pharmacy hours' }],
    faqs: [
      { q: 'Do you offer home delivery?', a: 'Contact the pharmacy to confirm delivery coverage, ordering process, and fees.' },
      { q: 'Do you fill prescriptions?', a: 'Ask the pharmacist about prescription requirements and medicine availability.' },
      { q: 'Are you open on Sundays?', a: 'Confirm Sunday and public-holiday opening hours directly with the pharmacy.' },
      { q: 'Do you provide health checks?', a: 'Contact the pharmacy to confirm available checks and current prices.' },
      { q: 'Is a pharmacist available?', a: 'Confirm pharmacist availability and advice hours with the pharmacy.' },
      { q: 'How can I contact the pharmacy?', a: 'Use the contact information listed on this page after confirming it is current.' }
    ],
    location: { landmark: 'Add a verified nearby landmark', mapUrl: '' },
    footerNote: 'Medicine availability may change. Consult a qualified healthcare professional and confirm details with the pharmacy.'
  };
}

function isEmpty(value) {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);
}
function fillMissing(current, defaults) {
  if (isEmpty(current)) return defaults;
  if (!current || typeof current !== 'object' || Array.isArray(current) || !defaults || typeof defaults !== 'object' || Array.isArray(defaults)) return current;
  const merged = { ...current };
  Object.keys(defaults).forEach(key => { merged[key] = Object.prototype.hasOwnProperty.call(current, key) ? fillMissing(current[key], defaults[key]) : defaults[key]; });
  return merged;
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  let updated = 0;
  const groups = [
    [primarySlugs, 'primaryCare', primaryProfile], [hospitalSlugs, 'secondaryHospital', hospitalProfile], [pharmacySlugs, 'pharmacy', pharmacyProfile]
  ];
  for (const [slugs, type, buildProfile] of groups) {
    for (const slug of slugs) {
      const record = await NavigationPlace.findOne({ slug });
      if (!record) continue;
      const root = record.healthcareProfile && record.healthcareProfile.toObject ? record.healthcareProfile.toObject() : (record.healthcareProfile || {});
      const defaults = buildProfile(record.displayName || slug);
      const profile = fillMissing(root[type], defaults);
      const healthcareProfile = { ...root, type: root.type || type, [type]: profile };
      const changes = { healthcareProfile };
      if (!record.description) changes.description = `${record.displayName} healthcare information. Contact the facility to confirm current services and hours.`;
      if (!record.address) changes.address = `${record.displayName}, Yola, Adamawa State`;
      if (!record.area) changes.area = 'Yola';
      if (!record.openingHours) changes.openingHours = 'Contact the facility to confirm current hours';
      if (!record.image) changes.image = facilityImage;
      if (!record.heroImage) changes.heroImage = facilityImage;
      const contact = record.contact && record.contact.toObject ? record.contact.toObject() : (record.contact || {});
      changes.contact = {
        phone: contact.phone || '+234 800 000 0000',
        email: contact.email || `contact@${slug}.example`,
        website: contact.website || 'https://example.org'
      };
      await NavigationPlace.updateOne({ _id: record._id }, { $set: changes });
      updated += 1;
    }
  }
  console.log(`Healthcare profile initialization complete: ${updated} records updated.`);
  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Healthcare profile initialization failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
