/*
  # Contrainte d'Unicité sur l'Email - crm_leads

  ## Problème
  Il ne faut pas avoir plusieurs leads pour le même email

  ## Solution
  1. Ajouter une contrainte UNIQUE sur l'email (case-insensitive)
  2. Créer une fonction UPSERT pour gérer les leads existants
  3. Utiliser les bonnes colonnes (consent_marketing, pas consent_phone)
*/

-- ============================================
-- 1. AJOUTER CONTRAINTE UNIQUE SUR L'EMAIL
-- ============================================

-- Créer un index unique case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_email_unique_active
ON crm_leads (LOWER(email))
WHERE deleted_at IS NULL;

-- ============================================
-- 2. FONCTION UPSERT POUR LEAD
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_city text,
  p_source text DEFAULT 'website',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  lead_id uuid,
  access_token text,
  is_new boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_access_token text;
  v_is_new boolean := false;
  v_existing_id uuid;
BEGIN
  -- Normaliser l'email en lowercase
  p_email := LOWER(TRIM(p_email));
  
  -- Vérifier si un lead existe déjà avec cet email
  SELECT cl.id INTO v_existing_id
  FROM crm_leads cl
  WHERE LOWER(cl.email) = p_email
    AND cl.deleted_at IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Lead existe : mettre à jour ses informations
    v_lead_id := v_existing_id;
    v_is_new := false;
    
    -- Régénérer le token d'accès
    v_access_token := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);
    
    UPDATE crm_leads
    SET
      first_name = p_first_name,
      last_name = p_last_name,
      phone = p_phone,
      city = p_city,
      source = p_source,
      metadata = COALESCE(crm_leads.metadata, '{}'::jsonb) || p_metadata,
      access_token = v_access_token,
      updated_at = NOW(),
      -- Réactiver si c'était perdu ou archivé
      status = CASE 
        WHEN status IN ('perdu', 'lost') THEN 'NOUVEAU_LEAD'
        ELSE status
      END,
      -- Remettre archived_at à NULL si le lead était archivé
      archived_at = NULL
    WHERE id = v_lead_id;
    
    RAISE NOTICE 'Lead existant mis à jour: %', v_lead_id;
  ELSE
    -- Nouveau lead : créer
    v_is_new := true;
    v_access_token := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);
    
    INSERT INTO crm_leads (
      first_name,
      last_name,
      email,
      phone,
      city,
      source,
      status,
      metadata,
      access_token,
      consent_marketing
    )
    VALUES (
      p_first_name,
      p_last_name,
      p_email,
      p_phone,
      p_city,
      p_source,
      'NOUVEAU_LEAD',
      p_metadata,
      v_access_token,
      true
    )
    RETURNING id INTO v_lead_id;
    
    RAISE NOTICE 'Nouveau lead créé: %', v_lead_id;
  END IF;

  RETURN QUERY
  SELECT v_lead_id, v_access_token, v_is_new;
END;
$$;

-- ============================================
-- 3. PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.upsert_lead(text, text, text, text, text, text, jsonb) 
TO authenticated, service_role;

-- ============================================
-- 4. TEST DE LA FONCTION
-- ============================================

DO $$
DECLARE
  v_result record;
  v_first_token text;
  v_second_token text;
BEGIN
  -- Test 1 : Créer un nouveau lead
  SELECT * INTO v_result
  FROM upsert_lead(
    'test.unique@example.com',
    'Test',
    'Unique',
    '0123456789',
    'Paris',
    'test',
    '{"test": true}'::jsonb
  );
  
  v_first_token := v_result.access_token;
  
  IF v_result.is_new = true THEN
    RAISE NOTICE '✅ TEST 1 PASSED: Nouveau lead créé';
    RAISE NOTICE '   Lead ID: %', v_result.lead_id;
    RAISE NOTICE '   Token: %', v_result.access_token;
  ELSE
    RAISE WARNING '⚠️ TEST 1 FAILED: Should be new lead';
  END IF;

  -- Test 2 : Mettre à jour le même lead (même email)
  SELECT * INTO v_result
  FROM upsert_lead(
    'test.unique@example.com',
    'Test Updated',
    'Unique Updated',
    '0987654321',
    'Lyon',
    'test',
    '{"updated": true}'::jsonb
  );
  
  v_second_token := v_result.access_token;
  
  IF v_result.is_new = false THEN
    RAISE NOTICE '✅ TEST 2 PASSED: Lead existant mis à jour';
    RAISE NOTICE '   Token changé: %', (v_first_token != v_second_token);
  ELSE
    RAISE WARNING '⚠️ TEST 2 FAILED: Should be existing lead';
  END IF;
  
  -- Nettoyer le lead de test
  DELETE FROM crm_leads WHERE email = 'test.unique@example.com';
  RAISE NOTICE '🧹 Lead de test nettoyé';
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION public.upsert_lead IS
'Crée un nouveau lead ou met à jour un lead existant si l''email existe déjà (évite les doublons)';

COMMENT ON INDEX idx_crm_leads_email_unique_active IS
'Garantit l''unicité des emails actifs dans crm_leads (case-insensitive)';
