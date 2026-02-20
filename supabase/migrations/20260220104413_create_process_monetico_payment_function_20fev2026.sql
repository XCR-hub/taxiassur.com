/*
  # Fonction RPC pour traiter les paiements Monético

  ## Description
  Fonction appelée par le webhook CGI2 Monético pour mettre à jour les paiements.
  
  ## Paramètres
  - p_reference : Référence du paiement
  - p_status : Statut (paid, failed, cancelled)
  - p_transaction_id : Numéro d'autorisation
  - p_response_data : Données complètes du webhook
  
  ## Actions
  1. Met à jour le paiement dans monetico_payments
  2. Met à jour le lead si paiement réussi
  3. Crée une notification pour le commercial
*/

-- Créer la fonction de traitement des paiements Monético
CREATE OR REPLACE FUNCTION process_monetico_payment(
  p_reference TEXT,
  p_status TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_response_data JSONB DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_payment_id UUID;
  v_lead_id UUID;
  v_amount NUMERIC;
  v_created_by UUID;
BEGIN
  -- Mettre à jour le paiement
  UPDATE monetico_payments
  SET 
    status = p_status,
    transaction_id = p_transaction_id,
    monetico_data = COALESCE(p_response_data, monetico_data),
    payment_date = CASE 
      WHEN p_status = 'paid' THEN NOW() 
      ELSE payment_date 
    END,
    updated_at = NOW()
  WHERE reference = p_reference
  RETURNING id, lead_id, amount, created_by INTO v_payment_id, v_lead_id, v_amount, v_created_by;

  -- Si paiement trouvé et réussi
  IF FOUND AND p_status = 'paid' AND v_lead_id IS NOT NULL THEN
    -- Mettre à jour le lead
    UPDATE crm_leads
    SET 
      pipeline_stage = 'paiement_recu',
      updated_at = NOW()
    WHERE id = v_lead_id;

    -- Créer notification pour le commercial
    IF v_created_by IS NOT NULL THEN
      INSERT INTO crm_event_notifications (
        lead_id,
        event_type,
        title,
        message,
        priority,
        action_url,
        context_data
      ) VALUES (
        v_lead_id,
        'payment_received',
        'Paiement reçu',
        'Paiement de ' || v_amount || '€ confirmé',
        1,
        '/backoffice/crm-killer/' || v_lead_id,
        jsonb_build_object(
          'payment_id', v_payment_id,
          'reference', p_reference,
          'amount', v_amount,
          'transaction_id', p_transaction_id
        )
      );
    END IF;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur mais ne pas faire échouer le webhook
    RAISE WARNING 'Error processing monetico payment: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute à anon et authenticated pour le webhook
GRANT EXECUTE ON FUNCTION process_monetico_payment TO anon;
GRANT EXECUTE ON FUNCTION process_monetico_payment TO authenticated;
GRANT EXECUTE ON FUNCTION process_monetico_payment TO service_role;
