/*
  # Système complet de paiement Monetico
  
  ## Objectif
  Traçabilité complète des paiements comptants avec Monetico :
  - Création du lien de paiement par le commercial
  - Email automatique au prospect avec le lien
  - Affichage dans l'espace prospect
  - Suivi du statut en temps réel
  - Notification au commercial quand c'est payé
  
  ## Tables
  1. monetico_payments - Tous les paiements Monetico
  2. payment_notifications - Notifications de paiement
  
  ## Fonctions
  - create_monetico_payment_link
  - get_payment_status_by_token
  - process_monetico_webhook
*/

-- ============================================
-- TABLE : PAIEMENTS MONETICO
-- ============================================

CREATE TABLE IF NOT EXISTS monetico_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Informations du paiement
  payment_reference text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  
  -- URLs Monetico
  payment_url text NOT NULL,
  return_url text,
  cancel_url text,
  
  -- Statut
  status text DEFAULT 'pending', -- pending, sent, paid, failed, cancelled
  payment_status text, -- Statut retourné par Monetico
  
  -- Dates
  created_at timestamptz DEFAULT NOW(),
  sent_at timestamptz, -- Quand l'email a été envoyé
  paid_at timestamptz, -- Quand le paiement a été effectué
  expires_at timestamptz, -- Expiration du lien
  
  -- Données Monetico
  monetico_transaction_id text,
  monetico_response jsonb,
  
  -- Email
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  email_error text,
  
  -- Métadonnées
  created_by uuid REFERENCES admin_users(id),
  metadata jsonb,
  
  deleted_at timestamptz
);

-- Index
CREATE INDEX idx_monetico_payments_lead ON monetico_payments(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_monetico_payments_status ON monetico_payments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_monetico_payments_reference ON monetico_payments(payment_reference);

-- RLS
ALTER TABLE monetico_payments ENABLE ROW LEVEL SECURITY;

-- Policy : Admins et commerciaux peuvent tout voir
DROP POLICY IF EXISTS "Admin and commercial can view payments" ON monetico_payments;
CREATE POLICY "Admin and commercial can view payments"
  ON monetico_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
    )
  );

-- Policy : Admins peuvent créer
DROP POLICY IF EXISTS "Admin can create payments" ON monetico_payments;
CREATE POLICY "Admin can create payments"
  ON monetico_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.role IN ('admin', 'super_admin', 'commercial')
    )
  );

-- Policy : Admins peuvent mettre à jour
DROP POLICY IF EXISTS "Admin can update payments" ON monetico_payments;
CREATE POLICY "Admin can update payments"
  ON monetico_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
        AND au.is_active = true
    )
  );

-- Policy : Prospect peut voir ses paiements via token
DROP POLICY IF EXISTS "Prospect can view own payments via token" ON monetico_payments;
CREATE POLICY "Prospect can view own payments via token"
  ON monetico_payments FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads cl
      WHERE cl.id = monetico_payments.lead_id
        AND cl.access_token IS NOT NULL
        AND (cl.deleted_at IS NULL OR cl.deleted_at > NOW())
    )
  );

-- ============================================
-- TABLE : NOTIFICATIONS DE PAIEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS payment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES monetico_payments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES admin_users(id),
  
  notification_type text NOT NULL, -- payment_sent, payment_received, payment_failed
  title text NOT NULL,
  message text NOT NULL,
  
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  created_at timestamptz DEFAULT NOW(),
  metadata jsonb
);

-- Index
CREATE INDEX idx_payment_notifications_payment ON payment_notifications(payment_id);
CREATE INDEX idx_payment_notifications_user ON payment_notifications(user_id, is_read);
CREATE INDEX idx_payment_notifications_created ON payment_notifications(created_at DESC);

-- RLS
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Policy : Utilisateur voit ses notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON payment_notifications;
CREATE POLICY "Users can view own notifications"
  ON payment_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy : Système peut créer notifications
DROP POLICY IF EXISTS "System can create notifications" ON payment_notifications;
CREATE POLICY "System can create notifications"
  ON payment_notifications FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Policy : Utilisateur peut mettre à jour ses notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON payment_notifications;
CREATE POLICY "Users can update own notifications"
  ON payment_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- FONCTION : CRÉER UN PAIEMENT MONETICO
-- ============================================

CREATE OR REPLACE FUNCTION public.create_monetico_payment_link(
  p_lead_id uuid,
  p_amount numeric,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_reference text;
  v_lead_email text;
  v_lead_name text;
  v_payment_url text;
BEGIN
  -- Vérifier que le lead existe
  SELECT email, first_name || ' ' || last_name 
  INTO v_lead_email, v_lead_name
  FROM crm_leads
  WHERE id = p_lead_id
    AND (deleted_at IS NULL OR deleted_at > NOW());

  IF v_lead_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead introuvable'
    );
  END IF;

  -- Générer une référence unique
  v_reference := 'PAY-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 12));

  -- URL de test Monetico
  v_payment_url := 'https://p.monetico-services.com/test/paiement.cgi';

  -- Créer le paiement
  INSERT INTO monetico_payments (
    lead_id,
    payment_reference,
    amount,
    description,
    payment_url,
    status,
    created_by,
    created_at,
    expires_at
  )
  VALUES (
    p_lead_id,
    v_reference,
    p_amount,
    COALESCE(p_description, 'Paiement comptant assurance taxi'),
    v_payment_url,
    'pending',
    auth.uid(),
    NOW(),
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_payment_id;

  -- Créer une notification pour le commercial
  INSERT INTO payment_notifications (
    payment_id,
    user_id,
    notification_type,
    title,
    message,
    metadata
  )
  VALUES (
    v_payment_id,
    auth.uid(),
    'payment_created',
    'Lien de paiement créé',
    'Lien de paiement de ' || p_amount || '€ créé pour ' || v_lead_name,
    jsonb_build_object('amount', p_amount, 'reference', v_reference)
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'reference', v_reference,
    'payment_url', v_payment_url,
    'amount', p_amount,
    'message', 'Lien de paiement créé avec succès'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_monetico_payment_link(uuid, numeric, text) TO authenticated;

-- ============================================
-- FONCTION : RÉCUPÉRER PAIEMENTS PAR TOKEN
-- ============================================

CREATE OR REPLACE FUNCTION public.get_payments_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  payment_reference text,
  amount numeric,
  description text,
  payment_url text,
  status text,
  created_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Récupérer le lead_id via le token
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token
    AND (cl.deleted_at IS NULL OR cl.deleted_at > NOW())
    AND (cl.archived_at IS NULL OR cl.archived_at > NOW());

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Retourner les paiements
  RETURN QUERY
  SELECT 
    mp.id,
    mp.payment_reference,
    mp.amount,
    mp.description,
    mp.payment_url,
    mp.status,
    mp.created_at,
    mp.sent_at,
    mp.paid_at,
    mp.expires_at
  FROM monetico_payments mp
  WHERE mp.lead_id = v_lead_id
    AND (mp.deleted_at IS NULL OR mp.deleted_at > NOW())
  ORDER BY mp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payments_by_token(text) TO anon, authenticated;

-- ============================================
-- FONCTION : MARQUER PAIEMENT COMME ENVOYÉ
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_payment_as_sent(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE monetico_payments
  SET 
    status = 'sent',
    sent_at = NOW(),
    email_sent = true,
    email_sent_at = NOW()
  WHERE id = p_payment_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payment_as_sent(uuid) TO authenticated, service_role;

-- ============================================
-- FONCTION : TRAITER WEBHOOK MONETICO
-- ============================================

CREATE OR REPLACE FUNCTION public.process_monetico_payment(
  p_reference text,
  p_status text,
  p_transaction_id text DEFAULT NULL,
  p_response_data jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_lead_id uuid;
  v_lead_name text;
  v_amount numeric;
  v_created_by uuid;
BEGIN
  -- Récupérer le paiement
  SELECT 
    mp.id, 
    mp.lead_id, 
    mp.amount,
    mp.created_by,
    cl.first_name || ' ' || cl.last_name
  INTO v_payment_id, v_lead_id, v_amount, v_created_by, v_lead_name
  FROM monetico_payments mp
  JOIN crm_leads cl ON cl.id = mp.lead_id
  WHERE mp.payment_reference = p_reference;

  IF v_payment_id IS NULL THEN
    RETURN false;
  END IF;

  -- Mettre à jour le paiement
  IF p_status = 'paid' THEN
    UPDATE monetico_payments
    SET 
      status = 'paid',
      payment_status = p_status,
      paid_at = NOW(),
      monetico_transaction_id = p_transaction_id,
      monetico_response = p_response_data
    WHERE id = v_payment_id;

    -- Mettre à jour le lead
    UPDATE crm_leads
    SET 
      payment_completed_at = NOW(),
      status = 'contrat_final',
      pipeline_stage = 'contrat_final'
    WHERE id = v_lead_id;

    -- Créer notification pour le commercial
    IF v_created_by IS NOT NULL THEN
      INSERT INTO payment_notifications (
        payment_id,
        user_id,
        notification_type,
        title,
        message,
        metadata
      )
      VALUES (
        v_payment_id,
        v_created_by,
        'payment_received',
        'Paiement reçu',
        'Paiement de ' || v_amount || '€ reçu pour ' || v_lead_name,
        jsonb_build_object(
          'amount', v_amount,
          'reference', p_reference,
          'transaction_id', p_transaction_id
        )
      );
    END IF;

  ELSIF p_status = 'failed' THEN
    UPDATE monetico_payments
    SET 
      status = 'failed',
      payment_status = p_status,
      monetico_response = p_response_data
    WHERE id = v_payment_id;

  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_monetico_payment(text, text, text, jsonb) TO service_role;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE monetico_payments IS 
'Table de suivi de tous les paiements Monetico (liens générés, statuts, etc.)';

COMMENT ON TABLE payment_notifications IS 
'Notifications de paiement pour les commerciaux et admins';

COMMENT ON FUNCTION public.create_monetico_payment_link(uuid, numeric, text) IS 
'Crée un lien de paiement Monetico pour un lead et génère une référence unique';

COMMENT ON FUNCTION public.get_payments_by_token(text) IS 
'Récupère tous les paiements d''un prospect via son token pour l''espace prospect';

COMMENT ON FUNCTION public.process_monetico_payment(text, text, text, jsonb) IS 
'Traite le retour webhook de Monetico et met à jour le statut du paiement';
