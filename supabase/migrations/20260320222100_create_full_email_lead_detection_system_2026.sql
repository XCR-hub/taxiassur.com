/*
  # Système Complet de Détection Emails → Vrais Leads - 2026

  ## Objectif
  Détecter intelligemment les vrais leads parmi les emails entrants et ignorer :
  - Services de vérification d'emails (hunter.io, snov.io, apollo.io, etc.)
  - Boîtes jetables/temporaires (mailinator, yopmail, guerrillamail, etc.)
  - Outils de scraping et bots
  - Emails système / marketing automatisés

  ## Tables créées
  - `email_blacklist` : liste noire de domaines/patterns
  - `lead_deletion_log` : audit des suppressions

  ## Fonctions créées
  - `is_email_blacklisted()` : vérifie la liste noire
  - `classify_email_lead()` : classification complète avec score de confiance
  - `should_create_lead_from_email()` : décision binaire create/skip
  - `detect_spam_email()` : compatibilité ancien code
  - `safe_delete_lead()` / `delete_spam_lead()` : suppression sécurisée

  ## Colonnes ajoutées à crm_leads
  - `spam_score` : score de spam (0 = propre)
  - `is_verified` : lead vérifié manuellement
  - `lead_confidence` : niveau de confiance (high/medium/low/rejected/unknown)

  ## Sécurité
  - RLS activé sur toutes les nouvelles tables
  - Toutes les fonctions en SECURITY DEFINER avec search_path fixé
*/

-- =============================================
-- 1. TABLE EMAIL_BLACKLIST
-- =============================================
CREATE TABLE IF NOT EXISTS email_blacklist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_pattern text NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type IN ('exact', 'domain', 'contains')),
  reason       text,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id)
);

ALTER TABLE email_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage email blacklist"
  ON email_blacklist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_email_blacklist_pattern ON email_blacklist(email_pattern);
CREATE INDEX IF NOT EXISTS idx_email_blacklist_active ON email_blacklist(is_active) WHERE is_active = true;

-- =============================================
-- 2. TABLE LEAD_DELETION_LOG
-- =============================================
CREATE TABLE IF NOT EXISTS lead_deletion_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid NOT NULL,
  lead_email     text NOT NULL,
  lead_name      text,
  deletion_reason text NOT NULL,
  deleted_by     uuid REFERENCES auth.users(id),
  deleted_at     timestamptz DEFAULT now(),
  lead_data      jsonb
);

ALTER TABLE lead_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view deletion logs"
  ON lead_deletion_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

CREATE POLICY "Admin can insert deletion logs"
  ON lead_deletion_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_lead_deletion_log_email ON lead_deletion_log(lead_email);
CREATE INDEX IF NOT EXISTS idx_lead_deletion_log_deleted_at ON lead_deletion_log(deleted_at DESC);

-- =============================================
-- 3. COLONNES ADDITIONNELLES SUR crm_leads
-- =============================================
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS spam_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS lead_confidence text DEFAULT 'unknown';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'crm_leads_lead_confidence_check'
  ) THEN
    ALTER TABLE crm_leads
      ADD CONSTRAINT crm_leads_lead_confidence_check
      CHECK (lead_confidence IN ('high', 'medium', 'low', 'rejected', 'unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_leads_spam_score ON crm_leads(spam_score) WHERE spam_score > 50;
CREATE INDEX IF NOT EXISTS idx_crm_leads_verified ON crm_leads(is_verified);
CREATE INDEX IF NOT EXISTS idx_crm_leads_confidence ON crm_leads(lead_confidence);

-- =============================================
-- 4. INSERTION DE LA LISTE NOIRE
-- =============================================
INSERT INTO email_blacklist (email_pattern, pattern_type, reason) VALUES
  -- Services hébergement / infrastructure
  ('ionos.com', 'domain', 'Service hébergement IONOS'),
  ('ionos.fr', 'domain', 'Service hébergement IONOS'),
  ('1and1.com', 'domain', 'Service hébergement 1&1'),
  ('ovh.com', 'domain', 'Service hébergement OVH'),
  ('ovh.net', 'domain', 'Service hébergement OVH'),

  -- Réseaux sociaux
  ('instagram.com', 'domain', 'Notifications Instagram'),
  ('facebook.com', 'domain', 'Notifications Facebook'),
  ('linkedin.com', 'domain', 'Notifications LinkedIn'),
  ('twitter.com', 'domain', 'Notifications Twitter'),
  ('tiktok.com', 'domain', 'Notifications TikTok'),
  ('pinterest.com', 'domain', 'Notifications Pinterest'),
  ('youtube.com', 'domain', 'Notifications YouTube'),
  ('google.com', 'domain', 'Emails systèmes Google'),
  ('accounts.google.com', 'domain', 'Comptes Google'),

  -- Patterns no-reply
  ('noreply', 'contains', 'Email de non-réponse'),
  ('no-reply', 'contains', 'Email de non-réponse'),
  ('donotreply', 'contains', 'Email de non-réponse'),
  ('mailer-daemon', 'contains', 'Daemon d''envoi'),
  ('postmaster', 'contains', 'Postmaster'),

  -- Services marketing / envoi
  ('mailchimp.com', 'domain', 'Service marketing Mailchimp'),
  ('sendgrid.net', 'domain', 'Service d''envoi SendGrid'),
  ('brevo.com', 'domain', 'Service marketing Brevo'),
  ('sendinblue.com', 'domain', 'Service marketing Brevo'),
  ('mailer', 'contains', 'Service d''envoi automatique'),
  ('notification', 'contains', 'Notification système'),

  -- Services de vérification / enrichissement d'emails
  ('hunter.io', 'domain', 'Service de vérification d''email Hunter.io'),
  ('snov.io', 'domain', 'Service de prospection Snov.io'),
  ('apollo.io', 'domain', 'Plateforme sales intelligence Apollo.io'),
  ('lusha.com', 'domain', 'Service d''enrichissement Lusha'),
  ('zoominfo.com', 'domain', 'Plateforme B2B ZoomInfo'),
  ('clearbit.com', 'domain', 'Service d''enrichissement Clearbit'),
  ('rocketreach.co', 'domain', 'Service de prospection RocketReach'),
  ('voilanorbert.com', 'domain', 'Service de recherche d''emails'),
  ('findthat.email', 'domain', 'Service de recherche FindThat'),
  ('getprospect.com', 'domain', 'Service de prospection GetProspect'),
  ('emailsearch.io', 'domain', 'Service de recherche d''emails'),
  ('anymail.io', 'domain', 'Service de vérification d''emails'),
  ('verifalia.com', 'domain', 'Service de vérification Verifalia'),
  ('neverbounce.com', 'domain', 'Service de vérification NeverBounce'),
  ('zerobounce.net', 'domain', 'Service de vérification ZeroBounce'),
  ('debounce.io', 'domain', 'Service de vérification DeBounce'),
  ('kickbox.com', 'domain', 'Service de vérification Kickbox'),
  ('emaillistverify.com', 'domain', 'Service de vérification d''emails'),
  ('mailboxlayer.com', 'domain', 'API de vérification Mailboxlayer'),
  ('abstractapi.com', 'domain', 'API d''email validation'),

  -- Emails jetables / temporaires
  ('mailinator.com', 'domain', 'Email jetable Mailinator'),
  ('guerrillamail.com', 'domain', 'Email temporaire Guerrillamail'),
  ('guerrillamail.info', 'domain', 'Email temporaire Guerrillamail'),
  ('guerrillamail.biz', 'domain', 'Email temporaire Guerrillamail'),
  ('guerrillamail.de', 'domain', 'Email temporaire Guerrillamail'),
  ('guerrillamail.net', 'domain', 'Email temporaire Guerrillamail'),
  ('guerrillamail.org', 'domain', 'Email temporaire Guerrillamail'),
  ('yopmail.com', 'domain', 'Email temporaire Yopmail'),
  ('yopmail.fr', 'domain', 'Email temporaire Yopmail'),
  ('jetable.fr.nf', 'domain', 'Email temporaire'),
  ('10minutemail.com', 'domain', 'Email 10 minutes'),
  ('10minutemail.net', 'domain', 'Email 10 minutes'),
  ('10minutemail.org', 'domain', 'Email 10 minutes'),
  ('throwam.com', 'domain', 'Email jetable'),
  ('sharklasers.com', 'domain', 'Email jetable Guerrilla'),
  ('spam4.me', 'domain', 'Email anti-spam'),
  ('trashmail.com', 'domain', 'Email poubelle TrashMail'),
  ('trashmail.me', 'domain', 'Email poubelle TrashMail'),
  ('trashmail.net', 'domain', 'Email poubelle TrashMail'),
  ('trashmail.at', 'domain', 'Email poubelle TrashMail'),
  ('dispostable.com', 'domain', 'Email jetable'),
  ('tempmail.com', 'domain', 'Email temporaire TempMail'),
  ('temp-mail.org', 'domain', 'Email temporaire'),
  ('tempr.email', 'domain', 'Email temporaire'),
  ('throwaway.email', 'domain', 'Email jetable'),
  ('fakeinbox.com', 'domain', 'Boîte de réception fake'),
  ('maildrop.cc', 'domain', 'Email temporaire MailDrop'),
  ('getairmail.com', 'domain', 'Email temporaire'),
  ('filzmail.com', 'domain', 'Email temporaire'),
  ('discardmail.com', 'domain', 'Email à jeter'),
  ('spamgourmet.com', 'domain', 'Email anti-spam SpamGourmet'),
  ('anonaddy.com', 'domain', 'Email alias AnonAddy'),
  ('simplelogin.io', 'domain', 'Email alias SimpleLogin'),

  -- Outils de scraping / bots
  ('scrapingbee.com', 'domain', 'Service de scraping'),
  ('scraperapi.com', 'domain', 'API de scraping'),
  ('proxycrawl.com', 'domain', 'Service de crawl'),
  ('phantombuster.com', 'domain', 'Outil d''automatisation PhantomBuster'),
  ('browse.ai', 'domain', 'Service de scraping'),
  ('octoparse.com', 'domain', 'Outil de scraping'),
  ('webscraper.io', 'domain', 'Service de scraping'),

  -- CRM / Marketing tiers automatiques
  ('hubspot.com', 'domain', 'Emails automatiques HubSpot'),
  ('salesforce.com', 'domain', 'Emails automatiques Salesforce'),
  ('pipedrive.com', 'domain', 'Emails automatiques Pipedrive'),
  ('marketo.com', 'domain', 'Emails marketing Marketo'),
  ('pardot.com', 'domain', 'Emails marketing Pardot'),
  ('constantcontact.com', 'domain', 'Emails marketing'),
  ('klaviyo.com', 'domain', 'Emails marketing Klaviyo'),
  ('activecampaign.com', 'domain', 'Emails marketing ActiveCampaign'),

  -- Patterns de bots / systèmes
  ('bounce', 'contains', 'Notification de bounce'),
  ('daemon', 'contains', 'Processus système'),
  ('automated', 'contains', 'Email automatisé'),
  ('auto-confirm', 'contains', 'Confirmation automatique'),
  ('autoconfirm', 'contains', 'Confirmation automatique'),
  ('system@', 'contains', 'Email système'),
  ('robot@', 'contains', 'Email robot'),
  ('bot@', 'contains', 'Email bot'),
  ('crawler@', 'contains', 'Email crawler'),
  ('abuse@', 'contains', 'Email abus'),
  ('webmaster@', 'contains', 'Email webmaster générique')

ON CONFLICT DO NOTHING;

-- =============================================
-- 5. FONCTION is_email_blacklisted()
-- =============================================
CREATE OR REPLACE FUNCTION is_email_blacklisted(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_lower text;
  v_domain      text;
BEGIN
  v_email_lower := LOWER(TRIM(p_email));
  v_domain      := SPLIT_PART(v_email_lower, '@', 2);

  -- Vérifier email exact
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE pattern_type = 'exact' AND is_active = true
    AND LOWER(email_pattern) = v_email_lower
  ) THEN RETURN true; END IF;

  -- Vérifier domaine
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE pattern_type = 'domain' AND is_active = true
    AND v_domain LIKE '%' || LOWER(email_pattern)
  ) THEN RETURN true; END IF;

  -- Vérifier contains
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE pattern_type = 'contains' AND is_active = true
    AND v_email_lower LIKE '%' || LOWER(email_pattern) || '%'
  ) THEN RETURN true; END IF;

  RETURN false;
END;
$$;

-- =============================================
-- 6. FONCTION classify_email_lead() — COEUR DU SYSTÈME
-- =============================================
CREATE OR REPLACE FUNCTION classify_email_lead(
  p_email      text,
  p_subject    text    DEFAULT NULL,
  p_body       text    DEFAULT NULL,
  p_from_name  text    DEFAULT NULL,
  p_has_attach boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score       integer := 0;
  v_reasons     text[]  := ARRAY[]::text[];
  v_email_lower text;
  v_username    text;
  v_domain      text;
  v_name_parts  text[];
  v_digit_count integer;
  v_char_count  integer;
  v_is_real     boolean;
  v_confidence  text;
BEGIN
  v_email_lower := LOWER(TRIM(p_email));
  v_username    := SPLIT_PART(v_email_lower, '@', 1);
  v_domain      := SPLIT_PART(v_email_lower, '@', 2);

  -- ---- SIGNAUX NÉGATIFS ----

  -- Liste noire DB
  IF is_email_blacklisted(p_email) THEN
    v_score   := v_score - 100;
    v_reasons := array_append(v_reasons, 'Email/domaine sur liste noire');
  END IF;

  -- Username trop court
  IF length(v_username) < 3 THEN
    v_score   := v_score - 30;
    v_reasons := array_append(v_reasons, 'Nom d''utilisateur trop court');
  END IF;

  -- Username avec trop de chiffres (pattern aléatoire)
  v_digit_count := length(regexp_replace(v_username, '[^0-9]', '', 'g'));
  v_char_count  := length(v_username);
  IF v_char_count > 0 AND (v_digit_count::float / v_char_count) > 0.5 THEN
    v_score   := v_score - 25;
    v_reasons := array_append(v_reasons, 'Username avec majorité de chiffres (aléatoire)');
  END IF;

  -- Username trop long sans séparateur (pattern bot)
  IF length(v_username) > 20
     AND v_username NOT LIKE '%.%'
     AND v_username NOT LIKE '%_%'
     AND v_username NOT LIKE '%-%'
  THEN
    v_score   := v_score - 20;
    v_reasons := array_append(v_reasons, 'Username trop long sans séparateur');
  END IF;

  -- Email de réponse automatique
  IF p_subject IS NOT NULL AND (
    p_subject ILIKE 'Re:%' OR p_subject ILIKE 'Fwd:%' OR
    p_subject ILIKE 'TR:%' OR p_subject ILIKE 'AW:%'
  ) THEN
    v_score   := v_score - 20;
    v_reasons := array_append(v_reasons, 'Email de réponse/transfert');
  END IF;

  -- Sujet lié à vérification / absence / newsletter
  IF p_subject IS NOT NULL AND (
    p_subject ILIKE '%verify%'       OR p_subject ILIKE '%vérifi%'    OR
    p_subject ILIKE '%test email%'   OR p_subject ILIKE '%email check%' OR
    p_subject ILIKE '%validation%'   OR p_subject ILIKE '%unsubscribe%' OR
    p_subject ILIKE '%désabonnement%' OR p_subject ILIKE '%automatique%' OR
    p_subject ILIKE '%out of office%' OR p_subject ILIKE '%absence%' OR
    p_subject ILIKE '%newsletter%'   OR p_subject ILIKE '%bounce%' OR
    p_subject ILIKE '%congé%'        OR p_subject ILIKE '%automatic reply%'
  ) THEN
    v_score   := v_score - 30;
    v_reasons := array_append(v_reasons, 'Sujet lié à vérification/automatisation/absence');
  END IF;

  -- Corps contenant patterns de vérification d'email
  IF p_body IS NOT NULL AND (
    p_body ILIKE '%email verification%' OR p_body ILIKE '%verify your email%' OR
    p_body ILIKE '%email validation%'   OR p_body ILIKE '%confirm your email%' OR
    p_body ILIKE '%click to verify%'    OR p_body ILIKE '%email deliverability%' OR
    p_body ILIKE '%email checker%'      OR p_body ILIKE '%inbox placement%' OR
    p_body ILIKE '%catch-all%'          OR p_body ILIKE '%email exists%'
  ) THEN
    v_score   := v_score - 40;
    v_reasons := array_append(v_reasons, 'Corps contient pattern de vérification d''email');
  END IF;

  -- ---- SIGNAUX POSITIFS ----

  -- Vrai nom fourni (Prénom Nom)
  IF p_from_name IS NOT NULL
     AND length(TRIM(p_from_name)) > 3
     AND p_from_name NOT ILIKE '%@%'
     AND p_from_name ~ '^[A-ZÀ-Ÿa-zà-ÿ]'
  THEN
    v_name_parts := regexp_split_to_array(TRIM(p_from_name), '\s+');
    IF array_length(v_name_parts, 1) >= 2 THEN
      v_score   := v_score + 30;
      v_reasons := array_append(v_reasons, 'Vrai nom complet (Prénom + Nom)');
    ELSE
      v_score   := v_score + 10;
      v_reasons := array_append(v_reasons, 'Nom partiel fourni');
    END IF;
  END IF;

  -- Pièces jointes
  IF p_has_attach THEN
    v_score   := v_score + 25;
    v_reasons := array_append(v_reasons, 'Pièces jointes (signal positif)');
  END IF;

  -- Mots-clés taxi/assurance dans le sujet
  IF p_subject IS NOT NULL AND (
    p_subject ILIKE '%taxi%'      OR p_subject ILIKE '%assurance%' OR
    p_subject ILIKE '%devis%'     OR p_subject ILIKE '%cotisation%' OR
    p_subject ILIKE '%vtc%'       OR p_subject ILIKE '%conducteur%' OR
    p_subject ILIKE '%carte pro%' OR p_subject ILIKE '%renouvellement%' OR
    p_subject ILIKE '%contrat%'   OR p_subject ILIKE '%résiliation%' OR
    p_subject ILIKE '%tarif%'     OR p_subject ILIKE '%prime%' OR
    p_subject ILIKE '%sinistre%'  OR p_subject ILIKE '%accident%'
  ) THEN
    v_score   := v_score + 40;
    v_reasons := array_append(v_reasons, 'Sujet lié à taxi/assurance (signal fort)');
  END IF;

  -- Numéro de téléphone dans le corps
  IF p_body IS NOT NULL AND p_body ~ '(?:^|\s)(?:\+?33|0)[1-9](?:[\s.\-]?\d{2}){4}' THEN
    v_score   := v_score + 20;
    v_reasons := array_append(v_reasons, 'Numéro de téléphone trouvé');
  END IF;

  -- Domaine grand public reconnu
  IF v_domain IN (
    'gmail.com', 'yahoo.fr', 'yahoo.com', 'hotmail.fr', 'hotmail.com',
    'outlook.fr', 'outlook.com', 'wanadoo.fr', 'orange.fr', 'free.fr',
    'laposte.net', 'sfr.fr', 'bbox.fr', 'neuf.fr', 'live.fr', 'live.com',
    'msn.com', 'icloud.com', 'me.com', 'numericable.fr', 'bouyguestelecom.fr',
    'protonmail.com', 'pm.me'
  ) THEN
    v_score   := v_score + 15;
    v_reasons := array_append(v_reasons, 'Domaine email grand public reconnu');
  END IF;

  -- Domaine professionnel (pas liste noire, pas grand public)
  IF v_domain NOT IN (
    'gmail.com', 'yahoo.fr', 'yahoo.com', 'hotmail.fr', 'hotmail.com',
    'outlook.fr', 'outlook.com', 'wanadoo.fr', 'orange.fr', 'free.fr',
    'laposte.net', 'sfr.fr', 'bbox.fr', 'live.fr', 'live.com', 'icloud.com'
  )
  AND length(v_domain) > 5
  AND NOT is_email_blacklisted(p_email)
  THEN
    v_score   := v_score + 10;
    v_reasons := array_append(v_reasons, 'Domaine professionnel potentiel');
  END IF;

  -- Contact déjà connu dans le CRM
  IF EXISTS (
    SELECT 1 FROM crm_leads
    WHERE LOWER(email) = v_email_lower LIMIT 1
  ) THEN
    v_score   := v_score + 35;
    v_reasons := array_append(v_reasons, 'Contact déjà connu dans le CRM');
  END IF;

  -- ---- DÉCISION ----
  v_is_real := v_score >= 10;

  IF v_score >= 50 THEN
    v_confidence := 'high';
  ELSIF v_score >= 10 THEN
    v_confidence := 'medium';
  ELSIF v_score >= -10 THEN
    v_confidence := 'low';
  ELSE
    v_confidence := 'rejected';
  END IF;

  RETURN jsonb_build_object(
    'is_real_lead', v_is_real,
    'confidence',   v_confidence,
    'score',        v_score,
    'reasons',      v_reasons,
    'email',        p_email,
    'action',       CASE WHEN v_is_real THEN 'create_lead' ELSE 'skip' END
  );
END;
$$;

-- =============================================
-- 7. FONCTION should_create_lead_from_email()
-- =============================================
CREATE OR REPLACE FUNCTION should_create_lead_from_email(
  p_email      text,
  p_subject    text    DEFAULT NULL,
  p_body       text    DEFAULT NULL,
  p_has_attach boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (classify_email_lead(p_email, p_subject, p_body, NULL, p_has_attach)->>'is_real_lead')::boolean;
END;
$$;

-- =============================================
-- 8. FONCTION detect_spam_email() — compatibilité
-- =============================================
CREATE OR REPLACE FUNCTION detect_spam_email(
  p_email      text,
  p_subject    text    DEFAULT NULL,
  p_body       text    DEFAULT NULL,
  p_has_attach boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c jsonb;
BEGIN
  v_c := classify_email_lead(p_email, p_subject, p_body, NULL, p_has_attach);
  RETURN jsonb_build_object(
    'is_spam',            NOT (v_c->>'is_real_lead')::boolean,
    'spam_score',         -1 * (v_c->>'score')::integer,
    'reasons',            v_c->'reasons',
    'should_create_lead', (v_c->>'is_real_lead')::boolean,
    'confidence',         v_c->>'confidence',
    'classification',     v_c
  );
END;
$$;

-- =============================================
-- 9. FONCTION safe_delete_lead()
-- =============================================
CREATE OR REPLACE FUNCTION safe_delete_lead(
  p_lead_id       uuid,
  p_deletion_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_data jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès refusé - admins uniquement');
  END IF;

  SELECT jsonb_build_object(
    'id', id, 'name', COALESCE(first_name || ' ' || last_name, email),
    'email', email, 'phone', phone, 'status', status,
    'pipeline_stage', pipeline_stage, 'created_at', created_at
  )
  INTO v_lead_data
  FROM crm_leads WHERE id = p_lead_id;

  IF v_lead_data IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead introuvable');
  END IF;

  INSERT INTO lead_deletion_log (lead_id, lead_email, lead_name, deletion_reason, deleted_by, lead_data)
  VALUES (
    p_lead_id,
    v_lead_data->>'email',
    v_lead_data->>'name',
    p_deletion_reason,
    auth.uid(),
    v_lead_data
  );

  DELETE FROM crm_interactions WHERE lead_id = p_lead_id;
  DELETE FROM crm_lead_documents WHERE lead_id = p_lead_id;
  DELETE FROM lead_company_quotes WHERE lead_id = p_lead_id;
  DELETE FROM crm_leads WHERE id = p_lead_id;

  RETURN jsonb_build_object('success', true, 'message', 'Lead supprimé', 'deleted_lead', v_lead_data);
END;
$$;

CREATE OR REPLACE FUNCTION delete_spam_lead(
  p_lead_id uuid,
  p_reason  text DEFAULT 'Spam ou faux lead détecté'
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

-- =============================================
-- 10. FONCTION mark_lead_as_verified()
-- =============================================
CREATE OR REPLACE FUNCTION mark_lead_as_verified(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_leads
  SET is_verified = true, spam_score = 0, lead_confidence = 'high'
  WHERE id = p_lead_id
  AND EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid());
END;
$$;

-- =============================================
-- 11. PERMISSIONS
-- =============================================
GRANT EXECUTE ON FUNCTION is_email_blacklisted TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION classify_email_lead TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION should_create_lead_from_email TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION detect_spam_email TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION safe_delete_lead TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_spam_lead TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_lead_as_verified TO authenticated, service_role;

COMMENT ON TABLE email_blacklist IS 'Liste noire des emails/domaines à ignorer pour la création de leads';
COMMENT ON TABLE lead_deletion_log IS 'Log d''audit des suppressions de leads';
COMMENT ON FUNCTION classify_email_lead IS 'Classification intelligente email → vrai lead ou non (scrapers, vérificateurs, jetables, bots)';
COMMENT ON FUNCTION is_email_blacklisted IS 'Vérifie si un email est sur liste noire';
