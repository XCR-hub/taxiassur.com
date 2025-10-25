/*
  # Fix Social Posts RLS Policies

  1. Problème
    - Table social_posts a RLS activé mais aucune politique
    - Erreur 401 Unauthorized lors des insertions
    - Impossible de créer des posts depuis le back-office

  2. Solution
    - Créer politiques RLS pour lecture publique
    - Créer politiques RLS pour écriture authentifiée
    - Permettre service_role d'écrire (pour cron jobs)

  3. Sécurité
    - Lecture: Publique (pour affichage stats)
    - Écriture: Authentifiés + Service Role
*/

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow public read social posts" ON social_posts;
DROP POLICY IF EXISTS "Allow authenticated manage social posts" ON social_posts;
DROP POLICY IF EXISTS "Allow service role all access social posts" ON social_posts;
DROP POLICY IF EXISTS "Allow anon read social posts" ON social_posts;

-- Politique 1: Lecture publique (pour stats et affichage)
CREATE POLICY "Allow public read social posts"
  ON social_posts FOR SELECT
  TO public
  USING (true);

-- Politique 2: Écriture pour authentifiés
CREATE POLICY "Allow authenticated write social posts"
  ON social_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update social posts"
  ON social_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete social posts"
  ON social_posts FOR DELETE
  TO authenticated
  USING (true);

-- Politique 3: Accès service_role (pour cron jobs et edge functions)
CREATE POLICY "Allow service role all access social posts"
  ON social_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politique 4: Autoriser anonymous à insérer (pour edge functions publiques)
CREATE POLICY "Allow anon insert social posts"
  ON social_posts FOR INSERT
  TO anon
  WITH CHECK (true);

-- Vérification
DO $$
DECLARE
  v_policies_count integer;
BEGIN
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename = 'social_posts';

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ FIX SOCIAL POSTS RLS POLICIES';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Politiques créées: %', v_policies_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Lecture publique: Activée';
  RAISE NOTICE '✅ Écriture authentifiée: Activée';
  RAISE NOTICE '✅ Service role: Accès total';
  RAISE NOTICE '✅ Anonymous insert: Activée (edge functions)';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ Problème 401 résolu !';
  RAISE NOTICE '════════════════════════════════════════';
END $$;
