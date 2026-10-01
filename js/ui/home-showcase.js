import { tablePositions } from '../core/suggested-layout.js';
import { inflatableItem } from '../data/inflatables.js';
import { LINENS } from '../data/linens.js';

(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const mode = params.get('showcase');
  if (!mode) return;

  const valid = new Set(['styled','open','sidewalls','waterslide']);
  const selectedMode = valid.has(mode) ? mode : 'styled';

  window.RENTSKETCH_SHARED_READONLY = true;
  document.documentElement.classList.add('rentsketch-showcase');
  document.body.classList.add('rentsketch-showcase');

  function chooseTent(bridge) {
    return bridge.TENTS.find(t => t.type === 'pole' && Number(t.widthFt) === 20 && Number(t.lengthFt) === 40)
      || bridge.TENTS.find(t => /20\s*[x×]\s*40/i.test(t.name || '') && t.type === 'pole')
      || bridge.TENTS[0];
  }

  function chooseTable(bridge) {
    return bridge.TABLES.find(t => t.shape === 'round' && Number(t.diameterFt || t.widthFt) === 5)
      || bridge.TABLES.find(t => t.shape === 'round')
      || bridge.TABLES[0];
  }

  function chooseChair(bridge) {
    return bridge.CHAIRS.find(c => /plastic.*white|white.*plastic/i.test(c.name || '') && !c.isThrone)
      || bridge.CHAIRS.find(c => !c.isThrone)
      || bridge.CHAIRS[0];
  }

  function chooseLinen() {
    return LINENS.find(l => l.active !== false && /120/.test(l.name || '') && /round/i.test(l.name || ''))
      || LINENS.find(l => l.active !== false && /round/i.test(l.name || ''))
      || LINENS.find(l => l.active !== false)
      || null;
  }

  function fallbackPositions() {
    return [
      {x:1.2,y:2.2},{x:12.8,y:2.2},
      {x:1.2,y:11.2},{x:12.8,y:11.2},
      {x:1.2,y:20.2},{x:12.8,y:20.2},
      {x:1.2,y:29.2},{x:12.8,y:29.2}
    ];
  }

  function tablesFor(bridge, tent) {
    const table = chooseTable(bridge), chair = chooseChair(bridge), linen = chooseLinen();
    if (!table || !chair) return [];
    const diameter = Number(table.diameterFt || table.widthFt || 5);
    let positions = [];
    try { positions = tablePositions(tent, table, chair, []); } catch (_) {}
    if (positions.length < 8) positions = fallbackPositions();
    const colors = ['Red','Chocolate','Gray','Red','Chocolate','Gray','Red','Chocolate'];
    return positions.slice(0,8).map((pos, index) => ({
      id:'showcase-table-'+(index+1),
      kind:'table',
      tableId:table.id,
      productId:table.productId || null,
      externalId:table.externalId || null,
      name:table.name || '5 ft Round Table',
      shape:table.shape || 'round',
      widthFt:diameter,
      depthFt:diameter,
      modelWidthFt:Number(table.widthFt || diameter),
      modelDepthFt:Number(table.depthFt || diameter),
      x:Number(pos.x),
      y:Number(pos.y),
      rotationDeg:0,
      seatCount:8,
      chairId:chair.id,
      linenId:linen?.id || 'linen-round-120',
      linenProductId:linen?.productId || null,
      linenColor:colors[index]
    }));
  }

  function windowWalls(tent) {
    const rows = [];
    const lengths = {
      front:Number(tent.widthFt || 20),
      back:Number(tent.widthFt || 20),
      left:Number(tent.lengthFt || 40),
      right:Number(tent.lengthFt || 40)
    };
    for (const side of ['front','back','left','right']) {
      for (let start=0; start<lengths[side]; start+=10) {
        rows.push({
          id:'showcase-wall-'+side+'-'+start,
          side,
          startFt:start,
          lengthFt:Math.min(10,lengths[side]-start),
          type:'window',
          enabled:true
        });
      }
    }
    return rows;
  }

  function waterslideFor(bridge) {
    const slide = bridge.INFLATABLES.find(p => /22\s*ft.*tropical.*lava.*wave/i.test(p.name || ''))
      || bridge.INFLATABLES.find(p => /lava.*wave/i.test(p.name || ''))
      || bridge.INFLATABLES.find(p => /water\s*slide|waterslide/i.test(p.name || ''));
    if (!slide) return null;
    const item = inflatableItem(slide,'showcase-waterslide',31,8);
    item.rotationDeg = 0;
    return item;
  }

  function makeScene(bridge) {
    const tent = chooseTent(bridge);
    if (!tent) return null;
    const objects = tablesFor(bridge,tent);
    const scene = {
      eventName:'RentSketch Showcase',
      eventType:'wedding',
      guestCount:64,
      tentId:tent.id,
      chairId:chooseChair(bridge)?.id || 'plastic-white',
      surfaceType:'grass',
      spaceType:'backyard',
      lightingId:'lighting-none',
      sidewalls:[],
      objects,
      zones:[],
      aisles:[],
      siteLayout:false,
      siteWidthFt:50,
      siteLengthFt:60,
      viewMode:'3d',
      sceneOptions:{night:false,weather:'clear',guests:true,styling:true,motion:false}
    };
    if (selectedMode === 'sidewalls' || selectedMode === 'waterslide') {
      scene.sidewalls = windowWalls(tent);
    }
    if (selectedMode === 'waterslide') {
      scene.siteLayout = true;
      scene.siteWidthFt = 70;
      scene.siteLengthFt = 60;
      const slide = waterslideFor(bridge);
      if (slide) scene.objects.push(slide);
    }
    return scene;
  }

  function cleanUi() {
    document.getElementById('layoutNotice')?.remove();
    document.querySelectorAll('.paywall-overlay,.rs-modal,.customer-entry-overlay,.guided-preview').forEach(el => el.remove());
    document.getElementById('eventPreviewMark')?.remove();
  }

  function setCamera() {
    const bridge = window.FriendlyBridge;
    if (bridge?.showcaseCamera) {
      return bridge.showcaseCamera(selectedMode === 'styled' ? 'inside' : selectedMode === 'waterslide' ? 'wide' : 'outside');
    }
    const inside = selectedMode === 'styled';
    const id = inside ? 'view3dInside' : 'view3dFit';
    const button = document.getElementById(id);
    if (button) button.click();
  }

  let attempts = 0;
  function boot() {
    const bridge = window.FriendlyBridge;
    const catalogReady = window.RENTSKETCH_CATALOG_READY || params.get('tenant') === 'generic';
    if (!bridge || !catalogReady || !bridge.TENTS?.length) {
      if (++attempts < 160) return setTimeout(boot,100);
      return;
    }
    const scene = makeScene(bridge);
    if (!scene) return;
    window.RENTSKETCH_PASS_RESTORING = true;
    try {
      bridge.loadScene(scene);
      bridge.setViewMode('3d');
    } finally {
      window.RENTSKETCH_PASS_RESTORING = false;
      window.RENTSKETCH_SHARED_READONLY = true;
    }
    cleanUi();
    setTimeout(() => { cleanUi(); setCamera(); },700);
    setTimeout(() => { cleanUi(); setCamera(); },1800);
    window.parent?.postMessage?.({type:'rentsketch.showcase.ready',mode:selectedMode},'*');
  }
  boot();
})();