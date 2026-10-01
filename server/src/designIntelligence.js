'use strict';
const db = require('./db');

const syntheticWord = /(^|[^a-z0-9])(qa|test|fake|fixture|regression|claude|demo)([^a-z0-9]|$)/i;
function text(v){ return String(v == null ? '' : v).trim(); }
function key(v){ return text(v).toLowerCase(); }
function inc(map,k,n=1){ if(!k)return; map.set(k,(map.get(k)||0)+n); }
function top(map,limit=8){ return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([name,count])=>({name,count})); }
function label(v){ return text(v).replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,m=>m.toUpperCase()); }

function sceneObjects(scene){ return Array.isArray(scene?.objects) ? scene.objects.filter(Boolean) : []; }
function tentId(scene,objects){
  const direct = text(scene?.tentId || scene?.tent?.id || scene?.tent?.tentId);
  if(direct) return direct;
  const obj = objects.find(o => key(o?.kind)==='tent' || key(o?.type)==='tent');
  return text(obj?.productId || obj?.externalId || obj?.sku || obj?.tentId || obj?.id || obj?.name);
}
function eventName(scene){ return text(scene?.eventName || scene?.event?.name || scene?.customer?.eventName); }
function syntheticDesign(row,scene){
  if(syntheticWord.test(text(row.event_type)) || syntheticWord.test(text(row.project_name)) || syntheticWord.test(eventName(scene))) return true;
  if(scene?.qaProof || scene?.qaSavedProof || scene?.testProof || scene?.fixtureProof) return true;
  return false;
}
function featuresFor(objects,scene){
  const out = new Set(), tent = tentId(scene,objects);
  if(tent) out.add('Tent · '+label(tent));
  for(const o of objects){
    const kind = text(o?.kind || o?.type);
    const main = text(o?.productId || o?.externalId || o?.sku || o?.itemId || o?.visualModelId || o?.name);
    if(main) out.add(label(kind || 'Item')+' · '+label(main));
    else if(kind) out.add(label(kind));
    for(const [prefix,value] of [['Table',o?.tableId],['Chair',o?.chairId],['Linen',o?.linenId],['Tent',o?.tentId],['Inflatable',o?.inflatableId]]){
      if(text(value)) out.add(prefix+' · '+label(value));
    }
  }
  return [...out].slice(0,30);
}
function recommendation(id,title,detail,signal,priority='medium'){ return { id,title,detail,signal,priority }; }

async function getDesignIntelligence(options={}){
  const tenantId=options&&options.tenantId?String(options.tenantId):null;
  const designWhere=tenantId?'WHERE d.tenant_id=$1':'';
  const requestWhere=tenantId?'WHERE tenant_id=$1':'';
  const args=tenantId?[tenantId]:[];
  const [designResult, requestResult] = await Promise.all([
    db.query(
      "SELECT d.id::text,d.tenant_id::text,COALESCE(t.slug,'generic') AS tenant_slug,d.owner_user_id IS NOT NULL AS staff_owned,d.event_type,d.guest_count,d.estimate_total,d.scene,d.project_name,d.revision,d.created_at,d.updated_at FROM designs d LEFT JOIN tenants t ON t.id=d.tenant_id "+designWhere+" ORDER BY d.updated_at DESC LIMIT 5000",
      args
    ),
    db.query(
      "SELECT design_id::text,status,created_at,approved_total_cents,booked_total_cents,booked_line_items,booked_at,external_order_id,external_order_source FROM quote_requests "+requestWhere+" ORDER BY created_at DESC",
      args
    )
  ]);

  const reqByDesign = new Map();
  const bookedItems=new Map();
  let attributedBookedRevenueCents=0,attributedBookedOrders=0;
  for(const r of requestResult.rows){
    if(r.design_id){
      const list=reqByDesign.get(r.design_id)||[]; list.push(r); reqByDesign.set(r.design_id,list);
    }
    const cents=Number(r.booked_total_cents);
    if(r.status==='booked'&&Number.isSafeInteger(cents)&&cents>=0){
      attributedBookedRevenueCents+=cents; attributedBookedOrders++;
      const items=Array.isArray(r.booked_line_items)?r.booked_line_items:[];
      for(const item of items){
        const name=text(item?.label||item?.name||item?.productId||item?.sku);
        if(name)inc(bookedItems,label(name),Number(item?.qty||item?.quantity||1)||1);
      }
    }
  }

  const eventTypes=new Map(), tents=new Map(), objectKinds=new Map(), features=new Map(), pairs=new Map();
  let ignoredSynthetic=0, ignoredEmpty=0, learning=0, totalObjects=0, guestSum=0, guestN=0, revisionSum=0;
  let missingGuest=0, missingTent=0, sparse=0, highRevision=0, missingEstimate=0, missingEventType=0;
  let withRequest=0, booked=0;
  const tenantCounts=new Map();

  for(const row of designResult.rows){
    const scene = row.scene && typeof row.scene==='object' ? row.scene : {};
    const objects = sceneObjects(scene), tent = tentId(scene,objects), requests = reqByDesign.get(row.id)||[];
    const meaningful = objects.length>0 || !!tent || Number(row.guest_count)>0 || !!text(row.event_type) ||
      row.estimate_total != null || !!text(row.project_name) || requests.length>0 || row.staff_owned;
    if(syntheticDesign(row,scene)){ ignoredSynthetic++; continue; }
    if(!meaningful){ ignoredEmpty++; continue; }

    learning++; inc(tenantCounts,row.tenant_slug); totalObjects += objects.length; revisionSum += Number(row.revision||1);
    if(Number(row.guest_count)>0){ guestSum += Number(row.guest_count); guestN++; } else missingGuest++;
    if(!tent) missingTent++; else inc(tents,label(tent));
    if(objects.length<=1) sparse++;
    if(Number(row.revision||1)>=5) highRevision++;
    if(row.estimate_total==null) missingEstimate++;
    if(!text(row.event_type)) missingEventType++; else inc(eventTypes,label(row.event_type));

    for(const o of objects) inc(objectKinds,label(o?.kind || o?.type || 'Item'));
    const f = featuresFor(objects,scene);
    f.forEach(v=>inc(features,v));
    for(let i=0;i<f.length;i++) for(let j=i+1;j<f.length;j++) inc(pairs,[f[i],f[j]].sort().join(' + '));
    if(requests.length){ withRequest++; if(requests.some(r=>r.status==='booked')) booked++; }
  }

  const pct = n => learning ? Math.round(n/learning*100) : 0;
  const requestRate = learning ? Math.round(withRequest/learning*100) : 0;
  const bookedRate = learning ? Math.round(booked/learning*100) : 0;
  const recommendations=[];
  const topTent=top(tents,1)[0], topPair=top(pairs,1)[0];

  if(topTent && topTent.count>=3) recommendations.push(recommendation(
    'template-top-tent','Turn the most-used tent into a faster starting template',
    topTent.name+' appears in '+topTent.count+' learning layouts. Prebuilding its common seating/spacing choices can reduce setup time.',
    topTent.count+' layouts','medium'
  ));
  if(topPair && topPair.count>=3) recommendations.push(recommendation(
    'quick-add-pair','Offer a quick-add bundle for a repeated combination',
    topPair.name+' appears together in '+topPair.count+' layouts. A bundle or smart suggestion can reduce repetitive placement.',
    topPair.count+' layouts','medium'
  ));
  if(learning>=5 && pct(missingGuest)>=25) recommendations.push(recommendation('guest-count','Capture guest count earlier',pct(missingGuest)+'% of learning layouts do not have a guest count. Earlier capture would improve sizing and seating guidance.',pct(missingGuest)+'% missing','high'));
  if(learning>=5 && pct(missingTent)>=35) recommendations.push(recommendation('starting-space','Make the starting-space choice clearer',pct(missingTent)+'% of learning layouts have no recognized tent/starting structure. Consider a clearer first-step choice between tent, room, yard, and open space.',pct(missingTent)+'% without tent','medium'));
  if(learning>=5 && pct(highRevision)>=25) recommendations.push(recommendation('rework','Reduce repeated rework',pct(highRevision)+'% of learning layouts reached 5+ saved revisions. That is a signal to improve templates, sizing guidance, or multi-select editing.',pct(highRevision)+'% high revision','medium'));
  if(learning>=10 && requestRate<20) recommendations.push(recommendation('quote-conversion','Improve the handoff from layout to quote','Only '+requestRate+'% of learning layouts have a linked quote request. Review the final Review/Request Quote step and make the next action more obvious.',requestRate+'% request rate','high'));
  if(learning<10) recommendations.push(recommendation('sample-size','Keep collecting real layouts before automating defaults','Only '+learning+' saved layouts currently qualify for learning after QA and empty placeholders are excluded. Insights will become stronger automatically as real designs accumulate.',learning+' learning layouts','low'));

  return {
    generatedAt:new Date().toISOString(),
    mode:tenantId?'tenant_live_aggregate':'live_aggregate',
    privacy:'Aggregate layout features only; customer contact fields are not read.',
    sample:{scanned:designResult.rows.length,learning,ignoredSynthetic,ignoredEmpty,confidence:learning>=50?'high':learning>=15?'medium':'low',tenants:tenantCounts.size,tenantScoped:!!tenantId},
    averages:{objectsPerDesign:learning ? Number((totalObjects/learning).toFixed(1)) : 0,guestCount:guestN ? Number((guestSum/guestN).toFixed(1)) : null,revisions:learning ? Number((revisionSum/learning).toFixed(1)) : 0},
    conversion:{withRequest,booked,requestRate,bookedRate},
    attribution:{
      bookedRevenueCents:attributedBookedRevenueCents,
      bookedOrders:attributedBookedOrders,
      averageBookedOrderCents:attributedBookedOrders?Math.round(attributedBookedRevenueCents/attributedBookedOrders):0,
      bookedItems:top(bookedItems,12)
    },
    friction:{
      missingGuest:{count:missingGuest,pct:pct(missingGuest)},missingTent:{count:missingTent,pct:pct(missingTent)},
      sparse:{count:sparse,pct:pct(sparse)},highRevision:{count:highRevision,pct:pct(highRevision)},
      missingEstimate:{count:missingEstimate,pct:pct(missingEstimate)},missingEventType:{count:missingEventType,pct:pct(missingEventType)}
    },
    patterns:{eventTypes:top(eventTypes,6),tents:top(tents,6),objectKinds:top(objectKinds,8),features:top(features,10),pairs:top(pairs,8)},
    recommendations:recommendations.slice(0,8)
  };
}

function snapshotPayload(intelligence){
  return {
    generatedAt:intelligence.generatedAt,sample:intelligence.sample,averages:intelligence.averages,
    conversion:intelligence.conversion,attribution:intelligence.attribution,friction:intelligence.friction,
    patterns:intelligence.patterns,recommendations:intelligence.recommendations
  };
}
function historyShape(rows){
  const history=rows.map(row=>{
    const p=row.payload||{};
    return {
      at:row.bucket_at,
      learning:Number(p.sample?.learning||0),confidence:p.sample?.confidence||'low',
      requestRate:Number(p.conversion?.requestRate||0),bookedRate:Number(p.conversion?.bookedRate||0),
      bookedRevenueCents:Number(p.attribution?.bookedRevenueCents||0),bookedOrders:Number(p.attribution?.bookedOrders||0),
      objectsPerDesign:Number(p.averages?.objectsPerDesign||0),revisions:Number(p.averages?.revisions||0),
      missingGuestPct:Number(p.friction?.missingGuest?.pct||0),missingTentPct:Number(p.friction?.missingTent?.pct||0),
      sparsePct:Number(p.friction?.sparse?.pct||0),highRevisionPct:Number(p.friction?.highRevision?.pct||0)
    };
  });
  const current=history.at(-1)||null,previous=history.length>1?history.at(-2):null;
  const delta=(field,a=current,b=previous)=>a&&b?Number((Number(a[field]||0)-Number(b[field]||0)).toFixed(1)):0;
  function period(days){
    if(!current)return null;
    const target=new Date(current.at).getTime()-days*86400000;
    let baseline=null;
    for(const point of history){ if(new Date(point.at).getTime()<=target)baseline=point; else break; }
    if(!baseline)return null;
    return {
      days,from:baseline.at,to:current.at,
      learning:delta('learning',current,baseline),requestRate:delta('requestRate',current,baseline),
      bookedRate:delta('bookedRate',current,baseline),bookedRevenueCents:delta('bookedRevenueCents',current,baseline)
    };
  }
  return {
    points:history,
    trend:current?{learning:delta('learning'),requestRate:delta('requestRate'),bookedRate:delta('bookedRate'),bookedRevenueCents:delta('bookedRevenueCents'),objectsPerDesign:delta('objectsPerDesign'),highRevisionPct:delta('highRevisionPct'),missingGuestPct:delta('missingGuestPct')}:null,
    periods:{days7:period(7),days30:period(30),days90:period(90)}
  };
}

async function refreshDesignIntelligenceSnapshot(){
  const intelligence=await getDesignIntelligence(),bucket=new Date(); bucket.setUTCMinutes(0,0,0);
  await db.query(
    'INSERT INTO design_intelligence_snapshots(bucket_at,payload,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(bucket_at) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()',
    [bucket.toISOString(),JSON.stringify(snapshotPayload(intelligence))]
  );
  console.log('[design-intelligence] snapshot saved',JSON.stringify({bucket:bucket.toISOString(),learning:intelligence.sample.learning,requestRate:intelligence.conversion.requestRate,recommendations:intelligence.recommendations.length}));
  return intelligence;
}
async function refreshTenantDesignIntelligenceSnapshots(){
  const tenants=(await db.query("SELECT id,slug FROM tenants WHERE slug<>'generic' ORDER BY created_at")).rows;
  const bucket=new Date(); bucket.setUTCMinutes(0,0,0);
  for(const tenant of tenants){
    try{
      const intelligence=await getDesignIntelligence({tenantId:tenant.id});
      await db.query(
        'INSERT INTO tenant_design_intelligence_snapshots(tenant_id,bucket_at,payload,updated_at) VALUES($1,$2,$3::jsonb,now()) ON CONFLICT(tenant_id,bucket_at) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()',
        [tenant.id,bucket.toISOString(),JSON.stringify(snapshotPayload(intelligence))]
      );
    }catch(err){console.error('[design-intelligence] tenant snapshot failed',tenant.slug,err.message);}
  }
}
async function getDesignIntelligenceHistory(limit=48){
  const safe=Math.max(2,Math.min(2160,Number(limit)||48));
  const rows=(await db.query('SELECT bucket_at,payload FROM design_intelligence_snapshots ORDER BY bucket_at DESC LIMIT $1',[safe])).rows.reverse();
  return historyShape(rows);
}
async function getTenantDesignIntelligenceHistory(tenantId,limit=2160){
  const safe=Math.max(2,Math.min(2160,Number(limit)||2160));
  const rows=(await db.query(
    'SELECT bucket_at,payload FROM tenant_design_intelligence_snapshots WHERE tenant_id=$1 ORDER BY bucket_at DESC LIMIT $2',
    [tenantId,safe]
  )).rows.reverse();
  return historyShape(rows);
}

let refreshTimer=null,hourlyTimer=null;
function runAllSnapshots(){
  return Promise.allSettled([refreshDesignIntelligenceSnapshot(),refreshTenantDesignIntelligenceSnapshots()]);
}
function scheduleDesignIntelligenceRefresh(delayMs=15000){
  if(refreshTimer) clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{refreshTimer=null;runAllSnapshots().catch(err=>console.error('[design-intelligence] refresh failed:',err.message));},Math.max(1000,Number(delayMs)||15000));
  refreshTimer.unref?.();
}
function startDesignIntelligenceWorker(){
  scheduleDesignIntelligenceRefresh(20000);
  if(hourlyTimer) return;
  hourlyTimer=setInterval(()=>runAllSnapshots().catch(err=>console.error('[design-intelligence] hourly refresh failed:',err.message)),60*60*1000);
  hourlyTimer.unref?.();
}

module.exports = {
  getDesignIntelligence,getDesignIntelligenceHistory,getTenantDesignIntelligenceHistory,
  refreshDesignIntelligenceSnapshot,refreshTenantDesignIntelligenceSnapshots,
  scheduleDesignIntelligenceRefresh,startDesignIntelligenceWorker
};
