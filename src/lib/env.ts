// Helper to get environment variables with fallback for production
// In production, variables are loaded from window.ENV (via env-config.js)
// In development, variables are loaded from import.meta.env (via Vite)

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
    throw new Error('VITE_SUPABASE_URL is not configured. Please check your environment variables.');
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!key) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not configured. Please check your environment variables.');
  }
  return key;
}

export function getGoogleCseApiKey(): string {
  const key = getEnv('VITE_GOOGLE_CSE_API_KEY');
  if (!key) {
    console.warn('WARNING: VITE_GOOGLE_CSE_API_KEY is not configured. Search features will not work.');
    return '';
  }
  return key;
}

export function getGoogleCseCx(): string {
  const cx = getEnv('VITE_GOOGLE_CSE_CX');
  if (!cx) {
    console.warn('WARNING: VITE_GOOGLE_CSE_CX is not configured. Search features will not work.');
    return '';
  }
  return cx;
}

export function getAdminPassword(): string {
  return getEnv('VITE_ADMIN_PASSWORD') || 'taxiassur2024';
}

export function getSiteUrl(): string {
  return getEnv('VITE_SITE_URL') || 'https://taxiassur.com';
}

export function getNoIndex(): boolean {
  const noindex = getEnv('VITE_NOINDEX');
  return noindex === 'true';
}

export function getSupabaseServiceRoleKey(): string {
  const key = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');
  if (!key) {
    console.warn('WARNING: VITE_SUPABASE_SERVICE_ROLE_KEY is not configured. Admin operations will fail.');
    return '';
  }
  return key;
}
