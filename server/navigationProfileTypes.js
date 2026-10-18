'use strict';

const PROFILE_FIELDS = {
  generic: null,
  flightAgent: 'flightAgentProfile',
  fillingStation: 'fillingStationProfile',
  bank: 'bankProfile',
  commercialCenter: 'commercialCenterProfile',
  church: 'churchProfile',
  mosque: 'mosqueProfile',
  judiciary: 'judiciaryProfile',
  parksRecreation: 'parksRecreationProfile',
  eventCenter: 'eventCenterProfile',
  hospitality: 'hospitalityProfile',
  iconicStructure: 'iconicStructureProfile',
  sportsSpa: 'sportsSpaProfile',
  school: 'schoolProfile',
  university: 'universityProfile',
  technical: 'technicalProfile',
  learning: 'learningProfile',
  healthcare: 'healthcareProfile'
};

function searchable(card) {
  return [card.category, card.subcategory, card.displayName, card.slug]
    .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
}

function detailProfileType(card) {
  const value = searchable(card);
  const category = String(card.category || '').toLowerCase().replace(/[&_/-]+/g, ' ');
  const identity = [card.displayName, card.slug].filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');

  if (/\bflight|airline|travel agent|travel and tours/.test(value)) return 'flightAgent';
  if (category === 'agents') return 'generic';
  if (/\bfilling stations?|fuel stations?|petrol stations?\b/.test(value)) return 'fillingStation';
  if (/\bbanks?|atms?\b/.test(value)) return 'bank';
  if (/\b(judiciary|judicial|courts?)\b/.test(value)) return 'judiciary';
  if (/\bmosques?|masjids?|islamic centers?|islamic centres?\b/.test(value)) return 'mosque';
  if (/\bchurch(es)?\b|\bcathedrals?|\bchapels?\b|catholic secreteriat|catholic secretariat/.test(value)) return 'church';
  if (/\bcommercial centers?|commercial centres?|markets?|shopping complexes?\b/.test(value)) return 'commercialCenter';
  if (/\bevent centers?|event centres?|event halls?\b/.test(value)) return 'eventCenter';
  if (/\bparks?|green spaces?|recreation\b/.test(category) || /\bparks?|green spaces?|recreation\b/.test(value)) return 'parksRecreation';
  if (/\b(restaurant|cafe|bakery|grill|suya|shawarma|ice ?cream|chicken cottage|exclusive spot)\b/.test(identity)) return 'generic';
  if (/\bhotels?\b/.test(category) || /\bhotels?|lodges?|resorts?|guest houses?\b/.test(identity)) return 'hospitality';
  if (/\b(iconic structures?|landmarks?|flyovers?|roundabouts?|toll gates?)\b/.test(value)) return 'iconicStructure';
  if (/\b(sports?|spa|wellness|gyms?)\b/.test(value)) return 'sportsSpa';
  if (/\b(colleges?|polytechnics?|monotechnics?|college of health|health technology|nursing sciences?|legal studies|institute of technology)\b/.test(value) &&
      !/\buniversity\b/.test(value)) return 'technical';
  if (/\b(primary healthcare|secondary hospitals?|hospitals?|health|pharmacies?|pharmacy|clinics?|dispensary|maternity)\b/.test(value) ||
      /^(modibbo-adama-teaching-hospital-mauth-yola)$/.test(String(card.slug || '').toLowerCase())) return 'healthcare';
  if (/\bhighschool\b/.test(value)) return 'school';
  if (/\b(schools?|primary|secondary|nursery|elementary|high school|grammar school|academy)\b/.test(value) &&
      !/\b(university|college|polytechnic|library|knowledge center)\b/.test(value)) return 'school';
  if (/\b(universities|university)\b/.test(value) || /\bpolytechnic|institute of technology\b/.test(String(card.subcategory || '').toLowerCase())) return 'university';
  if (/\b(libraries?|library|knowledge centers?|learning centers?|learning hubs?|educational hubs?)\b/.test(value)) return 'learning';
  return 'generic';
}

module.exports = { PROFILE_FIELDS, detailProfileType };
