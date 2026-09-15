const categories = [
  'Artisans',
  'Health',
  'Home Services',
  'Tech & Digital',
  'Auto',
  'Education',
  'Events',
  'Legal & Finance',
  'Beauty',
  'Agencies',
  'NGOs'
];

const areas = [
  'Jimeta',
  'Yola South',
  'Karewa',
  'Doubeli',
  'Bekaji',
  'Rumde',
  'Yolde Pate',
  'Damilu',
  'All of Yola'
];

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeArea(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'yola' || normalized === 'yola south') return 'Yola South';
  if (normalized === 'all' || normalized === 'all of yola') return 'All of Yola';
  return areas.find(area => area.toLowerCase() === normalized) || value;
}

module.exports = { categories, areas, slugify, normalizeArea };