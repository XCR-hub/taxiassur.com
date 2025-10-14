-- ================================================================
-- CONFIGURATION DES PARAMÈTRES SUPABASE
-- ================================================================
-- Corrige l'erreur: "unrecognized configuration parameter app.settings.supabase_url"
-- ================================================================

-- Ces paramètres sont utilisés par les Edge Functions et cron jobs
-- pour accéder aux services Supabase

-- Note: En production Supabase, ces variables sont automatiquement
-- disponibles via Deno.env.get() dans les Edge Functions :
-- - SUPABASE_URL
-- - SUPABASE_SERVICE_ROLE_KEY
-- - SUPABASE_ANON_KEY

-- Si vous avez besoin de les stocker dans la base de données pour
-- d'autres usages, utilisez la table seo_automation_config :

INSERT INTO seo_automation_config (key, value, enabled, description)
VALUES
  (
    'supabase_connection',
    jsonb_build_object(
      'url', 'https://drohhxrkoequjphvabvq.supabase.co',
      'project_ref', 'drohhxrkoequjphvabvq'
    ),
    true,
    'Configuration de connexion Supabase'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Vérifier la configuration
SELECT
  key,
  value,
  enabled,
  description
FROM seo_automation_config
WHERE key = 'supabase_connection';

-- ================================================================
-- CORRECTION DES FICHIERS MIGRATIONS
-- ================================================================
-- Les fichiers de migration qui utilisent current_setting('app.settings...')
-- doivent être modifiés pour utiliser directement les valeurs ou
-- récupérer depuis seo_automation_config
-- ================================================================

-- Exemple de fonction corrigée pour récupérer l'URL Supabase :

CREATE OR REPLACE FUNCTION get_supabase_url()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
BEGIN
  SELECT value->>'url' INTO v_url
  FROM seo_automation_config
  WHERE key = 'supabase_connection';

  RETURN COALESCE(v_url, 'https://drohhxrkoequjphvabvq.supabase.co');
END;
$$;

-- Test de la fonction
SELECT get_supabase_url();

-- ================================================================
-- NOTE IMPORTANTE
-- ================================================================
-- Les Edge Functions utilisent Deno.env.get() pour accéder aux variables
-- d'environnement. Ces variables sont automatiquement disponibles :
--
-- - Deno.env.get("SUPABASE_URL")
-- - Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
-- - Deno.env.get("SUPABASE_ANON_KEY")
--
-- Vous n'avez RIEN à configurer pour les Edge Functions.
-- ================================================================
