(function () {
  'use strict';
  function connectionMessage(error, fallback) {
    if (error && error.name === 'AbortError') return 'The connection took too long. Please try again. Your order has not been changed.';
    if (error instanceof TypeError || error instanceof SyntaxError) return fallback;
    return error && error.message || fallback;
  }
  var query = new URLSearchParams(location.search);
  var tenant = query.get('tenant');
  if (!['friendly', 'friendly-nyc', 'generic'].includes(tenant)) tenant = null;
  var friendlyTenant = tenant === 'friendly' || tenant === 'friendly-nyc';
  var orderMode = friendlyTenant && query.get('mode') === 'order';
  var orderPanel = document.getElementById('orderAccess');
  var intro = document.getElementById('accessIntro');
  if (orderPanel && friendlyTenant) {
    orderPanel.hidden = false;
    orderPanel.open = orderMode;
    var requestedOrder = query.get('order');
    var orderInput = document.getElementById('orderNumber');
    if (orderInput && requestedOrder && /^[a-zA-Z0-9-]{1,80}$/.test(requestedOrder)) orderInput.value = requestedOrder;
  }
  document.body.classList.toggle('order-access-page', orderMode);
  if (orderMode) {
    if (intro) intro.textContent = tenant === 'friendly-nyc'
      ? 'Your eligible Friendly Party Rental NYC booking includes RentSketch. Enter the first name on the booking and your order number.'
      : 'Your eligible Friendly Party Rental booking includes RentSketch. Enter the first name on the booking and your order number.';
    ['paidAccess','emailDetails','emailHelp','privateNote'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.hidden = true;
    });
  }

  var orderForm = document.getElementById('orderAccessForm');
  if (orderForm && friendlyTenant) orderForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    var submit = orderForm.querySelector('button'), message = document.getElementById('orderAccessStatus');
    if (!submit || submit.disabled || !orderForm.reportValidity()) return;
    submit.disabled = true; submit.textContent = 'Checking your booking…';
    if (message) { message.textContent = ''; message.className = ''; }
    var continueLink = document.getElementById('orderContinue'); if (continueLink) continueLink.hidden = true;
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 45000);
    try {
      var response = await fetch('https://rentsketch-api-production.up.railway.app/api/consumer/order-access/request', {
        method: 'POST', headers: { 'Content-Type':'application/json' }, signal: controller.signal,
        body: JSON.stringify({
          tenant: tenant,
          orderNumber: document.getElementById('orderNumber').value.trim(),
          firstName: document.getElementById('orderFirstName').value.trim()
        }),
      });
      var result = await response.json(); if (!response.ok) throw new Error(result.error || 'Please try again shortly.');
      var destination; try { destination = new URL(result.accessUrl); } catch (_) {}
      if (!destination || destination.origin !== 'https://rentsketch.com' || destination.pathname !== '/designer/' ||
          destination.searchParams.get('tenant') !== tenant ||
          !new URLSearchParams(destination.hash.slice(1)).get('recoveryToken')) {
        throw new Error('Your event could not be opened. Please try again.');
      }
      if (message) message.textContent = 'Booking verified. Opening your event…';
      submit.textContent = 'Opening your event…';
      if (continueLink) { continueLink.href = destination.href; continueLink.hidden = false; }
      location.assign(destination.href);
    } catch (error) {
      if (message) { message.className = 'error'; message.textContent = connectionMessage(error, 'We couldn’t check your booking right now. Please try again. Your order has not been changed.'); }
      submit.disabled = false; submit.textContent = 'Open my event';
    } finally { clearTimeout(timer); }
  });

  document.querySelectorAll('[data-preview]').forEach(function (link) {
    link.href = '/designer/' + (tenant ? '?tenant=' + encodeURIComponent(tenant) : '');
  });

  var form = document.getElementById('accessForm'), status = document.getElementById('accessStatus');
  if (form) {
    var button = form.querySelector('button');
    form.addEventListener('submit', async function (event) {
      event.preventDefault(); if (!button || button.disabled || !form.reportValidity()) return;
      button.disabled = true; button.textContent = 'Requesting your link…'; if (status) { status.textContent = ''; status.className = ''; }
      var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 25000);
      try {
        var response = await fetch('https://rentsketch-api-production.up.railway.app/api/consumer/designs/recovery-link', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ email: document.getElementById('accessEmail').value.trim(), tenant: tenant }),
        });
        var result = await response.json(); if (!response.ok) throw new Error(result.error || 'Please try again in a moment.');
        if (status) status.textContent = 'If a saved event matches this email, its private link will arrive shortly. Check your inbox and spam folder.';
        button.textContent = 'Link requested';
        setTimeout(function () { button.disabled = false; button.textContent = 'Email my event link again'; }, 60000);
      } catch (error) {
        if (status) { status.className = 'error'; status.textContent = connectionMessage(error, 'We couldn’t request your link right now. Please try again.'); }
        button.disabled = false; button.textContent = 'Email my event link';
      } finally { clearTimeout(timer); }
    });
  }
})();
