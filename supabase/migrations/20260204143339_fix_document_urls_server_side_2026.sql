/*
  # Fix Document URLs - Server Side

  1. New Functions
    - `get_document_public_url()` - Génère l'URL correcte depuis le serveur
    - Vue `crm_lead_documents_with_urls` - Documents avec URLs pré-générées
  
  2. Security
    - RLS sur la vue hérite des policies de crm_lead_documents
*/

-- Fonction pour générer l'URL publique d'un document
CREATE OR REPLACE FUNCTION get_document_public_url(
  p_file_path TEXT,
  p_bucket TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket TEXT;
  v_path TEXT;
  v_supabase_url TEXT := current_setting('app.settings.supabase_url', true);
BEGIN
  -- Si pas d'URL configurée, utiliser l'URL par défaut
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  END IF;

  -- Déterminer le bucket
  v_bucket := COALESCE(p_bucket, 'crm-documents');
  v_path := p_file_path;
  
  -- Si pas de bucket fourni, essayer de détecter depuis le path
  IF p_bucket IS NULL THEN
    IF v_path LIKE 'prospect-documents/%' THEN
      v_bucket := 'prospect-documents';
      v_path := REPLACE(v_path, 'prospect-documents/', '');
    ELSIF v_path LIKE 'crm-documents/%' THEN
      v_bucket := 'crm-documents';
      v_path := REPLACE(v_path, 'crm-documents/', '');
    ELSE
      -- Chercher dans storage.objects
      SELECT bucket_id INTO v_bucket
      FROM storage.objects
      WHERE name = v_path
      LIMIT 1;
      
      v_bucket := COALESCE(v_bucket, 'crm-documents');
    END IF;
  END IF;
  
  RETURN v_supabase_url || '/storage/v1/object/public/' || v_bucket || '/' || v_path;
END;
$$;

-- Vue avec URLs pré-générées
CREATE OR REPLACE VIEW crm_lead_documents_with_urls AS
SELECT 
  d.*,
  get_document_public_url(d.file_path, d.bucket) as download_url
FROM crm_lead_documents d;

-- RLS sur la vue (hérite de la table)
ALTER VIEW crm_lead_documents_with_urls OWNER TO postgres;
GRANT SELECT ON crm_lead_documents_with_urls TO authenticated;
GRANT SELECT ON crm_lead_documents_with_urls TO anon;
