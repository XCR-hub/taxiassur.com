/*
  # Système d'Upload de Documents Prospects

  1. Tables
    - `prospect_documents` - Documents uploadés par les prospects via leur espace
    - Extension de la table leads avec access_token

  2. Storage
    - Bucket `prospect-documents` pour les fichiers uploadés

  3. Security
    - RLS avec accès via token unique
    - Pas besoin d'authentification pour upload
*/

-- Ajouter colonne access_token à la table leads si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE leads ADD COLUMN access_token text UNIQUE;
  END IF;
END $$;

-- Générer des tokens uniques pour les leads existants
UPDATE leads
SET access_token = encode(gen_random_bytes(32), 'hex')
WHERE access_token IS NULL;

-- Fonction pour générer automatiquement un token à l'insertion
CREATE OR REPLACE FUNCTION generate_lead_access_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.access_token IS NULL THEN
    NEW.access_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger pour générer le token automatiquement
DROP TRIGGER IF EXISTS trigger_generate_lead_access_token ON leads;

CREATE TRIGGER trigger_generate_lead_access_token
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_lead_access_token();

-- Table pour les documents uploadés par les prospects
CREATE TABLE IF NOT EXISTS prospect_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  notes text,

  CONSTRAINT valid_prospect_document_type CHECK (
    document_type IN (
      'licence_taxi',
      'permis_conduire',
      'piece_identite',
      'carte_grise',
      'releve_information',
      'autre'
    )
  ),
  CONSTRAINT valid_prospect_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_prospect_documents_lead_id ON prospect_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_prospect_documents_status ON prospect_documents(status);
CREATE INDEX IF NOT EXISTS idx_prospect_documents_uploaded_at ON prospect_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_access_token ON leads(access_token);

-- Enable RLS
ALTER TABLE prospect_documents ENABLE ROW LEVEL SECURITY;

-- Policies - Accès public simplifié (la sécurité est gérée dans l'application)
CREATE POLICY "Public can manage prospect documents"
  ON prospect_documents
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction helper pour obtenir lead_id depuis token
CREATE OR REPLACE FUNCTION get_lead_id_from_token(token_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_uuid uuid;
BEGIN
  SELECT id INTO lead_uuid
  FROM leads
  WHERE access_token = token_value;

  RETURN lead_uuid;
END;
$$;

-- Créer le storage bucket pour les documents prospects
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prospect-documents',
  'prospect-documents',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Storage policies - Accès public pour upload sans auth
CREATE POLICY "Allow public upload to prospect-documents"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'prospect-documents');

CREATE POLICY "Allow public read from prospect-documents"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'prospect-documents');

CREATE POLICY "Allow authenticated update prospect-documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'prospect-documents')
  WITH CHECK (bucket_id = 'prospect-documents');

CREATE POLICY "Allow authenticated delete from prospect-documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'prospect-documents');

-- Commentaires
COMMENT ON TABLE prospect_documents IS 'Documents uploadés par les prospects via leur espace client';
COMMENT ON COLUMN leads.access_token IS 'Token unique pour accéder à l''espace prospect sans authentification';
COMMENT ON FUNCTION get_lead_id_from_token(text) IS 'Récupère le lead_id à partir du token d''accès';
COMMENT ON FUNCTION generate_lead_access_token() IS 'Génère automatiquement un token unique pour chaque lead';
