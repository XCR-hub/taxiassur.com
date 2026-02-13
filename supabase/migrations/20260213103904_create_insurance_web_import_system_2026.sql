/*
  # Système d'Import Web pour Assureurs
  
  1. Tables
    - insurance_web_credentials: Identifiants de connexion aux portails assureurs
    - web_import_jobs: Historique des imports
    - web_import_documents: Documents récupérés
    
  2. Sécurité
    - Chiffrement des identifiants
    - RLS pour admin uniquement
    - Logs d'audit
*/

-- Table des identifiants de connexion aux assureurs
CREATE TABLE IF NOT EXISTS insurance_web_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL, -- solly_azar, generali, 2ma, zephir, plus_simple
  portal_url text NOT NULL,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  additional_credentials jsonb, -- Pour 2FA, token, etc.
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_connection_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des jobs d'import
CREATE TABLE IF NOT EXISTS web_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid REFERENCES insurance_web_credentials(id) ON DELETE CASCADE,
  client_id uuid REFERENCES crm_clients(id) ON DELETE CASCADE,
  contract_number text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress_percentage integer DEFAULT 0,
  total_documents integer DEFAULT 0,
  imported_documents integer DEFAULT 0,
  total_data_fields integer DEFAULT 0,
  imported_data_fields integer DEFAULT 0,
  error_message text,
  logs jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Table des documents importés
CREATE TABLE IF NOT EXISTS web_import_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES web_import_jobs(id) ON DELETE CASCADE,
  client_id uuid REFERENCES crm_clients(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- contrat, attestation, avenant, facture, sinistre
  document_name text NOT NULL,
  document_date date,
  file_path text,
  file_url text,
  file_size bigint,
  mime_type text,
  extracted_data jsonb, -- Données extraites du document
  source_url text, -- URL d'origine sur le portail assureur
  checksum text, -- Pour détecter les doublons
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'processed', 'error')),
  created_at timestamptz DEFAULT now()
);

-- Table des données importées (informations contrat, sinistres, etc.)
CREATE TABLE IF NOT EXISTS web_import_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES web_import_jobs(id) ON DELETE CASCADE,
  client_id uuid REFERENCES crm_clients(id) ON DELETE CASCADE,
  data_type text NOT NULL, -- contract_info, vehicle_info, payment_info, claim_info
  field_name text NOT NULL,
  field_value text,
  field_date date,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_web_credentials_company ON insurance_web_credentials(company_name);
CREATE INDEX IF NOT EXISTS idx_web_import_jobs_client ON web_import_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_web_import_jobs_status ON web_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_web_import_documents_job ON web_import_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_web_import_documents_client ON web_import_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_web_import_documents_checksum ON web_import_documents(checksum);
CREATE INDEX IF NOT EXISTS idx_web_import_data_job ON web_import_data(job_id);
CREATE INDEX IF NOT EXISTS idx_web_import_data_client ON web_import_data(client_id);

-- RLS
ALTER TABLE insurance_web_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_import_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_import_data ENABLE ROW LEVEL SECURITY;

-- Policies (Admin uniquement)
CREATE POLICY "Admin can manage credentials"
  ON insurance_web_credentials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role IN ('master', 'admin')
    )
  );

CREATE POLICY "Admin can manage import jobs"
  ON web_import_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view import documents"
  ON web_import_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view import data"
  ON web_import_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
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
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  -- Créer le job
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
  
  -- Appeler l'edge function de façon asynchrone
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/web-import-executor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'job_id', v_job_id
    )
  );
  
  RETURN v_job_id;
END;
$$;

-- Fonction pour mettre à jour la progression
CREATE OR REPLACE FUNCTION update_import_progress(
  p_job_id uuid,
  p_progress integer,
  p_log_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE web_import_jobs
  SET 
    progress_percentage = p_progress,
    logs = CASE
      WHEN p_log_message IS NOT NULL THEN
        logs || jsonb_build_object(
          'timestamp', now(),
          'message', p_log_message
        )
      ELSE logs
    END,
    updated_at = now()
  WHERE id = p_job_id;
END;
$$;

-- Fonction pour marquer un job comme complété
CREATE OR REPLACE FUNCTION complete_import_job(
  p_job_id uuid,
  p_success boolean,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE web_import_jobs
  SET 
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    error_message = p_error_message,
    completed_at = now(),
    progress_percentage = 100
  WHERE id = p_job_id;
END;
$$;

-- Trigger pour updated_at
CREATE TRIGGER update_insurance_web_credentials_updated_at
  BEFORE UPDATE ON insurance_web_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
