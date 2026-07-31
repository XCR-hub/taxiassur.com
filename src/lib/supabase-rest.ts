import { supabase } from '@/lib/supabase';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

const FALLBACK_SUPABASE_URL = 'https://drohhxrkoequjphvabvq.supabase.co';
const AUTH_RETRY_STATUSES = new Set([401, 403]);

interface SupabaseRestOptions {
  retryWithAnonOnAuthError?: boolean;
  useAnonOnly?: boolean;
  accessToken?: string;
}

function getBaseUrl(): string {
  return (getSupabaseUrl() || FALLBACK_SUPABASE_URL).replace(/\/$/, '');
}

function getAnonKey(): string {
  return getSupabaseAnonKey();
}

function buildUrl(path: string): string {
  return `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

async function getSessionAccessToken(refresh = false): Promise<string> {
  try {
    const result = refresh ? await supabase.auth.refreshSession() : await supabase.auth.getSession();
    return result.data.session?.access_token || '';
  } catch {
    return '';
  }
}

function buildHeaders(anonKey: string, authToken: string, init: RequestInit): Headers {
  const headers = new Headers(init.headers || {});
  headers.set('apikey', anonKey);
  headers.set('Authorization', `Bearer ${authToken}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

async function fetchWithToken(path: string, init: RequestInit, anonKey: string, authToken: string): Promise<Response> {
  return fetch(buildUrl(path), {
    ...init,
    headers: buildHeaders(anonKey, authToken, init),
  });
}

export async function supabaseRestFetch(
  path: string,
  init: RequestInit = {},
  options: SupabaseRestOptions = {},
): Promise<Response> {
  const anonKey = getAnonKey();
  if (!anonKey) {
    throw new Error('Configuration Supabase publique manquante pour le backoffice');
  }

  const method = (init.method || 'GET').toUpperCase();
  const retryWithAnon = options.retryWithAnonOnAuthError ?? method === 'GET';
  const sessionToken = options.useAnonOnly ? '' : (options.accessToken || await getSessionAccessToken(false));
  const primaryToken = sessionToken || anonKey;

  let response = await fetchWithToken(path, init, anonKey, primaryToken);

  if (!AUTH_RETRY_STATUSES.has(response.status) || options.useAnonOnly) {
    return response;
  }

  if (sessionToken) {
    const refreshedToken = await getSessionAccessToken(true);
    if (refreshedToken && refreshedToken !== sessionToken) {
      response = await fetchWithToken(path, init, anonKey, refreshedToken);
      if (!AUTH_RETRY_STATUSES.has(response.status)) {
        return response;
      }
    }
  }

  if (retryWithAnon) {
    return fetchWithToken(path, init, anonKey, anonKey);
  }

  return response;
}

export async function supabaseRestJson<T>(
  path: string,
  init: RequestInit = {},
  options: SupabaseRestOptions = {},
): Promise<T> {
  const response = await supabaseRestFetch(path, init, options);
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}${details ? `: ${details.slice(0, 180)}` : ''}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}