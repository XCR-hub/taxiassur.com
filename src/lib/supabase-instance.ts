import { createClient } from '@supabase/supabase-js';

// Module isolé pour éviter circular deps
// Ce module NE DOIT importer AUCUN autre module du projet

// Récupérer les variables d'environnement directement
function getEnvVar(key: string): string {
  if (typeof window !== 'undefined' && (window as any).ENV_CONFIG) {
    return (window as any).ENV_CONFIG[key];
  }
  return import.meta.env[key] || '';
}

// Fallback values
const FALLBACK_URL = 'https://drohhxrkoequjphvabvq.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';

// Global singleton - survives HMR
declare global {
  interface Window {
    __TAXIASSUR_SUPABASE__?: ReturnType<typeof createClient>;
    __TAXIASSUR_SUPABASE_ADMIN__?: ReturnType<typeof createClient>;
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
    console.log('🆕 Creating Supabase instance (lazy)');

    const url = getEnvVar('VITE_SUPABASE_URL') || FALLBACK_URL;
    const key = getEnvVar('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

    const instance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'taxiassur-auth',
        detectSessionInUrl: false
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            // Ajouter un timeout de 10s max pour toutes les requêtes
            signal: AbortSignal.timeout(10000)
          });
        }
      }
    });

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

// Admin client
let _adminInstance: ReturnType<typeof createClient> | null = null;

export function getAdminInstance() {
  if (typeof window !== 'undefined' && window.__TAXIASSUR_SUPABASE_ADMIN__) {
    return window.__TAXIASSUR_SUPABASE_ADMIN__;
  }

  if (_adminInstance) {
    return _adminInstance;
  }

  const url = getEnvVar('VITE_SUPABASE_URL') || FALLBACK_URL;
  const serviceKey = getEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY');

  if (!serviceKey) {
    throw new Error('Service Role Key not configured');
  }

  const instance = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'taxiassur-admin-auth'
    }
  });

  _adminInstance = instance;
  if (typeof window !== 'undefined') {
    window.__TAXIASSUR_SUPABASE_ADMIN__ = instance;
  }

  return instance;
}
