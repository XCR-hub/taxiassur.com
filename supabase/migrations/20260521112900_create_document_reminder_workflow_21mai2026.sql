/*
  # Workflow de relance automatique des documents manquants

  1. Nouvelle table
    - `document_reminder_tracking` : Suivi des relances par lead
      - `id` (uuid, PK)
      - `lead_id` (uuid, FK vers crm_leads)
      - `reminder_number` (int) - Numero de la relance (1 a 7)
      - `channel` (text) - email ou sms
      - `missing_documents` (jsonb) - Liste des documents manquants au moment de l'envoi
      - `sent_at` (timestamptz)
      - `status` (text) - sent/failed
      - `message_preview` (text) - Apercu du message envoye

  2. Calendrier de relance
    - Jours 1, 2, 3 : 1 relance/jour (email + SMS)
    - Jours 5, 7, 9, 11 : 1 relance tous les 2 jours (email + SMS)
    - Total : 7 relances sur 11 jours

  3. Security
    - RLS active
    - Policies pour les admins authentifies
*/

-- Table de suivi des relances documents
CREATE TABLE IF NOT EXISTS document_reminder_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  reminder_number integer NOT NULL DEFAULT 1,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  missing_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  message_preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les requetes frequentes
CREATE INDEX IF NOT EXISTS idx_doc_reminder_lead_id ON document_reminder_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_doc_reminder_sent_at ON document_reminder_tracking(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_reminder_lead_channel ON document_reminder_tracking(lead_id, channel, reminder_number);

-- RLS
ALTER TABLE document_reminder_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view document reminders"
  ON document_reminder_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can insert document reminders"
  ON document_reminder_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = (SELECT auth.uid())
    )
  );

-- Fonction pour determiner si un lead doit recevoir une relance
CREATE OR REPLACE FUNCTION get_leads_needing_document_reminder()
RETURNS TABLE(
  lead_id uuid,
  email text,
  phone text,
  first_name text,
  last_name text,
  access_token text,
  vehicle_type text,
  next_reminder_number integer,
  days_since_creation numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH reminder_schedule AS (
    -- Calendrier: J1, J2, J3 puis J5, J7, J9, J11
    SELECT unnest(ARRAY[1, 2, 3, 5, 7, 9, 11]) AS day_number,
           generate_series(1, 7) AS reminder_num
  ),
  lead_max_reminders AS (
    SELECT
      drt.lead_id,
      MAX(drt.reminder_number) AS max_reminder,
      MAX(drt.sent_at) FILTER (WHERE drt.channel = 'email') AS last_email_at,
      MAX(drt.sent_at) FILTER (WHERE drt.channel = 'sms') AS last_sms_at
    FROM document_reminder_tracking drt
    WHERE drt.status = 'sent'
    GROUP BY drt.lead_id
  )
  SELECT
    cl.id AS lead_id,
    cl.email,
    cl.phone,
    cl.first_name,
    cl.last_name,
    cl.access_token,
    cl.vehicle_type,
    COALESCE(lmr.max_reminder, 0) + 1 AS next_reminder_number,
    EXTRACT(EPOCH FROM (now() - COALESCE(cl.first_request_at, cl.created_at))) / 86400.0 AS days_since_creation
  FROM crm_leads cl
  LEFT JOIN lead_max_reminders lmr ON lmr.lead_id = cl.id
  WHERE
    -- Lead actif et pas encore client
    cl.status IN ('nouveau_lead', 'new', 'contacted', 'in_progress', 'documents_pending')
    -- A un email ou telephone
    AND (cl.email IS NOT NULL OR cl.phone IS NOT NULL)
    -- Documents pas encore complets
    AND (cl.documents_complete IS NULL OR cl.documents_complete = false)
    -- Pas deja a 7 relances
    AND COALESCE(lmr.max_reminder, 0) < 7
    -- Verifier le calendrier
    AND (
      CASE COALESCE(lmr.max_reminder, 0) + 1
        WHEN 1 THEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.first_request_at, cl.created_at))) / 86400.0 >= 1
        WHEN 2 THEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.first_request_at, cl.created_at))) / 86400.0 >= 2
        WHEN 3 THEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.first_request_at, cl.created_at))) / 86400.0 >= 3
        WHEN 4 THEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.first_request_at, cl.created_at))) / 86400.0 >= 5
        WHEN 5 THEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.first_request_at, cl.created_at))) / 86400.0 >= 7
        WHEN 6 THEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.first_request_at, cl.created_at))) / 86400.0 >= 9
        WHEN 7 THEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.first_request_at, cl.created_at))) / 86400.0 >= 11
        ELSE false
      END
    )
    -- Pas envoye aujourd'hui deja (eviter doublons)
    AND NOT EXISTS (
      SELECT 1 FROM document_reminder_tracking drt2
      WHERE drt2.lead_id = cl.id
        AND drt2.sent_at > now() - interval '20 hours'
        AND drt2.status = 'sent'
    )
  ORDER BY COALESCE(lmr.max_reminder, 0) ASC, cl.created_at ASC
  LIMIT 100;
END;
$$;

-- Fonction pour obtenir les documents manquants d'un lead
CREATE OR REPLACE FUNCTION get_lead_missing_documents(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_type text;
  v_required_docs text[];
  v_uploaded_docs text[];
  v_missing jsonb := '[]'::jsonb;
BEGIN
  -- Recuperer le type de vehicule
  SELECT vehicle_type INTO v_vehicle_type FROM crm_leads WHERE id = p_lead_id;

  -- Documents requis selon le type
  IF v_vehicle_type = 'vtc' THEN
    v_required_docs := ARRAY['carte_pro_vtc', 'inscription_registre_vtc', 'permis_conduire', 'carte_grise', 'carte_identite', 'rib', 'releve_information', 'kbis', 'controle_technique'];
  ELSIF v_vehicle_type = 'moto-taxi' THEN
    v_required_docs := ARRAY['licence_taxi', 'permis_conduire', 'carte_grise', 'carte_identite', 'rib', 'releve_information', 'carte_professionnelle', 'kbis', 'controle_technique'];
  ELSE
    v_required_docs := ARRAY['licence_taxi', 'permis_conduire', 'carte_grise', 'carte_identite', 'rib', 'releve_information', 'carte_professionnelle', 'autorisation_stationnement', 'kbis'];
  END IF;

  -- Documents deja uploades/valides
  SELECT COALESCE(array_agg(DISTINCT d.document_type), ARRAY[]::text[])
  INTO v_uploaded_docs
  FROM (
    SELECT document_type FROM crm_lead_documents
    WHERE lead_id = p_lead_id AND status IN ('validated', 'pending')
    UNION
    SELECT document_type FROM prospect_documents
    WHERE lead_id = p_lead_id AND status IN ('approved', 'pending')
  ) d;

  -- Construire la liste des manquants avec labels
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type', doc_type,
    'label', CASE doc_type
      WHEN 'licence_taxi' THEN 'Licence de taxi / ADS'
      WHEN 'permis_conduire' THEN 'Permis de conduire'
      WHEN 'carte_grise' THEN 'Carte grise du vehicule'
      WHEN 'carte_identite' THEN 'Carte d''identite'
      WHEN 'rib' THEN 'RIB'
      WHEN 'releve_information' THEN 'Releve d''information'
      WHEN 'carte_professionnelle' THEN 'Carte professionnelle'
      WHEN 'autorisation_stationnement' THEN 'Autorisation de stationnement'
      WHEN 'kbis' THEN 'Extrait Kbis / Statuts'
      WHEN 'carte_pro_vtc' THEN 'Carte professionnelle VTC'
      WHEN 'inscription_registre_vtc' THEN 'Inscription registre VTC'
      WHEN 'controle_technique' THEN 'Controle technique'
      ELSE doc_type
    END
  )), '[]'::jsonb)
  INTO v_missing
  FROM unnest(v_required_docs) AS doc_type
  WHERE doc_type != ALL(v_uploaded_docs);

  RETURN v_missing;
END;
$$;

-- Cron pour executer la relance documents toutes les 4 heures (8h, 12h, 16h, 20h)
SELECT cron.schedule(
  'document-reminder-workflow-8h',
  '0 8 * * *',
  $$SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/document-reminder-workflow',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"source": "cron-8h"}'::jsonb
  )$$
);

SELECT cron.schedule(
  'document-reminder-workflow-16h',
  '0 16 * * *',
  $$SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/document-reminder-workflow',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"source": "cron-16h"}'::jsonb
  )$$
);
