/*
  # Ajouter automatiquement download_url aux documents

  1. Fonction trigger
    - Ajoute automatiquement le download_url dans metadata lors de l'insertion
    - Détecte automatiquement le bucket (email-attachments ou prospect-documents)
    - Basé sur le préfixe du file_path
  
  2. Trigger
    - S'exécute BEFORE INSERT sur prospect_documents
    - Complète les metadata avec l'URL publique
*/

-- Fonction pour ajouter automatiquement le download_url
CREATE OR REPLACE FUNCTION auto_add_download_url()
RETURNS TRIGGER AS $$
DECLARE
  v_bucket TEXT;
  v_url TEXT;
BEGIN
  -- Détecter le bucket basé sur le file_path
  IF NEW.file_path LIKE '00000000-0000-0000-0000-000000000001/%' THEN
    v_bucket := 'email-attachments';
  ELSE
    v_bucket := 'prospect-documents';
  END IF;

  -- Construire l'URL publique
  v_url := 'https://drohhxrkoequjphvabvq.supabase.co/storage/v1/object/public/' || v_bucket || '/' || NEW.file_path;

  -- Ajouter l'URL dans metadata
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object('download_url', v_url);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS auto_add_download_url_trigger ON prospect_documents;
CREATE TRIGGER auto_add_download_url_trigger
  BEFORE INSERT ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_download_url();
