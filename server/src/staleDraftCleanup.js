'use strict';
const db=require('./db');
const { scheduleDesignIntelligenceRefresh }=require('./designIntelligence');

async function cleanupStaleGenericDrafts(){
  const result=await db.query(`
    DELETE FROM designs d
    USING tenants t
    WHERE d.tenant_id=t.id
      AND t.slug='generic'
      AND d.created_at <= now()-interval '7 days'
      AND d.owner_user_id IS NULL
      AND COALESCE(d.project_name,'')=''
      AND d.event_type IS NULL
      AND d.guest_count IS NULL
      AND d.estimate_total IS NULL
      AND COALESCE(d.scene->>'eventName','') IN ('','My Event')
      AND COALESCE(d.scene->>'tentId','')=''
      AND COALESCE(d.scene->'tent'->>'id','')=''
      AND jsonb_array_length(CASE WHEN jsonb_typeof(d.scene->'objects')='array' THEN d.scene->'objects' ELSE '[]'::jsonb END)=0
      AND NOT EXISTS (SELECT 1 FROM quote_requests q WHERE q.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM entitlements e WHERE e.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM consumer_payments p WHERE p.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM design_share_links s WHERE s.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM design_revisions r WHERE r.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM design_background_photos b WHERE b.design_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM designs child WHERE child.project_root_id=d.id)
    RETURNING d.id
  `);
  if(result.rowCount){
    console.log('[draft-cleanup] removed stale generic drafts:',result.rowCount);
    scheduleDesignIntelligenceRefresh(2000);
  }
  return result.rowCount;
}

let timer=null;
function startStaleDraftCleanupWorker(){
  setTimeout(()=>cleanupStaleGenericDrafts().catch(err=>console.error('[draft-cleanup] startup failed:',err.message)),45000).unref?.();
  if(timer)return;
  timer=setInterval(()=>cleanupStaleGenericDrafts().catch(err=>console.error('[draft-cleanup] periodic failed:',err.message)),6*60*60*1000);
  timer.unref?.();
}

module.exports={cleanupStaleGenericDrafts,startStaleDraftCleanupWorker};
