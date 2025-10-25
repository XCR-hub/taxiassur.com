/*
  # Fix SQL Functions et Supprimer RC Pro

  1. Problème
    - Erreur "cannot change return type of existing function"
    - RC Pro ne doit pas être dans le champ status (type d'activité)

  2. Solution
    - DROP puis recréer les fonctions get_blog_posts()
    - Supprimer "rc-pro" de la contrainte valid_contract_type
    - Garder seulement: taxi, vtc, autre
*/

-- ============================================================================
-- 1. CORRIGER LES FONCTIONS BLOG_POSTS
-- ============================================================================

-- Drop les fonctions existantes avec CASCADE
DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;

-- Recréer get_blog_posts avec la bonne signature
CREATE FUNCTION get_blog_posts()
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  featured_image text,
  meta_description text,
  meta_title text,
  keywords text[],
  tags text[],
  published boolean,
  reading_time integer,
  read_time integer,
  faq jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    slug,
    title,
    excerpt,
    content,
    COALESCE(author, 'TaxiAssur') as author,
    featured_image,
    meta_description,
    meta_title,
    COALESCE(keywords, ARRAY[]::text[]) as keywords,
    COALESCE(tags, ARRAY[]::text[]) as tags,
    COALESCE(published, false) as published,
    COALESCE(reading_time, read_time, 5) as reading_time,
    COALESCE(read_time, reading_time, 5) as read_time,
    COALESCE(faq, '[]'::jsonb) as faq,
    created_at,
    updated_at
  FROM blog_posts
  WHERE COALESCE(published, false) = true
  ORDER BY created_at DESC;
$$;

-- Recréer get_blog_post_by_slug avec la bonne signature
CREATE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  featured_image text,
  image_alt text,
  meta_description text,
  meta_title text,
  keywords text[],
  tags text[],
  published boolean,
  reading_time integer,
  read_time integer,
  faq jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    slug,
    title,
    excerpt,
    content,
    COALESCE(author, 'TaxiAssur') as author,
    featured_image,
    image_alt,
    meta_description,
    meta_title,
    COALESCE(keywords, ARRAY[]::text[]) as keywords,
    COALESCE(tags, ARRAY[]::text[]) as tags,
    COALESCE(published, false) as published,
    COALESCE(reading_time, read_time, 5) as reading_time,
    COALESCE(read_time, reading_time, 5) as read_time,
    COALESCE(faq, '[]'::jsonb) as faq,
    created_at,
    updated_at
  FROM blog_posts
  WHERE slug = p_slug AND COALESCE(published, false) = true
  LIMIT 1;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO anon, authenticated;

-- ============================================================================
-- 2. SUPPRIMER RC-PRO DE LA CONTRAINTE STATUS
-- ============================================================================

-- Supprimer l'ancienne contrainte
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_contract_type;

-- Recréer la contrainte sans rc-pro
ALTER TABLE leads
ADD CONSTRAINT valid_contract_type CHECK (
  status IN ('taxi', 'vtc', 'autre')
);

COMMENT ON CONSTRAINT valid_contract_type ON leads IS
'Type d''activité du prospect : taxi, vtc, ou autre';

-- Mettre à jour les leads existants avec rc-pro vers autre
UPDATE leads
SET status = 'autre'
WHERE status = 'rc-pro';

-- ============================================================================
-- 3. METTRE À JOUR LA FONCTION SQL get_contract_type_label
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contract_type_label(p_status text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_status
    WHEN 'taxi' THEN 'Taxi'
    WHEN 'vtc' THEN 'VTC'
    WHEN 'autre' THEN 'Autre'
    ELSE 'Inconnu'
  END;
END;
$$;

-- ============================================================================
-- 4. METTRE À JOUR LE TRIGGER DE VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_lead_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normaliser le status en minuscules
  NEW.status := LOWER(TRIM(NEW.status));

  -- Normaliser le lead_status en minuscules
  NEW.lead_status := LOWER(TRIM(NEW.lead_status));

  -- Valider que le status existe (sans rc-pro)
  IF NEW.status NOT IN ('taxi', 'vtc', 'autre') THEN
    RAISE EXCEPTION 'Type d''activité invalide: %. Valeurs autorisées: taxi, vtc, autre', NEW.status;
  END IF;

  -- Valider que le lead_status existe
  IF NEW.lead_status NOT IN ('nouveau', 'contacté', 'devis envoyé', 'client', 'perdu') THEN
    RAISE EXCEPTION 'État lead invalide: %. Valeurs autorisées: nouveau, contacté, devis envoyé, client, perdu', NEW.lead_status;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 20251015120000 appliquée avec succès';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 CORRECTIONS:';
  RAISE NOTICE '   ✅ Fonctions get_blog_posts() recréées';
  RAISE NOTICE '   ✅ RC Pro supprimé du champ status';
  RAISE NOTICE '';
  RAISE NOTICE '📋 TYPE D''ACTIVITÉ (status):';
  RAISE NOTICE '   ✅ taxi  - Activité Taxi';
  RAISE NOTICE '   ✅ vtc   - Activité VTC';
  RAISE NOTICE '   ✅ autre - Autre activité';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Leads existants avec rc-pro migrés vers "autre"';
  RAISE NOTICE '';
END $$;
