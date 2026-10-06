import { writeFile, mkdir } from 'node:fs/promises';
import { ACQUISITION_PAGES } from '../shared/acquisition-pages.js';
const site = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const content = (process.env.TAXIASSUR_NATIVE_PLATFORM_URL || 'https://postgres-read-api.taxiassur.com/platform').replace(/\/$/, '') + '/v1/public/content';
async function rows(table) {
  const all = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(content + '/' + table + '?limit=1000&offset=' + offset, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
    if (!response.ok) throw new Error(table + ': HTTP ' + response.status);
    const payload = await response.json();
    if (!payload.ok || !Array.isArray(payload.items)) throw new Error(table + ': invalid content response');
    all.push(...payload.items);
    if (payload.items.length < 1000) return all;
  }
}
function summarize(records, key, latestDate) {
  const cutoff = new Date(Date.parse(latestDate + 'T00:00:00Z') - 27 * 86400000).toISOString().slice(0, 10);
  const grouped = new Map();
  for (const record of records) {
    if (record.date < cutoff || record.date > latestDate) continue;
    const label = record[key], current = grouped.get(label) || { value: label, clicks: 0, impressions: 0, positionWeight: 0 };
    const impressions = Number(record.impressions || 0);
    current.clicks += Number(record.clicks || 0); current.impressions += impressions;
    current.positionWeight += Number(record.position || 0) * impressions;
    grouped.set(label, current);
  }
  return [...grouped.values()].sort((a, b) => b.impressions - a.impressions).slice(0, 20).map(row => ({ value: row.value, clicks: row.clicks, impressions: row.impressions, ctr_percent: row.impressions ? Number((row.clicks * 100 / row.impressions).toFixed(2)) : 0, position: row.impressions ? Number((row.positionWeight / row.impressions).toFixed(1)) : null }));
}
const [pages, queries] = await Promise.all([rows('gsc_pages'), rows('gsc_queries')]);
const latestDate = pages.map(row => row.date).filter(Boolean).sort().at(-1) || null;
const queryLatestDate = queries.map(row => row.date).filter(Boolean).sort().at(-1) || null;
const age = date => date ? Math.floor((Date.now() - Date.parse(date + 'T00:00:00Z')) / 86400000) : null;
const fresh = latestDate && queryLatestDate && age(latestDate) <= 7 && age(queryLatestDate) <= 7;
const publicPages = await Promise.all(Object.entries(ACQUISITION_PAGES).map(async ([pathname, expected]) => {
  const response = await fetch(site + pathname, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
  const html = await response.text();
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || null;
  const core = html.match(/<main[^>]*data-acquisition-html="true"[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
  return { pathname, status: response.status, title, has_route_content: core.includes(expected.h1), word_count: core.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length, has_quote_link: core.includes('/devis-assurance-taxi#devis-form') };
}));
const report = { checked_at: new Date().toISOString(), target: { service: 'taxi', channel: 'website_form', per_day: 3, per_30_days: 90 }, gsc: { fresh: Boolean(fresh), latest_page_date: latestDate, latest_query_date: queryLatestDate, age_days: age(latestDate), warning: fresh ? null : 'Stored Search Console data is stale. These rows cannot explain current rankings or September lead volume.', scope: 'Stored rows over 28 days ending at the most recent available date; not a live Search Console report.', pages: latestDate ? summarize(pages, 'url', latestDate) : [], queries: queryLatestDate ? summarize(queries, 'query', queryLatestDate) : [] }, public_pages: publicPages, current_leads: { measured: false, reason: 'Actual form requests are measured in the authenticated conversion dashboard; public SEO data does not expose contacts.' } };
await mkdir('reports', { recursive: true }); await writeFile('reports/acquisition-performance-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: 'reports/acquisition-performance-audit.json', target: report.target, gsc_fresh: report.gsc.fresh, last_gsc_date: latestDate, warning: report.gsc.warning, public_pages: publicPages }, null, 2));
if (!fresh && process.env.GITHUB_ACTIONS === 'true') console.log('::warning::Search Console data is stale; latest page date: ' + latestDate + '. Restore the Google sync before assessing current ranking changes.');
if (publicPages.some(page => page.status !== 200 || !page.has_route_content || !page.has_quote_link || page.word_count < 280) || (process.argv.includes('--require-fresh') && !fresh)) process.exitCode = 1;
