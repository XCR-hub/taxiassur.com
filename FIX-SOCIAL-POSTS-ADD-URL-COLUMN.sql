-- ============================================================================
-- FIX: Ajouter la colonne URL manquante dans social_posts
-- ============================================================================
-- PROBLÈME: La fonction publish_to_social_media() essaie d'insérer dans une colonne "url" qui n'existe pas
-- ERREUR: column "url" of relation "social_posts" does not exist
-- ============================================================================

-- Étape 1: Vérifier la structure actuelle de social_posts
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'social_posts'
ORDER BY ordinal_position;


-- Étape 2: Ajouter la colonne url si elle n'existe pas
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'url'
  ) THEN
    ALTER TABLE social_posts ADD COLUMN url text;
    RAISE NOTICE 'Colonne url ajoutée à social_posts';
  ELSE
    RAISE NOTICE 'Colonne url existe déjà dans social_posts';
  END IF;
END $$;


-- Étape 3: Vérifier que la colonne a bien été ajoutée
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'social_posts' AND column_name = 'url';


-- Étape 4: Tester la fonction publish_to_social_media
-- ============================================================================
SELECT publish_to_social_media(
  'linkedin',
  'Test de publication automatique sur LinkedIn - Colonne URL corrigée',
  'https://taxiassur.com'
);


-- Étape 5: Vérifier que la publication a bien été créée
-- ============================================================================
SELECT
  id,
  platform,
  content,
  url,
  status,
  created_at
FROM social_posts
WHERE platform = 'linkedin'
ORDER BY created_at DESC
LIMIT 3;


-- ============================================================================
-- RÉSULTATS ATTENDUS:
-- ============================================================================
-- Étape 1: Liste des colonnes actuelles de social_posts
-- Étape 2: "Colonne url ajoutée à social_posts" OU "Colonne url existe déjà"
-- Étape 3: 1 ligne avec column_name='url', data_type='text'
-- Étape 4: {"success": true, "post_id": "..."}
-- Étape 5: 1 post LinkedIn avec l'URL "https://taxiassur.com"
-- ============================================================================

-- 🎯 EXÉCUTION:
-- 1. Copie ce fichier complet
-- 2. Colle dans Supabase SQL Editor
-- 3. Clique RUN
-- 4. Vérifie que la fonction fonctionne maintenant !
