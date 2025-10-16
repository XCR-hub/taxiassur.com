/*
  # CORRECTION ERREURS + AJOUT SMS + AUGMENTATION EMAILS

  1. Corrections
    - Fix table automation_logs (vérifier existence avant création)
    - Fix page FAQ (utiliser faq_entries au lieu de faq)
    - Fix génération images Pexels

  2. Système SMS complet
    - Notifications SMS pour leads
    - SMS confirmation devis reçu
    - SMS devis envoyé
    - SMS contrat envoyé
    - SMS suivi personnalisé

  3. Augmentation emails automatiques
    - Emails quotidiens backlinks (au lieu de hebdo)
    - Emails quotidiens partenariats (au lieu de hebdo)
    - Scraping automatique sites taxis
    - Prospection directe taxis
*/

-- ============================================================================
-- 1. FIX TABLE AUTOMATION_LOGS
-- ============================================================================

-- Vérifier et créer seulement si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_logs') THEN
    CREATE TABLE automation_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      automation_type text NOT NULL,
      status text NOT NULL,
      details jsonb DEFAULT '{}'::jsonb,
      error_message text,
      execution_time interval,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX idx_automation_logs_created ON automation_logs(created_at DESC);
    CREATE INDEX idx_automation_logs_type ON automation_logs(automation_type, status);

    ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Authenticated users can read automation logs"
      ON automation_logs FOR SELECT TO authenticated USING (true);

    CREATE POLICY "Service role can manage automation logs"
      ON automation_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 2. TABLE SMS NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  message text NOT NULL,
  sms_type text NOT NULL, -- 'devis_recu', 'devis_envoye', 'contrat_envoye', 'rappel', 'custom'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  provider text DEFAULT 'twilio', -- 'twilio', 'ovh', 'sendinblue'
  provider_message_id text,
  error_message text,
  cost_euros decimal(10,4),
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_lead ON sms_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON sms_logs(sms_type);

-- RLS pour SMS logs
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read SMS logs"
  ON sms_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage SMS logs"
  ON sms_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. TABLE PROSPECTION TAXIS DIRECTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS taxi_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  city text NOT NULL,
  postal_code text,
  website_url text,
  source text NOT NULL, -- 'google_maps', 'pages_jaunes', 'scraping', 'manual'
  fleet_size int,
  status text NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'interested', 'not_interested', 'converted'
  last_contact_date timestamptz,
  next_contact_date timestamptz,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taxi_prospects_city ON taxi_prospects(city);
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_status ON taxi_prospects(status);
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_next_contact ON taxi_prospects(next_contact_date);

-- RLS
ALTER TABLE taxi_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read taxi prospects"
  ON taxi_prospects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage taxi prospects"
  ON taxi_prospects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. FONCTION ENVOI SMS
-- ============================================================================

CREATE OR REPLACE FUNCTION send_sms_notification(
  p_lead_id uuid,
  p_phone text,
  p_message text,
  p_type text
) RETURNS uuid AS $$
DECLARE
  v_sms_id uuid;
BEGIN
  -- Insérer log SMS
  INSERT INTO sms_logs (
    lead_id,
    phone_number,
    message,
    sms_type,
    status
  ) VALUES (
    p_lead_id,
    p_phone,
    p_message,
    p_type,
    'pending'
  ) RETURNING id INTO v_sms_id;

  -- Appeler edge function pour envoi réel
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'sms_id', v_sms_id,
      'phone', p_phone,
      'message', p_message,
      'type', p_type
    )
  );

  RETURN v_sms_id;
EXCEPTION WHEN OTHERS THEN
  -- Log erreur
  UPDATE sms_logs
  SET status = 'failed',
      error_message = SQLERRM
  WHERE id = v_sms_id;

  RETURN v_sms_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FONCTION AUTO SMS APRÈS CRÉATION LEAD
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_send_sms_on_lead()
RETURNS trigger AS $$
BEGIN
  -- Envoyer SMS confirmation si téléphone fourni
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    PERFORM send_sms_notification(
      NEW.id,
      NEW.phone,
      'Merci pour votre demande de devis TaxiAssur ! Nous vous recontactons sous 2h. Pour toute urgence : 01 XX XX XX XX',
      'devis_recu'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur nouvelle demande
DROP TRIGGER IF EXISTS trigger_auto_sms_on_lead ON leads;
CREATE TRIGGER trigger_auto_sms_on_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_send_sms_on_lead();

-- ============================================================================
-- 6. FONCTION SCRAPING TAXIS AUTOMATIQUE
-- ============================================================================

CREATE OR REPLACE FUNCTION schedule_taxi_scraping()
RETURNS void AS $$
BEGIN
  -- Appeler edge function de scraping
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scrape-taxi-companies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'cities', ARRAY['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Lille'],
      'max_per_city', 50
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. AUGMENTATION FRÉQUENCE EMAILS (QUOTIDIEN)
-- ============================================================================

-- Désactiver anciens crons hebdo
SELECT cron.unschedule('backlink-weekly');
SELECT cron.unschedule('partner-scraper-weekly');

-- Nouveau cron backlinks QUOTIDIEN à 08h
SELECT cron.schedule(
  'backlink-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{"daily": true, "max_emails": 10}'::jsonb
  );
  $$
);

-- Nouveau cron partenariats QUOTIDIEN à 09h
SELECT cron.schedule(
  'partner-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/partner-scraper-outreach',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{"daily": true, "max_emails": 10}'::jsonb
  );
  $$
);

-- Nouveau cron prospection taxis QUOTIDIEN à 10h
SELECT cron.schedule(
  'taxi-prospection-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/prospect-taxi-companies',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{"max_emails": 20}'::jsonb
  );
  $$
);

-- Scraping taxis QUOTIDIEN à 03h
SELECT cron.schedule(
  'scrape-taxis-daily',
  '0 3 * * *',
  $$SELECT schedule_taxi_scraping();$$
);

-- ============================================================================
-- 8. TEMPLATES SMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insérer templates par défaut
INSERT INTO sms_templates (name, type, message, variables) VALUES
  (
    'devis_recu',
    'devis_recu',
    'Merci {{prenom}} pour votre demande ! Votre devis TaxiAssur arrive sous 2h. Urgence ? 01 XX XX XX XX',
    '["prenom"]'::jsonb
  ),
  (
    'devis_envoye',
    'devis_envoye',
    '{{prenom}}, votre devis TaxiAssur est prêt ! Consultez-le : {{lien}}. Questions ? Répondez à ce SMS',
    '["prenom", "lien"]'::jsonb
  ),
  (
    'contrat_envoye',
    'contrat_envoye',
    'Félicitations {{prenom}} ! Votre contrat TaxiAssur est signé. Téléchargez-le : {{lien}}. Bienvenue !',
    '["prenom", "lien"]'::jsonb
  ),
  (
    'rappel_j3',
    'rappel',
    '{{prenom}}, avez-vous pu consulter votre devis TaxiAssur ? Besoin d''aide ? Répondez à ce SMS',
    '["prenom"]'::jsonb
  ),
  (
    'rappel_j7',
    'rappel',
    '{{prenom}}, -15% sur votre assurance taxi encore valable 48h ! Profitez-en : {{lien}}',
    '["prenom", "lien"]'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 9. FONCTION HELPER GET SMS TEMPLATE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sms_template(
  p_type text,
  p_variables jsonb DEFAULT '{}'::jsonb
) RETURNS text AS $$
DECLARE
  v_message text;
  v_key text;
  v_value text;
BEGIN
  -- Récupérer template
  SELECT message INTO v_message
  FROM sms_templates
  WHERE type = p_type AND active = true
  LIMIT 1;

  IF v_message IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remplacer variables
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_message := REPLACE(v_message, '{{' || v_key || '}}', v_value);
  END LOOP;

  RETURN v_message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. STATISTIQUES SMS ET PROSPECTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sms_stats()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_sms_sent', (SELECT COUNT(*) FROM sms_logs WHERE status = 'sent'),
    'sms_today', (SELECT COUNT(*) FROM sms_logs WHERE created_at > CURRENT_DATE),
    'sms_this_week', (SELECT COUNT(*) FROM sms_logs WHERE created_at > CURRENT_DATE - INTERVAL '7 days'),
    'delivery_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'delivered')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'failed')), 0) * 100,
        2
      )
      FROM sms_logs
    ),
    'total_cost_euros', (SELECT COALESCE(SUM(cost_euros), 0) FROM sms_logs WHERE status = 'sent'),
    'taxi_prospects_total', (SELECT COUNT(*) FROM taxi_prospects),
    'taxi_prospects_new', (SELECT COUNT(*) FROM taxi_prospects WHERE status = 'new'),
    'taxi_prospects_contacted', (SELECT COUNT(*) FROM taxi_prospects WHERE status = 'contacted'),
    'taxi_prospects_converted', (SELECT COUNT(*) FROM taxi_prospects WHERE status = 'converted'),
    'emails_sent_today', (SELECT COUNT(*) FROM email_logs WHERE sent_at > CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. FIX FAQ PAGE (utiliser faq_entries)
-- ============================================================================

-- Supprimer anciennes fonctions pour éviter conflits de type
DROP FUNCTION IF EXISTS get_faq_by_city(text);
DROP FUNCTION IF EXISTS get_all_faq();

-- Fonction pour récupérer FAQ par ville (corrigée)
CREATE OR REPLACE FUNCTION get_faq_by_city(p_city text)
RETURNS SETOF faq_entries AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM faq_entries
  WHERE city = p_city
     OR city IS NULL
  ORDER BY
    CASE WHEN city = p_city THEN 0 ELSE 1 END,
    created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer toutes les FAQ
CREATE OR REPLACE FUNCTION get_all_faq()
RETURNS SETOF faq_entries AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM faq_entries
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE sms_logs IS 'Logs de tous les SMS envoyés (confirmations, devis, contrats, rappels)';
COMMENT ON TABLE taxi_prospects IS 'Prospects taxis scrapés automatiquement pour prospection directe';
COMMENT ON TABLE sms_templates IS 'Templates SMS réutilisables avec variables';
COMMENT ON FUNCTION send_sms_notification IS 'Envoie un SMS à un lead et log dans sms_logs';
COMMENT ON FUNCTION get_sms_template IS 'Récupère un template SMS et remplace les variables';
COMMENT ON FUNCTION schedule_taxi_scraping IS 'Lance le scraping automatique des compagnies de taxis';
COMMENT ON FUNCTION get_sms_stats IS 'Retourne statistiques SMS et prospection en temps réel';
