export type PublicContentTable = 'blog_posts' | 'city_pages' | 'faq_entries' | 'news_articles';

interface PublicContentRow<T> {
  source_table: PublicContentTable;
  source_id: string;
  slug: string | null;
  url: string | null;
  title: string | null;
  status: string | null;
  category: string | null;
  city: string | null;
  published_at: string | null;
  updated_at: string | null;
  payload: T;
}

interface PublicItemResponse<T> {
  ok: boolean;
  item?: PublicContentRow<T>;
  error?: string;
}

interface PublicListResponse<T> {
  ok: boolean;
  items?: Array<PublicContentRow<T>>;
  error?: string;
}

interface PublicListOptions {
  limit?: number;
  status?: 'published' | 'all';
  category?: string;
  excludeId?: string;
  sort?: 'published_at' | 'updated_at' | 'title';
}

const PUBLIC_CACHE_ENDPOINTS = ['/api/d1', '/api/postgres-public'];

async function fetchWithTimeout(url: string, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function searchParams(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  return query.toString();
}

async function getPublicContentFromEndpoint<T>(endpoint: string, query: string): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(`${endpoint}/content?${query}`);
    if (!response.ok) return null;

    const data = (await response.json()) as PublicItemResponse<T>;
    return data.ok && data.item?.payload ? data.item.payload : null;
  } catch {
    return null;
  }
}

async function listPublicContentFromEndpoint<T>(endpoint: string, query: string): Promise<T[]> {
  try {
    const response = await fetchWithTimeout(`${endpoint}/list?${query}`);
    if (!response.ok) return [];

    const data = (await response.json()) as PublicListResponse<T>;
    return data.ok && data.items ? data.items.map((item) => item.payload).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function getD1Content<T>(
  table: PublicContentTable,
  lookup: { slug?: string; id?: string },
): Promise<T | null> {
  const query = searchParams({ table, slug: lookup.slug, id: lookup.id });

  for (const endpoint of PUBLIC_CACHE_ENDPOINTS) {
    const item = await getPublicContentFromEndpoint<T>(endpoint, query);
    if (item) return item;
  }

  return null;
}

export async function listD1Content<T>(
  table: PublicContentTable,
  options: PublicListOptions = {},
): Promise<T[]> {
  const query = searchParams({
    table,
    limit: options.limit,
    status: options.status,
    category: options.category,
    excludeId: options.excludeId,
    sort: options.sort,
  });

  for (const endpoint of PUBLIC_CACHE_ENDPOINTS) {
    const items = await listPublicContentFromEndpoint<T>(endpoint, query);
    if (items.length > 0) return items;
  }

  return [];
}
