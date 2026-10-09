import { test, expect } from '@playwright/test';

// Public asset and font loading may outlast the local server; assert the UI directly.
test.setTimeout(60_000);
test.use({ navigationTimeout: 30_000 });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('taxiassur_privacy_consent', JSON.stringify({ analytics: true, marketing: false, behavioral_personalization: false, version: '2026-08-01', updated_at: new Date().toISOString() }));
    let leadCallback: ((token: string) => void) | undefined;
    let leadError: (() => void) | undefined;
    let counter = 0;
    window.turnstile = { render: (_element, options) => { if (options.action === 'lead_form') { leadCallback = options.callback; leadError = options['error-callback']; counter++; } return (options.action || 'widget') + counter; }, remove: () => {}, reset: () => {} };
    Object.assign(window, { failTestCaptcha: () => leadError?.(), testCaptchaRenders: () => counter });
    (window as Window & { completeTestCaptcha?: () => void }).completeTestCaptcha = () => leadCallback?.('local-test-captcha-' + counter);
  });
  // Every API call is mocked: this test must never create a real prospect or send an email.
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/turnstile/verify')) return route.fulfill({ json: { success: true } });
    if (pathname.endsWith('/public/leads')) return route.fulfill({ status: 201, json: { ok: true, lead_id: 'local-test-lead', access_token: 'test-access' } });
    return route.fulfill({ json: { ok: true, items: [], leads: [], data: [] } });
  });
  await page.route(/https:\/\/(?:www\.)?(?:googletagmanager\.com|google-analytics\.com|challenges\.cloudflare\.com)\//, route => route.abort());
});

test('mobile home and quote pages have one short form with four required fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const pathname of ['/', '/devis-assurance-taxi', '/assurance-taxi', '/prix-assurance-taxi']) {
    await page.goto(pathname, { waitUntil: 'domcontentloaded' });
    const form = page.locator('form[data-form="devis"]');
    await expect(form).toHaveCount(1, { timeout: 15_000 });
    await expect(form.locator('input[required]')).toHaveCount(4);
    await expect(page.locator('h1')).toHaveCount(1);
    const bounds = await form.boundingBox(); expect(bounds?.y).toBeLessThan(1100);
    const title = await page.title(); expect((title.match(/TaxiAssur/g) || []).length).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: 'reports/acquisition-mobile.png', fullPage: true });
});

test('captcha is required and a successful request includes first entry attribution', async ({ page }) => {
  await page.goto('/?utm_source=google&utm_campaign=taxi', { waitUntil: 'domcontentloaded' });
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
  await expect(page.getByRole('link', { name: 'ACCEDER A MON ESPACE' })).toHaveAttribute('href', '/espace-prospect/test-access');
});

test('server rejection preserves fields and a fresh captcha allows a successful retry', async ({ page }) => {
  let submissions = 0;
  const tokens: string[] = [];
  await page.route('**/api/platform/v1/public/turnstile/verify', route => {
    tokens.push(route.request().postDataJSON().token);
    return route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/platform/v1/public/leads', route => ++submissions === 1
    ? route.fulfill({ status: 503, json: { ok: false, error: 'temporarily_unavailable' } })
    : route.fulfill({ status: 201, json: { ok: true, lead_id: 'local-test-lead', access_token: null } }));
  await page.goto('/devis-assurance-taxi', { waitUntil: 'domcontentloaded' });
  const form = page.locator('form[data-form="devis"]');
  await form.locator('[name="name"]').fill('Test local'); await form.locator('[name="phone"]').fill('0612345678');
  await form.locator('[name="email"]').fill('local-test@example.invalid'); await form.locator('[name="city"]').fill('Paris');
  await page.evaluate(() => (window as Window & { completeTestCaptcha?: () => void }).completeTestCaptcha?.());
  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole('alert')).toContainText('Votre demande');
  await expect(form.locator('button[type="submit"]')).toBeDisabled();
  await expect(form.locator('[name="email"]')).toHaveValue('local-test@example.invalid');
  await page.evaluate(() => (window as Window & { completeTestCaptcha?: () => void }).completeTestCaptcha?.());
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/merci/);
  expect(submissions).toBe(2);
  expect(tokens[0]).not.toBe(tokens[1]);
});

test('a rejected captcha is replaced and the visitor can submit without retyping', async ({ page }) => {
  let verifies = 0;
  const tokens: string[] = [];
  await page.route('**/api/platform/v1/public/turnstile/verify', route => {
    tokens.push(route.request().postDataJSON().token);
    return route.fulfill({ json: { success: ++verifies > 1 } });
  });
  await page.goto('/devis-assurance-taxi', { waitUntil: 'domcontentloaded' });
  const form = page.locator('form[data-form="devis"]');
  await form.locator('[name="name"]').fill('Test local');
  await form.locator('[name="phone"]').fill('0612345678');
  await form.locator('[name="email"]').fill('local-test@example.invalid');
  await form.locator('[name="city"]').fill('Paris');
  await page.evaluate(() => (window as Window & { completeTestCaptcha?: () => void }).completeTestCaptcha?.());
  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole('alert')).toContainText('nouveau contrôle');
  await expect(form.locator('button[type="submit"]')).toBeDisabled();
  await expect(form.locator('[name="email"]')).toHaveValue('local-test@example.invalid');
  await page.evaluate(() => (window as Window & { completeTestCaptcha?: () => void }).completeTestCaptcha?.());
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/merci/);
  expect(verifies).toBe(2);
  expect(tokens[0]).not.toBe(tokens[1]);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('DEMANDE REÇUE');
  await expect(page.getByText(/économies garanties|sous 15 minutes|sous 15 min/)).toHaveCount(0);
});

test('an unavailable captcha offers a retry and telephone contact', async ({ page }) => {
  await page.goto('/devis-assurance-taxi', { waitUntil: 'domcontentloaded' });
  const form = page.locator('form[data-form="devis"]');
  await expect(form).toBeVisible();
  const before = await page.evaluate(() => (window as Window & { testCaptchaRenders?: () => number }).testCaptchaRenders?.() || 0);
  await page.evaluate(() => (window as Window & { failTestCaptcha?: () => void }).failTestCaptcha?.());
  await expect(form.getByRole('alert')).toContainText('ne se charge pas');
  await expect(form.getByRole('alert').locator('a[href="tel:0180855786"]')).toBeVisible();
  await form.getByRole('button', { name: 'Relancer le contrôle' }).click();
  await expect(form.getByRole('alert')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as Window & { testCaptchaRenders?: () => number }).testCaptchaRenders?.() || 0)).toBeGreaterThan(before);
});
