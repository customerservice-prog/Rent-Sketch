const express = require('express');
const router = express.Router();

const buckets = new Map();
function limited(ip) {
  const now = Date.now();
  const key = String(ip || 'unknown');
  const current = buckets.get(key) || { count: 0, until: now + 10 * 60 * 1000 };
  if (current.until < now) { current.count = 0; current.until = now + 10 * 60 * 1000; }
  current.count += 1;
  buckets.set(key, current);
  return current.count > 30;
}

router.get('/property-lookup', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (limited(req.ip)) return res.status(429).json({ error: 'Too many address lookups. Please wait a few minutes.' });

  const address = String(req.query.address || '').trim().replace(/\s+/g, ' ');
  if (address.length < 8 || address.length > 220) {
    return res.status(400).json({ error: 'Enter a complete U.S. street address.' });
  }

  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('format', 'json');

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RentSketch/1.0 property-planning lookup' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Address service returned ' + response.status);
    const payload = await response.json();
    const match = payload?.result?.addressMatches?.[0];
    if (!match) {
      return res.json({
        found: false,
        enteredAddress: address,
        note: 'We could not automatically match this address. You can still continue by entering the usable event-area dimensions.'
      });
    }

    const longitude = Number(match.coordinates?.x);
    const latitude = Number(match.coordinates?.y);
    return res.json({
      found: Number.isFinite(latitude) && Number.isFinite(longitude),
      enteredAddress: address,
      matchedAddress: match.matchedAddress || address,
      coordinates: Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null,
      source: 'U.S. Census Geocoder',
      accuracy: 'address-location',
      note: 'Address location is not a survey or parcel measurement. Confirm the usable event-area dimensions before relying on a fit recommendation.'
    });
  } catch (error) {
    console.error('[property-lookup]', error && error.message || error);
    return res.status(503).json({ error: 'Address lookup is temporarily unavailable. You can still continue with your measurements.' });
  }
});

module.exports = router;
