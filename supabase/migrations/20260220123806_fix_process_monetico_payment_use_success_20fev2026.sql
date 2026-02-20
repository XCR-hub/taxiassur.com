/*
  # Correction fonction process_monetico_payment
  
  1. Modifications
    - Changer 'paid' en 'success' pour correspondre à la contrainte DB
    - La contrainte accepte: pending, processing, success, failed, cancelled, refunded
  
  2. Raison
    - Le webhook envoie 'success' mais la fonction cherche 'paid'
    - Résultat : le statut n'est jamais mis à jour correctement
*/

CREATE OR REPLACE FUNCTION public.process_monetico_payment(
  p_reference text, 
  p_status text, 
  p_transaction_id text DEFAULT NULL, 
  p_response_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      WHEN p_status = 'success' THEN NOW()  -- ✅ Changé de 'paid' à 'success'
      ELSE payment_date 
    END,
    updated_at = NOW()
  WHERE reference = p_reference
  RETURNING id, lead_id, amount, created_by INTO v_payment_id, v_lead_id, v_amount, v_created_by;

  -- Si paiement trouvé et réussi
  IF FOUND AND p_status = 'success' AND v_lead_id IS NOT NULL THEN  -- ✅ Changé de 'paid' à 'success'
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
$$;
