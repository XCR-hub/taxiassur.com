CREATE TABLE IF NOT EXISTS public_content_cache (
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  slug TEXT,
  url TEXT,
  title TEXT,
  status TEXT,
  category TEXT,
  city TEXT,
  published_at TEXT,
  updated_at TEXT,
  payload TEXT NOT NULL,
  PRIMARY KEY (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_public_content_cache_slug
  ON public_content_cache (source_table, slug);

CREATE INDEX IF NOT EXISTS idx_public_content_cache_status_published
  ON public_content_cache (source_table, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_content_cache_url
  ON public_content_cache (url);

CREATE TABLE IF NOT EXISTS gsc_metrics_cache (
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  url TEXT,
  query TEXT,
  date TEXT,
  impressions INTEGER,
  clicks INTEGER,
  ctr REAL,
  position REAL,
  payload TEXT NOT NULL,
  PRIMARY KEY (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_gsc_metrics_cache_url_date
  ON gsc_metrics_cache (url, date DESC);

CREATE INDEX IF NOT EXISTS idx_gsc_metrics_cache_query_date
  ON gsc_metrics_cache (query, date DESC);

CREATE INDEX IF NOT EXISTS idx_gsc_metrics_cache_date
  ON gsc_metrics_cache (date DESC);