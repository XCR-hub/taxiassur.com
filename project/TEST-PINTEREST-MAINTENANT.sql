-- ============================================
-- TEST PUBLICATION PINTEREST IMMÉDIATE
-- ============================================
-- Copiez-collez ce code dans Supabase SQL Editor
-- pour tester la publication Pinterest maintenant
-- ============================================

-- ÉTAPE 1: Fix RLS Policies (obligatoire)
DROP POLICY IF EXISTS "Allow public read social posts" ON social_posts;
DROP POLICY IF EXISTS "Allow authenticated write social posts" ON social_posts;
DROP POLICY IF EXISTS "Allow authenticated update social posts" ON social_posts;
DROP POLICY IF EXISTS "Allow authenticated delete social posts" ON social_posts;
DROP POLICY IF EXISTS "Allow service role all access social posts" ON social_posts;
DROP POLICY IF EXISTS "Allow anon insert social posts" ON social_posts;

CREATE POLICY "Allow public read social posts"
  ON social_posts FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated write social posts"
  ON social_posts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update social posts"
  ON social_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete social posts"
  ON social_posts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow service role all access social posts"
  ON social_posts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon insert social posts"
  ON social_posts FOR INSERT TO anon WITH CHECK (true);

-- ÉTAPE 2: Activer Pinterest
UPDATE social_networks
SET
  is_active = true,
  is_connected = true,
  auto_publish = true,
  metadata = jsonb_build_object(
    'board_id', '945333846723355976',
    'board_name', 'Réseaux',
    'viral_mode', true
  )
WHERE platform = 'pinterest';

-- ÉTAPE 3: Fonction de test immédiat
CREATE OR REPLACE FUNCTION test_pinterest_now()
RETURNS jsonb AS $$
DECLARE
  v_network_id uuid;
  v_post_id uuid;
  v_pin_result jsonb;
BEGIN
  -- Récupérer Pinterest network_id
  SELECT id INTO v_network_id
  FROM social_networks
  WHERE platform = 'pinterest' AND is_active = true;

  IF v_network_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pinterest non activé'
    );
  END IF;

  -- Créer un post de test
  INSERT INTO social_posts (
    network_id,
    content,
    media_urls,
    hashtags,
    status,
    metadata
  )
  VALUES (
    v_network_id,
    E'🚕 TEST PUBLICATION AUTOMATIQUE\n\nAssurance taxi professionnelle - Devis gratuit en 2 minutes\n\n✅ Couverture complète\n✅ Prix compétitifs\n✅ Service expert',
    ARRAY['https://images.pexels.com/photos/887846/pexels-photo-887846.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'],
    ARRAY['#taxi', '#assurance', '#professionnel', '#chauffeur'],
    'published',
    jsonb_build_object(
      'test_publication', true,
      'created_at', now(),
      'board_id', '945333846723355976'
    )
  )
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Post créé avec succès dans la base de données',
    'post_id', v_post_id,
    'network_id', v_network_id,
    'next_step', 'Le post doit maintenant être publié via l''edge function pinterest-publisher'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 4: Lancer le test
SELECT test_pinterest_now();

-- VÉRIFICATION
SELECT
  'Pinterest' as plateforme,
  is_active as actif,
  auto_publish as publication_auto,
  metadata->>'board_id' as board_id
FROM social_networks
WHERE platform = 'pinterest';

-- Voir les posts créés
SELECT
  id,
  content,
  status,
  media_urls,
  hashtags,
  created_at
FROM social_posts
WHERE network_id IN (SELECT id FROM social_networks WHERE platform = 'pinterest')
ORDER BY created_at DESC
LIMIT 5;
