export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'worker-src'?: string[];
  'form-action'?: string[];
  'base-uri'?: string[];
  'frame-ancestors'?: string[];
  'upgrade-insecure-requests'?: boolean;
}

export const cspConfig: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    process.env.VITE_SUPABASE_URL || '',
    'https://api.cloudflare.com',
  ],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': true,
};

export function generateCSPHeader(directives: CSPDirectives = cspConfig): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(directives)) {
    if (key === 'upgrade-insecure-requests' && value === true) {
      parts.push('upgrade-insecure-requests');
    } else if (Array.isArray(value)) {
      parts.push(`${key} ${value.join(' ')}`);
    }
  }

  return parts.join('; ');
}

export function applyCSP(directives: CSPDirectives = cspConfig) {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = generateCSPHeader(directives);
  document.head.appendChild(meta);
}

export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export function applyCSPWithNonce(nonce: string) {
  const directives: CSPDirectives = {
    ...cspConfig,
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      ...(cspConfig['script-src']?.filter(src => !src.includes('unsafe')) || []),
    ],
    'style-src': [
      "'self'",
      `'nonce-${nonce}'`,
      'https://fonts.googleapis.com',
    ],
  };

  applyCSP(directives);
  return nonce;
}
