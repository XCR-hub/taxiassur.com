import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('../public/lead-entry.js', import.meta.url), 'utf8');
function capture(url, consent, values = new Map()) {
  runInNewContext(script, { URL, window: { location: new URL(url) }, document: { referrer: 'https://google.com/search?q=private' }, localStorage: { getItem: () => JSON.stringify(consent) }, sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } });
  return values;
}
test('early entry never stores acquisition without analytics consent or on private pages', () => {
  assert.equal(capture('https://taxiassur.com/?utm_source=google', null).size, 0);
  assert.equal(capture('https://taxiassur.com/', { analytics: false }).size, 0);
  assert.equal(capture('https://taxiassur.com/backoffice', { analytics: true }).size, 0);
});
test('early entry preserves the first consented landing page across document navigation', () => {
  const values = capture('https://taxiassur.com/?utm_source=google&token=secret&gclid=click', { analytics: true, marketing: false });
  capture('https://taxiassur.com/devis-assurance-taxi', { analytics: true }, values);
  const saved = JSON.parse(values.get('taxiassur_lead_acquisition'));
  assert.equal(saved.landing_page, '/');
  assert.equal(saved.utm_source, 'google');
  assert.equal(saved.page_url, 'https://taxiassur.com/');
  assert.equal(saved.referrer, 'https://google.com/search');
  assert.equal(saved.gclid, undefined);
  assert.equal(JSON.stringify(saved).includes('secret'), false);
});
test('click IDs require marketing consent and invalid campaign values are discarded', () => {
  const saved = JSON.parse(capture('https://taxiassur.com/?utm_source=someone%40example.com&gclid=click_123', { analytics: true, marketing: true }).get('taxiassur_lead_acquisition'));
  assert.equal(saved.gclid, 'click_123');
  assert.equal(saved.utm_source, undefined);
});