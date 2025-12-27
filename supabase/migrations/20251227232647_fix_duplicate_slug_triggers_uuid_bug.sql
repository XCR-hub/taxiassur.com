/*
  # Fix Duplicate Slug Trigger Functions - UUID Bug
  
  1. Problème identifié
    - Les fonctions `prevent_duplicate_blog_slug()` et `prevent_duplicate_city_slug()` 
      utilisent `COALESCE(NEW.id, 0)` ce qui cause une erreur de type car `id` est UUID
    - Erreur: "COALESCE types uuid and integer cannot be matched"
    
  2. Changements
    - Remplacer `id != COALESCE(NEW.id, 0)` par `id IS DISTINCT FROM NEW.id`
    - Cette syntaxe gère correctement les NULL et les UUID
    
  3. Impact
    - Correction des insertions dans `blog_posts` et `city_pages`
    - Permet à l'Edge Function `publish-unified-content` de fonctionner
*/

-- Corriger la fonction pour blog_posts
CREATE OR REPLACE FUNCTION prevent_duplicate_blog_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM blog_posts
    WHERE slug = NEW.slug AND id IS DISTINCT FROM NEW.id
  ) THEN
    -- Ajouter timestamp au slug pour le rendre unique
    NEW.slug := NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
    RAISE NOTICE 'Slug modifié pour éviter doublon: %', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Corriger la fonction pour city_pages
CREATE OR REPLACE FUNCTION prevent_duplicate_city_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM city_pages
    WHERE slug = NEW.slug AND id IS DISTINCT FROM NEW.id
  ) THEN
    -- Ajouter timestamp au slug pour le rendre unique
    NEW.slug := NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
    RAISE NOTICE 'Slug modifié pour éviter doublon: %', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vérifier que les triggers sont toujours actifs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'blog_slug_duplicate_check'
  ) THEN
    CREATE TRIGGER blog_slug_duplicate_check
      BEFORE INSERT OR UPDATE ON blog_posts
      FOR EACH ROW
      EXECUTE FUNCTION prevent_duplicate_blog_slug();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'city_slug_duplicate_check'
  ) THEN
    CREATE TRIGGER city_slug_duplicate_check
      BEFORE INSERT OR UPDATE ON city_pages
      FOR EACH ROW
      EXECUTE FUNCTION prevent_duplicate_city_slug();
  END IF;
END $$;
