-- ============================================================================
-- FIX: Corriger la contrainte NOT NULL sur excerpt dans blog_posts
-- ============================================================================
-- PROBLÈME: La fonction generate_blog_post_ai() échoue car excerpt est NOT NULL
-- ERREUR: null value in column "excerpt" of relation "blog_posts" violates not-null constraint
-- ============================================================================

-- Étape 1: Vérifier la structure actuelle de blog_posts
-- ============================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'blog_posts'
ORDER BY ordinal_position;


-- Étape 2: Modifier excerpt pour accepter NULL OU ajouter une valeur par défaut
-- ============================================================================
DO $$
BEGIN
  -- Option 1: Rendre la colonne nullable (recommandé)
  ALTER TABLE blog_posts ALTER COLUMN excerpt DROP NOT NULL;
  RAISE NOTICE 'Colonne excerpt modifiée: accepte maintenant NULL';

  -- Option 2: Si tu préfères garder NOT NULL, ajoute une valeur par défaut
  -- ALTER TABLE blog_posts ALTER COLUMN excerpt SET DEFAULT '';
END $$;


-- Étape 3: Mettre à jour la fonction generate_blog_post_ai pour inclure excerpt
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_blog_post_ai(
  p_title text,
  p_category text DEFAULT 'Actualités',
  p_tags text[] DEFAULT ARRAY['taxi', 'assurance']
)
RETURNS jsonb AS $$
DECLARE
  v_slug text;
  v_content text;
  v_excerpt text;
  v_post_id uuid;
BEGIN
  -- Générer le slug à partir du titre
  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  -- Vérifier l'unicité du slug
  IF EXISTS (SELECT 1 FROM blog_posts WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || floor(random() * 1000)::text;
  END IF;

  -- Générer un contenu simple
  v_content := 'Contenu généré par IA pour: ' || p_title;

  -- Générer un extrait (résumé)
  v_excerpt := 'Découvrez notre guide complet sur ' || lower(p_title) || '. Informations essentielles pour les chauffeurs de taxi professionnels.';

  -- Insérer l'article avec l'excerpt
  INSERT INTO blog_posts (title, slug, excerpt, content, category, tags, published, featured_image)
  VALUES (
    p_title,
    v_slug,
    v_excerpt,
    v_content,
    p_category,
    p_tags,
    true,
    'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg'
  )
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'post_id', v_post_id,
    'slug', v_slug,
    'message', 'Article généré avec succès'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Étape 4: Vérifier que excerpt est maintenant nullable
-- ============================================================================
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'blog_posts' AND column_name = 'excerpt';


-- Étape 5: Tester la fonction generate_blog_post_ai
-- ============================================================================
SELECT generate_blog_post_ai(
  'Assurance Taxi 2025 - Guide Complet',
  'Guides',
  ARRAY['taxi', 'assurance', '2025']
);


-- Étape 6: Vérifier que l'article a bien été créé avec excerpt
-- ============================================================================
SELECT
  id,
  title,
  slug,
  excerpt,
  category,
  published,
  created_at
FROM blog_posts
WHERE title LIKE '%2025%'
ORDER BY created_at DESC
LIMIT 3;


-- ============================================================================
-- RÉSULTATS ATTENDUS:
-- ============================================================================
-- Étape 1: Liste des colonnes (excerpt devrait être NOT NULL actuellement)
-- Étape 2: "Colonne excerpt modifiée: accepte maintenant NULL"
-- Étape 3: Fonction mise à jour avec génération d'excerpt
-- Étape 4: is_nullable = 'YES' pour excerpt
-- Étape 5: {"success": true, "post_id": "...", "slug": "..."}
-- Étape 6: 1 article avec excerpt rempli automatiquement
-- ============================================================================

-- 🎯 EXÉCUTION:
-- 1. Copie ce fichier complet
-- 2. Colle dans Supabase SQL Editor
-- 3. Clique RUN
-- 4. Vérifie que la fonction génère maintenant des articles avec excerpt !
