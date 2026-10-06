export const NOINDEX_PATHS = new Set([
  '/actualites/theo-le-taxi-france-tv-1766881140212',
  '/assurance-taxi-grenoble', '/assurance-taxi-orleans',
  '/actualites/franchise-assurance-taxi-ce-qui-change-cette-annee',
  '/blog/double-activite-taxi-vtc-assurance',
  '/actualites/tesla-model-3-nouvelle-star-taxis-parisiens',
  '/blog/comparatif-assurances-taxi-2025-axa-generali-covea',
  '/assurance-taxi-angers',
]);

export function compactSeoText(value, maxLength) {
  const text = String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1).replace(/\s+\S*$/, '').trim();
  return (cut || text.slice(0, maxLength - 1)) + '\u2026';
}

export function seoTitle(value) {
  const title = String(value || '').replace(/\s*\|\s*(?:Blog |Actualit[e\u00e9]s )?TaxiAssur.*$/i, '').replace(/^TaxiAssur\s*[-|]\s*/i, '').trim();
  return compactSeoText(title, 48) + ' | TaxiAssur';
}

export function seoDescription(value, fallback) {
  const primary = compactSeoText(value, 160);
  return primary.length >= 100 ? primary : compactSeoText(fallback, 160);
}

export function redirectSources(text) {
  return String(text).split(/\r?\n/).flatMap(line => {
    const [source, , status] = line.trim().split(/\s+/);
    if (!source?.startsWith('/') || !/^3\d\d$/.test(status || '')) return [];
    const pattern = source.replace(/[.+?^$(){}|[\]\\]/g, '\\$&').replace(/:[a-z]+/gi, '[^/]+').replace(/\*/g, '.*');
    return [new RegExp('^' + pattern + '$')];
  });
}

export function isCanonicalPublicPath(pathname, redirects = []) {
  return !NOINDEX_PATHS.has(pathname) && !redirects.some(pattern => pattern.test(pathname));
}
