export const CLIENT_ACCESS_TOKEN_STORAGE_KEY = 'client_access_token';

const CLIENT_ACCESS_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

export function normalizeClientAccessToken(value: string | null | undefined): string {
  const token = value?.trim() || '';
  return CLIENT_ACCESS_TOKEN_PATTERN.test(token) ? token.toLowerCase() : '';
}

export function storeClientAccessToken(value: string): boolean {
  const token = normalizeClientAccessToken(value);
  if (!token || typeof window === 'undefined') return false;
  sessionStorage.setItem(CLIENT_ACCESS_TOKEN_STORAGE_KEY, token);
  sessionStorage.removeItem('client_email');
  return true;
}

export function getClientAccessToken(searchValue?: string | null): string {
  const fromUrl = normalizeClientAccessToken(searchValue);
  if (fromUrl) {
    storeClientAccessToken(fromUrl);
    return fromUrl;
  }
  if (typeof window === 'undefined') return '';
  return normalizeClientAccessToken(sessionStorage.getItem(CLIENT_ACCESS_TOKEN_STORAGE_KEY));
}

export function clearClientAccess(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CLIENT_ACCESS_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem('client_email');
}
