import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('taxiassur_privacy_consent', JSON.stringify({ analytics: true, marketing: false, behavioral_personalization: false, version: '2026-08-01', updated_at: new Date().toISOString() }));
    let leadCallback: ((token: string) => void) | undefined;
    window.turnstile = { render: (_element, options) => { if (options.action === 'lead_form') leadCallback = options.callback; return options.action || 'widget'; }, remove: () => {}, reset: () => {} };
    (window as Window & { completeTestCaptcha?: () => void }).completeTestCaptcha = () => leadCallback?.('local-test-captcha');
  });
  // Every API call is mocked: this test must never create a real prospect or send an email.
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/turnstile/verify')) return route.fulfill({ json: { success: true } });
    if (pathname.endsWith('/public/leads')) return route.fulfill({ status: 201, json: { ok: true, lead_id: 'local-test-lead', access_token: null } });
    return route.fulfill({ json: { ok: true, items: [], leads: [], data: [] } });
  });
  await page.route(/https:\/\/(?:www\.)?(?:googletagmanager\.com|google-analytics\.com|challenges\.cloudflare\.com)\//, route => route.abort());
});

test('mobile home and quote pages have one short form with four required fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const pathname of ['/', '/devis-assurance-taxi', '/assurance-taxi', '/prix-assurance-taxi']) {
    await page.goto(pathname);
    const form = page.locator('form[data-form="devis"]');
    await expect(form).toHaveCount(1);
    await expect(form.locator('input[required]')).toHaveCount(4);
    await expect(page.locator('h1')).toHaveCount(1);
    const bounds = await form.boundingBox(); expect(bounds?.y).toBeLessThan(1100);
    const title = await page.title(); expect((title.match(/TaxiAssur/g) || []).length).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: 'reports/acquisition-mobile.png', fullPage: true });
});

test('captcha is required and a successful request includes first entry attribution', async ({ page }) => {
  await page.goto('/?utm_source=google&utm_campaign=taxi');
  await page.locator('a[href="/devis-assurance-taxi#devis-form"]').first().click();
  await expect(page).toHaveURL(/devis-assurance-taxi/);
  const form = page.locator('form[data-form="devis"]');
  await form.locator('[name="name"]').fill('Test local');
  await form.locator('[name="phone"]').fill('0612345678');
  await form.locator('[name="email"]').fill('local-test@example.invalid');
  await form.locator('[name="city"]').fill('Paris');
  await expect(form.locator('button[type="submit"]')).toBeDisabled();
  await page.evaluate(() => (window as Window & { completeTestCaptcha?: () => void }).completeTestCaptcha?.());
  await expect(form.locator('button[type="submit"]')).toBeEnabled();
  const request = page.waitForRequest(request => request.url().endsWith('/v1/public/leads') && request.method() === 'POST');
  await form.locator('button[type="submit"]').click();
  const payload = (await request).postDataJSON();
  expect(payload.acquisition.landing_page).toBe('/'); expect(payload.acquisition.utm_source).toBe('google');
  expect(payload.acquisition.page_url).not.toContain('?'); expect(payload.service).toBe('assurance-taxi');
  await expect(page).toHaveURL(/merci/);
});

test('server rejection leaves contact fields intact so the visitor can retry', async ({ page }) => {
  await page.route('**/api/platform/v1/public/leads', route => route.fulfill({ status: 503, json: { ok: false, error: 'temporarily_unavailable' } }));
  await page.goto('/devis-assurance-taxi');
  const form = page.locator('form[data-form="devis"]');
  await form.locator('[name="name"]').fill('Test local'); await form.locator('[name="phone"]').fill('0612345678');
  await form.locator('[name="email"]').fill('local-test@example.invalid'); await form.locator('[name="city"]').fill('Paris');
  await page.evaluate(() => (window as Window & { completeTestCaptcha?: () => void }).completeTestCaptcha?.());
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('button[type="submit"]')).toBeEnabled();
  await expect(form.locator('[name="email"]')).toHaveValue('local-test@example.invalid');
  await expect(page).toHaveURL(/devis-assurance-taxi/);
});
