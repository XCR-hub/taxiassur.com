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
  return getEnv('VITE_SUPABASE_URL') || 'https://drohhxrkoequjphvabvq.supabase.co';
}

export function getSupabaseAnonKey(): string {
  return getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
}

export function getGoogleCseApiKey(): string | undefined {
  return getEnv('VITE_GOOGLE_CSE_API_KEY');
}

export function getGoogleCseCx(): string | undefined {
  return getEnv('VITE_GOOGLE_CSE_CX');
}

export function getAdminPassword(): string {
  return getEnv('VITE_ADMIN_PASSWORD') || 'taxiassur2024';
}

export function getIndexNowKey(): string {
  return getEnv('VITE_INDEXNOW_KEY') || 'bee0a466b3054c6683f80a0efac280c9';
}

export function getSiteUrl(): string {
  return getEnv('VITE_SITE_URL') || 'https://taxiassur.com';
}
