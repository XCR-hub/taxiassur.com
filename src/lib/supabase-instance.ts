import { createClient } from '@supabase/supabase-js';

type RuntimeEnv = Record<string, string | undefined>;

// Module isole pour eviter circular deps
// Ce module NE DOIT importer AUCUN autre module du projet

// Recuperer les variables d'environnement directement
function getEnvVar(key: string): string {
  if (typeof window !== 'undefined') {
    const runtimeWindow = window as Window & { ENV_CONFIG?: RuntimeEnv };
    return runtimeWindow.ENV_CONFIG?.[key] || '';
  }

  return import.meta.env[key] || '';
}

// Global singleton - survives HMR
declare global {
  interface Window {
    __TAXIASSUR_SUPABASE__?: ReturnType<typeof createClient>;
  }
}

// LAZY singleton - instance created on first getter call ONLY
let _instance: ReturnType<typeof createClient> | null = null;
let _isCreating = false;

function getSupabaseInstance() {
  // CRITICAL: Always check window first to prevent duplicates
  if (typeof window !== 'undefined' && window.__TAXIASSUR_SUPABASE__) {
    return window.__TAXIASSUR_SUPABASE__;
  }

  // Return cached module instance
  if (_instance) {
    return _instance;
  }

  // Prevent concurrent creation
  if (_isCreating) {
    throw new Error('Supabase instance is being created, please wait');
  }

  // Create new instance
  _isCreating = true;
  try {
    console.log('Creating Supabase instance (lazy)');

    const url = getEnvVar('VITE_SUPABASE_URL');
    const key = getEnvVar('VITE_SUPABASE_ANON_KEY');

    if (!url || !key) {
      throw new Error('Configuration Supabase manquante: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent etre definies explicitement.');
    }

    const instance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'taxiassur-auth',
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-client-info': 'taxiassur-crm'
        }
      }
    });

    // Auto-refresh session toutes les 10 minutes pour admin
    if (typeof window !== 'undefined') {
      setInterval(async () => {
        try {
          const { data: { session } } = await instance.auth.getSession();
          if (session) {
            // Rafraichir automatiquement
            await instance.auth.refreshSession();
            console.log('Session auto-refreshed');
          }
        } catch (error) {
          console.error('Failed to auto-refresh session:', error);
        }
      }, 10 * 60 * 1000); // 10 minutes
    }

    // Cache globally (MOST IMPORTANT)
    _instance = instance;
    if (typeof window !== 'undefined') {
      window.__TAXIASSUR_SUPABASE__ = instance;
    }

    return instance;
  } finally {
    _isCreating = false;
  }
}

// Export getter function - NOT a direct instance
export function getSupabaseInstanceLazy() {
  return getSupabaseInstance();
}

// For backwards compatibility, export a Proxy that calls getter
const lazyProxy = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    const instance = getSupabaseInstance();
    const value = instance[prop as keyof typeof instance];

    // Bind functions to maintain 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }

    return value;
  }
});

export const supabaseInstance = lazyProxy;

