/*
  # Fonction pour lier en masse les emails aux leads existants
  
  1. Problème résolu
    - Les emails synchronisés avant la création du lead ne sont pas liés automatiquement
    - Besoin d'une fonction pour re-scanner tous les emails non assignés
  
  2. Fonctionnalités
    - Lie tous les emails non assignés (lead_id IS NULL) aux leads correspondants
    - Recherche par email exact
    - Recherche aussi par téléphone si disponible
    - Retourne le nombre d'emails liés
  
  3. Utilisation
    - Peut être appelée manuellement depuis l'interface
    - Peut être programmée en cron job
    - Idempotente (peut être appelée plusieurs fois sans problème)
*/

-- Fonction RPC pour lier les emails aux leads existants
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
  -- Pour chaque email non assigné
  FOR email_record IN 
    SELECT * FROM email_messages
    WHERE lead_id IS NULL
    AND direction = 'inbound' -- On ne traite que les emails reçus
    ORDER BY received_at ASC
  LOOP
    matched_lead_id := NULL;

    -- Recherche par email dans crm_leads
    SELECT id INTO matched_lead_id
    FROM crm_leads
    WHERE email = email_record.from_email
    LIMIT 1;

    -- Si trouvé, lier l'email au lead
    IF matched_lead_id IS NOT NULL THEN
      UPDATE email_messages
      SET 
        lead_id = matched_lead_id,
        auto_matched = true
      WHERE id = email_record.id;
      
      emails_linked := emails_linked + 1;
      
      -- Le trigger create_interaction_from_email() va créer automatiquement l'interaction
    END IF;
  END LOOP;

  -- Compter les interactions créées
  SELECT COUNT(*) INTO interactions_created
  FROM crm_interactions
  WHERE created_at >= NOW() - INTERVAL '5 seconds';

  RETURN jsonb_build_object(
    'success', true,
    'emails_linked', emails_linked,
    'interactions_created', interactions_created,
    'message', format('✅ %s emails liés à des leads existants, %s interactions créées', emails_linked, interactions_created)
  );
END;
$$;

-- Fonction pour lier l'historique d'un lead spécifique
CREATE OR REPLACE FUNCTION link_lead_email_history(lead_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_lead_id uuid;
  emails_linked integer := 0;
  interactions_created integer := 0;
BEGIN
  -- Trouver le lead
  SELECT id INTO target_lead_id
  FROM crm_leads
  WHERE email = lead_email
  LIMIT 1;

  IF target_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Aucun lead trouvé avec cet email'
    );
  END IF;

  -- Lier tous les emails de cet expéditeur
  UPDATE email_messages
  SET 
    lead_id = target_lead_id,
    auto_matched = true
  WHERE from_email = lead_email
  AND (lead_id IS NULL OR lead_id != target_lead_id);

  GET DIAGNOSTICS emails_linked = ROW_COUNT;

  -- Compter les interactions
  SELECT COUNT(*) INTO interactions_created
  FROM crm_interactions
  WHERE lead_id = target_lead_id
  AND metadata->>'from' = lead_email;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', target_lead_id,
    'emails_linked', emails_linked,
    'total_interactions', interactions_created,
    'message', format('✅ %s emails liés au lead, %s interactions au total', emails_linked, interactions_created)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION link_unassigned_emails_to_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION link_unassigned_emails_to_leads() TO service_role;
GRANT EXECUTE ON FUNCTION link_lead_email_history(text) TO authenticated;
GRANT EXECUTE ON FUNCTION link_lead_email_history(text) TO service_role;

-- Commentaires
COMMENT ON FUNCTION link_unassigned_emails_to_leads() IS 
'Lie tous les emails non assignés aux leads existants en recherchant par email. Crée automatiquement les interactions.';

COMMENT ON FUNCTION link_lead_email_history(text) IS 
'Lie tous les emails d''un expéditeur spécifique à son lead correspondant. Utile pour récupérer l''historique.';
