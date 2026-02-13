/*
  # Système d'authentification Espace Client

  ## Description
  Création d'un espace client sécurisé avec authentification par email/mot de passe
  Séparé de l'espace prospect (qui utilise des tokens temporaires)

  ## Tables créées
  1. `client_accounts` - Comptes clients avec authentification
  
  ## Fonctionnalités
  - Login/mot de passe pour les clients convertis
  - Session sécurisée via Supabase Auth
  - Lien avec crm_leads pour récupérer les données
  - Accès aux documents, contrats, sinistres
  
  ## Sécurité
  - RLS activé
  - Les clients ne voient que leurs propres données
  - Mot de passe hashé par Supabase Auth
*/

-- Table pour lier les comptes auth aux leads
CREATE TABLE IF NOT EXISTS public.client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_client_accounts_user_id ON client_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_lead_id ON client_accounts(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_email ON client_accounts(email);

-- Enable RLS
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour client_accounts
CREATE POLICY "Les clients peuvent voir leur propre compte"
  ON client_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Les clients peuvent mettre à jour leur propre compte"
  ON client_accounts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fonction pour créer un compte client depuis un lead
CREATE OR REPLACE FUNCTION public.create_client_account(
  p_lead_id uuid,
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_lead crm_leads%ROWTYPE;
BEGIN
  -- Vérifier que le lead existe et est converti
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id
    AND converted_to_client = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead introuvable ou non converti en client'
    );
  END IF;

  -- Vérifier si le compte n'existe pas déjà
  IF EXISTS (SELECT 1 FROM client_accounts WHERE lead_id = p_lead_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Un compte client existe déjà pour ce lead'
    );
  END IF;

  -- Créer l'utilisateur dans auth.users (nécessite admin)
  -- Cette partie doit être gérée par l'edge function
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Compte client prêt à être créé'
  );
END;
$$;

-- Fonction pour récupérer les infos client complètes
CREATE OR REPLACE FUNCTION public.get_client_dashboard_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_account client_accounts%ROWTYPE;
  v_lead crm_leads%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Récupérer le compte client
  SELECT * INTO v_client_account
  FROM client_accounts
  WHERE user_id = auth.uid()
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Compte client introuvable'
    );
  END IF;

  -- Récupérer les données du lead
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = v_client_account.lead_id;

  -- Construire le résultat
  v_result := jsonb_build_object(
    'success', true,
    'client', jsonb_build_object(
      'id', v_client_account.id,
      'email', v_client_account.email,
      'last_login_at', v_client_account.last_login_at,
      'created_at', v_client_account.created_at
    ),
    'lead', jsonb_build_object(
      'id', v_lead.id,
      'first_name', v_lead.first_name,
      'last_name', v_lead.last_name,
      'email', v_lead.email,
      'phone', v_lead.phone,
      'address', v_lead.address,
      'postal_code', v_lead.postal_code,
      'city', v_lead.city,
      'company_name', v_lead.company_name,
      'contract_number', v_lead.contract_number,
      'status', v_lead.status
    )
  );

  -- Mettre à jour le last_login
  UPDATE client_accounts
  SET last_login_at = now()
  WHERE user_id = auth.uid();

  RETURN v_result;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_client_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_dashboard_data TO authenticated;

-- Commentaires
COMMENT ON TABLE client_accounts IS 
'Comptes clients avec authentification pour l''espace client sécurisé';

COMMENT ON FUNCTION public.create_client_account IS 
'Crée un compte client authentifié depuis un lead converti';

COMMENT ON FUNCTION public.get_client_dashboard_data IS 
'Récupère toutes les données du dashboard client (lead + compte)';
