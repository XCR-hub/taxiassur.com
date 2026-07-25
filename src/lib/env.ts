// Helper to get environment variables with fallback for production
// In production, variables are loaded from window.ENV (via env-config.js)
// In development, variables are loaded from import.meta.env (via Vite)

// Simple console.warn wrapper - NO imports to avoid circular deps
const warn = (msg: string) => {
  if (import.meta.env.DEV) {
    console.warn(msg);
  }
};

export function getEnv(key: string): string | undefined {
  // Try window.ENV_CONFIG first (production)
  if (typeof window !== 'undefined' && (window as any).ENV_CONFIG) {
    return (window as any).ENV_CONFIG[key];
  }

  // Fallback to import.meta.env (development)
  return import.meta.env[key];
}

export function getSupabaseUrl(): string {
  const url = getEnv('VITE_SUPABASE_URL');
  if (!url) {
    warn('⚠️ VITE_SUPABASE_URL is not configured. Supabase features will be disabled.');
    return '';
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!key) {
    warn('⚠️ VITE_SUPABASE_ANON_KEY is not configured. Supabase features will be disabled.');
    return '';
  }
  return key;
}

export function getGoogleCseApiKey(): string {
  const key = getEnv('VITE_GOOGLE_CSE_API_KEY');
  if (!key) {
    warn('WARNING: VITE_GOOGLE_CSE_API_KEY is not configured. Search features will not work.');
    return '';
  }
  return key;
}

export function getGoogleCseCx(): string {
  const cx = getEnv('VITE_GOOGLE_CSE_CX');
  if (!cx) {
    warn('WARNING: VITE_GOOGLE_CSE_CX is not configured. Search features will not work.');
    return '';
  }
  return cx;
}


export function getSiteUrl(): string {
  return getEnv('VITE_SITE_URL') || 'https://taxiassur.com';
}

export function getNoIndex(): boolean {
  const noindex = getEnv('VITE_NOINDEX');
  return noindex === 'true';
}

