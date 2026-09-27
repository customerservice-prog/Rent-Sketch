const express = require('express');
const { timingSafeEqual, randomBytes, createHash } = require('crypto');
const db = require('../db');

const router = express.Router();

function authorized(req) {
  const expected = String(process.env.PARTY_RENTAL_CRM_PROVISION_KEY || '');
  const supplied = String(req.get('x-party-rental-crm-key') || '');
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function requireCrm(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.PARTY_RENTAL_CRM_PROVISION_KEY) {
    return res.status(503).json({ error: 'CRM provisioning is not configured.' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized provisioning request.' });
  next();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'rental-business';
}

function cleanOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch (_) {
    return null;
  }
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function publicTenant(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    embedKey: row.embed_key,
    subscriptionPlan: row.subscription_plan,
    subscriptionStatus: row.subscription_status,
    billingSource: row.billing_source,
    externalCrmOrgId: row.external_crm_org_id,
  };
}

router.post('/provision', requireCrm, async (req, res) => {
  const body = req.body || {};
  const externalCrmOrgId = typeof body.organizationId === 'string' ? body.organizationId.trim().slice(0, 200) : '';
  const name = typeof body.businessName === 'string' ? body.businessName.trim().slice(0, 120) : '';
  const contactEmail = typeof body.contactEmail === 'string' ? body.contactEmail.trim().toLowerCase() : '';
  const website = typeof body.website === 'string' && body.website.trim() ? body.website.trim().slice(0, 500) : null;
  const requestedPlan = body.plan === 'pro' ? 'pro' : null;
  if (!externalCrmOrgId || !name || !validEmail(contactEmail) || !requestedPlan) {
    return res.status(400).json({ error: 'organizationId, businessName, valid contactEmail, and plan=pro are required.' });
  }

  const origins = Array.isArray(body.allowedOrigins)
    ? Array.from(new Set(body.allowedOrigins.map(cleanOrigin).filter(Boolean))).slice(0, 20)
    : [];
  if (website) {
    const siteOrigin = cleanOrigin(website);
    if (siteOrigin && !origins.includes(siteOrigin)) origins.push(siteOrigin);
  }

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['crm-provision:' + externalCrmOrgId]);

    let tenant = (await client.query(
      'SELECT * FROM tenants WHERE external_crm_org_id=$1 FOR UPDATE',
      [externalCrmOrgId]
    )).rows[0];

    if (!tenant) {
      const base = 'crm-' + slugify(body.tenantSlug || name);
      const suffix = createHash('sha256').update(externalCrmOrgId).digest('hex').slice(0, 8);
      const candidates = [base, (base.slice(0, 51) + '-' + suffix).slice(0, 60)];
      const embedKey = randomBytes(16).toString('hex');
      for (const slug of candidates) {
        const inserted = await client.query(
          `INSERT INTO tenants
            (slug,name,contact_email,website,subscription_plan,subscription_status,trial_ends_at,
             customer_access,embed_key,allowed_origins,billing_source,external_crm_org_id)
           VALUES ($1,$2,$3,$4,'pro','provisioned',NULL,'free',$5,$6::jsonb,'party_rental_crm',$7)
           ON CONFLICT (slug) DO NOTHING
           RETURNING *`,
          [slug, name, contactEmail, website, embedKey, JSON.stringify(origins), externalCrmOrgId]
        );
        tenant = inserted.rows[0];
        if (tenant) break;
      }
      if (!tenant) throw new Error('SLUG_CONFLICT');
    } else {
      tenant = (await client.query(
        `UPDATE tenants SET
           name=$1,contact_email=$2,website=$3,subscription_plan='pro',
           subscription_status=CASE WHEN subscription_status='active' THEN 'active' ELSE 'provisioned' END,
           allowed_origins=$4::jsonb,billing_source='party_rental_crm',updated_at=now()
         WHERE id=$5 RETURNING *`,
        [name, contactEmail, website, JSON.stringify(origins), tenant.id]
      )).rows[0];
    }

    await client.query('COMMIT');
    return res.json({ ok: true, tenant: publicTenant(tenant) });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err.message === 'SLUG_CONFLICT') return res.status(409).json({ error: 'Could not allocate a RentSketch tenant slug.' });
    console.error('[crm provision] failed', err.message);
    return res.status(500).json({ error: 'RentSketch provisioning failed.' });
  } finally {
    if (client) client.release();
  }
});

router.post('/activate', requireCrm, async (req, res) => {
  const organizationId = typeof req.body?.organizationId === 'string' ? req.body.organizationId.trim().slice(0, 200) : '';
  if (!organizationId) return res.status(400).json({ error: 'organizationId is required.' });
  const result = await db.query(
    `UPDATE tenants SET subscription_plan='pro',subscription_status='active',
       trial_ends_at=NULL,billing_source='party_rental_crm',updated_at=now()
     WHERE external_crm_org_id=$1 RETURNING *`,
    [organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Provisioned RentSketch tenant not found.' });
  res.json({ ok: true, tenant: publicTenant(result.rows[0]) });
});

router.post('/deactivate', requireCrm, async (req, res) => {
  const organizationId = typeof req.body?.organizationId === 'string' ? req.body.organizationId.trim().slice(0, 200) : '';
  if (!organizationId) return res.status(400).json({ error: 'organizationId is required.' });
  const result = await db.query(
    `UPDATE tenants SET subscription_status='canceled',billing_source='party_rental_crm',updated_at=now()
     WHERE external_crm_org_id=$1 RETURNING *`,
    [organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'RentSketch tenant not found.' });
  res.json({ ok: true, tenant: publicTenant(result.rows[0]) });
});

router.get('/status/:organizationId', requireCrm, async (req, res) => {
  const result = await db.query(
    'SELECT * FROM tenants WHERE external_crm_org_id=$1',
    [String(req.params.organizationId || '').slice(0, 200)]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'RentSketch tenant not found.' });
  res.json({ ok: true, tenant: publicTenant(result.rows[0]) });
});

module.exports = router;
