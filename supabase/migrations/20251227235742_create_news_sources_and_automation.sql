/*
  # Système complet d'agrégation d'actualités automatisé
  
  1. Tables créées
    - `news_sources` : Sources RSS/API configurées
    - `news_digest` : Synthèses quotidiennes/hebdomadaires
    
  2. Colonnes news_sources
    - `id` : UUID, clé primaire
    - `name` : nom de la source
    - `url` : URL RSS/API
    - `type` : rss, api, scraping, linkedin
    - `enabled` : actif ou non
    - `keywords` : mots-clés à filtrer
    - `priority` : niveau de priorité (1-10)
    - `check_interval` : intervalle de vérification en secondes
    - `last_check` : dernière vérification
    - `last_success` : dernier succès
    - `error_count` : nombre d'erreurs consécutives
    - `created_at` : date de création
    
  3. Colonnes news_digest
    - `id` : UUID, clé primaire
    - `type` : daily ou weekly
    - `title` : titre du digest
    - `content` : contenu HTML synthétisé
    - `articles_count` : nombre d'articles inclus
    - `period_start` : début de période
    - `period_end` : fin de période
    - `sent_at` : date d'envoi
    - `created_at` : date de création
    
  4. Sécurité
    - RLS activé sur toutes les tables
    - Lecture publique pour news_sources actives
    - Modification réservée aux authentifiés
    
  5. Index et performances
    - Index sur enabled, last_check pour requêtes fréquentes
    - Index sur type, period pour les digests
*/

CREATE TABLE IF NOT EXISTS news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'rss',
  enabled boolean DEFAULT true,
  keywords text[] DEFAULT ARRAY[]::text[],
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  check_interval integer DEFAULT 3600,
  last_check timestamptz,
  last_success timestamptz,
  error_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_digest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('daily', 'weekly')),
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  articles_count integer DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_digest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active news sources"
  ON news_sources
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

CREATE POLICY "Authenticated users can manage news sources"
  ON news_sources
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read news digest"
  ON news_digest
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage news digest"
  ON news_digest
  FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_news_sources_enabled ON news_sources(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_news_sources_last_check ON news_sources(last_check);
CREATE INDEX IF NOT EXISTS idx_news_sources_type ON news_sources(type);
CREATE INDEX IF NOT EXISTS idx_news_digest_type ON news_digest(type);
CREATE INDEX IF NOT EXISTS idx_news_digest_period ON news_digest(period_start, period_end);

INSERT INTO news_sources (name, url, type, enabled, keywords, priority, check_interval) VALUES
  ('Taxi Magazine', 'https://www.taximag.fr/feed', 'rss', true, 
   ARRAY['taxi', 'vtc', 'transport', 'réglementation', 'assurance'], 9, 3600),
  
  ('Mobilité Magazine', 'https://www.mobilitemagazine.fr/feed', 'rss', true,
   ARRAY['mobilité', 'transport', 'taxi', 'urbain'], 7, 3600),
  
  ('Transport Info', 'https://www.transportinfo.fr/rss', 'rss', true,
   ARRAY['transport', 'professionnel', 'réglementation'], 6, 7200),
  
  ('Google News Taxi France', 'https://news.google.com/rss/search?q=taxi+france&hl=fr&gl=FR&ceid=FR:fr', 'rss', true,
   ARRAY['taxi', 'france', 'actualité'], 8, 1800),
  
  ('Légifrance Transport', 'https://www.legifrance.gouv.fr/search/jorf?tab_selection=jorf&query=taxi&nature=DECRET', 'scraping', true,
   ARRAY['décret', 'arrêté', 'taxi', 'transport', 'réglementation'], 10, 21600),
  
  ('LinkedIn Taxi Pros', 'linkedin-companies', 'linkedin', true,
   ARRAY['taxi', 'assurance taxi', 'professionnel', 'vtc'], 8, 7200),
  
  ('Service Public Transport', 'https://www.service-public.fr/actualites/rss', 'rss', true,
   ARRAY['taxi', 'transport', 'professionnel', 'carte'], 9, 14400),
  
  ('DREAL Transports', 'https://www.ecologie.gouv.fr/rss/actualites', 'rss', true,
   ARRAY['transport', 'réglementation', 'professionnel'], 7, 21600)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION update_news_source_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_news_sources_timestamp
  BEFORE UPDATE ON news_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_news_source_timestamp();
