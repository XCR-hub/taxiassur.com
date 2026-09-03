import { expect, test, type Page } from '@playwright/test';

const publicRoutes = [
  '/',
  '/assurance-taxi',
  '/devis-assurance-taxi',
  '/blog',
  '/actualites',
];

const protectedShellRoutes = [
  '/backoffice',
  '/backoffice/crm-killer/pipeline',
  '/backoffice/crm-killer/inbox',
  '/backoffice/quote-queue',
  '/backoffice/crm-killer/retention',
  '/backoffice/crm-killer/ia',
  '/espace-prospect',
];

function captureRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 500) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  return errors;
}

for (const route of publicRoutes) {
  test(`public route ${route} renders without runtime errors`, async ({ page }) => {
    const errors = captureRuntimeErrors(page);
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(1_500);
    expect(errors).toEqual([]);
  });
}

for (const route of protectedShellRoutes) {
  test(`protected shell ${route} loads without server errors`, async ({ page }) => {
    const errors = captureRuntimeErrors(page);
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(1_000);
    expect(errors).toEqual([]);
  });
}

test('native platform API is reachable and protects admin data', async ({ request }) => {
  const health = await request.get('https://postgres-read-api.taxiassur.com/platform/health');
  expect(health.status()).toBe(200);
  expect((await health.json()).ok).toBe(true);

  const leads = await request.get('/api/platform/v1/admin/leads?page_size=1');
  expect(leads.status()).toBe(401);
});
