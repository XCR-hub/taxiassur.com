/*
  # Nettoyage des tables et vues obsoletes
  
  ## Contexte
  Suppression des tables et vues en trop qui ne sont plus utilisees.
  
  ## Actions
  1. Supprimer les tables de backup inutiles
  2. Supprimer les vues obsoletes
  3. Optimiser les indexes
*/

-- 1. Supprimer les tables de backup inutiles
DROP TABLE IF EXISTS leads_backup CASCADE;
DROP TABLE IF EXISTS crm_leads_enhanced CASCADE;

-- 2. Supprimer les vues obsoletes si elles existent
DROP VIEW IF EXISTS eligible_leads_view CASCADE;
DROP VIEW IF EXISTS v_hot_leads CASCADE;

-- 3. Re-creer uniquement les vues utiles et optimisees
CREATE OR REPLACE VIEW v_hot_leads AS
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  city,
  status,
  lead_score,
  created_at,
  last_contact_at
FROM crm_leads
WHERE deleted_at IS NULL
  AND status IN ('READY_FOR_QUOTE', 'QUOTE_SENT', 'SIGNATURE_PENDING')
  AND lead_score >= 70;

-- 4. Commentaire sur la structure finale
COMMENT ON TABLE crm_leads IS 'Table principale des leads - UNIQUE TABLE ACTIVE';
COMMENT ON VIEW v_hot_leads IS 'Vue des leads a fort potentiel pour reporting rapide';