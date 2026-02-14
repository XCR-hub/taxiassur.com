/*
  # Système de Fusion des Leads Dupliqués - 14 Février 2026

  1. Tables
    - `lead_merge_log` : Historique des fusions de leads

  2. Fonctions
    - `find_duplicate_leads()` : Trouve les emails avec plusieurs leads
    - `merge_two_leads()` : Fusionne 2 leads en gardant le maximum d'infos
    - `merge_all_duplicates_for_email()` : Fusionne tous les doublons d'un email
    - `auto_merge_all_duplicates()` : Fusionne automatiquement tous les doublons

  3. Sécurité
    - RLS activé sur lead_merge_log
    - Policies pour authenticated users
    - Audit complet de toutes les fusions

  4. Notes
    - Garde le lead avec le plus d'informations remplies
    - Consolide tous les documents et interactions
    - Conserve l'historique complet dans lead_merge_log
*/

-- Table de log des fusions
CREATE TABLE IF NOT EXISTS lead_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE SET NULL,
  merged_lead_ids uuid[] NOT NULL,
  merged_leads_data jsonb NOT NULL,
  merge_reason text DEFAULT 'duplicate_email',
  fields_merged jsonb,
  documents_count integer DEFAULT 0,
  interactions_count integer DEFAULT 0,
  merged_by uuid REFERENCES auth.users(id),
  merged_at timestamptz DEFAULT now(),
  CONSTRAINT valid_merged_ids CHECK (array_length(merged_lead_ids, 1) >= 1)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_lead_merge_log_master ON lead_merge_log(master_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_merge_log_merged_at ON lead_merge_log(merged_at DESC);

-- RLS sur lead_merge_log
ALTER TABLE lead_merge_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view merge logs" ON lead_merge_log;
CREATE POLICY "Authenticated users can view merge logs"
  ON lead_merge_log FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create merge logs" ON lead_merge_log;
CREATE POLICY "Authenticated users can create merge logs"
  ON lead_merge_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fonction pour trouver les emails avec doublons
CREATE OR REPLACE FUNCTION find_duplicate_leads()
RETURNS TABLE (
  email text,
  lead_count bigint,
  lead_ids uuid[],
  oldest_created_at timestamptz,
  newest_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.email,
    COUNT(*)::bigint as lead_count,
    array_agg(cl.id ORDER BY cl.created_at) as lead_ids,
    MIN(cl.created_at) as oldest_created_at,
    MAX(cl.created_at) as newest_created_at
  FROM crm_leads cl
  WHERE cl.email IS NOT NULL
    AND cl.email != ''
    AND cl.status != 'archived'
  GROUP BY cl.email
  HAVING COUNT(*) > 1
  ORDER BY lead_count DESC, cl.email;
END;
$$;

-- Fonction pour compter les champs remplis d'un lead
CREATE OR REPLACE FUNCTION count_filled_fields(lead_record crm_leads)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  filled_count integer := 0;
BEGIN
  IF lead_record.first_name IS NOT NULL AND lead_record.first_name != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.last_name IS NOT NULL AND lead_record.last_name != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.email IS NOT NULL AND lead_record.email != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.phone IS NOT NULL AND lead_record.phone != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.city IS NOT NULL AND lead_record.city != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.postal_code IS NOT NULL AND lead_record.postal_code != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.status IS NOT NULL THEN filled_count := filled_count + 1; END IF;
  IF lead_record.vehicle_type IS NOT NULL AND lead_record.vehicle_type != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.immatriculation IS NOT NULL AND lead_record.immatriculation != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.siret IS NOT NULL AND lead_record.siret != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.company_name IS NOT NULL AND lead_record.company_name != '' THEN filled_count := filled_count + 1; END IF;
  IF lead_record.notes IS NOT NULL AND lead_record.notes != '' THEN filled_count := filled_count + 1; END IF;

  RETURN filled_count;
END;
$$;

-- Fonction pour fusionner 2 leads intelligemment
CREATE OR REPLACE FUNCTION merge_two_leads(
  p_lead1_id uuid,
  p_lead2_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead1 crm_leads;
  v_lead2 crm_leads;
  v_master_id uuid;
  v_duplicate_id uuid;
  v_filled1 integer;
  v_filled2 integer;
  v_merged_data jsonb;
  v_fields_merged jsonb := '[]'::jsonb;
  v_docs_count integer := 0;
  v_interactions_count integer := 0;
BEGIN
  -- Récupérer les 2 leads
  SELECT * INTO v_lead1 FROM crm_leads WHERE id = p_lead1_id;
  SELECT * INTO v_lead2 FROM crm_leads WHERE id = p_lead2_id;

  IF v_lead1 IS NULL OR v_lead2 IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Un ou plusieurs leads introuvables');
  END IF;

  IF v_lead1.email != v_lead2.email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Les emails ne correspondent pas');
  END IF;

  -- Déterminer le master (celui avec le plus de champs remplis)
  v_filled1 := count_filled_fields(v_lead1);
  v_filled2 := count_filled_fields(v_lead2);

  IF v_filled1 >= v_filled2 THEN
    v_master_id := p_lead1_id;
    v_duplicate_id := p_lead2_id;
  ELSE
    v_master_id := p_lead2_id;
    v_duplicate_id := p_lead1_id;
    v_lead1 := v_lead2;
    SELECT * INTO v_lead2 FROM crm_leads WHERE id = v_duplicate_id;
  END IF;

  -- Fusionner les champs
  UPDATE crm_leads SET
    first_name = COALESCE(NULLIF(first_name, ''), v_lead2.first_name, first_name),
    last_name = COALESCE(NULLIF(last_name, ''), v_lead2.last_name, last_name),
    phone = COALESCE(NULLIF(phone, ''), v_lead2.phone, phone),
    city = COALESCE(NULLIF(city, ''), v_lead2.city, city),
    postal_code = COALESCE(NULLIF(postal_code, ''), v_lead2.postal_code, postal_code),
    vehicle_type = COALESCE(NULLIF(vehicle_type, ''), v_lead2.vehicle_type, vehicle_type),
    immatriculation = COALESCE(NULLIF(immatriculation, ''), v_lead2.immatriculation, immatriculation),
    siret = COALESCE(NULLIF(siret, ''), v_lead2.siret, siret),
    company_name = COALESCE(NULLIF(company_name, ''), v_lead2.company_name, company_name),
    notes = CASE
      WHEN notes IS NULL OR notes = '' THEN v_lead2.notes
      WHEN v_lead2.notes IS NOT NULL AND v_lead2.notes != '' THEN notes || E'\n\n--- Fusionné ---\n' || v_lead2.notes
      ELSE notes
    END,
    updated_at = now()
  WHERE id = v_master_id;

  -- Transférer tous les documents
  UPDATE crm_lead_documents SET lead_id = v_master_id WHERE lead_id = v_duplicate_id;
  GET DIAGNOSTICS v_docs_count = ROW_COUNT;

  -- Transférer toutes les interactions
  UPDATE crm_interactions SET lead_id = v_master_id WHERE lead_id = v_duplicate_id;
  GET DIAGNOSTICS v_interactions_count = ROW_COUNT;

  -- Transférer les devis
  UPDATE lead_company_quotes SET lead_id = v_master_id WHERE lead_id = v_duplicate_id;

  -- Transférer les contrats
  UPDATE lead_contracts SET lead_id = v_master_id WHERE lead_id = v_duplicate_id;

  -- Transférer les paiements
  UPDATE monetico_payment_tracking SET lead_id = v_master_id WHERE lead_id = v_duplicate_id;

  -- Transférer les messages emails
  UPDATE email_messages SET lead_id = v_master_id WHERE lead_id = v_duplicate_id;

  -- Sauvegarder les données du lead supprimé
  v_merged_data := to_jsonb(v_lead2);

  -- Archiver le duplicate
  UPDATE crm_leads SET
    status = 'archived',
    notes = COALESCE(notes, '') || E'\n\n--- FUSIONNÉ avec lead ' || v_master_id::text || ' le ' || now()::text || ' ---',
    updated_at = now()
  WHERE id = v_duplicate_id;

  -- Logger la fusion
  INSERT INTO lead_merge_log (
    master_lead_id, merged_lead_ids, merged_leads_data, merge_reason,
    fields_merged, documents_count, interactions_count, merged_by
  ) VALUES (
    v_master_id, ARRAY[v_duplicate_id], jsonb_build_object(v_duplicate_id::text, v_merged_data),
    'duplicate_email', v_fields_merged, v_docs_count, v_interactions_count, auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true, 'master_id', v_master_id, 'merged_id', v_duplicate_id,
    'documents_moved', v_docs_count, 'interactions_moved', v_interactions_count
  );
END;
$$;

-- Fonction pour fusionner tous les doublons d'un email
CREATE OR REPLACE FUNCTION merge_all_duplicates_for_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_ids uuid[];
  v_master_id uuid;
  v_duplicate_id uuid;
  v_merge_result jsonb;
  v_total_merged integer := 0;
  v_total_docs integer := 0;
  v_total_interactions integer := 0;
BEGIN
  SELECT array_agg(id ORDER BY created_at)
  INTO v_lead_ids
  FROM crm_leads
  WHERE email = p_email AND status != 'archived';

  IF v_lead_ids IS NULL OR array_length(v_lead_ids, 1) <= 1 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Aucun doublon à fusionner', 'leads_merged', 0);
  END IF;

  v_master_id := v_lead_ids[1];

  FOR i IN 2..array_length(v_lead_ids, 1) LOOP
    v_duplicate_id := v_lead_ids[i];
    v_merge_result := merge_two_leads(v_master_id, v_duplicate_id);

    IF (v_merge_result->>'success')::boolean THEN
      v_total_merged := v_total_merged + 1;
      v_total_docs := v_total_docs + (v_merge_result->>'documents_moved')::integer;
      v_total_interactions := v_total_interactions + (v_merge_result->>'interactions_moved')::integer;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'master_id', v_master_id, 'leads_merged', v_total_merged,
    'total_documents', v_total_docs, 'total_interactions', v_total_interactions
  );
END;
$$;

-- Fonction pour fusionner automatiquement TOUS les doublons
CREATE OR REPLACE FUNCTION auto_merge_all_duplicates()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_duplicate_email text;
  v_merge_result jsonb;
  v_total_emails integer := 0;
  v_total_leads_merged integer := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_duplicate_email IN
    SELECT email
    FROM crm_leads
    WHERE email IS NOT NULL AND email != '' AND status != 'archived'
    GROUP BY email
    HAVING COUNT(*) > 1
  LOOP
    v_merge_result := merge_all_duplicates_for_email(v_duplicate_email);

    IF (v_merge_result->>'success')::boolean THEN
      v_total_emails := v_total_emails + 1;
      v_total_leads_merged := v_total_leads_merged + (v_merge_result->>'leads_merged')::integer;
      v_results := v_results || jsonb_build_object('email', v_duplicate_email, 'result', v_merge_result);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'emails_processed', v_total_emails,
    'total_leads_merged', v_total_leads_merged, 'details', v_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION find_duplicate_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION count_filled_fields(crm_leads) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_two_leads(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_all_duplicates_for_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_merge_all_duplicates() TO authenticated;

COMMENT ON TABLE lead_merge_log IS 'Historique complet des fusions de leads dupliqués avec audit trail';
COMMENT ON FUNCTION find_duplicate_leads() IS 'Trouve tous les emails ayant plusieurs leads';
COMMENT ON FUNCTION merge_two_leads(uuid, uuid) IS 'Fusionne intelligemment 2 leads en gardant le maximum d''informations';
COMMENT ON FUNCTION merge_all_duplicates_for_email(text) IS 'Fusionne tous les doublons d''un email donné';
COMMENT ON FUNCTION auto_merge_all_duplicates() IS 'Lance la fusion automatique de TOUS les doublons dans la base';
