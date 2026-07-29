const DEFAULT_API_URL = 'https://postgres-read-api.taxiassur.com';

export const ALLOWED_TABLES = new Set(['blog_posts', 'city_pages', 'faq_entries', 'news_articles']);
export const SORT_FIELDS = new Set(['published_at', 'updated_at', 'created_at', 'title']);

export function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'cache-control': init.cacheControl || 'public, max-age=30',
      'x-taxiassur-source': 'postgres-mirror',
      ...(init.headers || {}),
    },
  });
}

export function positiveInt(value, fallback, max) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function config(env) {
  const token =
    env.TAXIASSUR_POSTGRES_READ_API_TOKEN ||
    env.POSTGRES_READ_API_TOKEN ||
    '';
  const baseUrl = String(
    env.TAXIASSUR_POSTGRES_READ_API_URL ||
    env.POSTGRES_READ_API_URL ||
    DEFAULT_API_URL,
  ).replace(/\/$/, '');

  return { token, baseUrl };
}

export function publicRow(table, item) {
  const id = item.id || item.source_id || item.slug || null;
  const status = normalizedStatus(item);

  return {
    source_table: table,
    source_id: id ? String(id) : null,
    slug: item.slug || null,
    url: item.url || null,
    title: item.title || null,
    status,
    category: item.category || null,
    city: item.city || item.city_name || null,
    published_at: item.published_at || item.created_at || null,
    updated_at: item.updated_at || item.created_at || null,
    payload: item,
  };
}

export function isPublished(item, requestedStatus = 'published') {
  if (requestedStatus === 'all') return true;

  const status = String(item.status || '').toLowerCase();
  if (status) return status === requestedStatus;

  if ('published' in item) return item.published === true || String(item.published).toLowerCase() === 'true';
  if ('is_published' in item) return item.is_published === true || String(item.is_published).toLowerCase() === 'true';

  return requestedStatus === 'published';
}

export function normalizedStatus(item) {
  const status = String(item.status || '').toLowerCase();
  if (status) return status;
  if (item.published === false || String(item.published).toLowerCase() === 'false') return 'draft';
  if (item.is_published === false || String(item.is_published).toLowerCase() === 'false') return 'draft';
  return 'published';
}

export async function postgresFetch(env, pathname, params = {}) {
  const { token, baseUrl } = config(env);
  if (!token) {
    const error = new Error('missing_postgres_read_api_token');
    error.statusCode = 503;
    throw error;
  }

  const url = new URL(`${baseUrl}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      const error = new Error(data.error || `postgres_read_api_${response.status}`);
      error.statusCode = response.status >= 400 && response.status < 500 ? response.status : 503;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export function publicError(error) {
  const status = error && error.statusCode ? error.statusCode : 503;
  return json(
    {
      ok: false,
      error: status === 503 ? 'postgres_public_cache_unavailable' : 'postgres_public_cache_error',
    },
    { status, cacheControl: 'no-store' },
  );
}
