// Visual production release QA. Real application, renderer and controls; isolated
// catalog/entitlement/save APIs. Reference scenes are QA layouts, not stock or
// installation claims. Use RENTSKETCH_QA_OUT to retain screenshots and downloads.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.RENTSKETCH_QA_OUT || path.join(root, '../qa-visual-production'));
fs.mkdirSync(out, { recursive: true });

const product = (id, name, category, visual, extra = {}) => ({ id, name, category, visual_model_id: visual, external_id: `qa:${id}`, active: true, price_per_day: null, ...extra });
const products = [
  product('qa-pole-20x40', '20x40 Pole Tent', 'tent', 'pole-20x40'),
  product('qa-frame-30x40', '30x40 Classic Frame Tent', 'tent', 'frame-30x40'),
  product('qa-round', '5ft Round Table', 'table', 'round-5ft'),
  product('8223e7ab-ca2b-40d5-9604-ce5f94c0aaca', '6ft Plastic Folding Table', 'table', 'banquet-6ft', { external_id: 'fpr:6ft-plastic-folding-table', photo_url: '/tests/fixtures/furniture/6ft-plastic-folding-table.png' }),
  product('qa-banquet', '8ft Banquet Table', 'table', 'banquet-8ft'),
  product('4fb360d1-b024-4595-9269-21887c70a55f', 'Sweetheart Table (60in Half-Round)', 'table', 'sweetheart-half-round-60', { external_id: 'fpr:sweetheart-table-60in-half-round', photo_url: '/tests/fixtures/furniture/sweetheart-table-60in-half-round.png' }),
  product('qa-cocktail', 'Cocktail Table', 'table', 'cocktail'),
  product('qa-resin', 'White Resin Folding Chair', 'chair', 'resin-white'),
  product('qa-plastic', 'White Plastic Folding Chair', 'chair', 'plastic-white'),
  product('qa-chiavari', 'Gold Chiavari Chair', 'chair', 'chiavari-gold'),
  product('6416c1b8-efbf-4427-80c4-50d30207272c', 'Cross-Back Farmhouse Chair', 'chair', 'crossback-natural', { external_id: 'fpr:cross-back-farmhouse-chair', photo_url: '/tests/fixtures/furniture/cross-back-farmhouse-chair.png' }),
  product('qa-linen-round', '120 Round Polyester Tablecloth', 'linen', 'linen-round-120'),
  product('qa-linen-rect', '72x120 Banquet Tablecloth', 'linen', 'linen-banquet-72x120'),
  product('qa-bistro', 'Bistro String Lights', 'lighting', 'lighting-bistro'),
  product('qa-foam', 'Foam Machine', 'other', 'foam-machine'),
  product('qa-fan', '20 Inch Event Fan', 'other', 'fan'),
  product('qa-cooler', 'Beverage Cooler', 'other', 'cooler'),
  product('qa-podium', 'Podium & Microphone', 'other', 'podium'),
  product('qa-speaker', 'Bluetooth Speaker', 'other', 'speaker'),
  product('qa-popcorn', 'Popcorn Machine', 'other', 'popcorn'),
  product('qa-stanchion', 'Black Retractable Stanchion', 'other', 'stanchion'),
  product('qa-bounce', 'Crayon Bounce House', 'other', null, { external_id: 'fpr:crayon-bounce-house' }),
  product('qa-slide', '18ft Purple Tropical Marble Double Bay Waterslide', 'other', null, { external_id: 'fpr:18ft-purple-tropical-marble-double-bay-waterslide' }),
];
const empty = { tentId: null, objects: [], siteWidthFt: 64, siteLengthFt: 56, surfaceType: 'grass', lightingId: 'lighting-none', chairId: 'plastic-white', backgroundPhoto: null, venueScan: null, sceneOptions: { guests: false, motion: false, styling: true, night: false, weather: 'clear' } };
let origin = '', revision = 1, savedScene = empty;
const writes = [], unexpected = [];
const detail = () => ({ id: 'visual-fixture', tenant: 'friendly', accessDesignId: 'visual-fixture', anonymousSessionId: 'visual-owner', revision, scene: savedScene, active: true, renewable: true, expiresAt: '2099-01-01T00:00:00Z' });
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://qa.test');
  const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (u.pathname === '/analytics-config.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end('// Analytics is disabled in isolated QA.'); }
  if (u.pathname === '/staff-api/api/auth/me') return json(401, { error: 'Not signed in' });
  if (u.pathname === '/api/tenants/friendly') return json(200, { slug: 'friendly', name: 'Friendly Party Rental', showPrices: false });
  if (u.pathname === '/api/tenants/friendly/products') return json(200, { products });
  if (u.pathname === '/api/consumer/event-pass/offer') return json(200, { required: true, available: true, priceCents: 999, durationDays: 30, renewalPriceCents: 499, renewalDurationDays: 30 });
  if (u.pathname === '/api/consumer/event-pass/resume') { req.resume(); return json(200, detail()); }
  if (u.pathname === '/api/tenants/friendly/designs/visual-fixture' && req.method === 'GET') return json(200, detail());
  if (u.pathname === '/api/tenants/friendly/designs/visual-fixture' && req.method === 'PATCH') {
    const chunks = []; req.on('data', chunk => chunks.push(chunk)); req.on('end', () => {
      if (req.headers['x-rentsketch-session'] !== 'visual-owner') return json(403, { error: 'Wrong fixture owner' });
      const payload = JSON.parse(Buffer.concat(chunks).toString());
      if (payload.expectedRevision !== revision) return json(409, { error: 'Project changed', currentRevision: revision });
      savedScene = payload.scene; writes.push(payload); revision += 1;
      json(200, { id: 'visual-fixture', revision, updatedAt: new Date().toISOString() });
    }); return;
  }
  if (u.pathname === '/api/tenants/friendly/review-pricing') return json(200, { available: true, deliveryFee: null, taxRate: 8 });
  if (u.pathname === '/qa-photo-fixture.svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#bdd3de"/><rect y="430" width="1600" height="570" fill="#809966"/><path d="M200 550H1400V890H200Z" fill="#95ab7c"/><path d="M200 550H1400M200 720H1400M500 550V890M1100 550V890" stroke="#baca9f" stroke-width="4"/></svg>');
  }
  if (u.pathname.startsWith('/api/')) { unexpected.push(`${req.method} ${u.pathname}`); return json(404, { error: 'Unexpected isolated QA API route' }); }
  if (u.pathname === '/designer/' || u.pathname === '/designer/index.html') {
    let html = fs.readFileSync(path.join(root, 'designer/index.html'), 'utf8').replace('<head>', `<head><script>window.RENTSKETCH_API_URL=${JSON.stringify(origin)};window.__qaErrors=[];window.addEventListener('error',e=>window.__qaErrors.push(e.message));</script>`);
    html = html.replaceAll('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', '/tests/node_modules/three/build/three.module.js').replaceAll('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/', '/tests/node_modules/three/examples/jsm/');
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(html);
  }
  const file = path.resolve(root, u.pathname.slice(1));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.glb': 'model/gltf-binary' };
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  if (file.endsWith('.html')) return res.end(fs.readFileSync(file, 'utf8').replaceAll('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', '/tests/node_modules/three/build/three.module.js').replaceAll('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/', '/tests/node_modules/three/examples/jsm/'));
  fs.createReadStream(file).pipe(res);
});

function pngEvidence(file) {
  const png = PNG.sync.read(fs.readFileSync(file)); let sum = 0, sum2 = 0, opaque = 0, samples = 0;
  for (let i = 0; i < png.data.length; i += 16) { const light = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3; sum += light; sum2 += light * light; opaque += png.data[i + 3] > 0; samples += 1; }
  const variance = sum2 / samples - (sum / samples) ** 2;
  assert.ok(png.width > 100 && png.height > 100, 'image has useful dimensions');
  assert.ok(opaque / samples > .9 && variance > 80, 'image contains a rendered scene, not blank/transparent output');
  return { width: png.width, height: png.height, variance: Math.round(variance), bytes: fs.statSync(file).size };
}

async function loadReference(page, name) {
  return page.evaluate(async name => {
    const bridge = window.FriendlyBridge;
    const { equipmentItem } = await import('/js/data/equipment.js');
    const { inflatableItem } = await import('/js/data/inflatables.js');
    let seq = 0;
    const table = (id, x, y, seats, chair = 'resin-white', linen = null) => {
      const model = bridge.TABLES.find(p => p.id === id); if (!model) throw new Error('QA model missing: ' + id);
      return { id: `qa-${name}-${++seq}`, kind: 'table', tableId: id, shape: model.shape, x, y, widthFt: model.diameterFt || model.widthFt, depthFt: model.diameterFt || model.depthFt, modelWidthFt: model.diameterFt || model.widthFt, modelDepthFt: model.diameterFt || model.depthFt, footprintOriented: true, rotationDeg: 0, seatCount: seats, chairId: chair, linenId: linen, linenColor: 'Ivory', ...(model.seatingLayout ? { seatingLayout: model.seatingLayout } : {}) };
    };
    const equipment = (type, x, y) => { const product = bridge.EQUIPMENT.find(p => p.type === type); if (!product) throw new Error('QA equipment missing: ' + type); return equipmentItem(product, `qa-${name}-${++seq}`, x, y); };
    const inflatable = (slug, x, y) => { const product = bridge.INFLATABLES.find(p => p.slug === slug); if (!product) throw new Error('QA inflatable missing: ' + slug); return inflatableItem(product, `qa-${name}-${++seq}`, x, y); };
    const scene = { tentId: null, objects: [], eventName: name === 'backyard' ? 'Backyard birthday' : name === 'reception' ? 'Garden reception' : 'Company gathering', siteWidthFt: 64, siteLengthFt: 56, surfaceType: 'grass', lightingId: 'lighting-none', chairId: 'resin-white', backgroundPhoto: null, venueScan: null, photoCalibration: null, photoComposition: null, photoGeometry: [], photoTentPlacement: null, sidewalls: null, viewMode: 'plan', sceneOptions: { guests: false, motion: false, styling: true, night: false, weather: 'clear' } };
    if (name === 'backyard') scene.objects = [inflatable('crayon-bounce-house', 6, 5), inflatable('18ft-purple-tropical-marble-double-bay-waterslide', 37, 4), table('banquet-6ft', 7, 35, 6, 'plastic-white'), table('banquet-6ft', 18, 35, 6, 'plastic-white'), equipment('foam-machine', 27, 12), equipment('cooler', 28, 39), equipment('popcorn', 31, 39)];
    if (name === 'reception') { scene.tentId = 'pole-20x40'; scene.lightingId = 'lighting-bistro'; scene.chairId = 'crossback-natural'; scene.objects = [table('round-5ft', 2, 7, 8, 'crossback-natural', 'linen-round-120'), table('round-5ft', 13, 7, 8, 'crossback-natural', 'linen-round-120'), table('round-5ft', 2, 21, 8, 'crossback-natural', 'linen-round-120'), table('round-5ft', 13, 21, 8, 'crossback-natural', 'linen-round-120'), table('sweetheart-half-round-60', 7.5, 34, 2, 'crossback-natural'), equipment('fan', 17, 34)]; }
    if (name === 'corporate') { scene.tentId = 'frame-30x40'; scene.surfaceType = 'grass'; scene.objects = [table('banquet-8ft', 3, 8, 8), table('banquet-8ft', 19, 8, 8), table('banquet-8ft', 3, 21, 8), table('banquet-8ft', 19, 21, 8), equipment('podium', 14, 3), equipment('speaker', 3, 2), equipment('speaker', 25, 2), table('cocktail', 5, 34, 0), table('cocktail', 23, 34, 0), equipment('stanchion', 12, 35), equipment('stanchion', 18, 35)]; }
    if (!bridge.loadScene(scene)) throw new Error('Reference scene could not load');
    bridge.setViewMode('plan'); return { objects: scene.objects.length, tables: scene.objects.filter(o => o.kind === 'table').length, tentId: scene.tentId, seats: scene.objects.reduce((n, o) => n + (o.seatCount || 0), 0) };
  }, name);
}

async function main() {
  await new Promise(resolve => server.listen(Number(process.env.RENTSKETCH_QA_PORT) || 0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  if (process.env.RENTSKETCH_QA_SERVE === '1') { console.log('Visual QA server: ' + origin + '/designer/?tenant=friendly'); return; }
  const browser = await chromium.launch({ executablePath: process.env.RENTSKETCH_CHROMIUM || undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const results = [], errors = [], consoleErrors = [], failedHttp = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.addInitScript(scene => { localStorage.setItem('rentsketch-anon-session', 'visual-owner'); if (!localStorage.getItem('rentsketch-autosave:friendly')) localStorage.setItem('rentsketch-autosave:friendly', JSON.stringify({ id: 'visual-fixture', tenant: 'friendly', anonymousSessionId: 'visual-owner', revision: 1, pending: false, savedAt: new Date().toISOString(), scene })); }, empty);
    const page = await context.newPage();
    page.on('response', response => { if (response.status() >= 400) { const failure = { status: response.status(), path: new URL(response.url()).pathname }; failedHttp.push(failure); console.error('[http]', JSON.stringify(failure)); } });
    page.on('pageerror', error => { errors.push(error.message); console.error('[pageerror]', error.message); });
    page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource.*(ERR_FAILED|401)/.test(message.text())) { consoleErrors.push(message.text()); console.error('[console]', message.text()); } });
    await page.goto(origin + '/designer/?tenant=friendly', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.RentSketchEventPass?.canEdit() && window.RENTSKETCH_CATALOG_READY && window.FriendlyBridge?.getScene);
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const fits = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no document horizontal overflow');
    async function capture(name) { await settle(); await fits(); const file = path.join(out, name + '.png'); await page.screenshot({ path: file }); return pngEvidence(file); }
    async function three() {
      await page.locator('#viewMode3d').click(); await page.locator('#canvas canvas').waitFor({ timeout: 45000 });
      await page.waitForFunction(() => window.FriendlyBridge.state.viewMode === '3d'); await settle();
      const info = await page.locator('#canvas canvas').evaluate(el => ({ width: el.width, height: el.height, lost: el.getContext('webgl2')?.isContextLost() }));
      assert.ok(info.width > 100 && info.height > 100 && info.lost === false, 'real WebGL scene is visible'); return info;
    }
    if (process.env.RENTSKETCH_QA_FOCUS !== 'presentation') {
    for (const event of ['backyard', 'reception', 'corporate']) {
      const counts = await loadReference(page, event);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        await page.locator('#viewModePlan').click(); const plan = await capture(`${event}-plan-${width}`);
        const webgl = await three(); await page.locator('#view3dFit').click();
        const day = await capture(`${event}-day-${width}`);
        await page.locator('#sceneControls > summary').click(); await page.locator('#view3dDayNight').click(); await page.locator('#sceneControls > summary').click();
        assert.equal(await page.evaluate(() => window.FriendlyBridge.getScene().sceneOptions.night), true);
        const night = await capture(`${event}-night-${width}`);
        await page.locator('#sceneControls > summary').click(); await page.locator('#view3dDayNight').click(); await page.locator('#sceneControls > summary').click();
        results.push({ event, width, counts, webgl, plan, day, night });
      }
    }
    await loadReference(page, 'reception'); await page.setViewportSize({ width: 1440, height: 1000 });
    const target = await page.evaluate(() => window.FriendlyBridge.getScene().objects.find(o => o.tableId === 'sweetheart-half-round-60').id);
    await page.locator(`.plan2d-object[data-item-id="${target}"]`).press('Enter');
    await page.locator('#inspectorPanel [data-role="insp-design-table"]').click(); await page.locator('.ts-three canvas').waitFor();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      assert.ok((await page.locator('.ts-three canvas').boundingBox()).height >= 100, 'Table Studio preview remains visible');
      await capture(`table-detail-${width}`);
    }
    await page.locator('.ts-dialog [data-ts="close"]').click();
    await page.locator('[data-role="inspector-close"]').click();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.locator('[data-drawer="inventory"]').first().click(); await page.locator('[data-role="inventory-category"][data-category="table"]').click();
      assert.ok(await page.locator('.inventory-card').count() >= 5, 'rental cards appear');
      await capture(`catalog-${width}`); await page.locator('#drawerClose').click();
    }
    } else { await loadReference(page, 'reception'); }
    if (process.env.RENTSKETCH_QA_BASELINE !== '1') {
      const asset = await page.evaluate(async () => {
        const THREE = await import('three'), loader = await import('/js/ui/packaged-asset-loader.js');
        const item = { id: 'qa-post', kind: 'equipment', visualType: 'stanchion', widthFt: 1.2, depthFt: 1.2, heightFt: 3.2, x: 13, y: 17, rotationDeg: 90 };
        const placeholder = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), new THREE.MeshStandardMaterial()); placeholder.position.set(13, 0, 17);
        const delivered = loader.enhancePlacedVisual(placeholder, item); const ready = await delivered.ready;
        const result = { ready, state: delivered.group.userData.assetDeliveryState, asset: delivered.group.userData.deliveredAsset, position: delivered.group.position.toArray(), footprint: [item.widthFt, item.depthFt], cache: loader.packagedAssetCacheInfo() };
        loader.disposeRentalAsset(delivered.group); loader.clearPackagedAssetCache(); return result;
      });
      assert.equal(asset.ready, true); assert.equal(asset.state, 'ready'); assert.equal(asset.asset.format, 'glb'); assert.equal(asset.asset.dimensionsVerified, false); assert.deepEqual(asset.position, [13, 0, 17]); assert.deepEqual(asset.footprint, [1.2, 1.2]);
      await context.route('**/assets/models/**/*.glb', route => route.abort());
      const fallback = await page.evaluate(async () => {
        const THREE = await import('three'), loader = await import('/js/ui/packaged-asset-loader.js');
        const placeholder = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), new THREE.MeshStandardMaterial());
        const delivered = loader.enhancePlacedVisual(placeholder, { id: 'qa-post-failed', kind: 'equipment', visualType: 'stanchion', widthFt: 1.2, depthFt: 1.2, heightFt: 3.2 });
        const ready = await delivered.ready, result = { ready, state: delivered.group.userData.assetDeliveryState, visibleFallback: delivered.group.children.includes(placeholder) && placeholder.visible };
        loader.disposeRentalAsset(delivered.group); return result;
      });
      await context.unroute('**/assets/models/**/*.glb'); assert.equal(fallback.ready, false); assert.equal(fallback.state, 'fallback'); assert.equal(fallback.visibleFallback, true); results.push({ packagedAsset: asset, blockedAsset: fallback });
      await page.setViewportSize({ width: 1440, height: 1000 }); await three();
      await page.locator('#view3dWalk').click(); await page.locator('#canvas canvas.walk-mode-canvas').waitFor();
      await page.locator('[data-drawer="inventory"]').first().click();
      await page.locator('[data-role="inventory-query"]').fill(''); await page.locator('[data-role="inventory-query"]').pressSequentially('wasd fan');
      assert.equal(await page.locator('[data-role="inventory-query"]').inputValue(), 'wasd fan', 'Walk keyboard shortcuts do not swallow text input');
      await page.locator('#drawerClose').click(); if (await page.locator('#canvas canvas.walk-mode-canvas').count()) await page.locator('#view3dWalk').click();
      await page.locator('#view3dFit').click(); results.push({ walkSearchTyping: true });
      const before = await page.evaluate(() => JSON.stringify(window.FriendlyBridge.getScene().objects));
      await page.locator('#btnToReview').click();
      assert.match(await page.locator('#btnDownload').innerText(), /image/i, 'download action names the actual image format');
      const downloadEvent = page.waitForEvent('download'); await page.locator('#btnDownload').click(); const download = await downloadEvent;
      assert.match(download.suggestedFilename(), /\.png$/i); const file = path.join(out, 'downloaded-event.png'); await download.saveAs(file); const image = pngEvidence(file);
      await page.locator('#btnPrint').click(); await page.locator('#rsPresentation').waitFor(); await capture('presentation-desktop');
      const safeHtml = await page.locator('.rs-presentation-document').innerHTML();
      assert.doesNotMatch(safeHtml, /visual-owner|rentsketch-anon-session|qa-private@example|PRIVATE CREW/);
      await page.locator('#rsPresentationViewName').fill('Reception entrance'); await page.locator('[data-presentation-save] button[type="submit"]').click();
      await page.waitForFunction(() => window.FriendlyBridge.getPresentationViews().some(view => view.name === 'Reception entrance'));
      await page.locator('[data-presentation-action="cover-view"]').click();
      await page.waitForFunction(() => !!window.FriendlyBridge.getScene().presentationCoverId);
      await page.evaluate(() => { window.print = () => { window.__qaPrinted = true; }; });
      await page.locator('[data-presentation-action="print"]').click(); await page.waitForFunction(() => window.__qaPrinted === true);
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('.rs-presentation-document').isVisible(), true, 'presentation remains visible under real print CSS');
      assert.equal(await page.locator('.rs-presentation-toolbar').isVisible(), false, 'print excludes editing controls');
      await page.pdf({ path: path.join(out, 'event-presentation.pdf'), format: 'Letter', printBackground: true });
      await page.emulateMedia({ media: 'screen' }); await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      await page.setViewportSize({ width: 390, height: 844 }); await capture('presentation-mobile');
      await page.locator('[data-presentation-action="close"]').click();
      assert.equal(await page.evaluate(() => JSON.stringify(window.FriendlyBridge.getScene().objects)), before, 'presentation/export preserves scene placements');
      const savedView = await page.evaluate(() => ({ views: window.FriendlyBridge.getPresentationViews(), cover: window.FriendlyBridge.getScene().presentationCoverId }));
      await page.evaluate(() => window.RentSketchAutosave.flush()); await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.RentSketchEventPass?.canEdit() && !!window.FriendlyBridge?.getScene().presentationCoverId);
      assert.deepEqual(await page.evaluate(() => ({ views: window.FriendlyBridge.getPresentationViews(), cover: window.FriendlyBridge.getScene().presentationCoverId })), savedView, 'saved camera/opening view survive real API save and reload');
      results.push({ actualPngDownload: image, presentationPreservesScene: true, savedCameraView: true, openingViewSurvivesReload: true, printedPdf: true });
      await loadReference(page, 'reception');
      await page.evaluate(() => {
        const scene = window.FriendlyBridge.getScene();
        scene.backgroundPhoto = { id: 'qa-photo', url: location.origin + '/qa-photo-fixture.svg', widthPx: 1600, heightPx: 1000, name: 'Interaction fixture — not a reconstructed venue' };
        scene.objects.find(item => item.tableId === 'sweetheart-half-round-60').photoPlacement = { x: 7, y: 11, rotationDeg: 90 };
        scene.photoCalibration = null; scene.photoComposition = { lighting: { azimuthDeg: 117 }, foregroundMasks: [] }; scene.viewMode = 'photo'; window.FriendlyBridge.loadScene(scene);
      });
      await page.locator('#view3dAdjustPhoto').click();
      await page.locator('[data-photo-calibration-panel]').waitFor({ state: 'visible' });
      assert.equal(await page.locator('[data-photo-calibration-panel]').isVisible(), true, 'fresh photo opens measured scale setup');
      await page.locator('[data-photo-reference-width]').fill('0'); await page.locator('[data-photo-confirm-scale]').click();
      assert.equal(await page.evaluate(() => window.FriendlyBridge.getScene().photoCalibration?.scaleConfirmed), false, 'invalid measurement does not mark photo calibrated');
      await page.locator('[data-photo-reference-width]').fill('20'); await page.locator('[data-photo-reference-depth]').fill('30'); await page.locator('[data-photo-confirm-scale]').click();
      assert.equal(await page.evaluate(() => window.FriendlyBridge.getScene().photoCalibration.scaleConfirmed), true);
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 }); assert.equal(await page.locator('[data-photo-tool="move"]').isVisible(), true, 'Place rentals is a visible step');
        await capture('photo-scale-' + width);
      }
      await page.setViewportSize({ width: 390, height: 844 }); await page.locator('[data-photo-done]').click();
      await page.locator('#sceneControls > summary').click(); await page.locator('.photo-lighting-controls > summary').click();
      await page.locator('[data-photo-light-preset="overcast"]').click();
      const photo = await page.evaluate(() => window.FriendlyBridge.getScene()); assert.equal(photo.photoComposition.lighting.azimuthDeg, 117, 'preset preserves manually matched direction'); assert.equal(photo.photoComposition.lighting.intensity, .65);
      await capture('photo-lighting-mobile'); results.push({ photoSetup: 'synthetic interaction fixture only', measuredScale: true, overcastPresetPreservesDirection: true });
      await page.locator('#sceneControls > summary').click();
      const beforeArrangement = await page.evaluate(() => window.FriendlyBridge.getScene().objects);
      const source = beforeArrangement.find(item => item.tableId === 'sweetheart-half-round-60');
      await page.locator('[data-arrange-open]').click(); await page.locator('[data-arrange-none]').click();
      await page.locator(`[data-arrange-ids='["${source.id}"]']`).check();
      await page.locator('[data-arrange-action]').selectOption('duplicate'); await page.locator('[data-arrange-copy-axis]').selectOption('x');
      await page.locator('[data-arrange-copies]').fill('1'); await page.locator('[data-arrange-gap]').fill('2'); await page.locator('[data-arrange-apply]').click();
      await page.waitForFunction(() => document.querySelector('[data-arrange-feedback]').textContent.includes('Copies added'));
      const afterArrangement = await page.evaluate(() => window.FriendlyBridge.getScene().objects);
      assert.equal(afterArrangement.length, beforeArrangement.length + 1);
      assert.deepEqual(afterArrangement.find(item => item.id === source.id), source, 'photo duplication preserves source canonical data');
      const duplicate = afterArrangement.find(item => !beforeArrangement.some(original => original.id === item.id));
      const canonical = ({ id, photoPlacement, ...rest }) => rest;
      assert.deepEqual(canonical(duplicate), canonical(source), 'duplicate retains canonical dimensions, rotation, product, seats and linen');
      assert.equal(duplicate.photoPlacement.rotationDeg, 90); assert.equal(duplicate.photoPlacement.y, 11); assert.ok(Math.abs(duplicate.photoPlacement.x - 11.5) < 1e-6, 'duplicate shifts by rotated photo footprint plus requested gap');
      await capture('photo-arrange-mobile'); await page.locator('.arrange-heading button[type="submit"]').click(); await page.locator('#btnUndo').click();
      assert.deepEqual(await page.evaluate(() => window.FriendlyBridge.getScene().objects), beforeArrangement, 'one Undo removes the entire photo duplication');
      results.push({ photoArrangementDuplicate: true, canonicalScenePreserved: true, rotatedPhotoFootprintGap: true, atomicUndo: true });
    }
    await page.evaluate(() => window.RentSketchAutosave.flush());
    if (process.env.RENTSKETCH_QA_BASELINE !== '1') {
      await page.goto(origin + '/designer/model-review.html?visual=stanchion', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Packaged model loaded'));
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const view of ['front', 'side', 'back', 'overview']) { await page.locator(`[data-view="${view}"]`).click(); assert.equal(await page.locator(`[data-view="${view}"]`).getAttribute('aria-pressed'), 'true'); }
        await capture('model-review-' + width);
      }
      results.push({ modelReview: 'versioned GLB visible; front/side/back/overview controls; desktop/mobile' });
    }
    assert.deepEqual(errors, [], 'no page errors'); assert.deepEqual(unexpected, [], 'all API calls stay in the isolated fixture');
    const scope = process.env.RENTSKETCH_QA_FOCUS === 'presentation' ? 'presentation-assets-photo' : process.env.RENTSKETCH_QA_BASELINE === '1' ? 'scene-baseline' : 'full';
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ scope, scenarios: results, pageErrors: errors, consoleErrors, failedHttp, savedRevision: revision, saveWrites: writes.length, api: 'isolated', catalog: 'QA subset using supported Friendly visual profiles; no live stock/pricing assertions', gpu: 'software Chromium; performance targets require representative physical devices' }, null, 2));
    console.log('PASS visual production browser (' + scope + '): ' + (scope === 'presentation-assets-photo' ? 'GLB delivery/fallback, PNG/PDF export, saved presentation reload, measured photo setup and model review.' : '3 reference events, desktop/mobile day/night, actual WebGL, table closeups, catalog layouts' + (scope === 'scene-baseline' ? '.' : ', GLB delivery/fallback, PNG/PDF export, saved presentation reload and measured photo setup.')) + ' Evidence: ' + out);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
