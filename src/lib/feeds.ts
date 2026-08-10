import { getSupabaseUrl } from './env';
import { logger } from '@/lib/logger';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';

// Fonction pour déclencher la régénération des feeds via edge function
export async function regenerateFeeds(): Promise<boolean> {
  try {
    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) {
      logger.error('Supabase configuration missing');
      return false;
    }

    // Appeler edge function auto-seo-notifier
    const endpoint = `${supabaseUrl}/functions/v1/auto-seo-notifier`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': (await internalFunctionHeaders()).Authorization
      }
    });

    if (response.ok) {
      const result = await response.json();
      logger.log('✅ SEO automatisé:', result);
      return result.ok === true;
    }

    return false;
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