/*
  # Système de Conformité RGPD Complet

  1. Nouvelles Tables
    - `gdpr_consents` - Registre des consentements
      - `id` (uuid, PK)
      - `email` (text, indexed)
      - `lawful_basis` (text) - 'consent' ou 'legitimate_interest'
      - `purpose` (text) - Objectif du traitement
      - `collected_at` (timestamptz)
      - `collected_by` (text) - Source/canal
      - `opted_out_at` (timestamptz, nullable)
      - `opt_out_url` (text)
      - `ip_address` (inet, nullable)
      - `user_agent` (text, nullable)
      - `metadata` (jsonb) - Données additionnelles

    - `gdpr_data_requests` - Demandes DSR (Data Subject Requests)
      - `id` (uuid, PK)
      - `email` (text)
      - `request_type` (text) - 'access', 'rectification', 'erasure', 'portability', 'restriction'
      - `status` (text) - 'pending', 'processing', 'completed', 'rejected'
      - `requested_at` (timestamptz)
      - `processed_at` (timestamptz, nullable)
      - `processed_by` (text, nullable)
      - `notes` (text, nullable)
      - `exported_data` (jsonb, nullable)

    - `gdpr_data_retention` - Suivi de rétention des données
      - `id` (uuid, PK)
      - `table_name` (text)
      - `record_id` (text)
      - `data_type` (text)
      - `collected_at` (timestamptz)
      - `retention_period_days` (int) - Durée de conservation en jours
      - `expires_at` (timestamptz)
      - `auto_delete` (boolean) - Suppression automatique
      - `deleted_at` (timestamptz, nullable)

    - `gdpr_audit_log` - Journal d'audit RGPD
      - `id` (uuid, PK)
      - `event_type` (text) - Type d'événement
      - `email` (text, nullable)
      - `action` (text)
      - `performed_by` (text)
      - `ip_address` (inet, nullable)
      - `details` (jsonb)
      - `created_at` (timestamptz)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour authenticated users uniquement
    - Logging automatique des actions

  3. Automatisation
    - Fonction pour enregistrer un consentement
    - Fonction pour traiter une demande DSR
    - Fonction pour vérifier les expirations
    - Fonction pour générer un rapport de conformité
    - Cron job quotidien pour supprimer les données expirées
*/

-- Créer la table des consentements RGPD
CREATE TABLE IF NOT EXISTS gdpr_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  lawful_basis text NOT NULL CHECK (lawful_basis IN ('consent', 'legitimate_interest')),
  purpose text NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  collected_by text NOT NULL DEFAULT 'website',
  opted_out_at timestamptz,
  opt_out_url text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_consents_email ON gdpr_consents(email);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_collected_at ON gdpr_consents(collected_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_opted_out ON gdpr_consents(opted_out_at) WHERE opted_out_at IS NOT NULL;

-- Créer la table des demandes DSR
CREATE TABLE IF NOT EXISTS gdpr_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by text,
  notes text,
  exported_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_email ON gdpr_data_requests(email);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_status ON gdpr_data_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_requests_type ON gdpr_data_requests(request_type);

-- Créer la table de rétention des données
CREATE TABLE IF NOT EXISTS gdpr_data_retention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  data_type text NOT NULL,
  collected_at timestamptz NOT NULL,
  retention_period_days int NOT NULL DEFAULT 1095, -- 3 ans par défaut
  expires_at timestamptz NOT NULL,
  auto_delete boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_data_retention_expires ON gdpr_data_retention(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gdpr_data_retention_table ON gdpr_data_retention(table_name, record_id);

-- Créer la table d'audit RGPD
CREATE TABLE IF NOT EXISTS gdpr_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  email text,
  action text NOT NULL,
  performed_by text NOT NULL,
  ip_address inet,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_email ON gdpr_audit_log(email);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_type ON gdpr_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_created ON gdpr_audit_log(created_at);

-- Activer RLS
ALTER TABLE gdpr_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_data_retention ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies pour authenticated users (backoffice)
CREATE POLICY "Authenticated users can read consents"
  ON gdpr_consents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert consents"
  ON gdpr_consents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update consents"
  ON gdpr_consents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read DSR"
  ON gdpr_data_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage DSR"
  ON gdpr_data_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read retention"
  ON gdpr_data_retention FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read audit log"
  ON gdpr_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can write audit log"
  ON gdpr_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fonction pour enregistrer un consentement
CREATE OR REPLACE FUNCTION register_gdpr_consent(
  p_email text,
  p_lawful_basis text,
  p_purpose text,
  p_collected_by text DEFAULT 'website',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_consent_id uuid;
  v_opt_out_url text;
BEGIN
  -- Générer l'URL de désinscription
  v_opt_out_url := 'https://taxiassur.com/opt-out?email=' || encode(p_email::bytea, 'base64');

  -- Insérer le consentement
  INSERT INTO gdpr_consents (
    email, lawful_basis, purpose, collected_by,
    opt_out_url, ip_address, user_agent
  ) VALUES (
    p_email, p_lawful_basis, p_purpose, p_collected_by,
    v_opt_out_url, p_ip_address, p_user_agent
  ) RETURNING id INTO v_consent_id;

  -- Logger l'événement
  INSERT INTO gdpr_audit_log (
    event_type, email, action, performed_by, ip_address,
    details
  ) VALUES (
    'consent_registered', p_email, 'consent_given', p_collected_by, p_ip_address,
    jsonb_build_object(
      'consent_id', v_consent_id,
      'lawful_basis', p_lawful_basis,
      'purpose', p_purpose
    )
  );

  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour gérer l'opt-out
CREATE OR REPLACE FUNCTION process_opt_out(
  p_email text
) RETURNS boolean AS $$
BEGIN
  -- Marquer tous les consentements actifs comme opt-out
  UPDATE gdpr_consents
  SET
    opted_out_at = now(),
    updated_at = now()
  WHERE
    email = p_email
    AND opted_out_at IS NULL;

  -- Logger l'événement
  INSERT INTO gdpr_audit_log (
    event_type, email, action, performed_by,
    details
  ) VALUES (
    'opt_out', p_email, 'unsubscribed', 'user',
    jsonb_build_object('timestamp', now())
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer une demande DSR
CREATE OR REPLACE FUNCTION create_dsr_request(
  p_email text,
  p_request_type text,
  p_notes text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_request_id uuid;
BEGIN
  INSERT INTO gdpr_data_requests (
    email, request_type, notes, status
  ) VALUES (
    p_email, p_request_type, p_notes, 'pending'
  ) RETURNING id INTO v_request_id;

  -- Logger l'événement
  INSERT INTO gdpr_audit_log (
    event_type, email, action, performed_by,
    details
  ) VALUES (
    'dsr_request', p_email, p_request_type || '_requested', 'user',
    jsonb_build_object('request_id', v_request_id)
  );

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour exporter les données personnelles
CREATE OR REPLACE FUNCTION export_personal_data(
  p_email text
) RETURNS jsonb AS $$
DECLARE
  v_data jsonb;
BEGIN
  -- Collecter toutes les données de l'utilisateur
  v_data := jsonb_build_object(
    'email', p_email,
    'export_date', now(),
    'consents', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'purpose', purpose,
          'lawful_basis', lawful_basis,
          'collected_at', collected_at,
          'opted_out_at', opted_out_at
        )
      )
      FROM gdpr_consents
      WHERE email = p_email
    ),
    'leads', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'created_at', created_at,
          'status', status,
          'vehicle_type', vehicle_type
        )
      )
      FROM leads
      WHERE email = p_email
    ),
    'audit_trail', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'action', action,
          'timestamp', created_at,
          'event_type', event_type
        )
      )
      FROM gdpr_audit_log
      WHERE email = p_email
      ORDER BY created_at DESC
      LIMIT 100
    )
  );

  RETURN v_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour supprimer les données personnelles
CREATE OR REPLACE FUNCTION delete_personal_data(
  p_email text
) RETURNS boolean AS $$
BEGIN
  -- Logger avant suppression
  INSERT INTO gdpr_audit_log (
    event_type, email, action, performed_by,
    details
  ) VALUES (
    'data_erasure', p_email, 'all_data_deleted', 'system',
    jsonb_build_object('timestamp', now())
  );

  -- Supprimer ou anonymiser les données
  DELETE FROM gdpr_consents WHERE email = p_email;
  DELETE FROM leads WHERE email = p_email;
  UPDATE gdpr_data_requests SET email = 'deleted@taxiassur.com' WHERE email = p_email;

  -- Marquer dans les logs (garder pour conformité)
  UPDATE gdpr_audit_log
  SET email = 'deleted@taxiassur.com'
  WHERE email = p_email;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour nettoyer les données expirées
CREATE OR REPLACE FUNCTION cleanup_expired_data() RETURNS int AS $$
DECLARE
  v_deleted_count int := 0;
  v_record record;
BEGIN
  -- Traiter chaque enregistrement expiré avec auto_delete
  FOR v_record IN
    SELECT * FROM gdpr_data_retention
    WHERE expires_at < now()
    AND auto_delete = true
    AND deleted_at IS NULL
  LOOP
    -- Exécuter la suppression selon la table
    CASE v_record.table_name
      WHEN 'leads' THEN
        DELETE FROM leads WHERE id::text = v_record.record_id;
      WHEN 'gdpr_consents' THEN
        DELETE FROM gdpr_consents WHERE id::text = v_record.record_id;
    END CASE;

    -- Marquer comme supprimé
    UPDATE gdpr_data_retention
    SET deleted_at = now()
    WHERE id = v_record.id;

    v_deleted_count := v_deleted_count + 1;
  END LOOP;

  -- Logger le nettoyage
  IF v_deleted_count > 0 THEN
    INSERT INTO gdpr_audit_log (
      event_type, action, performed_by,
      details
    ) VALUES (
      'auto_cleanup', 'expired_data_deleted', 'cron',
      jsonb_build_object('deleted_count', v_deleted_count)
    );
  END IF;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer un rapport de conformité
CREATE OR REPLACE FUNCTION generate_compliance_report() RETURNS jsonb AS $$
DECLARE
  v_report jsonb;
BEGIN
  v_report := jsonb_build_object(
    'generated_at', now(),
    'total_consents', (SELECT COUNT(*) FROM gdpr_consents),
    'active_consents', (SELECT COUNT(*) FROM gdpr_consents WHERE opted_out_at IS NULL),
    'opt_outs', (SELECT COUNT(*) FROM gdpr_consents WHERE opted_out_at IS NOT NULL),
    'pending_requests', (SELECT COUNT(*) FROM gdpr_data_requests WHERE status = 'pending'),
    'completed_requests', (SELECT COUNT(*) FROM gdpr_data_requests WHERE status = 'completed'),
    'expired_records', (
      SELECT COUNT(*) FROM gdpr_data_retention
      WHERE expires_at < now() AND deleted_at IS NULL
    ),
    'recent_activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'event', event_type,
          'action', action,
          'timestamp', created_at
        )
      )
      FROM (
        SELECT * FROM gdpr_audit_log
        ORDER BY created_at DESC
        LIMIT 20
      ) recent
    ),
    'lawful_basis_breakdown', (
      SELECT jsonb_object_agg(
        lawful_basis,
        count
      )
      FROM (
        SELECT lawful_basis, COUNT(*) as count
        FROM gdpr_consents
        WHERE opted_out_at IS NULL
        GROUP BY lawful_basis
      ) breakdown
    )
  );

  RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job pour nettoyage quotidien à 2h du matin
SELECT cron.schedule(
  'gdpr-cleanup-expired-data',
  '0 2 * * *',
  $$ SELECT cleanup_expired_data(); $$
);

-- Insérer des données de démonstration
DO $$
BEGIN
  -- Enregistrer quelques consentements de test
  PERFORM register_gdpr_consent(
    'contact@taxiparisien.fr',
    'legitimate_interest',
    'B2B prospection taxi insurance',
    'website'
  );

  PERFORM register_gdpr_consent(
    'info@flotte-taxis-lyon.fr',
    'legitimate_interest',
    'B2B prospection taxi insurance',
    'partner_finder'
  );

  PERFORM register_gdpr_consent(
    'client@email.com',
    'consent',
    'Newsletter and marketing communications',
    'website'
  );
END $$;