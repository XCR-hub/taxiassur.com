/*
  # Bibliothèque Documentaire - Étape 2: Fonctions et Triggers

  ## Fonctions
  1. auto_attach_company_documents() - Attachement automatique
  2. get_lead_documents() - Récupération de tous les documents d'un lead
  3. track_document_view() - Suivi des vues
  4. track_document_download() - Suivi des téléchargements
*/

-- =====================================================
-- 1. RLS POLICIES
-- =====================================================

ALTER TABLE company_document_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on company_document_library"
  ON company_document_library FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Public can view active company documents"
  ON company_document_library FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

ALTER TABLE contract_document_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commercial can view assigned lead associations"
  ON contract_document_associations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = contract_document_associations.lead_id
      AND (
        crm_leads.assigned_to = auth.uid()
        OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
      )
    )
  );

CREATE POLICY "System can insert associations"
  ON contract_document_associations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 2. FUNCTION: Auto-attach company documents
-- =====================================================

CREATE OR REPLACE FUNCTION auto_attach_company_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attachment_type text;
BEGIN
  -- Determine attachment type
  IF TG_TABLE_NAME = 'lead_company_quotes' THEN
    v_attachment_type := 'devis';
  ELSIF TG_TABLE_NAME = 'contract_documents' THEN
    v_attachment_type := 'contrat';
  ELSE
    v_attachment_type := 'manual';
  END IF;

  -- Insert associations for mandatory documents
  INSERT INTO contract_document_associations (
    lead_id,
    company_id,
    company_document_id,
    association_type,
    attachment_trigger,
    is_sent_to_prospect
  )
  SELECT
    NEW.lead_id,
    NEW.company_id,
    cd.id,
    v_attachment_type,
    'auto_on_' || v_attachment_type,
    true
  FROM company_document_library cd
  WHERE cd.company_id = NEW.company_id
    AND cd.is_active = true
    AND cd.is_mandatory = true
    AND v_attachment_type = ANY(cd.auto_attach_on)
    AND NOT EXISTS (
      SELECT 1 FROM contract_document_associations cda
      WHERE cda.lead_id = NEW.lead_id
        AND cda.company_document_id = cd.id
    );

  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. FUNCTION: Get all documents for a lead
-- =====================================================

CREATE OR REPLACE FUNCTION get_lead_documents(p_lead_id uuid)
RETURNS TABLE (
  document_id uuid,
  document_name text,
  document_type text,
  document_category text,
  file_url text,
  file_size_bytes integer,
  source text,
  is_company_document boolean,
  company_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- Company documents
  SELECT
    cdl.id,
    cdl.document_name,
    cdl.document_type,
    cdl.document_category,
    cdl.file_url,
    cdl.file_size_bytes,
    'company_library'::text,
    true,
    ic.name,
    cda.attached_at
  FROM contract_document_associations cda
  JOIN company_document_library cdl ON cdl.id = cda.company_document_id
  JOIN insurance_companies ic ON ic.id = cda.company_id
  WHERE cda.lead_id = p_lead_id
    AND cdl.is_active = true
    AND cdl.show_in_prospect_space = true
  
  UNION ALL
  
  -- Prospect uploaded documents
  SELECT
    pd.id,
    pd.file_name,
    pd.document_type,
    CASE
      WHEN pd.document_type IN ('licence_taxi', 'permis_conduire', 'piece_identite') THEN 'identity'
      WHEN pd.document_type = 'carte_grise' THEN 'vehicle'
      WHEN pd.document_type = 'rib' THEN 'paiement'
      ELSE 'legal'
    END,
    COALESCE(pd.file_path, ''),
    pd.file_size,
    'prospect_upload'::text,
    false,
    NULL,
    pd.uploaded_at
  FROM prospect_documents pd
  WHERE pd.lead_id = p_lead_id
    AND pd.validated = true
  
  ORDER BY created_at DESC;
END;
$$;

-- =====================================================
-- 4. FUNCTION: Track document view
-- =====================================================

CREATE OR REPLACE FUNCTION track_document_view(
  p_association_id uuid,
  p_viewer_ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE contract_document_associations
  SET
    is_viewed = true,
    viewed_at = COALESCE(viewed_at, now()),
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE id = p_association_id;

  UPDATE company_document_library
  SET last_used_at = now()
  WHERE id IN (
    SELECT company_document_id
    FROM contract_document_associations
    WHERE id = p_association_id
  );
END;
$$;

-- =====================================================
-- 5. FUNCTION: Track document download
-- =====================================================

CREATE OR REPLACE FUNCTION track_document_download(
  p_association_id uuid,
  p_downloader_ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE contract_document_associations
  SET
    is_downloaded = true,
    downloaded_at = COALESCE(downloaded_at, now()),
    download_count = download_count + 1,
    last_downloaded_at = now()
  WHERE id = p_association_id;

  UPDATE company_document_library
  SET
    download_count = download_count + 1,
    last_used_at = now()
  WHERE id IN (
    SELECT company_document_id
    FROM contract_document_associations
    WHERE id = p_association_id
  );
END;
$$;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

DO $$
BEGIN
  -- Drop trigger if exists
  DROP TRIGGER IF EXISTS trigger_auto_attach_on_quote ON lead_company_quotes;
  
  -- Create trigger
  CREATE TRIGGER trigger_auto_attach_on_quote
    AFTER INSERT ON lead_company_quotes
    FOR EACH ROW
    EXECUTE FUNCTION auto_attach_company_documents();
END
$$;
