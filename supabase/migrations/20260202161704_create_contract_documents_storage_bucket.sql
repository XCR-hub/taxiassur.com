/*
  # Bucket de stockage pour documents de contrat

  1. Bucket
    - Création du bucket `contract-documents`
    - Accès public en lecture
    - Upload authentifié uniquement

  2. Policies
    - Upload: authentifié seulement
    - Lecture: public
*/

-- Créer le bucket pour les documents de contrat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Upload réservé aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload contract documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contract-documents');

-- Policy: Lecture publique
CREATE POLICY "Public can view contract documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'contract-documents');

-- Policy: Mise à jour réservée aux authentifiés
CREATE POLICY "Authenticated users can update contract documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contract-documents')
  WITH CHECK (bucket_id = 'contract-documents');

-- Policy: Suppression réservée aux authentifiés
CREATE POLICY "Authenticated users can delete contract documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contract-documents');
