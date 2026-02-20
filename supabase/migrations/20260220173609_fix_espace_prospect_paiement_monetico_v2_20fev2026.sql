/*
  # Fix Espace Prospect - Affichage du paiement Monetico V2
  
  ## Problème
  Dans l'espace prospect, l'onglet Paiement affiche "Devis non accepté" car :
  1. La fonction get_payments_by_token n'existe pas
  2. Le composant ClientPaymentButton cherche dans lead_contracts qui n'existe pas
  3. Aucun paiement Monetico n'est créé automatiquement après validation devis
  
  ## Solution
  1. Créer la fonction RPC get_payments_by_token
  2. Créer automatiquement un paiement Monetico quand un devis est validé
  3. Permettre l'affichage du bouton de paiement via le token
*/

-- ============================================
-- 1. Fonction RPC pour récupérer les paiements par token
-- ============================================

CREATE OR REPLACE FUNCTION public.get_payments_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  reference text,
  amount numeric,
  status text,
  description text,
  payment_url text,
  created_at timestamptz,
  payment_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Récupérer le lead_id depuis le token
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Retourner les paiements du lead
  RETURN QUERY
  SELECT 
    mp.id,
    mp.reference,
    mp.amount,
    mp.status,
    COALESCE(mp.description, 'Paiement comptant assurance taxi') as description,
    mp.payment_url,
    mp.created_at,
    mp.payment_date
  FROM monetico_payments mp
  WHERE mp.lead_id = v_lead_id
  ORDER BY mp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payments_by_token(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_payments_by_token(text) IS 
'Récupère tous les paiements Monetico d''un lead via son access_token';

-- ============================================
-- 2. Fonction pour créer un paiement Monetico via token
-- ============================================

CREATE OR REPLACE FUNCTION public.create_payment_by_token(
  p_token text,
  p_amount numeric DEFAULT 50.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_payment_id uuid;
  v_reference text;
BEGIN
  -- Récupérer les infos du lead
  SELECT l.id, l.email, l.first_name, l.last_name
  INTO v_lead_id, v_email, v_first_name, v_last_name
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide'
    );
  END IF;

  -- Vérifier s'il existe déjà un paiement pending
  SELECT id, reference INTO v_payment_id, v_reference
  FROM monetico_payments
  WHERE lead_id = v_lead_id
    AND status = 'pending'
    AND amount = p_amount
  ORDER BY created_at DESC
  LIMIT 1;

  -- Si pas de paiement pending, en créer un
  IF v_payment_id IS NULL THEN
    v_reference := 'T' || FLOOR(RANDOM() * 100000000000)::text;
    
    INSERT INTO monetico_payments (
      lead_id,
      reference,
      amount,
      currency,
      status,
      description,
      customer_email,
      customer_name,
      return_url,
      created_at
    )
    VALUES (
      v_lead_id,
      v_reference,
      p_amount,
      'EUR',
      'pending',
      'Paiement comptant assurance taxi',
      v_email,
      v_first_name || ' ' || COALESCE(v_last_name, ''),
      'https://taxiassur.com/espace-prospect/' || p_token || '?tab=paiement',
      NOW()
    )
    RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'reference', v_reference,
    'amount', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_payment_by_token(text, numeric) TO anon, authenticated;

COMMENT ON FUNCTION public.create_payment_by_token(text, numeric) IS 
'Crée un paiement Monetico pour un lead via son access_token';

-- ============================================
-- 3. Ajouter une RLS policy pour permettre la lecture via token
-- ============================================

DROP POLICY IF EXISTS "Prospect can view payments via token" ON monetico_payments;

CREATE POLICY "Prospect can view payments via token"
  ON monetico_payments
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads l
      WHERE l.id = monetico_payments.lead_id
        AND l.access_token IS NOT NULL
        AND l.deleted_at IS NULL
    )
  );

-- ============================================
-- 4. Créer automatiquement un paiement pour les devis déjà acceptés
-- ============================================

DO $$
DECLARE
  v_lead record;
  v_payment_id uuid;
  v_reference text;
BEGIN
  -- Pour chaque lead qui a accepté un devis mais n'a pas de paiement
  FOR v_lead IN
    SELECT 
      cl.id,
      cl.email,
      cl.first_name,
      cl.last_name,
      cl.access_token,
      cl.quote_accepted_at
    FROM crm_leads cl
    WHERE cl.quote_accepted_at IS NOT NULL
      AND cl.payment_completed_at IS NULL
      AND cl.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM monetico_payments mp
        WHERE mp.lead_id = cl.id
          AND mp.status = 'pending'
      )
    LIMIT 10  -- Limiter à 10 pour éviter une surcharge
  LOOP
    v_reference := 'T' || FLOOR(RANDOM() * 100000000000)::text;
    
    INSERT INTO monetico_payments (
      lead_id,
      reference,
      amount,
      currency,
      status,
      description,
      customer_email,
      customer_name,
      return_url,
      created_at
    )
    VALUES (
      v_lead.id,
      v_reference,
      50.00,  -- Montant par défaut
      'EUR',
      'pending',
      'Paiement comptant assurance taxi',
      v_lead.email,
      v_lead.first_name || ' ' || COALESCE(v_lead.last_name, ''),
      'https://taxiassur.com/espace-prospect/' || v_lead.access_token || '?tab=paiement',
      NOW()
    )
    RETURNING id INTO v_payment_id;
    
    RAISE NOTICE 'Paiement créé pour lead % : % (ref: %)', v_lead.id, v_payment_id, v_reference;
  END LOOP;
END $$;
