export type PublicContentTable = 'blog_posts' | 'city_pages' | 'faq_entries' | 'news_articles';

interface D1ContentRow<T> {
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

interface D1ItemResponse<T> {
  ok: boolean;
  item?: D1ContentRow<T>;
  error?: string;
}

interface D1ListResponse<T> {
  ok: boolean;
  items?: Array<D1ContentRow<T>>;
  error?: string;
}

interface D1ListOptions {
  limit?: number;
  status?: 'published' | 'all';
  category?: string;
  excludeId?: string;
  sort?: 'published_at' | 'updated_at' | 'title';
}

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

export async function getD1Content<T>(
  table: PublicContentTable,
  lookup: { slug?: string; id?: string },
): Promise<T | null> {
  const query = searchParams({ table, slug: lookup.slug, id: lookup.id });

  try {
    const response = await fetchWithTimeout(`/api/d1/content?${query}`);
    if (!response.ok) return null;

    const data = (await response.json()) as D1ItemResponse<T>;
    return data.ok && data.item?.payload ? data.item.payload : null;
  } catch {
    return null;
  }
}

export async function listD1Content<T>(
  table: PublicContentTable,
  options: D1ListOptions = {},
): Promise<T[]> {
  const query = searchParams({
    table,
    limit: options.limit,
    status: options.status,
    category: options.category,
    excludeId: options.excludeId,
    sort: options.sort,
  });

  try {
    const response = await fetchWithTimeout(`/api/d1/list?${query}`);
    if (!response.ok) return [];

    const data = (await response.json()) as D1ListResponse<T>;
    return data.ok && data.items ? data.items.map((item) => item.payload).filter(Boolean) : [];
  } catch {
    return [];
  }
}
