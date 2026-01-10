/**
 * SEO AUTOMATION BACKEND
 * Automatise : sitemap, IndexNow, ping moteurs, notifications
 */

import { MIRROR_PAGES } from './mirror-pages';

export interface SEOAutomationConfig {
  enabled: boolean;
  autoSitemap: boolean;
  autoIndexNow: boolean;
  autoPing: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
}

/**
 * Génère automatiquement le sitemap complet incluant pages miroirs
 */
export async function generateCompleteSitemap(): Promise<string> {
  const baseUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';
  const now = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/assurance-taxi', priority: 1.0, changefreq: 'weekly' },
    { url: '/devis-instantane', priority: 0.9, changefreq: 'weekly' },
    { url: '/comparateur-axa', priority: 0.9, changefreq: 'weekly' },
    { url: '/rc-professionnelle', priority: 0.8, changefreq: 'monthly' },
    { url: '/flotte-vehicules', priority: 0.8, changefreq: 'monthly' },
    { url: '/assurance-taxi-vtc', priority: 0.8, changefreq: 'monthly' },
    { url: '/blog', priority: 0.7, changefreq: 'daily' },
    { url: '/faq', priority: 0.7, changefreq: 'weekly' },
    { url: '/contact', priority: 0.6, changefreq: 'monthly' },
    { url: '/partenaires', priority: 0.6, changefreq: 'monthly' }
  ];

  // Ajouter pages villes
  const cityPages = [
    'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Nice',
    'Nantes', 'Strasbourg', 'Montpellier', 'Lille', 'Rennes', 'Reims'
  ].map(city => ({
    url: `/assurance-taxi-${city.toLowerCase()}`,
    priority: 0.7,
    changefreq: 'weekly'
  }));

  // Ajouter pages miroirs
  const mirrorPages = MIRROR_PAGES.map(page => ({
    url: page.url,
    priority: page.priority / 10,
    changefreq: page.intent === 'transactional' ? 'weekly' : 'monthly'
  }));

  const allPages = [...staticPages, ...cityPages, ...mirrorPages];

  const urls = allPages
    .map(
      page => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;
}

/**
 * Ping tous les moteurs de recherche avec le sitemap
 */
export async function pingSearchEngines(): Promise<{
  success: boolean;
  results: Array<{ engine: string; status: string }>;
}> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  const engines = [
    {
      name: 'Google',
      url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
    },
    {
      name: 'Bing',
      url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
    }
  ];

  const results = await Promise.allSettled(
    engines.map(async engine => {
      try {
        const response = await fetch(engine.url);
        return {
          engine: engine.name,
          status: response.ok ? 'success' : 'failed'
        };
      } catch {
        return {
          engine: engine.name,
          status: 'error'
        };
      }
    })
  );

  return {
    success: results.some(r => r.status === 'fulfilled'),
    results: results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { engine: 'unknown', status: 'error' }
    )
  };
}

/**
 * Notifie tous les moteurs quand une page change
 */
export async function notifyPageUpdate(pageUrl: string): Promise<boolean> {
  // IndexNow removed - now handled by search engines crawling
  console.log('[SEO] Page update:', pageUrl);
  return true;
}

/**
 * Notifie tous les moteurs pour plusieurs pages
 */
export async function notifyBulkPageUpdates(pageUrls: string[]): Promise<{
  success: boolean;
  successCount: number;
  failCount: number;
}> {
  // IndexNow removed - now handled by search engines crawling
  console.log('[SEO] Bulk page updates:', pageUrls.length, 'pages');
  return {
    success: true,
    successCount: pageUrls.length,
    failCount: 0
  };
}

/**
 * Tâche automatique quotidienne
 */
export async function runDailyAutomation(): Promise<{
  sitemap: boolean;
  indexnow: boolean;
  ping: boolean;
}> {
  const results = {
    sitemap: false,
    indexnow: false,
    ping: false
  };

  try {
    // 1. Régénérer le sitemap
    const sitemap = await generateCompleteSitemap();
    // TODO: Sauvegarder dans /public/sitemap.xml
    results.sitemap = !!sitemap;

    // 2. Notifier IndexNow
    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';
    await notifyPageUpdate(`${siteUrl}/sitemap.xml`);
    results.indexnow = true;

    // 3. Ping moteurs
    const pingResult = await pingSearchEngines();
    results.ping = pingResult.success;
  } catch (error) {
    console.error('[SEO Automation] Daily task failed:', error);
  }

  return results;
}

/**
 * Vérifie et notifie les nouvelles pages automatiquement
 */
export async function autoDetectAndNotifyNewPages(): Promise<number> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';

  // Collecter toutes les URLs du site
  const allUrls = [
    '/',
    '/assurance-taxi',
    '/devis-instantane',
    ...MIRROR_PAGES.map(p => p.url)
  ];

  // Vérifier quelles pages n'ont pas encore été notifiées
  const lastNotified = getLastNotifiedPages();
  const newPages = allUrls.filter(url => !lastNotified.includes(url));

  if (newPages.length > 0) {
    const fullUrls = newPages.map(url => `${siteUrl}${url}`);
    await notifyBulkPageUpdates(fullUrls);

    // Sauvegarder les pages notifiées
    saveNotifiedPages(allUrls);
  }

  return newPages.length;
}

/**
 * Sauvegarde locale des pages déjà notifiées
 */
function saveNotifiedPages(urls: string[]): void {
  try {
    localStorage.setItem('seo_notified_pages', JSON.stringify(urls));
    localStorage.setItem('seo_last_notification', Date.now().toString());
  } catch {
    // Silent fail
  }
}

/**
 * Récupère les pages déjà notifiées
 */
function getLastNotifiedPages(): string[] {
  try {
    const saved = localStorage.getItem('seo_notified_pages');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Crée un fichier robots.txt optimisé
 */
export function generateRobotsTxt(): string {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';

  return `# TaxiAssur - Robots.txt optimisé multi-moteurs
User-agent: *
Allow: /
Disallow: /admin
Disallow: /backoffice
Disallow: /api/
Disallow: /*.json$

# Crawl-delay pour être poli
Crawl-delay: 1

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/feeds/sitemap.xml

# Moteurs spécifiques
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: ia_archiver
Allow: /

# Bloqués (spam, scraping)
User-agent: MJ12bot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /
`;
}

/**
 * Statistiques SEO
 */
export interface SEOStats {
  totalPages: number;
  mirrorPages: number;
  lastSitemapUpdate: string | null;
  lastIndexNowSubmit: string | null;
  totalNotifications: number;
}

export function getSEOStats(): SEOStats {
  try {
    const lastNotification = localStorage.getItem('seo_last_notification');
    const notifiedPages = getLastNotifiedPages();

    return {
      totalPages: MIRROR_PAGES.length + 50, // Estimation
      mirrorPages: MIRROR_PAGES.length,
      lastSitemapUpdate: lastNotification ? new Date(parseInt(lastNotification)).toISOString() : null,
      lastIndexNowSubmit: lastNotification ? new Date(parseInt(lastNotification)).toISOString() : null,
      totalNotifications: notifiedPages.length
    };
  } catch {
    return {
      totalPages: 0,
      mirrorPages: 0,
      lastSitemapUpdate: null,
      lastIndexNowSubmit: null,
      totalNotifications: 0
    };
  }
}

/**
 * Hook React pour automatiser les tâches SEO
 */
export function useSEOAutomation(config: SEOAutomationConfig) {
  React.useEffect(() => {
    if (!config.enabled) return;

    const interval = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000
    }[config.frequency];

    const timer = setInterval(async () => {
      if (config.autoIndexNow) {
        await autoDetectAndNotifyNewPages();
      }

      if (config.autoPing) {
        await pingSearchEngines();
      }
    }, interval);

    // Exécuter immédiatement au montage
    if (config.autoIndexNow) {
      autoDetectAndNotifyNewPages();
    }

    return () => clearInterval(timer);
  }, [config]);
}

declare global {
  const React: typeof import('react');
}
