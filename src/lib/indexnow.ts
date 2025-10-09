/**
 * IndexNow - Indexation Instantanée Multi-Moteurs
 * Soumet automatiquement les nouvelles URLs à Bing, Yandex, Qwant, Ecosia, Seznam
 */

import { getIndexNowKey, getSiteUrl } from './env';

interface IndexNowConfig {
  host: string;
  key: string;
  keyLocation: string;
}

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
  'https://api.search.seznam.cz/indexnow'
];

/**
 * Soumet une ou plusieurs URLs à IndexNow
 */
export async function submitToIndexNow(urls: string | string[]): Promise<{
  success: boolean;
  results: Array<{ endpoint: string; status: number; error?: string }>;
}> {
  const siteUrl = getSiteUrl();
  const indexNowKey = getIndexNowKey();

  const urlArray = Array.isArray(urls) ? urls : [urls];
  const fullUrls = urlArray.map(url =>
    url.startsWith('http') ? url : `${siteUrl}${url}`
  );

  const config: IndexNowConfig = {
    host: new URL(siteUrl).hostname,
    key: indexNowKey,
    keyLocation: `${siteUrl}/${indexNowKey}.txt`
  };

  const results = await Promise.allSettled(
    INDEXNOW_ENDPOINTS.map(endpoint =>
      submitToEndpoint(endpoint, fullUrls, config)
    )
  );

  const processedResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        endpoint: INDEXNOW_ENDPOINTS[index],
        status: result.value.status,
        error: result.value.error
      };
    }
    return {
      endpoint: INDEXNOW_ENDPOINTS[index],
      status: 0,
      error: result.reason?.message || 'Unknown error'
    };
  });

  const successCount = processedResults.filter(r => r.status === 200).length;

  return {
    success: successCount > 0,
    results: processedResults
  };
}

/**
 * Soumet à un endpoint spécifique
 */
async function submitToEndpoint(
  endpoint: string,
  urls: string[],
  config: IndexNowConfig
): Promise<{ status: number; error?: string }> {
  try {
    const payload = {
      host: config.host,
      key: config.key,
      keyLocation: config.keyLocation,
      urlList: urls
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok && response.status !== 202) {
      return {
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return { status: response.status };
  } catch (error) {
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Génère une clé IndexNow unique (à stocker dans .env)
 */
function generateIndexNowKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/**
 * Vérifie si IndexNow est configuré
 */
export function isIndexNowConfigured(): boolean {
  return !!getIndexNowKey();
}

/**
 * Soumet automatiquement une page après publication
 */
export async function autoSubmitPage(pageUrl: string): Promise<boolean> {
  if (!isIndexNowConfigured()) {
    console.warn('IndexNow not configured. Skipping auto-submission.');
    return false;
  }

  try {
    const result = await submitToIndexNow(pageUrl);
    console.log(`[IndexNow] Submitted ${pageUrl}:`, result);
    return result.success;
  } catch (error) {
    console.error('[IndexNow] Auto-submission failed:', error);
    return false;
  }
}

/**
 * Soumet le sitemap complet
 */
export async function submitSitemap(): Promise<boolean> {
  const siteUrl = getSiteUrl();
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      console.error('[IndexNow] Cannot fetch sitemap');
      return false;
    }

    const sitemapText = await response.text();
    const urlMatches = sitemapText.matchAll(/<loc>(.*?)<\/loc>/g);
    const urls = Array.from(urlMatches).map(match => match[1]);

    if (urls.length === 0) {
      console.warn('[IndexNow] No URLs found in sitemap');
      return false;
    }

    const result = await submitToIndexNow(urls);
    console.log(`[IndexNow] Submitted ${urls.length} URLs from sitemap:`, result);
    return result.success;
  } catch (error) {
    console.error('[IndexNow] Sitemap submission failed:', error);
    return false;
  }
}

/**
 * Hook React pour soumettre automatiquement la page courante
 */
export function useIndexNow(enabled: boolean = true) {
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const currentUrl = window.location.pathname;

    // Soumettre après 5 secondes (laisser le temps à la page de se charger)
    const timer = setTimeout(() => {
      autoSubmitPage(currentUrl);
    }, 5000);

    return () => clearTimeout(timer);
  }, [enabled]);
}
