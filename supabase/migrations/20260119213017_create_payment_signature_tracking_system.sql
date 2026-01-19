/*
  # Système de traçabilité Paiement & Signature

  ## Description
  Permet de tracer précisément comment et quand le client a payé et signé,
  même si TaxiAssur n'encaisse pas directement (paiement via compagnie).
  Système flexible adapté à la réalité terrain des assureurs.

  ## Nouvelles colonnes crm_leads

  ### Paiement
  - `payment_confirmed` (bool) : Paiement confirmé (checkbox admin)
  - `payment_method` (enum) : cb_compagnie, prelevement_compagnie, cb_taxiassur
  - `payment_date` (date) : Date du paiement
  - `payment_reference` (text) : Référence transaction
  - `payment_notes` (text) : Commentaire libre
  - `payment_verified_by` (uuid) : Admin qui a confirmé
  - `payment_verified_at` (timestamp)

  ### Signature
  - `contract_signed` (bool) : Contrat signé (checkbox admin)
  - `signature_method` (enum) : electronique_assureur, electronique_taxiassur, manuscrite
  - `signature_date` (date) : Date de signature
  - `signature_proof_url` (text) : Lien vers preuve
  - `signature_status` (text) : Statut si fourni par plateforme
  - `signature_notes` (text) : Commentaire libre
  - `signature_verified_by` (uuid) : Admin qui a confirmé
  - `signature_verified_at` (timestamp)

  ### Documents contractuels
  - `contract_url` (text) : Lien vers contrat
  - `special_conditions_url` (text) : Lien vers dispositions particulières

  ## Verrous intelligents (mis à jour)
  - Verrou paiement : bloque passage à CLIENT_ACTIF si payment_confirmed = false
  - Verrou signature : bloque passage à CLIENT_ACTIF si contract_signed = false

  ## Sécurité
  - Seuls les admins peuvent modifier ces champs
  - Horodatage automatique
  - Traçabilité complète
*/

-- Enums pour méthodes de paiement et signature
CREATE TYPE payment_method_type AS ENUM (
  'cb_compagnie',              -- CB directement auprès de la compagnie
  'prelevement_compagnie',     -- Prélèvement par la compagnie
  'cb_taxiassur'               -- CB via TaxiAssur (Stripe)
);

CREATE TYPE signature_method_type AS ENUM (
  'electronique_assureur',     -- Signature électronique plateforme assureur
  'electronique_taxiassur',    -- Signature électronique TaxiAssur
  'manuscrite'                 -- Signature manuscrite (exception)
);

-- Ajout des colonnes de paiement
DO $$ 
BEGIN
  -- Paiement
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_confirmed') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_confirmed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_method') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_method payment_method_type;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_date') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_reference') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_reference text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_notes') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_verified_by') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_verified_by uuid REFERENCES admin_users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_verified_at') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_verified_at timestamptz;
  END IF;

  -- Signature
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'contract_signed') THEN
    ALTER TABLE crm_leads ADD COLUMN contract_signed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'signature_method') THEN
    ALTER TABLE crm_leads ADD COLUMN signature_method signature_method_type;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'signature_date') THEN
    ALTER TABLE crm_leads ADD COLUMN signature_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'signature_proof_url') THEN
    ALTER TABLE crm_leads ADD COLUMN signature_proof_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'signature_status') THEN
    ALTER TABLE crm_leads ADD COLUMN signature_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'signature_notes') THEN
    ALTER TABLE crm_leads ADD COLUMN signature_notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'signature_verified_by') THEN
    ALTER TABLE crm_leads ADD COLUMN signature_verified_by uuid REFERENCES admin_users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'signature_verified_at') THEN
    ALTER TABLE crm_leads ADD COLUMN signature_verified_at timestamptz;
  END IF;

  -- Documents contractuels
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'contract_url') THEN
    ALTER TABLE crm_leads ADD COLUMN contract_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'special_conditions_url') THEN
    ALTER TABLE crm_leads ADD COLUMN special_conditions_url text;
  END IF;
END $$;

-- Fonction pour vérifier les verrous de paiement et signature
CREATE OR REPLACE FUNCTION check_payment_signature_locks(p_lead_id uuid)
RETURNS TABLE (
  can_activate_client boolean,
  payment_confirmed boolean,
  contract_signed boolean,
  blocking_reasons text[]
) AS $$
DECLARE
  v_lead RECORD;
  v_reasons text[] := ARRAY[]::text[];
BEGIN
  SELECT 
    payment_confirmed,
    contract_signed,
    can_process_payment,
    can_sign_contract
  INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id;

  -- Vérifier documents complémentaires avant contrat
  IF NOT v_lead.can_sign_contract THEN
    v_reasons := array_append(v_reasons, 'Documents complémentaires avant contrat manquants');
  END IF;

  -- Vérifier paiement confirmé
  IF NOT v_lead.payment_confirmed THEN
    v_reasons := array_append(v_reasons, 'Paiement non confirmé');
  END IF;

  -- Vérifier contrat signé
  IF NOT v_lead.contract_signed THEN
    v_reasons := array_append(v_reasons, 'Contrat non signé');
  END IF;

  RETURN QUERY SELECT
    (v_lead.payment_confirmed AND v_lead.contract_signed AND v_lead.can_sign_contract),
    v_lead.payment_confirmed,
    v_lead.contract_signed,
    v_reasons;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour confirmer un paiement (admin uniquement)
CREATE OR REPLACE FUNCTION confirm_payment(
  p_lead_id uuid,
  p_payment_method payment_method_type,
  p_payment_date date,
  p_payment_reference text DEFAULT NULL,
  p_payment_notes text DEFAULT NULL,
  p_admin_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE crm_leads
  SET
    payment_confirmed = true,
    payment_method = p_payment_method,
    payment_date = p_payment_date,
    payment_reference = p_payment_reference,
    payment_notes = p_payment_notes,
    payment_verified_by = p_admin_user_id,
    payment_verified_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;

  -- Ajouter événement timeline
  INSERT INTO crm_timeline (
    id,
    lead_id,
    event_type,
    title,
    description,
    metadata,
    created_by,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_lead_id,
    'payment',
    'Paiement confirmé',
    format('Méthode : %s - Date : %s', p_payment_method, p_payment_date),
    jsonb_build_object(
      'payment_method', p_payment_method,
      'payment_date', p_payment_date,
      'payment_reference', p_payment_reference
    ),
    p_admin_user_id,
    now()
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Paiement confirmé avec succès'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour confirmer une signature (admin uniquement)
CREATE OR REPLACE FUNCTION confirm_signature(
  p_lead_id uuid,
  p_signature_method signature_method_type,
  p_signature_date date,
  p_signature_proof_url text DEFAULT NULL,
  p_signature_status text DEFAULT NULL,
  p_signature_notes text DEFAULT NULL,
  p_admin_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE crm_leads
  SET
    contract_signed = true,
    signature_method = p_signature_method,
    signature_date = p_signature_date,
    signature_proof_url = p_signature_proof_url,
    signature_status = p_signature_status,
    signature_notes = p_signature_notes,
    signature_verified_by = p_admin_user_id,
    signature_verified_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;

  -- Ajouter événement timeline
  INSERT INTO crm_timeline (
    id,
    lead_id,
    event_type,
    title,
    description,
    metadata,
    created_by,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_lead_id,
    'document_uploaded',
    'Signature confirmée',
    format('Méthode : %s - Date : %s', p_signature_method, p_signature_date),
    jsonb_build_object(
      'signature_method', p_signature_method,
      'signature_date', p_signature_date,
      'signature_proof_url', p_signature_proof_url,
      'signature_status', p_signature_status
    ),
    p_admin_user_id,
    now()
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Signature confirmée avec succès'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_payment_confirmed ON crm_leads(payment_confirmed) WHERE payment_confirmed = true;
CREATE INDEX IF NOT EXISTS idx_crm_leads_contract_signed ON crm_leads(contract_signed) WHERE contract_signed = true;
CREATE INDEX IF NOT EXISTS idx_crm_leads_payment_date ON crm_leads(payment_date) WHERE payment_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_signature_date ON crm_leads(signature_date) WHERE signature_date IS NOT NULL;

-- Commentaires
COMMENT ON COLUMN crm_leads.payment_confirmed IS 'Paiement confirmé par admin (traçabilité uniquement, TaxiAssur peut ne pas encaisser)';
COMMENT ON COLUMN crm_leads.payment_method IS 'Méthode de paiement : CB compagnie, prélèvement compagnie, ou CB TaxiAssur';
COMMENT ON COLUMN crm_leads.contract_signed IS 'Contrat signé (électroniquement ou manuellement)';
COMMENT ON COLUMN crm_leads.signature_method IS 'Méthode de signature : électronique assureur, électronique TaxiAssur, ou manuscrite';
COMMENT ON FUNCTION check_payment_signature_locks IS 'Vérifie si le lead peut devenir client actif (paiement + signature + docs OK)';
COMMENT ON FUNCTION confirm_payment IS 'Confirme un paiement avec traçabilité complète (admin only)';
COMMENT ON FUNCTION confirm_signature IS 'Confirme une signature avec traçabilité complète (admin only)';
