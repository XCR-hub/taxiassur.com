/*
  # Création automatique des devis compagnies - Colonnes correctes
  
  1. **Créer les devis manquants** pour tous les leads existants
  2. **Trigger automatique** pour créer les devis quand un lead est créé
  
  Utilise les bonnes colonnes : insurance_company_id et quote_status
*/

-- =============================================
-- 1. CRÉER LES DEVIS MANQUANTS pour tous les leads
-- =============================================

-- Insérer les devis pour TOUS les leads qui n'en ont pas encore
INSERT INTO lead_company_quotes (lead_id, insurance_company_id, quote_status)
SELECT 
  l.id as lead_id,
  ic.id as insurance_company_id,
  'pending' as quote_status
FROM crm_leads l
CROSS JOIN insurance_companies ic
WHERE ic.is_active = true
  AND NOT EXISTS (
    SELECT 1 
    FROM lead_company_quotes lcq 
    WHERE lcq.lead_id = l.id 
    AND lcq.insurance_company_id = ic.id
  );

-- =============================================
-- 2. FONCTION: Créer automatiquement les devis
-- =============================================

CREATE OR REPLACE FUNCTION auto_create_company_quotes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer les devis pour toutes les compagnies actives
  INSERT INTO lead_company_quotes (lead_id, insurance_company_id, quote_status)
  SELECT 
    NEW.id as lead_id,
    ic.id as insurance_company_id,
    'pending' as quote_status
  FROM insurance_companies ic
  WHERE ic.is_active = true
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- =============================================
-- 3. TRIGGER: Créer les devis à la création du lead
-- =============================================

DROP TRIGGER IF EXISTS auto_create_company_quotes_trigger ON crm_leads;

CREATE TRIGGER auto_create_company_quotes_trigger
AFTER INSERT ON crm_leads
FOR EACH ROW
EXECUTE FUNCTION auto_create_company_quotes();

-- Commentaires
COMMENT ON FUNCTION auto_create_company_quotes() IS 
'Crée automatiquement les enregistrements lead_company_quotes pour toutes les compagnies actives';

COMMENT ON TRIGGER auto_create_company_quotes_trigger ON crm_leads IS 
'Déclenché à la création d''un lead pour initialiser les devis compagnies';