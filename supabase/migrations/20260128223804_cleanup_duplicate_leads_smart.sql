/*
  # Cleanup Duplicate Leads Intelligently

  1. Problem
    - Found 36 duplicate leads for same email (abdammarie@gmail.com)
    - This creates confusion and missing leads in UI
    - Emails and documents are scattered across duplicates

  2. Solution
    - Identify duplicate groups by email
    - Keep the most advanced lead (best status + most recent)
    - Migrate all data to the kept lead
    - Delete duplicates safely

  3. Status Priority (best to worst)
    - CLIENT_ACTIF
    - DEVIS
    - COLLECTE_DOCUMENTS  
    - RELANCE
    - RECONTACT_PROGRAMME
    - NOUVEAU_LEAD
*/

-- Function to get status priority
CREATE OR REPLACE FUNCTION get_status_priority(status lead_status)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE status
    WHEN 'CLIENT_ACTIF' THEN 100
    WHEN 'DEVIS' THEN 90
    WHEN 'COLLECTE_DOCUMENTS' THEN 80
    WHEN 'RELANCE' THEN 70
    WHEN 'RECONTACT_PROGRAMME' THEN 60
    WHEN 'NOUVEAU_LEAD' THEN 50
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to consolidate duplicate leads
CREATE OR REPLACE FUNCTION consolidate_duplicate_leads()
RETURNS TABLE(
  email text,
  kept_lead_id uuid,
  deleted_count integer
) AS $$
DECLARE
  duplicate_email record;
  best_lead record;
  duplicate_lead record;
  deleted integer;
BEGIN
  -- Pour chaque email en doublon
  FOR duplicate_email IN 
    SELECT DISTINCT cl.email
    FROM crm_leads cl
    WHERE cl.email IS NOT NULL AND cl.email != ''
    GROUP BY cl.email
    HAVING COUNT(*) > 1
  LOOP
    -- Trouver le meilleur lead à garder
    SELECT *
    INTO best_lead
    FROM crm_leads
    WHERE crm_leads.email = duplicate_email.email
    ORDER BY 
      get_status_priority(status) DESC,
      created_at DESC
    LIMIT 1;

    deleted := 0;

    -- Pour chaque doublon (sauf le meilleur)
    FOR duplicate_lead IN
      SELECT *
      FROM crm_leads
      WHERE crm_leads.email = duplicate_email.email
        AND id != best_lead.id
    LOOP
      -- Migrer les email_messages
      UPDATE email_messages
      SET lead_id = best_lead.id
      WHERE lead_id = duplicate_lead.id;

      -- Migrer les prospect_documents
      UPDATE prospect_documents
      SET lead_id = best_lead.id
      WHERE lead_id = duplicate_lead.id
        AND NOT EXISTS (
          SELECT 1 FROM prospect_documents pd2
          WHERE pd2.lead_id = best_lead.id
          AND pd2.file_name = prospect_documents.file_name
        );

      -- Migrer les crm_lead_documents
      UPDATE crm_lead_documents
      SET lead_id = best_lead.id
      WHERE lead_id = duplicate_lead.id
        AND NOT EXISTS (
          SELECT 1 FROM crm_lead_documents cld2
          WHERE cld2.lead_id = best_lead.id
          AND cld2.file_name = crm_lead_documents.file_name
        );

      -- Migrer les crm_interactions
      UPDATE crm_interactions
      SET lead_id = best_lead.id
      WHERE lead_id = duplicate_lead.id;

      -- Supprimer le doublon
      DELETE FROM crm_leads
      WHERE id = duplicate_lead.id;

      deleted := deleted + 1;
    END LOOP;

    -- Retourner le résultat
    RETURN QUERY SELECT duplicate_email.email, best_lead.id, deleted;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la consolidation
-- NOTE: Cette fonction peut être appelée manuellement depuis le SQL Editor
-- SELECT * FROM consolidate_duplicate_leads();
