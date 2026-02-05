/*
  # Fonction de fusion de leads dupliqués

  1. Description
    - Fusionne plusieurs leads en un seul lead principal
    - Transfère toutes les données (interactions, documents, emails, devis)
    - Conserve l'historique complet
    - Soft delete les leads fusionnés
    - Crée un enregistrement de la fusion pour audit

  2. Fonctionnalités
    - Transfert de toutes les relations vers le lead principal
    - Fusion intelligente des métadonnées
    - Conservation de l'historique complet
    - Traçabilité complète
*/

-- Table pour l'historique des fusions
CREATE TABLE IF NOT EXISTS crm_lead_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  merged_lead_ids uuid[] NOT NULL,
  merged_by uuid REFERENCES admin_users(id),
  merged_at timestamptz DEFAULT now(),
  stats jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_merges_primary ON crm_lead_merges(primary_lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_merges_merged_at ON crm_lead_merges(merged_at);

-- RLS pour la table des fusions
ALTER TABLE crm_lead_merges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins peuvent voir les fusions"
  ON crm_lead_merges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins peuvent créer des fusions"
  ON crm_lead_merges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Fonction de fusion de leads
CREATE OR REPLACE FUNCTION merge_duplicate_leads(
  p_primary_lead_id uuid,
  p_leads_to_merge uuid[]
)
RETURNS jsonb AS $$
DECLARE
  v_merged_count int := 0;
  v_interactions_moved int := 0;
  v_documents_moved int := 0;
  v_emails_moved int := 0;
  v_quotes_moved int := 0;
  v_lead_id uuid;
  v_user_id uuid;
  v_row_count int;
BEGIN
  -- Vérifier que le lead principal existe
  IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE id = p_primary_lead_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Le lead principal n''existe pas ou est supprimé'
    );
  END IF;

  -- Récupérer l'utilisateur connecté
  v_user_id := auth.uid();

  -- Traiter chaque lead à fusionner
  FOREACH v_lead_id IN ARRAY p_leads_to_merge
  LOOP
    -- Ignorer le lead principal s'il est dans la liste
    IF v_lead_id = p_primary_lead_id THEN
      CONTINUE;
    END IF;

    -- Vérifier que le lead existe
    IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE id = v_lead_id AND deleted_at IS NULL) THEN
      CONTINUE;
    END IF;

    -- 1. Transférer les interactions
    UPDATE crm_interactions
    SET lead_id = p_primary_lead_id
    WHERE lead_id = v_lead_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_interactions_moved := v_interactions_moved + v_row_count;

    -- 2. Transférer les documents
    UPDATE crm_lead_documents
    SET lead_id = p_primary_lead_id
    WHERE lead_id = v_lead_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_documents_moved := v_documents_moved + v_row_count;

    -- 3. Transférer les emails
    UPDATE email_messages
    SET lead_id = p_primary_lead_id
    WHERE lead_id = v_lead_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_emails_moved := v_emails_moved + v_row_count;

    -- 4. Transférer les devis (supprimer les doublons d'abord)
    DELETE FROM lead_company_quotes
    WHERE lead_id = v_lead_id
      AND company_id IN (
        SELECT company_id FROM lead_company_quotes WHERE lead_id = p_primary_lead_id
      );

    UPDATE lead_company_quotes
    SET lead_id = p_primary_lead_id
    WHERE lead_id = v_lead_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_quotes_moved := v_quotes_moved + v_row_count;

    -- 5. Transférer les conversations email (si la table existe)
    BEGIN
      UPDATE email_conversations
      SET lead_id = p_primary_lead_id
      WHERE lead_id = v_lead_id;
    EXCEPTION
      WHEN undefined_table THEN NULL;
    END;

    -- 6. Transférer les pièces jointes email (si la table existe)
    BEGIN
      UPDATE email_attachments
      SET lead_id = p_primary_lead_id
      WHERE lead_id = v_lead_id;
    EXCEPTION
      WHEN undefined_table THEN NULL;
    END;

    -- 7. Soft delete le lead fusionné
    UPDATE crm_leads
    SET 
      deleted_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'merged_into', p_primary_lead_id,
        'merged_at', now(),
        'merged_by', v_user_id
      )
    WHERE id = v_lead_id;

    v_merged_count := v_merged_count + 1;
  END LOOP;

  -- Créer l'enregistrement de fusion
  INSERT INTO crm_lead_merges (
    primary_lead_id,
    merged_lead_ids,
    merged_by,
    stats
  ) VALUES (
    p_primary_lead_id,
    p_leads_to_merge,
    v_user_id,
    jsonb_build_object(
      'merged_count', v_merged_count,
      'interactions_moved', v_interactions_moved,
      'documents_moved', v_documents_moved,
      'emails_moved', v_emails_moved,
      'quotes_moved', v_quotes_moved
    )
  );

  -- Mettre à jour les métadonnées du lead principal
  UPDATE crm_leads
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'last_merge_at', now(),
    'total_merges', COALESCE((metadata->>'total_merges')::int, 0) + v_merged_count
  )
  WHERE id = p_primary_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'merged_count', v_merged_count,
    'interactions_moved', v_interactions_moved,
    'documents_moved', v_documents_moved,
    'emails_moved', v_emails_moved,
    'quotes_moved', v_quotes_moved
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
