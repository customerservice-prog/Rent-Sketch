function params() { return new URLSearchParams(location.search); }

function simpleStart(bridge) {
  const tent = bridge.TENTS.find(t => t.type === 'pole' && t.widthFt === 20 && t.lengthFt === 20) || bridge.TENTS[0];
  if (!tent) {
    const inflatable = bridge.INFLATABLES?.[0];
    if (!inflatable) return false;
    bridge.openInflatablePreview(inflatable);
    window.dispatchEvent(new CustomEvent('rentsketch:designStarted', { detail: { productId: inflatable.productId } }));
    return true;
  }
  bridge.state.tentId = tent.id;
  bridge.state.guestCount = 0;
  bridge.customizeFromScratch();
  if (params().get('demo') === '1' && window.RentSketchEventPass?.canEdit() === true && !bridge.getScene().objects.length) bridge.buildPartyScene();
  window.dispatchEvent(new CustomEvent('rentsketch:designStarted', { detail: { tentId: tent.id, productId: tent.productId } }));
  return true;
}

function fitsArea(tent, widthFt, lengthFt, surfaceType) {
  if (!tent) return false;
  if (['concrete', 'asphalt', 'deck'].includes(surfaceType) && tent.type === 'pole') return false;
  const clearance = Math.max(0, Number(tent.installationClearanceFt || 0));
  const reqW = Number(tent.widthFt || 0) + clearance * 2;
  const reqL = Number(tent.lengthFt || 0) + clearance * 2;
  return (reqW <= widthFt && reqL <= lengthFt) || (reqW <= lengthFt && reqL <= widthFt);
}

function capacityFor(tent, needDance) {
  const cap = tent?.capacity || {};
  return Number(needDance ? cap.diningWithDance : cap.diningRounds) || 0;
}

function recommendTent(tents, guestCount, widthFt, lengthFt, surfaceType, needDance) {
  return tents
    .filter(t => fitsArea(t, widthFt, lengthFt, surfaceType))
    .filter(t => capacityFor(t, needDance) >= guestCount)
    .sort((a, b) => (a.widthFt * a.lengthFt) - (b.widthFt * b.lengthFt))[0] || null;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function renderFriendlyIntake(bridge) {
  const host = document.getElementById('intakeWizard');
  if (!host || host.dataset.addressPlannerMounted === '1') return true;
  host.dataset.addressPlannerMounted = '1';
  host.innerHTML = `
    <style>
      .rs-property-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}
      .rs-property-actions{display:flex;gap:8px;flex-wrap:wrap}
      .rs-property-actions input{min-width:0}
      @media (max-width:640px){
        .rs-property-grid{grid-template-columns:1fr}
        .rs-property-actions{display:grid;grid-template-columns:1fr}
        .rs-property-actions button{width:100%}
        #plannerMap iframe{height:210px!important}
      }
    </style>
    <div style="max-width:760px;margin:24px auto;padding:0 14px 40px">
      <div style="background:#fff;border:1px solid #dfe7df;border-radius:22px;padding:24px;box-shadow:0 18px 50px rgba(25,58,34,.08)">
        <p style="margin:0 0 8px;font-weight:800;color:#2f7a3c;letter-spacing:.04em;text-transform:uppercase;font-size:12px">Friendly Party Rental · Free RentSketch Planner</p>
        <h2 style="margin:0 0 10px;font-size:clamp(28px,5vw,42px);line-height:1.05">What can fit at your event address?</h2>
        <p style="margin:0 0 22px;color:#53625a;line-height:1.55">Start with the property address, then confirm the usable event area. RentSketch will recommend a Friendly tent that fits your guest count and stated space. No card required.</p>

        <form id="friendlyAddressPlanner" novalidate>
          <label style="display:block;font-weight:700;margin-bottom:7px" for="plannerAddress">Event address</label>
          <div class="rs-property-actions">
            <input id="plannerAddress" autocomplete="street-address" placeholder="${isFriendlyNyc ? '123 Main St, Riverdale, NY 10463' : '123 Main St, Syracuse, NY 13202'}" required style="flex:1 1 420px;padding:13px 14px;border:1px solid #bbc9bf;border-radius:12px;font:inherit">
            <button id="plannerFind" type="button" style="padding:13px 18px;border:0;border-radius:12px;background:#183429;color:#fff;font-weight:800;cursor:pointer">Find property</button>
          </div>
          <div id="plannerLookupStatus" role="status" aria-live="polite" style="min-height:24px;margin:8px 0 4px;color:#53625a;font-size:14px"></div>
          <div id="plannerMap" style="display:none;margin:10px 0 18px;border:1px solid #d7e1d9;border-radius:14px;overflow:hidden;background:#f4f7f4"></div>

          <div class="rs-property-grid">
            <label style="font-weight:700">Usable width (ft)
              <input id="plannerWidth" inputmode="decimal" type="number" min="10" max="500" step="1" value="40" required style="display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #bbc9bf;border-radius:12px;font:inherit">
            </label>
            <label style="font-weight:700">Usable length (ft)
              <input id="plannerLength" inputmode="decimal" type="number" min="10" max="500" step="1" value="60" required style="display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #bbc9bf;border-radius:12px;font:inherit">
            </label>
            <label style="font-weight:700">Guests
              <input id="plannerGuests" inputmode="numeric" type="number" min="1" max="1000" step="1" value="60" required style="display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #bbc9bf;border-radius:12px;font:inherit">
            </label>
            <label style="font-weight:700">Ground surface
              <select id="plannerSurface" style="display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #bbc9bf;border-radius:12px;font:inherit;background:#fff">
                <option value="grass">Grass / stakeable ground</option>
                <option value="asphalt">Asphalt</option>
                <option value="concrete">Concrete</option>
                <option value="deck">Deck / hard surface</option>
                <option value="notSure">Not sure</option>
              </select>
            </label>
          </div>

          <div style="margin:14px 0 4px;padding:12px 14px;background:#f7f9f7;border-radius:12px;color:#53625a;font-size:13px;line-height:1.5"><strong style="color:#263d2f">How to measure:</strong> use the clear, usable rectangle where rentals can actually go—not the full lot. Measure between the house, fences, trees, pools, driveways, septic areas, overhead lines, or other no-place zones. You can refine obstacles later in RentSketch.</div>
          <label style="display:flex;gap:10px;align-items:flex-start;margin:16px 0;font-weight:650">
            <input id="plannerDance" type="checkbox" style="margin-top:3px"> I want space for a dance floor
          </label>

          <div id="plannerRecommendation" style="display:none;margin:18px 0;padding:16px;border-radius:14px;background:#eef7ee;border:1px solid #cfe3d2"></div>
          <button id="plannerContinue" type="submit" style="width:100%;padding:15px 18px;border:0;border-radius:13px;background:#2f7a3c;color:#fff;font-weight:900;font-size:17px;cursor:pointer">Find a setup that fits</button>
          <p style="margin:12px 0 0;color:#69756e;font-size:12px;line-height:1.5">Address matching identifies the property location only. The usable dimensions are your planning measurements, not survey data. Friendly Party Rental confirms final placement, staking/ballast, clearance and availability before booking.</p>
        </form>
      </div>
    </div>`;

  const form = document.getElementById('friendlyAddressPlanner');
  const address = document.getElementById('plannerAddress');
  const status = document.getElementById('plannerLookupStatus');
  const find = document.getElementById('plannerFind');
  const map = document.getElementById('plannerMap');
  const rec = document.getElementById('plannerRecommendation');
  let propertyMatch = null;

  async function lookup() {
    const value = address.value.trim();
    if (value.length < 8) { status.textContent = 'Enter a complete street address.'; return null; }
    find.disabled = true;
    status.textContent = 'Finding the property address…';
    try {
      const url = window.RENTSKETCH_API_URL + '/api/consumer/property-lookup?address=' + encodeURIComponent(value);
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Address lookup unavailable');
      propertyMatch = data;
      if (data.found) {
        address.value = data.matchedAddress || value;
        status.innerHTML = '<strong>Property found:</strong> ' + esc(data.matchedAddress || value) + '. Confirm this is the right location, then enter the usable event-area dimensions.';
        const lat = Number(data.coordinates?.latitude), lon = Number(data.coordinates?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          const delta = .0015;
          const bbox = [lon-delta,lat-delta,lon+delta,lat+delta].join(',');
          const src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) + '&layer=mapnik&marker=' + encodeURIComponent(lat + ',' + lon);
          map.style.display = 'block';
          map.innerHTML = '<iframe title="Map showing the matched event address" loading="lazy" referrerpolicy="no-referrer" style="display:block;width:100%;height:260px;border:0" src="' + src + '"></iframe><div style="padding:9px 12px;color:#66736b;font-size:12px">Map confirms the address location only. It does not measure the yard or property boundary.</div>';
        }
      } else {
        map.style.display = 'none'; map.innerHTML = '';
        status.textContent = data.note || 'Address was not automatically matched. You can still continue with your measurements.';
      }
      return data;
    } catch (error) {
      propertyMatch = null;
      status.textContent = (error && error.message) || 'Address lookup unavailable. You can still continue with your measurements.';
      return null;
    } finally {
      find.disabled = false;
    }
  }

  find.addEventListener('click', lookup);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const widthFt = Number(document.getElementById('plannerWidth').value);
    const lengthFt = Number(document.getElementById('plannerLength').value);
    const guestCount = Number(document.getElementById('plannerGuests').value);
    const surfaceType = document.getElementById('plannerSurface').value;
    const needDance = document.getElementById('plannerDance').checked;
    if (!Number.isFinite(widthFt) || !Number.isFinite(lengthFt) || widthFt < 10 || lengthFt < 10 || !Number.isFinite(guestCount) || guestCount < 1) {
      status.textContent = 'Enter a usable width, length and guest count.';
      return;
    }

    if (!propertyMatch && address.value.trim()) await lookup();
    const tent = recommendTent(bridge.TENTS, guestCount, widthFt, lengthFt, surfaceType, needDance);
    if (!tent) {
      rec.style.display = 'block';
      rec.style.background = '#fff5e8';
      rec.style.borderColor = '#efcf9d';
      rec.innerHTML = '<strong>No current Friendly tent cleanly matches all of those inputs.</strong><br><span style="color:#6b5a44">That can mean the stated area is too small once installation clearance is included, the guest count needs more space, or a hard surface rules out pole tents. You can adjust the measurements or call Friendly at 315-884-1498.</span>';
      return;
    }

    const clearance = Number(tent.installationClearanceFt || 0);
    rec.style.display = 'block';
    rec.style.background = '#eef7ee';
    rec.style.borderColor = '#cfe3d2';
    rec.innerHTML = '<strong>Recommended starting point: ' + esc(tent.name) + '</strong><br><span style="color:#53625a">' +
      esc(String(guestCount)) + ' guests · stated area ' + esc(String(widthFt)) + '×' + esc(String(lengthFt)) + ' ft' +
      (clearance ? ' · includes an estimated ' + esc(String(clearance)) + ' ft installation-clearance check' : '') +
      '. Friendly will verify the final site plan.</span>';

    bridge.state.tentId = tent.id;
    bridge.state.guestCount = guestCount;
    bridge.state.siteLayout = true;
    bridge.state.siteWidthFt = widthFt;
    bridge.state.siteLengthFt = lengthFt;
    bridge.state.surfaceType = surfaceType;
    bridge.state.needDance = needDance;
    bridge.state.eventType = 'party';
    bridge.state.propertyAddress = propertyMatch?.matchedAddress || address.value.trim();
    bridge.state.propertyCoordinates = propertyMatch?.coordinates || null;
    bridge.customizeFromScratch();
    setTimeout(() => {
      if (bridge.state.guestCount > 0 && typeof bridge.useRecommendedLayout === 'function') bridge.useRecommendedLayout();
    }, 60);
    window.dispatchEvent(new CustomEvent('rentsketch:propertyPlanned', { detail: {
      source: params().get('source') || 'friendly',
      addressMatched: !!propertyMatch?.found,
      widthFt, lengthFt, guestCount, surfaceType, needDance, tentId: tent.id, productId: tent.productId || null
    }}));
  });
  return true;
}

export function startIntake() {
  const bridge = window.FriendlyBridge;
  if (!bridge) return false;
  if (document.getElementById('step-designer')?.classList.contains('active')) return true;
  const p = params();
  const tenantSlug = window.RENTSKETCH_TENANT_SLUG || p.get('tenant');
  const isFriendly = tenantSlug === 'friendly' || tenantSlug === 'friendly-nyc';
  const isFriendlyNyc = tenantSlug === 'friendly-nyc';
  const directDesign = p.get('design') || p.get('focus') || p.get('order') || p.get('demo') === '1' || p.get('mode') === 'order';
  if (isFriendly && !directDesign) return renderFriendlyIntake(bridge);
  return simpleStart(bridge);
}

let attempts = 0;
(function start() {
  if (!startIntake() && ++attempts < 100) setTimeout(start, 50);
})();