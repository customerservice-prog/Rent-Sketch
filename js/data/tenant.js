// Friendly Party Rental — bootstrap tenant configuration.
// Runtime tenant identity/branding/catalog comes from the tenant API; these local
// catalogs are renderer primitives and a safe bootstrap for Friendly tenant #1.
import { CHAIRS } from './chairs.js';
import { TABLES } from './tables.js';
import { TENTS } from './tents.js';
export { CHAIRS, TABLES, TENTS };

export const FRIENDLY_TENANT = {
  id: 'friendly', slug: 'friendly', name: 'Friendly Party Rental', logo: 'logo.png',
  contactEmail: 'customerservice@friendlypartyrental.com',
  colors: { primary: '#2f7a3c', primaryDark: '#22592c', primaryTint: '#eef7ee', secondary: '#f7f3ea' },
  tents: cloneCatalog(TENTS), tables: cloneCatalog(TABLES), chairs: cloneCatalog(CHAIRS),
};
Object.assign(FRIENDLY_TENANT, { tagline: 'Plan your tent, tables, and chairs for your event with Friendly Party Rental', phone: '315-884-1498', shortName: 'Friendly', showPackages: true });

export const FRIENDLY_NYC_TENANT = {
  ...FRIENDLY_TENANT,
  id: 'friendly-nyc', slug: 'friendly-nyc', name: 'Friendly Party Rental NYC',
  tagline: 'Plan your Riverdale and Downstate New York event with Friendly Party Rental NYC',
  colors: { primary: '#0B1F3A', primaryDark: '#07182d', primaryTint: '#eef2f7', secondary: '#E07B00' },
};

export const FRIENDLY_SC_TENANT = {
  ...FRIENDLY_TENANT,
  id: 'friendly-sc', slug: 'friendly-sc', name: 'Friendly Party Rental SC',
  phone: '864-610-5324',
  tagline: 'Plan your Greenville and Upstate South Carolina event with Friendly Party Rental SC',
  colors: { primary: '#0B1F3A', primaryDark: '#07182d', primaryTint: '#eef2f7', secondary: '#E07B00' },
};

export const GENERIC_TENANT = {
  id: 'generic', slug: 'generic', name: 'RentSketch', shortName: 'RentSketch', logo: 'logo.png', contactEmail: '', phone: '',
  tagline: 'Plan tents, tables, chairs, dance floors and more in a real-scale event layout.', showPackages: false,
  colors: { primary: '#2f6fed', primaryDark: '#1f4fbf', primaryTint: '#eaf1ff', secondary: '#0b1b3a' },
  tents: stripPricing(cloneCatalog(TENTS)), tables: stripPricing(cloneCatalog(TABLES)), chairs: stripPricing(cloneCatalog(CHAIRS)),
};

function cloneCatalog(list) {
  return list.map(function (item) { return JSON.parse(JSON.stringify(item)); });
}

function stripPricing(list) {
  return list.map(function (item) { item.pricePerDay = null; return item; });
}

export function getTenant(slug) {
  return slug === 'friendly' ? FRIENDLY_TENANT : slug === 'friendly-nyc' ? FRIENDLY_NYC_TENANT : slug === 'friendly-sc' ? FRIENDLY_SC_TENANT : GENERIC_TENANT;
}

// IMPORTANT: tenant.js is intentionally limited to tenant bootstrap data.
// It does not monkey-patch fetch or boot product-page previews. Runtime tenant
// hydration lives in designer/index.html and the single tent preview controller
// lives in js/ui/tent-preview-entry.js, where it can wait for the live catalog.
// Product visual_model_id is authoritative from the tenant catalog/API. A caller
// that explicitly wants a conservative fallback can use visualResolver.js.
