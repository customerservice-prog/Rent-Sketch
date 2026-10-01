(function () {
  'use strict';
  function preconnect(href) {
    if (document.querySelector('link[rel="preconnect"][href="' + href + '"]')) return;
    var link = document.createElement('link'); link.rel = 'preconnect'; link.href = href; link.crossOrigin = 'anonymous'; document.head.appendChild(link);
  }
  preconnect('https://rentsketch-api-production.up.railway.app');
  var vitals = document.createElement('script');
  vitals.src = '/web-vitals.js?v=20260922-rum-2';
  vitals.async = true;
  document.head.appendChild(vitals);
  window.RentSketchAnalytics = window.RentSketchAnalytics || { pendingEvents: [] };
  var analytics = document.createElement('script');
  analytics.src = '/analytics-loader.js?v=20260930-ga4-3';
  analytics.async = true;
  document.head.appendChild(analytics);
  function track(name, data) {
    var api = window.RentSketchAnalytics;
    if (api && typeof api.track === 'function') api.track(name, data || {});
    else if (api) api.pendingEvents.push([name, data || {}]);
    else if (typeof window.gtag === 'function') window.gtag('event', name, data || {});
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href*="/api/consumer/event-pass/direct-checkout"]');
    if (!link) return;
    var source = '';
    try { source = new URL(link.href, location.href).searchParams.get('source') || ''; } catch (_) {}
    track('begin_checkout', {
      currency: 'USD',
      value: 9.99,
      checkout_source: source,
      items: [{ item_id: 'event_pass_30_day', item_name: 'RentSketch Event Pass', price: 9.99, quantity: 1 }]
    });
  });
  var menu = document.querySelector('.menu-toggle');
  var links = document.getElementById('navlinks');
  function closeMenu() { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('click', function () {
    var open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); links.classList.toggle('open', open);
  });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
  var annual = false;
  function renderPrices() {
    document.querySelectorAll('[data-monthly]').forEach(function (node) {
      node.textContent = '$' + Number(node.dataset[annual ? 'annual' : 'monthly']).toLocaleString('en-US');
      node.closest('.price-card').querySelector('[data-period]').textContent = annual ? '/year' : '/month';
      node.closest('.price-card').querySelector('[data-annual-note]').textContent = annual ? 'Billed yearly. Renews annually until canceled.' : '$' + Number(node.dataset.annual).toLocaleString('en-US') + ' billed yearly if you choose annual';
    });
  }
  document.querySelectorAll('[data-billing]').forEach(function (button) {
    button.addEventListener('click', function () {
      annual = button.dataset.billing === 'annual';
      document.querySelectorAll('[data-billing]').forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      renderPrices();
    });
  });
  // Static prices are already correct in the HTML. Reconcile them with the
  // server only after the critical render so below-fold billing never blocks
  // the wedding hero.
  function hydratePlans() {
    if (!document.querySelector('[data-monthly]')) return;
    fetch('https://rentsketch-api-production.up.railway.app/api/business/plans')
      .then(function (r) { if (!r.ok) throw Error('Catalog unavailable'); return r.json(); })
      .then(function (data) {
        (data.plans || []).forEach(function (plan) {
          var node = document.querySelector('[data-plan="' + plan.id + '"] [data-monthly]');
          if (node && Number.isFinite(plan.monthlyCents) && Number.isFinite(plan.annualCents)) {
            node.dataset.monthly = String(plan.monthlyCents / 100); node.dataset.annual = String(plan.annualCents / 100);
          }
        }); renderPrices();
      }).catch(function () {});
  }
  var isHomepage = location.pathname === '/' || location.pathname === '/index.html';
  if (!isHomepage) {
    if ('requestIdleCallback' in window) requestIdleCallback(hydratePlans, { timeout: 3500 });
    else setTimeout(hydratePlans, 1800);
  }

  var header = document.querySelector('.top');
  function syncHeaderDepth() {
    if (header) header.dataset.scrolled = String(window.scrollY > 12);
  }
  syncHeaderDepth();
  window.addEventListener('scroll', syncHeaderDepth, { passive: true });

  document.addEventListener('click', function (event) {
    if (!menu || !links || menu.getAttribute('aria-expanded') !== 'true') return;
    if (event.target.closest('.menu-toggle,#navlinks')) return;
    closeMenu();
  });

  var liveShowcase = document.querySelector('[data-rs-live-showcase]');
  if (liveShowcase) {
    var liveFrame = liveShowcase.querySelector('[data-showcase-frame]');
    var liveShell = liveShowcase.querySelector('.rs-live-shell');
    var liveTitle = liveShowcase.querySelector('[data-showcase-title]');
    var liveCopy = liveShowcase.querySelector('[data-showcase-copy]');
    var scenes = {
      styled: {
        title: 'Styled reception · 64 seats',
        copy: 'Go inside the 20 × 40 tent and see guests, table linens, place settings and centerpiece styling rendered together.'
      },
      open: {
        title: 'Open 20 × 40 pole tent',
        copy: 'Pull the camera outside to understand the complete tent footprint, anchoring area and furnished reception in the backyard.'
      },
      sidewalls: {
        title: 'Cathedral-window sidewalls',
        copy: 'Close the same event with window sidewall segments and see the physical tent change without redrawing the tables inside.'
      },
      waterslide: {
        title: 'Tent + waterslide in one event',
        copy: 'Add a full-size inflatable beside the tent and see both rentals together in the same outdoor planning scene.'
      }
    };
    function showcaseUrl(mode) {
      return '/designer/?tenant=friendly&source=homepage_live_showcase&showcase=' + encodeURIComponent(mode);
    }
    function selectShowcase(mode) {
      var scene = scenes[mode] || scenes.styled;
      liveShowcase.querySelectorAll('[data-showcase-mode]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.showcaseMode === mode));
      });
      if (liveTitle) liveTitle.textContent = scene.title;
      if (liveCopy) liveCopy.textContent = scene.copy;
      if (liveShell) liveShell.classList.remove('is-ready');
      if (liveFrame) {
        liveFrame.title = 'Live RentSketch ' + scene.title;
        if (liveFrame.getAttribute('src') !== showcaseUrl(mode)) liveFrame.setAttribute('src', showcaseUrl(mode));
      }
      track('view_showcase_scene', { showcase_scene: mode });
    }
    liveShowcase.querySelectorAll('[data-showcase-mode]').forEach(function (button) {
      button.addEventListener('click', function () { selectShowcase(button.dataset.showcaseMode); });
    });
    if (liveFrame) liveFrame.addEventListener('load', function () {
      setTimeout(function () { liveShell?.classList.add('is-ready'); }, 500);
    });
    window.addEventListener('message', function (event) {
      if (event.source !== liveFrame?.contentWindow || event.data?.type !== 'rentsketch.showcase.ready') return;
      liveShell?.classList.add('is-ready');
    });
  }

  // Keep the rest of the page immediately paintable. The wedding build is the
  // primary motion system; generic section reveal effects caused expensive
  // style/layout work on first load.
})();
