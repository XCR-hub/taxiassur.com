/*
  # Table des demandes de signature électronique (EDI Signature)

  1. Nouvelle Table
    - `signature_requests`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key vers leads)
      - `edi_request_id` (text, ID unique EDI Signature)
      - `status` (text, statut de la signature)
      - `title` (text, titre du document)
      - `document_url` (text, URL du document original)
      - `signature_url` (text, URL de signature pour le client)
      - `signed_document_url` (text, URL du document signé)
      - `viewed_at` (timestamptz, date de consultation)
      - `signed_at` (timestamptz, date de signature)
      - `completed_at` (timestamptz, date de complétion)
      - `expired_at` (timestamptz, date d'expiration)
      - `declined_at` (timestamptz, date de refus)
      - `decline_reason` (text, raison du refus)
      - `created_at` (timestamptz, date de création)
      - `updated_at` (timestamptz, date de mise à jour)

  2. Sécurité
    - Enable RLS sur `signature_requests`
    - Policies pour lecture/écriture authentifiée
*/

-- Créer la table signature_requests si elle n'existe pas
CREATE TABLE IF NOT EXISTS signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  edi_request_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  title text NOT NULL,
  document_url text,
  signature_url text,
  signed_document_url text,
  viewed_at timestamptz,
  signed_at timestamptz,
  completed_at timestamptz,
  expired_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_signature_requests_lead_id
  ON signature_requests(lead_id);

CREATE INDEX IF NOT EXISTS idx_signature_requests_edi_request_id
  ON signature_requests(edi_request_id);

CREATE INDEX IF NOT EXISTS idx_signature_requests_status
  ON signature_requests(status);

CREATE INDEX IF NOT EXISTS idx_signature_requests_created_at
  ON signature_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all signature requests
DROP POLICY IF EXISTS "Authenticated users can read signature requests" ON signature_requests;
CREATE POLICY "Authenticated users can read signature requests"
  ON signature_requests FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert signature requests
DROP POLICY IF EXISTS "Authenticated users can insert signature requests" ON signature_requests;
CREATE POLICY "Authenticated users can insert signature requests"
  ON signature_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update signature requests
DROP POLICY IF EXISTS "Authenticated users can update signature requests" ON signature_requests;
CREATE POLICY "Authenticated users can update signature requests"
  ON signature_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete signature requests
DROP POLICY IF EXISTS "Authenticated users can delete signature requests" ON signature_requests;
CREATE POLICY "Authenticated users can delete signature requests"
  ON signature_requests FOR DELETE
  TO authenticated
  USING (true);

-- Function pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_signature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS signature_requests_updated_at ON signature_requests;
CREATE TRIGGER signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_requests_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE signature_requests IS 'Demandes de signature électronique via EDI Signature';
COMMENT ON COLUMN signature_requests.edi_request_id IS 'ID unique de la demande dans EDI Signature';
COMMENT ON COLUMN signature_requests.status IS 'Statut: pending, viewed, signed, completed, declined, expired, cancelled';
COMMENT ON COLUMN signature_requests.signature_url IS 'URL unique pour que le client signe le document';
COMMENT ON COLUMN signature_requests.signed_document_url IS 'URL du document signé final';
