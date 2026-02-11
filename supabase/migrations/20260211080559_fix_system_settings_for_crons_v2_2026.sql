/*
  # Fix System Settings pour les Cron Jobs - V2
  
  ## Problème
  - Les cron jobs utilisent `get_system_setting()` mais la table system_settings n'existe pas
  - Les edge functions ne sont jamais appelées automatiquement
  - Les leads des formulaires ne sont pas créés automatiquement
  
  ## Solution
  - Créer la table system_settings si elle n'existe pas
  - Drop et recréer la fonction get_system_setting
  - Insérer les configurations nécessaires
*/

-- 1️⃣ Créer la table system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2️⃣ Activer RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 3️⃣ Politiques RLS
DROP POLICY IF EXISTS "Service role can read system settings" ON system_settings;
DROP POLICY IF EXISTS "Service role can update system settings" ON system_settings;

CREATE POLICY "Service role can read system settings"
  ON system_settings
  FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Service role can update system settings"
  ON system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4️⃣ Drop et recréer la fonction get_system_setting
DROP FUNCTION IF EXISTS get_system_setting(text);
DROP FUNCTION IF EXISTS get_system_setting(p_key text);

CREATE OR REPLACE FUNCTION get_system_setting(setting_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT value 
    FROM system_settings 
    WHERE key = setting_key
    LIMIT 1
  );
END;
$$;

-- 5️⃣ Insérer les configurations nécessaires
INSERT INTO system_settings (key, value, description)
VALUES
  ('supabase_url', 'https://drohhxrkoequjphvabvq.supabase.co', 'URL Supabase'),
  ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg', 'Anon Key')
ON CONFLICT (key) DO UPDATE 
  SET value = EXCLUDED.value,
      updated_at = NOW();

-- 6️⃣ Insérer la service_role_key séparément (récupération depuis secrets Supabase)
DO $$
DECLARE
  service_key TEXT;
BEGIN
  -- Essayer de récupérer depuis les secrets Supabase
  BEGIN
    service_key := current_setting('supabase.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      service_key := NULL;
  END;
  
  -- Si on a réussi à récupérer la clé, l'insérer
  IF service_key IS NOT NULL AND service_key != '' THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('supabase_service_role_key', service_key, 'Service Role Key')
    ON CONFLICT (key) DO UPDATE 
      SET value = EXCLUDED.value,
          updated_at = NOW();
  END IF;
END $$;
