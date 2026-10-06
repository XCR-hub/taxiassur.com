import { hasAnalyticsConsent, hasMarketingConsent, isPrivateApplicationPath } from './privacy-consent';
import { PLATFORM_BASE_URL } from './platform-api';

export interface LeadAcquisition { landing_page: string; page_url: string; referrer?: string; session_id?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string; gclid?: string; }
const KEY = 'taxiassur_lead_acquisition';
const initialUrl = typeof window === 'undefined' ? null : new URL(window.location.href);
const initialReferrer = typeof document === 'undefined' ? '' : document.referrer;
function safeUrl(value: string): string { try { const url = new URL(value); return url.origin + url.pathname; } catch { return ''; } }

export function getLeadAcquisition(): LeadAcquisition {
  const current = new URL(window.location.href);
  const entry = initialUrl && !isPrivateApplicationPath(initialUrl.pathname) ? initialUrl : current;
  const context: LeadAcquisition = { landing_page: entry.pathname, page_url: current.origin + current.pathname };
  if (!hasAnalyticsConsent()) return context;
  context.referrer = safeUrl(initialReferrer);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const value = entry.searchParams.get(key)?.trim().slice(0, 160);
    if (value && !/[@<>]/.test(value)) context[key] = value;
  }
  if (hasMarketingConsent()) {
    const clickId = entry.searchParams.get('gclid');
    if (clickId && /^[a-z0-9_-]{1,300}$/i.test(clickId)) context.gclid = clickId;
  }
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) {
      const prior = JSON.parse(stored) as LeadAcquisition;
      if (typeof prior.landing_page === 'string' && prior.landing_page.startsWith('/') && !isPrivateApplicationPath(prior.landing_page)) {
        Object.assign(context, prior, { page_url: context.page_url });
      }
    }
    if (!hasMarketingConsent()) delete context.gclid;
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) { sessionId = 'session_' + crypto.randomUUID(); sessionStorage.setItem('session_id', sessionId); }
    context.session_id = sessionId;
    sessionStorage.setItem(KEY, JSON.stringify(context));
  } catch { /* Storage is optional; sending a quote request must keep working. */ }
  return context;
}

export function trackLeadFormEvent(event: 'form_start' | 'form_validation_error' | 'form_antispam_error' | 'form_server_error' | 'form_network_error', formId: string, status: string, errorCode?: string): void {
  if (!hasAnalyticsConsent()) return;
  const acquisition = getLeadAcquisition();
  if (!acquisition.session_id) return;
  void fetch(PLATFORM_BASE_URL + '/v1/public/conversions', {
    method: 'POST', credentials: 'omit', keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: event, form_id: formId, service: status === 'vtc' ? 'assurance-vtc' : 'assurance-taxi', page_url: acquisition.page_url, session_id: acquisition.session_id, error_code: errorCode }),
  }).catch(() => {});
}
