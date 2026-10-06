import { beforeEach, describe, expect, it, vi } from 'vitest';
const permissions = vi.hoisted(() => ({ analytics: false, marketing: false }));
vi.mock('../privacy-consent', () => ({ hasAnalyticsConsent: () => permissions.analytics, hasMarketingConsent: () => permissions.marketing, isPrivateApplicationPath: (pathname: string) => /^\/(backoffice|espace-prospect|auth)(\/|$)/.test(pathname) }));
vi.mock('../platform-api', () => ({ PLATFORM_BASE_URL: '/api/platform' }));
const fetchMock = vi.fn().mockResolvedValue({ ok: true });
beforeEach(() => { vi.resetModules(); sessionStorage.clear(); permissions.analytics = false; permissions.marketing = false; fetchMock.mockClear(); vi.stubGlobal('fetch', fetchMock); window.history.replaceState({}, '', '/?utm_source=google&utm_campaign=taxi&gclid=test-click&token=private'); });
describe('lead attribution', () => {
  it('sends only public page paths without consent and writes no browser identifiers', async () => {
    const { getLeadAcquisition, trackLeadFormEvent } = await import('../lead-acquisition');
    expect(getLeadAcquisition()).toEqual({ landing_page: '/', page_url: location.origin + '/' });
    trackLeadFormEvent('form_start', 'lead_form', 'taxi');
    expect(sessionStorage.length).toBe(0); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('preserves first landing page through navigation and strips access tokens from URLs', async () => {
    permissions.analytics = true;
    const { getLeadAcquisition } = await import('../lead-acquisition');
    const first = getLeadAcquisition();
    window.history.replaceState({}, '', '/devis-assurance-taxi?token=secret');
    const second = getLeadAcquisition();
    expect(second.landing_page).toBe('/'); expect(second.utm_source).toBe('google'); expect(second.session_id).toBe(first.session_id);
    expect(second.page_url).toBe(location.origin + '/devis-assurance-taxi');
    expect(JSON.stringify(second)).not.toContain('private'); expect(JSON.stringify(second)).not.toContain('secret'); expect(second.gclid).toBeUndefined();
  });
  it('sends advertising click ids only with marketing consent and drops them on revocation', async () => {
    permissions.analytics = true; permissions.marketing = true;
    const { getLeadAcquisition } = await import('../lead-acquisition');
    expect(getLeadAcquisition().gclid).toBe('test-click'); permissions.marketing = false;
    expect(getLeadAcquisition().gclid).toBeUndefined();
  });
  it('does not capture private entry pages', async () => {
    window.history.replaceState({}, '', '/espace-prospect?token=secret');
    const { getLeadAcquisition } = await import('../lead-acquisition');
    window.history.replaceState({}, '', '/devis-assurance-taxi');
    expect(getLeadAcquisition().landing_page).toBe('/devis-assurance-taxi');
  });
  it('reports a consented form start without contact details or a second success conversion', async () => {
    permissions.analytics = true;
    const { trackLeadFormEvent } = await import('../lead-acquisition');
    trackLeadFormEvent('form_start', 'lead_form', 'taxi');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.event_type).toBe('form_start'); expect(payload.service).toBe('assurance-taxi');
    expect(payload.email).toBeUndefined(); expect(payload.phone).toBeUndefined();
  });
});
