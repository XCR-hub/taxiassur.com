/*
  # Correction trigger handle_monetico_payment_success
  
  1. Modifications
    - Corriger les noms de colonnes pour correspondre à crm_lead_timeline
    - Utiliser event_type au lieu de type
    - Utiliser event_data au lieu de title/description/metadata
  
  2. Raison
    - Le trigger utilisait les mauvaises colonnes
    - Empêchait l'UPDATE des paiements
*/

CREATE OR REPLACE FUNCTION handle_monetico_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Seulement si le statut passe à 'success' et qu'il y a un lead
  IF NEW.status = 'success' AND OLD.status != 'success' AND NEW.lead_id IS NOT NULL THEN
    
    -- Ajouter une entrée dans la timeline
    INSERT INTO crm_lead_timeline (
      lead_id,
      event_type,
      event_data,
      actor_type
    ) VALUES (
      NEW.lead_id,
      'payment',
      jsonb_build_object(
        'title', 'Paiement comptant reçu',
        'description', format('Paiement de %s € effectué avec succès via Monetico (Réf: %s)', NEW.amount, NEW.reference),
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reference', NEW.reference,
        'transaction_id', NEW.transaction_id
      ),
      'system'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;
