/*
  # GA4 & NLP SEO Signals - Tables and RPCs

  ## New Tables
  - ga4_page_signals: behavioral data per page from GA4 Data API
  - nlp_content_scores: Google Natural Language API analysis results

  ## New RPCs
  - get_ga4_seo_combined_signals: joins ga4 + gsc data for unified priority scoring
  - get_ga4_summary_stats: summary stats for dashboard
*/

CREATE TABLE IF NOT EXISTS ga4_page_signals (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path            text         NOT NULL,
  full_url             text,
  sessions             integer      DEFAULT 0,
  engaged_sessions     integer      DEFAULT 0,
  page_views           integer      DEFAULT 0,
  new_users            integer      DEFAULT 0,
  bounce_rate          numeric(5,4) DEFAULT 0,
  avg_session_duration numeric(10,2) DEFAULT 0,
  engagement_rate      numeric(5,4) DEFAULT 0,
  behavioral_score     integer      DEFAULT 0 CHECK (behavioral_score BETWEEN 0 AND 100),
  date_range_start     date         NOT NULL,
  date_range_end       date         NOT NULL,
  synced_at            timestamptz  DEFAULT now(),
  created_at           timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ga4_signals_page_path  ON ga4_page_signals(page_path);
CREATE INDEX IF NOT EXISTS idx_ga4_signals_synced_at  ON ga4_page_signals(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_signals_score       ON ga4_page_signals(behavioral_score DESC);

ALTER TABLE ga4_page_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read ga4 signals"   ON ga4_page_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role insert ga4 signals"      ON ga4_page_signals FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update ga4 signals"      ON ga4_page_signals FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS nlp_content_scores (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url            text         NOT NULL,
  page_path           text,
  entity_count        integer      DEFAULT 0,
  entity_salience_avg numeric(4,3) DEFAULT 0,
  top_entities        jsonb        DEFAULT '[]',
  sentiment_score     numeric(4,3) DEFAULT 0 CHECK (sentiment_score BETWEEN -1 AND 1),
  sentiment_magnitude numeric(6,3) DEFAULT 0,
  main_category       text,
  category_confidence numeric(4,3) DEFAULT 0,
  content_length      integer      DEFAULT 0,
  semantic_score      integer      DEFAULT 0 CHECK (semantic_score BETWEEN 0 AND 100),
  improvement_hints   jsonb        DEFAULT '[]',
  analyzed_at         timestamptz  DEFAULT now(),
  created_at          timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nlp_scores_page_url  ON nlp_content_scores(page_url);
CREATE INDEX IF NOT EXISTS idx_nlp_scores_page_path ON nlp_content_scores(page_path);
CREATE INDEX IF NOT EXISTS idx_nlp_scores_analyzed  ON nlp_content_scores(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nlp_scores_semantic  ON nlp_content_scores(semantic_score DESC);

ALTER TABLE nlp_content_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read nlp scores"   ON nlp_content_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role insert nlp scores"      ON nlp_content_scores FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update nlp scores"      ON nlp_content_scores FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Combined signal view for dashboard
CREATE OR REPLACE FUNCTION get_ga4_seo_combined_signals(limit_rows integer DEFAULT 20)
RETURNS TABLE (
  page_path         text,
  gsc_clicks        bigint,
  gsc_impressions   bigint,
  gsc_position      numeric,
  gsc_ctr           numeric,
  ga4_sessions      bigint,
  ga4_bounce_rate   numeric,
  ga4_engagement    numeric,
  ga4_avg_duration  numeric,
  behavioral_score  integer,
  semantic_score    integer,
  combined_priority integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(p.url, g.full_url)             AS page_path,
    COALESCE(p.clicks, 0)::bigint           AS gsc_clicks,
    COALESCE(p.impressions, 0)::bigint      AS gsc_impressions,
    COALESCE(p.position, 0)::numeric        AS gsc_position,
    COALESCE(p.ctr, 0)::numeric             AS gsc_ctr,
    COALESCE(g.sessions, 0)::bigint         AS ga4_sessions,
    COALESCE(g.bounce_rate, 0)::numeric     AS ga4_bounce_rate,
    COALESCE(g.engagement_rate, 0)::numeric AS ga4_engagement,
    COALESCE(g.avg_session_duration, 0)::numeric AS ga4_avg_duration,
    COALESCE(g.behavioral_score, 0)         AS behavioral_score,
    COALESCE(n.semantic_score, 0)           AS semantic_score,
    LEAST(100, (
      CASE WHEN COALESCE(p.position, 99) BETWEEN 4 AND 20 THEN 40 ELSE 20 END
      + COALESCE(g.behavioral_score, 0) * 30 / 100
      + (100 - COALESCE(n.semantic_score, 50)) * 30 / 100
    ))::integer                             AS combined_priority
  FROM gsc_pages p
  FULL OUTER JOIN (
    SELECT DISTINCT ON (page_path)
      page_path, full_url, sessions, bounce_rate, engagement_rate,
      avg_session_duration, behavioral_score, synced_at
    FROM ga4_page_signals ORDER BY page_path, synced_at DESC
  ) g ON g.page_path = REPLACE(p.url, 'https://taxiassur.com', '')
  LEFT JOIN (
    SELECT DISTINCT ON (page_path) page_path, semantic_score
    FROM nlp_content_scores ORDER BY page_path, analyzed_at DESC
  ) n ON n.page_path = REPLACE(p.url, 'https://taxiassur.com', '')
  ORDER BY combined_priority DESC NULLS LAST
  LIMIT limit_rows;
$$;

GRANT EXECUTE ON FUNCTION get_ga4_seo_combined_signals(integer) TO authenticated;

CREATE OR REPLACE FUNCTION get_ga4_summary_stats()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_pages_tracked',  COUNT(DISTINCT page_path),
    'avg_engagement_rate',  ROUND(AVG(engagement_rate)::numeric, 3),
    'avg_session_duration', ROUND(AVG(avg_session_duration)::numeric, 1),
    'avg_bounce_rate',      ROUND(AVG(bounce_rate)::numeric, 3),
    'total_sessions',       SUM(sessions),
    'high_engagement_pages', COUNT(*) FILTER (WHERE engagement_rate >= 0.6),
    'low_engagement_pages',  COUNT(*) FILTER (WHERE engagement_rate < 0.3 AND sessions > 10),
    'last_sync',            MAX(synced_at)
  )
  FROM (
    SELECT DISTINCT ON (page_path)
      page_path, engagement_rate, avg_session_duration, bounce_rate, sessions, synced_at
    FROM ga4_page_signals ORDER BY page_path, synced_at DESC
  ) latest;
$$;

GRANT EXECUTE ON FUNCTION get_ga4_summary_stats() TO authenticated;
