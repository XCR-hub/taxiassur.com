// Fonction pour déclencher la régénération des feeds via edge function
export async function regenerateFeeds(): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return false;
    }

    // Appeler edge function auto-seo-notifier
    const endpoint = `${supabaseUrl}/functions/v1/auto-seo-notifier`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SEO automatisé:', result);
      return result.ok === true;
    }

    return false;
  } catch (error) {
    console.error('Failed to regenerate feeds:', error);
    return false;
  }
}

// Fonction pour tester la connectivité du webhook
export async function pingWebhook(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    // In development, use the PHP server endpoint instead of the static file
    const isDev = import.meta.env.DEV;
    const endpoint = isDev 
      ? '/api/webhook.php?action=ping'  // Use API endpoint that can be proxied
      : '/webhooks/make.php?action=ping';
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
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