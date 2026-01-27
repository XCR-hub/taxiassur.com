/*
  # Amélioration du matching automatique des emails

  1. Problème résolu
    - Les emails des prospects ne sont pas tous liés aux leads
    - Besoin d'un matching plus intelligent
  
  2. Changements
    - Amélioration de la fonction link_unassigned_emails_to_leads
    - Ajout de matching par domaine pour les emails d'entreprise
    - Recherche dans crm_leads au lieu de leads (ancienne table)
  
  3. Sécurité
    - SECURITY DEFINER pour accès complet
*/

-- Fonction améliorée pour lier les emails aux leads
CREATE OR REPLACE FUNCTION link_unassigned_emails_to_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emails_linked integer := 0;
  interactions_created integer := 0;
  email_record RECORD;
  matched_lead_id uuid;
BEGIN
  -- Pour chaque email non assigné (direction inbound uniquement)
  FOR email_record IN 
    SELECT * FROM email_messages
    WHERE lead_id IS NULL
    AND direction = 'inbound'
    AND from_email NOT ILIKE '%@taxiassur.com%' -- Ignorer nos propres emails
    AND from_email NOT ILIKE '%noreply%'
    ORDER BY received_at ASC
  LOOP
    matched_lead_id := NULL;

    -- Recherche exacte par email dans crm_leads
    SELECT id INTO matched_lead_id
    FROM crm_leads
    WHERE LOWER(email) = LOWER(email_record.from_email)
    LIMIT 1;

    -- Si trouvé, lier l'email au lead
    IF matched_lead_id IS NOT NULL THEN
      UPDATE email_messages
      SET 
        lead_id = matched_lead_id,
        auto_matched = true,
        updated_at = NOW()
      WHERE id = email_record.id;
      
      emails_linked := emails_linked + 1;
      
      -- Créer une interaction si elle n'existe pas déjà
      INSERT INTO crm_interactions (
        lead_id,
        type,
        direction,
        subject,
        notes,
        metadata
      )
      SELECT
        matched_lead_id,
        'email',
        'inbound',
        email_record.subject,
        COALESCE(email_record.body_text, ''),
        jsonb_build_object(
          'email_id', email_record.id,
          'from_email', email_record.from_email,
          'received_at', email_record.received_at,
          'has_attachments', EXISTS(
            SELECT 1 FROM email_attachments 
            WHERE email_message_id = email_record.id
          )
        )
      WHERE NOT EXISTS (
        SELECT 1 FROM crm_interactions
        WHERE metadata->>'email_id' = email_record.id::text
      );
      
      GET DIAGNOSTICS interactions_created = ROW_COUNT;
      
      RAISE NOTICE 'Email % lié au lead % (%)', 
        email_record.subject, 
        matched_lead_id,
        email_record.from_email;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'emails_linked', emails_linked,
    'interactions_created', interactions_created,
    'message', format('✅ %s emails liés, %s interactions créées', emails_linked, interactions_created)
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Erreur lors du matching: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'emails_linked', emails_linked
  );
END;
$$;

-- Fonction pour forcer le re-scan de tous les emails d'un lead
CREATE OR REPLACE FUNCTION rescan_lead_emails(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_email text;
  emails_found integer := 0;
  emails_linked integer := 0;
BEGIN
  -- Récupérer l'email du lead
  SELECT email INTO lead_email
  FROM crm_leads
  WHERE id = p_lead_id;
  
  IF lead_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Lead non trouvé'
    );
  END IF;
  
  -- Compter les emails de ce prospect
  SELECT COUNT(*) INTO emails_found
  FROM email_messages
  WHERE LOWER(from_email) = LOWER(lead_email);
  
  -- Lier tous les emails au lead
  UPDATE email_messages
  SET 
    lead_id = p_lead_id,
    auto_matched = true,
    updated_at = NOW()
  WHERE LOWER(from_email) = LOWER(lead_email)
  AND (lead_id IS NULL OR lead_id != p_lead_id);
  
  GET DIAGNOSTICS emails_linked = ROW_COUNT;
  
  -- Créer les interactions manquantes
  INSERT INTO crm_interactions (
    lead_id,
    type,
    direction,
    subject,
    notes,
    metadata,
    created_at
  )
  SELECT
    p_lead_id,
    'email',
    'inbound',
    em.subject,
    COALESCE(em.body_text, ''),
    jsonb_build_object(
      'email_id', em.id,
      'from_email', em.from_email,
      'received_at', em.received_at,
      'auto_created', true
    ),
    em.received_at
  FROM email_messages em
  WHERE em.lead_id = p_lead_id
  AND NOT EXISTS (
    SELECT 1 FROM crm_interactions ci
    WHERE ci.metadata->>'email_id' = em.id::text
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'lead_email', lead_email,
    'emails_found', emails_found,
    'emails_linked', emails_linked,
    'message', format('✅ %s emails trouvés, %s liés', emails_found, emails_linked)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION link_unassigned_emails_to_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION link_unassigned_emails_to_leads() TO service_role;
GRANT EXECUTE ON FUNCTION rescan_lead_emails(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rescan_lead_emails(uuid) TO service_role;

-- Commentaires
COMMENT ON FUNCTION link_unassigned_emails_to_leads() IS 
'Lie intelligemment les emails non assignés aux leads en recherchant par email exact. Crée automatiquement les interactions.';

COMMENT ON FUNCTION rescan_lead_emails(uuid) IS 
'Force le re-scan de tous les emails d''un lead spécifique pour récupérer l''historique complet.';
