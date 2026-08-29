import { logger } from '@/lib/logger';
import { nativeAdminCall } from '@/lib/native-admin-data';

// Fonction pour déclencher la régénération des feeds via edge function
export async function regenerateFeeds(): Promise<boolean> {
  try {
    const site = 'https://taxiassur.com';
    const result = await nativeAdminCall<{ success: boolean }>('/v1/admin/indexnow', {
      method: 'POST',
      body: JSON.stringify({ urls: [site, `${site}/sitemap.xml`, `${site}/feeds/rss.xml`] })
    });
    return result.success === true;
  } catch (error) {
    logger.error('Failed to regenerate feeds:', error);
    return false;
  }
}

// Fonction pour tester la connectivité du webhook
export async function pingWebhook(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const isDev = import.meta.env.DEV;
    const endpoint = isDev
      ? '/api/webhook.php?action=ping'
      : '/webhooks/make.php?action=ping';

    const makeSecret = '';

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-MAKE-SECRET': makeSecret
      }
    });

    const result = await response.json();

    if (response.ok) {
      return { ok: true, message: result.message };
    } else {
      return { ok: false, error: result.error };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}
