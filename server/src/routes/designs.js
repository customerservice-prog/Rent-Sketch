const express = require('express');
const db = require('../db');
const { clientIp } = require('../clientIp');
const { requireTenantAccess } = require('../middleware/requireAuth');
const projects = require('../designProjects');
const { getDesignIntelligence, getTenantDesignIntelligenceHistory } = require('../designIntelligence');
const router = express.Router();
const buckets = new Map();
function limit(req, res, next) {
  const key = req.params.slug + ':' + clientIp(req), now = Date.now();
  for (const [id, value] of buckets) if (now - value.start > 3600000) buckets.delete(id);
  const value = buckets.get(key) || { start: now, count: 0 };
  value.count++; buckets.set(key, value);
  if (value.count > 120) return res.status(429).json({ error: 'Too many design saves. Please wait a moment and try again.' });
  next();
}
router.post('/:slug/designs', limit, projects.handler(req => projects.create(req, false), 201));
router.patch('/:slug/designs/:id', limit, projects.handler(req => projects.update(req, false)));
router.post('/:slug/shared-design/restore', projects.handler(projects.restoreShared));
projects.register(router, '/:slug/designs');
router.get('/:slug/design-intelligence', requireTenantAccess, async (req,res,next)=>{
  try{
    const [intelligence,history]=await Promise.all([
      getDesignIntelligence({tenantId:req.tenant.id}),
      getTenantDesignIntelligenceHistory(req.tenant.id,2160)
    ]);
    res.setHeader('Cache-Control','no-store');
    res.json({...intelligence,history});
  }catch(error){next(error);}
});
router.get('/:slug/design-suggestions', async (req,res,next)=>{
  try{
    const tenant=(await db.query('SELECT id,slug FROM tenants WHERE slug=$1',[req.params.slug])).rows[0];
    if(!tenant)return res.status(404).json({error:'Tenant not found'});
    const intelligence=await getDesignIntelligence({tenantId:tenant.id});
    const enough=Number(intelligence.sample?.learning||0)>=10;
    const pairs=enough?(intelligence.patterns?.pairs||[]).filter(x=>Number(x.count)>=3).slice(0,4):[];
    const features=enough?(intelligence.patterns?.features||[]).filter(x=>Number(x.count)>=3).slice(0,6):[];
    res.setHeader('Cache-Control','public, max-age=300');
    res.json({
      enabled:enough&&(pairs.length>0||features.length>0),
      sampleSize:Number(intelligence.sample?.learning||0),
      confidence:intelligence.sample?.confidence||'low',
      pairs,features,
      note:enough?'Based on aggregate saved layouts from this rental company.':'More real layouts are needed before customer suggestions are shown.'
    });
  }catch(error){next(error);}
});
router.get('/:slug/designs', requireTenantAccess, async (req, res, next) => {
  try {
    const result = await db.query(`SELECT id,event_type,guest_count,estimate_total,created_at,project_name,revision,updated_at
      FROM designs WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 50`, [req.tenant.id]);
    res.json({ designs: result.rows });
  } catch (error) { next(error); }
});
module.exports = router;
