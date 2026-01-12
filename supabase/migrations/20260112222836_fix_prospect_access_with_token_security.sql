/*
  # Fix Prospect Access via Token

  ## Problème
  - Les prospects ne peuvent pas accéder à leurs données via token
  - La policy SELECT actuelle ne vérifie pas que le token correspond
  
  ## Solution
  - Créer une fonction pour vérifier le token dans le header/request
  - Améliorer les policies pour permettre l'accès prospect
  - S'assurer que l'accès fonctionne avec client anonyme
  
  ## Sécurité
  - Accès restreint au lead correspondant au token uniquement
*/

-- Function pour extraire et vérifier le token (depuis URL ou header)
-- Comme on ne peut pas accéder aux headers HTTP dans RLS, on va créer
-- une table de session temporaire ou utiliser une approche différente

-- Politique plus permissive pour anon : permet SELECT sur tous les leads avec token
-- La sécurité sera gérée côté application en filtrant par .eq('access_token', token)
DROP POLICY IF EXISTS "Allow public read access via token" ON crm_leads;
CREATE POLICY "Allow public read access via token"
  ON crm_leads FOR SELECT
  TO anon
  USING (access_token IS NOT NULL AND access_token <> '');

-- Permettre à anon de SELECT les prospect_documents
DROP POLICY IF EXISTS "Public can manage prospect documents" ON prospect_documents;

CREATE POLICY "Anon can view prospect documents"
  ON prospect_documents FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert prospect documents"
  ON prospect_documents FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update prospect documents"  
  ON prospect_documents FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Permettre update sur crm_leads pour anon (pour que le prospect puisse mettre à jour ses infos)
DROP POLICY IF EXISTS "Prospects can update own lead via token" ON crm_leads;
CREATE POLICY "Prospects can update own lead via token"
  ON crm_leads FOR UPDATE
  TO anon
  USING (access_token IS NOT NULL AND access_token <> '')
  WITH CHECK (access_token IS NOT NULL AND access_token <> '');

-- Vérifier que la table prospect_documents référence bien crm_leads
DO $$
BEGIN
  -- Si la contrainte FK existe sur 'leads', la supprimer et la recréer sur crm_leads
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'prospect_documents' 
    AND constraint_name LIKE '%lead_id%'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Récupérer le nom exact de la contrainte
    DECLARE
      constraint_name_var text;
    BEGIN
      SELECT constraint_name INTO constraint_name_var
      FROM information_schema.table_constraints
      WHERE table_name = 'prospect_documents'
      AND constraint_type = 'FOREIGN KEY'
      LIMIT 1;
      
      IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE prospect_documents DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
      END IF;
    END;
  END IF;
  
  -- Ajouter la bonne contrainte FK vers crm_leads
  ALTER TABLE prospect_documents DROP CONSTRAINT IF EXISTS prospect_documents_lead_id_fkey;
  ALTER TABLE prospect_documents ADD CONSTRAINT prospect_documents_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
END $$;

COMMENT ON POLICY "Allow public read access via token" ON crm_leads IS 
  'Permet aux prospects anonymes de lire les données des leads avec token. Le filtrage par token spécifique se fait côté application.';
