/*
  # Génération Automatique des Access Tokens

  ## Problème
  Les leads n'ont pas d'access_token généré automatiquement

  ## Solution
  1. Fonction pour générer un token SHA256
  2. Trigger pour générer le token à la création
  3. Mise à jour des leads existants sans token
*/

-- 1. Fonction de génération de token
CREATE OR REPLACE FUNCTION public.generate_lead_access_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  -- Générer un token SHA256 unique
  v_token := encode(digest(gen_random_uuid()::text || now()::text || random()::text, 'sha256'), 'hex');
  RETURN v_token;
END;
$$;

-- 2. Trigger pour générer automatiquement le token
CREATE OR REPLACE FUNCTION public.trigger_generate_lead_access_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si pas de token, en générer un
  IF NEW.access_token IS NULL OR NEW.access_token = '' THEN
    NEW.access_token := generate_lead_access_token();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS ensure_lead_access_token ON crm_leads;
CREATE TRIGGER ensure_lead_access_token
  BEFORE INSERT OR UPDATE OF access_token ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_lead_access_token();

-- 3. Générer les tokens pour les leads existants
UPDATE crm_leads
SET access_token = generate_lead_access_token()
WHERE access_token IS NULL
  AND deleted_at IS NULL;

-- Commentaires
COMMENT ON FUNCTION generate_lead_access_token IS 
'Génère un token d''accès unique SHA256 pour un lead';

COMMENT ON FUNCTION trigger_generate_lead_access_token IS 
'Trigger qui génère automatiquement un access_token si manquant';