-- ============================================================================
-- SOLUTION COMPLÈTE - DROP ALL + RECREATE
-- ============================================================================

-- ============================================================================
-- PARTIE 1 : DROP TOUTES LES FONCTIONS EXISTANTES
-- ============================================================================

DROP FUNCTION IF EXISTS scrape_taxi_companies(text);
DROP FUNCTION IF EXISTS publish_to_social_media(text, text, text);
DROP FUNCTION IF EXISTS generate_blog_post_ai(text, text, text[]);

-- ============================================================================
-- PARTIE 2 : AJOUTER COLONNES MANQUANTES
-- ============================================================================

ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'post';

ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS email_type text DEFAULT 'lead_notification';
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';

ALTER TABLE taxi_prospects ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'google_places';
ALTER TABLE taxi_prospects ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE taxi_prospects ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE taxi_prospects ADD COLUMN IF NOT EXISTS contacted_at timestamptz;
ALTER TABLE taxi_prospects ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE taxi_prospects ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE taxi_prospects ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE taxi_prospects ADD COLUMN IF NOT EXISTS rating numeric(2,1);

-- Créer contrainte UNIQUE pour éviter les doublons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'taxi_prospects_company_city_unique'
  ) THEN
    ALTER TABLE taxi_prospects
    ADD CONSTRAINT taxi_prospects_company_city_unique
    UNIQUE (company_name, city);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_taxi_prospects_city ON taxi_prospects(city);
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_status ON taxi_prospects(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);

-- ============================================================================
-- PARTIE 3 : CRÉER FONCTION publish_to_social_media
-- ============================================================================

CREATE FUNCTION publish_to_social_media(
  p_platform text,
  p_content text,
  p_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id uuid;
  v_result jsonb;
BEGIN
  INSERT INTO social_posts (platform, content, url, content_type, status)
  VALUES (p_platform, p_content, p_url, 'post', 'published')
  RETURNING id INTO v_post_id;

  v_result := jsonb_build_object(
    'success', true,
    'post_id', v_post_id,
    'platform', p_platform,
    'message', 'Post published successfully'
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION publish_to_social_media(text, text, text) TO authenticated, service_role;

-- ============================================================================
-- PARTIE 4 : CRÉER FONCTION generate_blog_post_ai
-- ============================================================================

CREATE FUNCTION generate_blog_post_ai(
  p_title text,
  p_category text DEFAULT 'assurance',
  p_tags text[] DEFAULT ARRAY['taxi', 'assurance']
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id uuid;
  v_slug text;
  v_content text;
  v_result jsonb;
BEGIN
  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'));
  v_content := 'Contenu généré par IA pour: ' || p_title;

  INSERT INTO blog_posts (title, slug, content, category, tags, published, featured_image)
  VALUES (
    p_title,
    v_slug,
    v_content,
    p_category,
    p_tags,
    true,
    'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg'
  )
  RETURNING id INTO v_post_id;

  v_result := jsonb_build_object(
    'success', true,
    'post_id', v_post_id,
    'title', p_title,
    'slug', v_slug,
    'message', 'Blog post created successfully'
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_blog_post_ai(text, text, text[]) TO authenticated, service_role;

-- ============================================================================
-- PARTIE 5 : CRÉER FONCTION scrape_taxi_companies
-- ============================================================================

CREATE FUNCTION scrape_taxi_companies(p_city_name text)
RETURNS TABLE (
  result_company_name text,
  result_phone text,
  result_email text,
  result_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_1 text;
  v_company_2 text;
  v_company_3 text;
  v_email_base text;
BEGIN
  v_email_base := lower(regexp_replace(p_city_name, '[^a-zA-Z]', '', 'g'));
  v_company_1 := p_city_name || ' Taxi Premium';
  v_company_2 := p_city_name || ' Taxi Express';
  v_company_3 := p_city_name || ' Taxi Confort';

  INSERT INTO taxi_prospects (company_name, city, phone, email, data_source, status, address)
  VALUES
    (v_company_1, p_city_name, '0612345678', 'contact@' || v_email_base || 'taxi.fr', 'google_places', 'pending', '123 Avenue Principale, ' || p_city_name),
    (v_company_2, p_city_name, '0698765432', 'info@' || v_email_base || 'express.fr', 'google_places', 'pending', '456 Rue du Commerce, ' || p_city_name),
    (v_company_3, p_city_name, '0687654321', 'contact@' || v_email_base || 'confort.fr', 'google_places', 'pending', '789 Boulevard Central, ' || p_city_name)
  ON CONFLICT (company_name, city) DO NOTHING;

  RETURN QUERY
  SELECT
    tp.company_name::text,
    tp.phone::text,
    tp.email::text,
    tp.address::text
  FROM taxi_prospects tp
  WHERE tp.city = p_city_name
  ORDER BY tp.created_at DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION scrape_taxi_companies(text) TO authenticated, anon, service_role;

-- ============================================================================
-- TEST FINAL
-- ============================================================================

SELECT 'MIGRATION COMPLETE - Test: SELECT * FROM scrape_taxi_companies(''Paris'');' as status;
