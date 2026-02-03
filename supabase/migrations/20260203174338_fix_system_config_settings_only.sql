/*
  # Fix system_config and add settings

  1. Problème
    - La colonne value est de type jsonb au lieu de text
    - Les URLs et clés ne peuvent pas être insérées directement

  2. Solution
    - Altérer la colonne value de jsonb vers text
    - Insérer les settings nécessaires
    - Créer les fonctions helper
*/

-- Supprimer les données existantes si elles posent problème
TRUNCATE TABLE system_config;

-- Altérer le type de la colonne value
ALTER TABLE system_config
  ALTER COLUMN value TYPE text;

-- Créer ou remplacer la fonction helper pour récupérer un setting
CREATE OR REPLACE FUNCTION get_system_setting(p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value text;
BEGIN
  SELECT value INTO v_value
  FROM system_config
  WHERE key = p_key;
  
  RETURN v_value;
END;
$$;

-- Créer ou remplacer la fonction pour mettre à jour un setting
CREATE OR REPLACE FUNCTION update_system_setting(p_key text, p_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO system_config (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key)
  DO UPDATE SET value = p_value, updated_at = now();
  
  RETURN true;
END;
$$;

-- Insérer les valeurs des settings
INSERT INTO system_config (key, value, description) VALUES
  ('supabase_url', 'https://drohhxrkoequjphvabvq.supabase.co', 'URL du projet Supabase'),
  ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg', 'Clé publique Supabase'),
  ('supabase_service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik', 'Service role key (à ne jamais exposer côté client)')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

-- Créer un index si il n'existe pas
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_config_timestamp ON system_config;

CREATE TRIGGER trigger_update_system_config_timestamp
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_timestamp();