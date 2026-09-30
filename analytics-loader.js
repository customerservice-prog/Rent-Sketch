(function () {
  'use strict';
  if (window.RENTSKETCH_ANALYTICS_BOOTED) return;
  window.RENTSKETCH_ANALYTICS_BOOTED = true;
  window.RENTSKETCH_GA4_ENABLED = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var existing = window.RentSketchAnalytics || {};
  var pending = Array.isArray(existing.pendingEvents) ? existing.pendingEvents : [];
  var measurementId = '';
  var started = false;
  var configAttempts = 0;
  var status = existing.status || {};

  function setStatus(state, reason) {
    status.state = state;
    status.reason = reason || '';
    status.measurementId = measurementId || '';
    status.updatedAt = new Date().toISOString();
    existing.status = status;
  }

  function hint(href) {
    if (document.querySelector('link[rel="preconnect"][href="' + href + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  function loadNow() {
    if (!measurementId || started) return;
    started = true;
    setStatus('loading');
    hint('https://www.googletagmanager.com');
    hint('https://www.google-analytics.com');

    // Queue GA initialization before loading gtag. Because the library is async,
    // this records the first page view without blocking the page render.
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: true });

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.onload = function () { setStatus('ready'); };
    script.onerror = function () { setStatus('script_error', 'Google tag library failed to load'); };
    document.head.appendChild(script);
  }

  function track(name, data) {
    if (!measurementId) {
      pending.push([name, data || {}]);
      return;
    }
    loadNow();
    window.gtag('event', name, data || {});
  }

  existing.pendingEvents = pending;
  existing.loadNow = loadNow;
  existing.track = track;
  window.RentSketchAnalytics = existing;
  setStatus('waiting_for_config');

  function start() {
    measurementId = String(window.RENTSKETCH_GA4_MEASUREMENT_ID || '').trim().toUpperCase();
    if (!/^G-[A-Z0-9]+$/.test(measurementId)) {
      setStatus('config_error', 'GA4 measurement ID is missing or invalid');
      return;
    }
    window.RENTSKETCH_GA4_ENABLED = true;
    setStatus('configured');

    // Start immediately. The old multi-second delay dropped short visits and
    // made Analytics undercount users/events even when configuration worked.
    loadNow();
    while (pending.length) {
      var entry = pending.shift();
      window.gtag('event', entry[0], entry[1] || {});
    }
  }

  function requestConfig() {
    configAttempts += 1;
    var config = document.createElement('script');
    config.async = true;
    config.src = '/analytics-config.js' + (configAttempts > 1 ? '?retry=' + Date.now() : '');
    config.referrerPolicy = 'same-origin';
    config.onload = start;
    config.onerror = function () {
      if (configAttempts < 2) {
        setStatus('config_retry', 'Retrying analytics configuration');
        setTimeout(requestConfig, 750);
      } else {
        setStatus('config_fetch_error', 'Analytics configuration could not be loaded');
      }
    };
    document.head.appendChild(config);
  }

  requestConfig();
})();
