/*
  # Système intelligent de prise de contact

  1. Objectif
    - Remplacer l'étape CONTACT vague par un système concret de prise de contact
    - Workflow : NOUVEAU_LEAD → Contact multi-canal → COLLECTE_DOCUMENTS
    - Séquence automatique si pas de réponse : Appel → WhatsApp → SMS → Email

  2. Nouveaux champs
    - contact_attempts : historique des tentatives
    - last_contact_method : dernier canal utilisé
    - contact_established : contact établi ou non
    - last_contact_at : date du dernier contact

  3. Tables
    - contact_sequences : séquences de contact automatiques
*/

-- Ajouter des colonnes pour tracer les tentatives de contact
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS contact_attempts jsonb DEFAULT '[]'::jsonb;

ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS last_contact_method text;

ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS contact_established boolean DEFAULT false;

ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

-- Créer une table pour les séquences de contact automatiques
CREATE TABLE IF NOT EXISTS contact_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  sequence_type text NOT NULL, -- 'initial_contact', 'follow_up', 'document_request'
  step_number integer NOT NULL,
  channel text NOT NULL, -- 'call', 'whatsapp', 'sms', 'email'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'responded'
  sent_at timestamptz,
  delivered_at timestamptz,
  responded_at timestamptz,
  message_content text,
  response_content text,
  call_answered boolean, -- Spécifique pour les appels
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_contact_sequences_lead_id ON contact_sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_sequences_status ON contact_sequences(status);
CREATE INDEX IF NOT EXISTS idx_contact_sequences_created_at ON contact_sequences(created_at);

-- RLS pour contact_sequences
ALTER TABLE contact_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage contact sequences"
  ON contact_sequences
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour démarrer une séquence de contact
CREATE OR REPLACE FUNCTION start_contact_sequence(
  p_lead_id uuid,
  p_sequence_type text DEFAULT 'initial_contact'
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_lead record;
BEGIN
  -- Récupérer les infos du lead
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  -- Créer la séquence de contact initiale
  -- Étape 1 : Appel téléphonique (manuel)
  INSERT INTO contact_sequences (lead_id, sequence_type, step_number, channel, status)
  VALUES (p_lead_id, p_sequence_type, 1, 'call', 'pending');

  -- Marquer le lead comme ayant une séquence active
  UPDATE crm_leads
  SET 
    updated_at = now(),
    last_contact_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'sequence_type', p_sequence_type
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour enregistrer une tentative de contact
CREATE OR REPLACE FUNCTION record_contact_attempt(
  p_lead_id uuid,
  p_method text,
  p_success boolean,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_attempts jsonb;
  v_new_attempt jsonb;
BEGIN
  -- Récupérer les tentatives existantes
  SELECT contact_attempts INTO v_attempts
  FROM crm_leads
  WHERE id = p_lead_id;

  -- Créer la nouvelle tentative
  v_new_attempt := jsonb_build_object(
    'timestamp', now(),
    'method', p_method,
    'success', p_success,
    'notes', p_notes
  );

  -- Ajouter à la liste
  IF v_attempts IS NULL THEN
    v_attempts := '[]'::jsonb;
  END IF;

  v_attempts := v_attempts || jsonb_build_array(v_new_attempt);

  -- Mettre à jour le lead
  UPDATE crm_leads
  SET 
    contact_attempts = v_attempts,
    last_contact_method = p_method,
    last_contact_at = now(),
    contact_established = CASE WHEN p_success THEN true ELSE contact_established END,
    updated_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'attempts_count', jsonb_array_length(v_attempts)
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour déclencher la séquence automatique si appel échoué
CREATE OR REPLACE FUNCTION trigger_automatic_contact_sequence(p_lead_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_lead record;
  v_access_token text;
BEGIN
  -- Récupérer le lead
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  -- Générer le token d'accès pour l'espace prospect
  v_access_token := encode(digest(p_lead_id::text || now()::text, 'sha256'), 'hex');
  
  UPDATE crm_leads
  SET access_token = v_access_token
  WHERE id = p_lead_id;

  -- Créer les étapes de la séquence automatique
  -- Étape 2 : WhatsApp
  INSERT INTO contact_sequences (lead_id, sequence_type, step_number, channel, status, message_content)
  VALUES (
    p_lead_id, 
    'no_answer_sequence', 
    2, 
    'whatsapp', 
    'pending',
    'Bonjour ' || v_lead.first_name || ', nous avons essayé de vous joindre. Vous pouvez télécharger vos documents ici : ' || 
    current_setting('app.settings.app_url', true) || '/espace-prospect/' || v_access_token
  );

  -- Étape 3 : SMS  
  INSERT INTO contact_sequences (lead_id, sequence_type, step_number, channel, status, message_content)
  VALUES (
    p_lead_id,
    'no_answer_sequence',
    3,
    'sms',
    'pending',
    'TaxiAssur: Impossible de vous joindre. Uploadez vos documents: ' || 
    current_setting('app.settings.app_url', true) || '/espace-prospect/' || v_access_token
  );

  -- Étape 4 : Email
  INSERT INTO contact_sequences (lead_id, sequence_type, step_number, channel, status, message_content)
  VALUES (
    p_lead_id,
    'no_answer_sequence',
    4,
    'email',
    'pending',
    'Bonjour ' || v_lead.first_name || ',\n\nNous avons tenté de vous joindre par téléphone sans succès.\n\n' ||
    'Pour faire avancer votre dossier, vous pouvez :\n' ||
    '- Vous connecter à votre espace prospect pour télécharger vos documents\n' ||
    '- Nous envoyer directement vos documents par email\n' ||
    '- Nous les transmettre par WhatsApp\n\n' ||
    'Lien espace prospect : ' || current_setting('app.settings.app_url', true) || '/espace-prospect/' || v_access_token
  );

  RETURN jsonb_build_object(
    'success', true,
    'sequences_created', 3,
    'access_token', v_access_token
  );
END;
$$ LANGUAGE plpgsql;
