/*
  ⚡ COPIER/COLLER CE FICHIER DANS SUPABASE DASHBOARD

  Erreur: execute_sql() not found (404)
  Solution: Créer la fonction

  Durée: 10 secondes

  Instructions:
  1. https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
  2. + New Query
  3. Copier TOUT ce fichier
  4. Coller et RUN
*/

-- ============================================
-- Créer execute_sql(sql_query text)
-- ============================================

DROP FUNCTION IF EXISTS execute_sql(text) CASCADE;

CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_affected_rows int;
BEGIN
  -- Sécurité: Bloquer DROP, DELETE sans WHERE, TRUNCATE
  IF sql_query ~* '^\s*(DROP|TRUNCATE)' THEN
    RAISE EXCEPTION 'Opération non autorisée: DROP/TRUNCATE';
  END IF;

  IF sql_query ~* 'DELETE.*FROM.*(?!WHERE)' THEN
    RAISE EXCEPTION 'DELETE sans WHERE non autorisé';
  END IF;

  -- Exécuter la requête
  BEGIN
    EXECUTE sql_query;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    RETURN json_build_object(
      'success', true,
      'affected_rows', v_affected_rows,
      'message', 'Requête exécutée avec succès'
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erreur lors de l''exécution'
    );
  END;
END;
$$;

-- ============================================
-- Vérifier que ça fonctionne
-- ============================================

SELECT execute_sql('SELECT 1');

-- Résultat attendu:
-- {
--   "success": true,
--   "affected_rows": 0,
--   "message": "Requête exécutée avec succès"
-- }

-- ============================================
-- ✅ APRÈS EXÉCUTION
-- ============================================
-- 1. Rafraîchir: https://taxiassur.com/backoffice/auto-optimizer
-- 2. Ctrl+F5 pour vider le cache
-- 3. Cliquer "ACTIVER TOUTES"
-- 4. ✅ Pas d'erreur 404
