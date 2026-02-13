/*
  # Système d'invitation client avec création de mot de passe

  ## Description
  Quand un prospect devient client (converted_to_client = true), il reçoit automatiquement
  un email avec un lien pour créer son mot de passe et accéder à son espace client.

  ## Tables créées
  1. `client_invitations` - Tokens d'invitation temporaires
  
  ## Fonctionnalités
  - Génération automatique d'invitation quand converted_to_client = true
  - Lien unique et sécurisé avec expiration (7 jours)
  - Création du compte auth.users lors de la validation
  - Email automatique avec le lien d'invitation
  
  ## Sécurité
  - Token unique aléatoire
  - Expiration automatique après 7 jours
  - Un seul usage du token
  - RLS activé
*/

-- Table pour les invitations clients
CREATE TABLE IF NOT EXISTS public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL UNIQUE,
  invitation_token text NOT NULL UNIQUE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_lead_id ON client_invitations(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_expires_at ON client_invitations(expires_at);

-- Enable RLS
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- Policies (accès anonyme pour validation du token)
CREATE POLICY "Tout le monde peut lire les invitations valides"
  ON client_invitations
  FOR SELECT
  TO anon, authenticated
  USING (
    expires_at > now() 
    AND used_at IS NULL
  );

-- Fonction pour créer une invitation client
CREATE OR REPLACE FUNCTION public.create_client_invitation(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead crm_leads%ROWTYPE;
  v_invitation_token text;
  v_invitation_id uuid;
BEGIN
  -- Récupérer le lead
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id
    AND converted_to_client = true
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead introuvable ou non converti en client'
    );
  END IF;

  -- Vérifier si une invitation existe déjà
  IF EXISTS (
    SELECT 1 FROM client_invitations 
    WHERE lead_id = p_lead_id 
    AND expires_at > now()
    AND used_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Une invitation valide existe déjà pour ce client'
    );
  END IF;

  -- Générer un token unique
  v_invitation_token := encode(gen_random_bytes(32), 'hex');

  -- Créer l'invitation
  INSERT INTO client_invitations (lead_id, invitation_token, email)
  VALUES (p_lead_id, v_invitation_token, v_lead.email)
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'invitation_token', v_invitation_token,
    'email', v_lead.email
  );
END;
$$;

-- Fonction pour valider une invitation et créer le compte
CREATE OR REPLACE FUNCTION public.validate_client_invitation(
  p_token text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation client_invitations%ROWTYPE;
  v_lead crm_leads%ROWTYPE;
BEGIN
  -- Récupérer l'invitation
  SELECT * INTO v_invitation
  FROM client_invitations
  WHERE invitation_token = p_token
    AND expires_at > now()
    AND used_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation invalide ou expirée'
    );
  END IF;

  -- Récupérer le lead
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = v_invitation.lead_id;

  -- Vérifier si le compte n'existe pas déjà
  IF EXISTS (SELECT 1 FROM client_accounts WHERE lead_id = v_invitation.lead_id) THEN
    -- Marquer l'invitation comme utilisée
    UPDATE client_invitations
    SET used_at = now()
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Un compte existe déjà pour ce client'
    );
  END IF;

  -- Marquer l'invitation comme utilisée
  UPDATE client_invitations
  SET used_at = now()
  WHERE id = v_invitation.id;

  -- Retourner les infos pour création du compte
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead.id,
    'email', v_lead.email,
    'first_name', v_lead.first_name,
    'last_name', v_lead.last_name,
    'ready_for_creation', true
  );
END;
$$;

-- Fonction pour récupérer les infos d'une invitation
CREATE OR REPLACE FUNCTION public.get_invitation_info(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation client_invitations%ROWTYPE;
  v_lead crm_leads%ROWTYPE;
BEGIN
  SELECT * INTO v_invitation
  FROM client_invitations
  WHERE invitation_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation introuvable'
    );
  END IF;

  -- Vérifier si expirée
  IF v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation expirée'
    );
  END IF;

  -- Vérifier si déjà utilisée
  IF v_invitation.used_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation déjà utilisée'
    );
  END IF;

  -- Récupérer le lead
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = v_invitation.lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_invitation.email,
    'first_name', v_lead.first_name,
    'last_name', v_lead.last_name,
    'expires_at', v_invitation.expires_at
  );
END;
$$;

-- Trigger automatique lors de la conversion en client
CREATE OR REPLACE FUNCTION trigger_create_client_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Si le lead vient d'être converti en client
  IF NEW.converted_to_client = true AND (OLD.converted_to_client IS NULL OR OLD.converted_to_client = false) THEN
    -- Créer l'invitation
    v_result := create_client_invitation(NEW.id);
    
    IF (v_result->>'success')::boolean THEN
      -- Appeler l'edge function pour envoyer l'email
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-client-invitation-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
        ),
        body := jsonb_build_object(
          'lead_id', NEW.id,
          'email', NEW.email,
          'first_name', NEW.first_name,
          'last_name', NEW.last_name,
          'invitation_token', v_result->>'invitation_token'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_client_invitation_on_conversion ON crm_leads;
CREATE TRIGGER trigger_client_invitation_on_conversion
  AFTER UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_client_invitation();

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_client_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_client_invitation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_info TO anon, authenticated;

-- Commentaires
COMMENT ON TABLE client_invitations IS 
'Invitations temporaires pour créer un compte client avec mot de passe';

COMMENT ON FUNCTION public.create_client_invitation IS 
'Crée une invitation client avec token unique (appelée automatiquement lors de la conversion)';

COMMENT ON FUNCTION public.validate_client_invitation IS 
'Valide une invitation et prépare la création du compte client';

COMMENT ON FUNCTION public.get_invitation_info IS 
'Récupère les informations d''une invitation par son token';
