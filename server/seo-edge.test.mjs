import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seoTitle, seoDescription, redirectSources, isCanonicalPublicPath } from '../functions/lib/public-seo.js';
import { onRequest } from '../functions/_middleware.js';

const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const redirects = redirectSources(readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8'));

test('sitemap excludes redirect sources and intentionally non-indexed pages', () => {
  assert.equal(isCanonicalPublicPath('/mentions-legales', redirects), false);
  assert.equal(isCanonicalPublicPath('/villes/paris', redirects), false);
  assert.equal(isCanonicalPublicPath('/assurance-taxi-grenoble', redirects), false);
  assert.equal(isCanonicalPublicPath('/blog/guide-professionnel', redirects), true);
  for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    assert.equal(isCanonicalPublicPath(new URL(loc).pathname, redirects), true, loc);
  }
});

test('metadata remains concise and descriptions have useful fallbacks', () => {
  const title = seoTitle('Un guide professionnel '.repeat(10) + ' | Blog TaxiAssur');
  assert.ok(title.length <= 60);
  assert.equal((title.match(/TaxiAssur/g) || []).length, 1);
  const fallback = 'Comparez les garanties de votre assurance taxi professionnelle avec TaxiAssur et preparez les documents utiles a votre devis.';
  assert.equal(seoDescription('Court', fallback), fallback);
  assert.ok(seoDescription('Une description complete '.repeat(20), fallback).length <= 160);
});

test('edge HTML links every sitemap page without JavaScript and protects private routes', async () => {
  const original = globalThis.HTMLRewriter;
  const bodies = [], heads = [];
  globalThis.HTMLRewriter = class {
    on(selector, handler) {
      if (selector === 'body' || selector === 'head') handler.element({ append: value => (selector === 'body' ? bodies : heads).push(value) });
      return this;
    }
    transform(response) { return response; }
  };
  const context = pathname => ({
    request: new Request('https://taxiassur.com' + pathname),
    next: async () => new Response('<html><head></head><body></body></html>', { headers: { 'content-type': 'text/html' } }),
    env: { ASSETS: { fetch: async request => request.url.endsWith('/sitemap.xml') ? new Response(sitemap) : new Response(JSON.stringify({ routes: { '/blog/escape-test': { title: '<script>alert(1)</script>', description: 'test' } } })) } },
  });
  try {
    await onRequest(context('/sitemap'));
    const links = new Set([...bodies.join('').matchAll(/href="([^"]+)"/g)].map(match => match[1]));
    for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) assert.ok(links.has(new URL(loc).pathname), loc);
    assert.ok(heads.join('').includes('href="https://taxiassur.com/sitemap"'));
    assert.ok(heads.join('').includes('data-rh="true"'));
    bodies.length = 0;
    await onRequest(context('/'));
    assert.ok(bodies.join('').includes('href="/sitemap"'));
    bodies.length = 0;
    heads.length = 0;
    await onRequest(context('/backoffice'));
    assert.equal(bodies.length, 0);
    assert.equal(heads.length, 0);
  } finally { globalThis.HTMLRewriter = original; }
});
