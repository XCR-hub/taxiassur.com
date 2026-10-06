/* Capture an opted-in entry before a visitor can follow a server-rendered link. */
(function () {
  try {
    var privatePath = /^\/(?:backoffice|admin|auth|espace-client|espace-prospect|client)(?:\/|$)/i;
    if (privatePath.test(window.location.pathname)) return;
    var consent = JSON.parse(localStorage.getItem('taxiassur_privacy_consent') || 'null');
    if (!consent || consent.analytics !== true) return;
    var key = 'taxiassur_lead_acquisition';
    var previous = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (previous && typeof previous.landing_page === 'string' && previous.landing_page.startsWith('/') && !privatePath.test(previous.landing_page)) return;
    var entry = new URL(window.location.href);
    var context = { landing_page: entry.pathname, page_url: entry.origin + entry.pathname };
    try { var referrer = new URL(document.referrer); context.referrer = referrer.origin + referrer.pathname; } catch (_) { context.referrer = ''; }
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
      var value = (entry.searchParams.get(key) || '').trim().slice(0, 160);
      if (value && !/[@<>]/.test(value)) context[key] = value;
    });
    var clickId = entry.searchParams.get('gclid');
    if (consent.marketing === true && clickId && /^[a-z0-9_-]{1,300}$/i.test(clickId)) context.gclid = clickId;
    sessionStorage.setItem(key, JSON.stringify(context));
  } catch (_) { /* Optional storage must never prevent a quote request. */ }
})();