/*
  # Fix système complet - Drop et recréation
  
  ## Actions
  1. Supprimer les anciennes fonctions
  2. Recréer avec les bonnes signatures
  3. Ajouter les colonnes manquantes
  4. Créer les permissions commerciaux
*/

-- ============================================
-- DROP ANCIENNES FONCTIONS
-- ============================================

DROP FUNCTION IF EXISTS public.get_lead_by_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.create_commercial_default_permissions(uuid) CASCADE;

-- ============================================
-- COLONNES MANQUANTES
-- ============================================

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS payment_completed_at timestamptz;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS contract_pdf_url text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS attestation_pdf_url text;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS converted_to_client boolean DEFAULT false;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS client_since timestamptz;

-- ============================================
-- TABLE PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type text NOT NULL,
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_create boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, permission_type)
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all permissions" ON user_permissions;
CREATE POLICY "Admins can manage all permissions"
  ON user_permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid() AND au.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- FONCTION : DEVIS (TOUS, MÊME SANS PDF)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  company_id uuid,
  company_name text,
  company_logo_url text,
  quote_file_url text,
  quote_amount numeric,
  status text,
  submitted_at timestamptz,
  last_sent_at timestamptz,
  quote_accepted_at timestamptz,
  refusal_reason text,
  created_at timestamptz,
  updated_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token
    AND (cl.deleted_at IS NULL OR cl.deleted_at > NOW())
    AND (cl.archived_at IS NULL OR cl.archived_at > NOW())
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Retourner TOUS les devis
  RETURN QUERY
  SELECT 
    lcq.id,
    lcq.lead_id,
    lcq.insurance_company_id as company_id,
    COALESCE(ic.name, '') as company_name,
    COALESCE(ic.logo_url, '') as company_logo_url,
    COALESCE(lcq.quote_pdf_url, '') as quote_file_url,
    lcq.quote_amount,
    COALESCE(lcq.quote_status, 'pending') as status,
    lcq.sent_at as submitted_at,
    lcq.last_sent_at,
    lcq.quote_accepted_at,
    lcq.refusal_reason,
    lcq.created_at,
    lcq.updated_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.lead_id = v_lead_id
    AND (lcq.deleted_at IS NULL OR lcq.deleted_at > NOW())
  ORDER BY lcq.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;

-- ============================================
-- FONCTION : GET LEAD BY TOKEN
-- ============================================

CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  company_name text,
  siret text,
  status text,
  pipeline_stage text,
  documents_complete boolean,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  converted_to_client boolean,
  client_since timestamptz,
  selected_company_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.first_name,
    cl.last_name,
    cl.email,
    cl.phone,
    cl.address,
    cl.postal_code,
    cl.city,
    cl.company_name,
    cl.siret,
    cl.status,
    cl.pipeline_stage,
    COALESCE(
      (SELECT COUNT(*) FILTER (WHERE validated = true) = COUNT(*) 
       FROM crm_lead_documents d 
       WHERE d.lead_id = cl.id 
         AND d.deleted_at IS NULL),
      false
    ) as documents_complete,
    (SELECT lcq.quote_amount 
     FROM lead_company_quotes lcq 
     WHERE lcq.lead_id = cl.id 
       AND lcq.quote_status = 'validated' 
       AND (lcq.deleted_at IS NULL OR lcq.deleted_at > NOW())
     ORDER BY lcq.quote_accepted_at DESC 
     LIMIT 1
    ) as quote_amount,
    (SELECT lcq.quote_accepted_at 
     FROM lead_company_quotes lcq 
     WHERE lcq.lead_id = cl.id 
       AND lcq.quote_status = 'validated' 
       AND (lcq.deleted_at IS NULL OR lcq.deleted_at > NOW())
     ORDER BY lcq.quote_accepted_at DESC 
     LIMIT 1
    ) as quote_accepted_at,
    cl.contract_signed_at,
    cl.payment_completed_at,
    cl.contract_pdf_url,
    cl.attestation_pdf_url,
    COALESCE(cl.converted_to_client, false) as converted_to_client,
    cl.client_since,
    (SELECT lcq.insurance_company_id 
     FROM lead_company_quotes lcq 
     WHERE lcq.lead_id = cl.id 
       AND lcq.quote_status = 'validated' 
       AND (lcq.deleted_at IS NULL OR lcq.deleted_at > NOW())
     ORDER BY lcq.quote_accepted_at DESC 
     LIMIT 1
    ) as selected_company_id,
    cl.created_at,
    cl.updated_at
  FROM crm_leads cl
  WHERE cl.access_token = p_token
    AND (cl.deleted_at IS NULL OR cl.deleted_at > NOW())
    AND (cl.archived_at IS NULL OR cl.archived_at > NOW())
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon, authenticated;

-- ============================================
-- FONCTION : PERMISSIONS COMMERCIAUX
-- ============================================

CREATE OR REPLACE FUNCTION public.create_commercial_default_permissions(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_permissions (user_id, permission_type, can_view, can_edit, can_delete, can_create)
  VALUES 
    (p_user_id, 'crm_leads', true, true, true, true),
    (p_user_id, 'crm_contacts', true, true, true, true),
    (p_user_id, 'crm_activities', true, true, true, true),
    (p_user_id, 'crm_documents', true, true, false, true),
    (p_user_id, 'crm_quotes', true, true, false, true),
    (p_user_id, 'analytics', true, false, false, false),
    (p_user_id, 'settings', false, false, false, false),
    (p_user_id, 'user_management', false, false, false, false)
  ON CONFLICT (user_id, permission_type) 
  DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_create = EXCLUDED.can_create,
    updated_at = NOW();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_commercial_default_permissions(uuid) TO service_role;

-- ============================================
-- INDEX PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_lead_status 
ON lead_company_quotes(lead_id, quote_status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_access_token 
ON crm_leads(access_token) 
WHERE deleted_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_type 
ON user_permissions(user_id, permission_type);
