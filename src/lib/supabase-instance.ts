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

// Initialize ONCE - no lazy loading to avoid issues
let _instance: ReturnType<typeof createClient> | null = null;

function initSupabaseInstance() {
  // Return existing instance from window (HMR safe)
  if (typeof window !== 'undefined' && window.__TAXIASSUR_SUPABASE__) {
    console.log('♻️ Reusing Supabase from window');
    return window.__TAXIASSUR_SUPABASE__;
  }

  // Return module-level cache
  if (_instance) {
    console.log('♻️ Reusing Supabase from cache');
    return _instance;
  }

  // Create new instance
  console.log('🆕 Creating Supabase instance');

  const url = getEnvVar('VITE_SUPABASE_URL') || FALLBACK_URL;
  const key = getEnvVar('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

  const instance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'taxiassur-auth',
      detectSessionInUrl: true
    }
  });

  // Cache globally
  _instance = instance;
  if (typeof window !== 'undefined') {
    window.__TAXIASSUR_SUPABASE__ = instance;
  }

  return instance;
}

// Export singleton instance directly
export const supabaseInstance = initSupabaseInstance();

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
