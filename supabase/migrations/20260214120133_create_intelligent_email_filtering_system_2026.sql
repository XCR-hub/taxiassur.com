/*
  # Système de Filtrage Intelligent des Emails - 14 Février 2026

  1. Nouvelles Tables
    - `email_blacklist` : Liste noire d'emails et domaines à ignorer
    - `lead_deletion_log` : Log des suppressions de leads

  2. Nouvelles Fonctions
    - `is_email_blacklisted()` : Vérifie si un email est sur liste noire
    - `detect_spam_email()` : Détection intelligente des spams
    - `safe_delete_lead()` : Suppression sécurisée d'un lead
    - `should_create_lead_from_email()` : Décide si un email doit créer un lead

  3. Sécurité
    - RLS activé sur toutes les tables
    - Logs de suppression pour audit
*/

-- Table de liste noire des emails
CREATE TABLE IF NOT EXISTS email_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_pattern text NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type IN ('exact', 'domain', 'contains')),
  reason text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE email_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage email blacklist"
  ON email_blacklist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_email_blacklist_pattern ON email_blacklist(email_pattern);
CREATE INDEX IF NOT EXISTS idx_email_blacklist_active ON email_blacklist(is_active) WHERE is_active = true;

-- Insérer les emails/domaines de service à bloquer
INSERT INTO email_blacklist (email_pattern, pattern_type, reason) VALUES
  -- Services d'hébergement
  ('ionos.com', 'domain', 'Service d''hébergement IONOS'),
  ('ionos.fr', 'domain', 'Service d''hébergement IONOS'),
  ('1and1.com', 'domain', 'Service d''hébergement 1&1'),
  ('ovh.com', 'domain', 'Service d''hébergement OVH - emails système'),
  ('ovh.net', 'domain', 'Service d''hébergement OVH'),

  -- Réseaux sociaux
  ('instagram.com', 'domain', 'Notifications Instagram'),
  ('facebook.com', 'domain', 'Notifications Facebook'),
  ('linkedin.com', 'domain', 'Notifications LinkedIn'),
  ('twitter.com', 'domain', 'Notifications Twitter'),
  ('tiktok.com', 'domain', 'Notifications TikTok'),

  -- Services de notification
  ('noreply', 'contains', 'Email de non-réponse'),
  ('no-reply', 'contains', 'Email de non-réponse'),
  ('donotreply', 'contains', 'Email de non-réponse'),
  ('mailer-daemon', 'contains', 'Daemon d''envoi'),
  ('postmaster', 'contains', 'Postmaster'),

  -- Services marketing/automation
  ('mailchimp.com', 'domain', 'Service marketing Mailchimp'),
  ('sendgrid.net', 'domain', 'Service d''envoi SendGrid'),
  ('brevo.com', 'domain', 'Service marketing Brevo'),
  ('sendinblue.com', 'domain', 'Service marketing Brevo'),

  -- Autres services
  ('mailer', 'contains', 'Service d''envoi automatique'),
  ('notification', 'contains', 'Notification système'),
  ('support@', 'contains', 'Email de support générique')
ON CONFLICT DO NOTHING;

-- Table de log des suppressions de leads
CREATE TABLE IF NOT EXISTS lead_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lead_email text NOT NULL,
  lead_name text,
  deletion_reason text NOT NULL,
  deleted_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz DEFAULT now(),
  lead_data jsonb
);

ALTER TABLE lead_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view deletion logs"
  ON lead_deletion_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_lead_deletion_log_email ON lead_deletion_log(lead_email);
CREATE INDEX IF NOT EXISTS idx_lead_deletion_log_deleted_at ON lead_deletion_log(deleted_at DESC);

-- Fonction : Vérifie si un email est sur liste noire
CREATE OR REPLACE FUNCTION is_email_blacklisted(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blacklisted boolean := false;
  v_email_lower text;
  v_domain text;
BEGIN
  v_email_lower := LOWER(TRIM(p_email));
  v_domain := SPLIT_PART(v_email_lower, '@', 2);

  -- Vérifier email exact
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE pattern_type = 'exact'
    AND is_active = true
    AND LOWER(email_pattern) = v_email_lower
  ) THEN
    RETURN true;
  END IF;

  -- Vérifier domaine
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE pattern_type = 'domain'
    AND is_active = true
    AND v_domain LIKE '%' || LOWER(email_pattern)
  ) THEN
    RETURN true;
  END IF;

  -- Vérifier contains
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE pattern_type = 'contains'
    AND is_active = true
    AND v_email_lower LIKE '%' || LOWER(email_pattern) || '%'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Fonction : Détection intelligente de spam
CREATE OR REPLACE FUNCTION detect_spam_email(
  p_email text,
  p_subject text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_has_attachments boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_is_spam boolean := false;
  v_spam_score integer := 0;
  v_reasons text[] := ARRAY[]::text[];
BEGIN
  -- Vérifier liste noire
  IF is_email_blacklisted(p_email) THEN
    v_is_spam := true;
    v_spam_score := v_spam_score + 100;
    v_reasons := array_append(v_reasons, 'Email sur liste noire');
  END IF;

  -- Vérifier si c'est une réponse (Re:, Fwd:)
  IF p_subject IS NOT NULL THEN
    IF p_subject ILIKE 'Re:%' OR p_subject ILIKE 'Fwd:%' OR p_subject ILIKE 'TR:%' THEN
      v_spam_score := v_spam_score + 30;
      v_reasons := array_append(v_reasons, 'Email de réponse (Re:/Fwd:)');
    END IF;
  END IF;

  -- Bonus si pièces jointes (signe de vraie demande)
  IF p_has_attachments THEN
    v_spam_score := v_spam_score - 20;
    v_reasons := array_append(v_reasons, 'Contient des pièces jointes (positif)');
  END IF;

  -- Vérifier si l'email existe déjà dans les leads
  IF EXISTS (
    SELECT 1 FROM crm_leads
    WHERE LOWER(email) = LOWER(p_email)
    AND created_at > NOW() - INTERVAL '30 days'
  ) THEN
    v_spam_score := v_spam_score + 50;
    v_reasons := array_append(v_reasons, 'Lead existant (moins de 30 jours)');
  END IF;

  -- Mots-clés spam dans le sujet
  IF p_subject IS NOT NULL THEN
    IF p_subject ILIKE '%unsubscribe%'
       OR p_subject ILIKE '%désabonnement%'
       OR p_subject ILIKE '%automatic%'
       OR p_subject ILIKE '%automatique%' THEN
      v_spam_score := v_spam_score + 40;
      v_reasons := array_append(v_reasons, 'Mots-clés spam dans le sujet');
    END IF;
  END IF;

  -- Déterminer si spam
  v_is_spam := v_spam_score >= 50;

  v_result := jsonb_build_object(
    'is_spam', v_is_spam,
    'spam_score', v_spam_score,
    'reasons', v_reasons,
    'should_create_lead', NOT v_is_spam
  );

  RETURN v_result;
END;
$$;

-- Fonction : Décide si on doit créer un lead depuis un email
CREATE OR REPLACE FUNCTION should_create_lead_from_email(
  p_email text,
  p_subject text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_has_attachments boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_detection jsonb;
BEGIN
  v_detection := detect_spam_email(p_email, p_subject, p_body, p_has_attachments);
  RETURN (v_detection->>'should_create_lead')::boolean;
END;
$$;

-- Fonction : Suppression sécurisée d'un lead
CREATE OR REPLACE FUNCTION safe_delete_lead(
  p_lead_id uuid,
  p_deletion_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_data jsonb;
  v_result jsonb;
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Accès refusé - Seuls les admins peuvent supprimer des leads'
    );
  END IF;

  -- Récupérer les données du lead avant suppression
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'email', email,
    'phone', phone,
    'city', city,
    'status', status,
    'pipeline_stage', pipeline_stage,
    'created_at', created_at
  )
  INTO v_lead_data
  FROM crm_leads
  WHERE id = p_lead_id;

  IF v_lead_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead introuvable'
    );
  END IF;

  -- Logger la suppression
  INSERT INTO lead_deletion_log (
    lead_id,
    lead_email,
    lead_name,
    deletion_reason,
    deleted_by,
    lead_data
  )
  VALUES (
    p_lead_id,
    v_lead_data->>'email',
    v_lead_data->>'name',
    p_deletion_reason,
    auth.uid(),
    v_lead_data
  );

  -- Supprimer les données liées (cascade devrait gérer mais on s'assure)
  DELETE FROM crm_interactions WHERE lead_id = p_lead_id;
  DELETE FROM crm_lead_documents WHERE lead_id = p_lead_id;
  DELETE FROM lead_company_quotes WHERE lead_id = p_lead_id;
  DELETE FROM crm_event_notifications WHERE (context_data->>'lead_id')::uuid = p_lead_id;

  -- Supprimer le lead
  DELETE FROM crm_leads WHERE id = p_lead_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Lead supprimé avec succès',
    'deleted_lead', v_lead_data
  );

  RETURN v_result;
END;
$$;

-- Fonction RPC publique pour les admins
CREATE OR REPLACE FUNCTION delete_spam_lead(
  p_lead_id uuid,
  p_reason text DEFAULT 'Spam ou faux lead détecté'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN safe_delete_lead(p_lead_id, p_reason);
END;
$$;

-- Ajouter une colonne pour marquer les emails suspects
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS spam_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Index pour filtrer les leads suspects
CREATE INDEX IF NOT EXISTS idx_crm_leads_spam_score ON crm_leads(spam_score) WHERE spam_score > 50;
CREATE INDEX IF NOT EXISTS idx_crm_leads_verified ON crm_leads(is_verified);

-- Fonction pour marquer un lead comme vérifié
CREATE OR REPLACE FUNCTION mark_lead_as_verified(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_leads
  SET is_verified = true,
      spam_score = 0
  WHERE id = p_lead_id
  AND EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
END;
$$;

COMMENT ON TABLE email_blacklist IS 'Liste noire des emails et domaines à ignorer lors de la création de leads';
COMMENT ON TABLE lead_deletion_log IS 'Log d''audit des suppressions de leads';
COMMENT ON FUNCTION is_email_blacklisted IS 'Vérifie si un email est sur liste noire';
COMMENT ON FUNCTION detect_spam_email IS 'Détection intelligente des spams avec scoring';
COMMENT ON FUNCTION should_create_lead_from_email IS 'Décide si un email doit créer un lead';
COMMENT ON FUNCTION safe_delete_lead IS 'Suppression sécurisée d''un lead avec logging';
COMMENT ON FUNCTION delete_spam_lead IS 'RPC publique pour supprimer un spam lead (admins only)';
