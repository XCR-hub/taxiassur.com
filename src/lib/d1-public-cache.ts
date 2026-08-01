import { getEnv } from '@/lib/env';

export type PublicContentTable = 'blog_posts' | 'city_pages' | 'faq_entries' | 'news_articles';

type PublicSourceKey = 'postgres' | 'd1';

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

export interface PublicContentCounts {
  blog_posts: number;
  city_pages: number;
  faq_entries: number;
  news_articles: number;
  gsc_pages?: number;
  gsc_queries?: number;
}
const SOURCE_ENDPOINTS: Record<PublicSourceKey, string> = {
  postgres: '/api/postgres-public',
  d1: '/api/d1',
};

const DEFAULT_SOURCE_ORDER: PublicSourceKey[] = ['postgres', 'd1'];

function normalizeSourceKey(value: string): PublicSourceKey | null {
  const normalized = value.trim().toLowerCase();
  if (['postgres', 'postgres-public', 'postgres_public', 'pg'].includes(normalized)) return 'postgres';
  if (['d1', 'cloudflare-d1', 'cloudflare_d1'].includes(normalized)) return 'd1';
  return null;
}

function getPublicSourceOrder(): PublicSourceKey[] {
  const configured = getEnv('VITE_PUBLIC_CONTENT_SOURCE_ORDER') || '';
  const seen = new Set<PublicSourceKey>();
  const order = configured
    .split(',')
    .map(normalizeSourceKey)
    .filter((source): source is PublicSourceKey => Boolean(source))
    .filter((source) => {
      if (seen.has(source)) return false;
      seen.add(source);
      return true;
    });

  return order.length > 0 ? order : DEFAULT_SOURCE_ORDER;
}

function getPublicCacheEndpoints(): string[] {
  return getPublicSourceOrder().map((source) => SOURCE_ENDPOINTS[source]);
}

function getPublicFetchTimeoutMs(): number {
  const configured = Number(getEnv('VITE_PUBLIC_CONTENT_TIMEOUT_MS') || '');
  if (!Number.isFinite(configured) || configured <= 0) return 3500;
  return Math.min(10000, Math.max(1200, Math.round(configured)));
}

async function fetchWithTimeout(url: string, timeoutMs = getPublicFetchTimeoutMs()): Promise<Response> {
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

function numberFromUnknown(value: unknown): number {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function countsFromRows(rows: unknown): Partial<PublicContentCounts> {
  if (!Array.isArray(rows)) return {};

  return rows.reduce<Partial<PublicContentCounts>>((acc, row) => {
    if (!row || typeof row !== 'object') return acc;
    const sourceTable = String((row as { source_table?: unknown }).source_table || '') as keyof PublicContentCounts;
    if (!sourceTable) return acc;
    acc[sourceTable] = numberFromUnknown((row as { rows?: unknown }).rows);
    return acc;
  }, {});
}

function normalizeHealthCounts(data: unknown): PublicContentCounts | null {
  if (!data || typeof data !== 'object') return null;
  const health = data as {
    tables?: Record<string, unknown>;
    counts?: {
      public_content_cache?: unknown;
      gsc_metrics_cache?: unknown;
    };
  };

  const counts: Partial<PublicContentCounts> = {};

  if (health.tables && typeof health.tables === 'object' && !Array.isArray(health.tables)) {
    for (const key of ['blog_posts', 'city_pages', 'faq_entries', 'news_articles', 'gsc_pages', 'gsc_queries'] as Array<keyof PublicContentCounts>) {
      counts[key] = numberFromUnknown(health.tables[key]);
    }
  }

  Object.assign(counts, countsFromRows(health.counts?.public_content_cache));
  Object.assign(counts, countsFromRows(health.counts?.gsc_metrics_cache));

  if (!counts.blog_posts && !counts.city_pages && !counts.faq_entries && !counts.news_articles) return null;

  return {
    blog_posts: counts.blog_posts || 0,
    city_pages: counts.city_pages || 0,
    faq_entries: counts.faq_entries || 0,
    news_articles: counts.news_articles || 0,
    gsc_pages: counts.gsc_pages || 0,
    gsc_queries: counts.gsc_queries || 0,
  };
}

async function getPublicCountsFromEndpoint(endpoint: string): Promise<PublicContentCounts | null> {
  try {
    const response = await fetchWithTimeout(`${endpoint}/health?stats=${Date.now()}`);
    if (!response.ok) return null;
    return normalizeHealthCounts(await response.json());
  } catch {
    return null;
  }
}

export async function getD1Content<T>(
  table: PublicContentTable,
  lookup: { slug?: string; id?: string },
): Promise<T | null> {
  const query = searchParams({ table, slug: lookup.slug, id: lookup.id });

  for (const endpoint of getPublicCacheEndpoints()) {
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

  for (const endpoint of getPublicCacheEndpoints()) {
    const items = await listPublicContentFromEndpoint<T>(endpoint, query);
    if (items.length > 0) return items;
  }

  return [];
}

export async function getPublicContentCounts(): Promise<PublicContentCounts | null> {
  for (const endpoint of getPublicCacheEndpoints()) {
    const counts = await getPublicCountsFromEndpoint(endpoint);
    if (counts) return counts;
  }

  return null;
}
