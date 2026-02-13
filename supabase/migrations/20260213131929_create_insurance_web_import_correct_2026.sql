/*
  # Système d'Import Web pour Assureurs
  
  Tables pour gérer l'import automatique depuis les portails assureurs
*/

-- Table des identifiants de connexion aux assureurs
CREATE TABLE IF NOT EXISTS insurance_web_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  portal_url text NOT NULL,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  additional_credentials jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_connection_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des jobs d'import
CREATE TABLE IF NOT EXISTS web_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid REFERENCES insurance_web_credentials(id) ON DELETE CASCADE,
  client_id uuid,
  contract_number text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress_percentage integer DEFAULT 0,
  total_documents integer DEFAULT 0,
  imported_documents integer DEFAULT 0,
  error_message text,
  logs jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Table des documents importés
CREATE TABLE IF NOT EXISTS web_import_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES web_import_jobs(id) ON DELETE CASCADE,
  client_id uuid,
  document_type text NOT NULL,
  document_name text NOT NULL,
  document_date date,
  file_path text,
  file_url text,
  file_size bigint,
  mime_type text,
  extracted_data jsonb,
  source_url text,
  checksum text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'processed', 'error')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_web_credentials_company ON insurance_web_credentials(company_name);
CREATE INDEX IF NOT EXISTS idx_web_import_jobs_client ON web_import_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_web_import_jobs_status ON web_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_web_import_documents_job ON web_import_documents(job_id);

-- RLS
ALTER TABLE insurance_web_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_import_documents ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour insurance_web_credentials (utilise admin_users.id au lieu de user_id)
CREATE POLICY "Admin can view credentials"
  ON insurance_web_credentials
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "Admin can insert credentials"
  ON insurance_web_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "Admin can update credentials"
  ON insurance_web_credentials
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

CREATE POLICY "Master can delete credentials"
  ON insurance_web_credentials
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE role = 'master')
  );

-- Politiques pour web_import_jobs
CREATE POLICY "Admin can manage import jobs"
  ON web_import_jobs
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Politiques pour web_import_documents  
CREATE POLICY "Admin can view import documents"
  ON web_import_documents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Fonction pour démarrer un import
CREATE OR REPLACE FUNCTION start_web_import(
  p_credential_id uuid,
  p_client_id uuid,
  p_contract_number text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  INSERT INTO web_import_jobs (
    credential_id,
    client_id,
    contract_number,
    status,
    created_by
  ) VALUES (
    p_credential_id,
    p_client_id,
    p_contract_number,
    'pending',
    auth.uid()
  )
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;