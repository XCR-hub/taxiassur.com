/*
  # Système automatique de parsing des emails formulaire

  1. Problème
    - Des leads manquent (Nicolas Ruedy, Simon sp.taxi13200@gmail.com)
    - Les emails de formulaire ne sont pas tous synchronisés
    - Seulement 35 emails dans la base alors qu'il y en a beaucoup plus

  2. Solution
    - Créer un CRON pour parser automatiquement les emails formulaire
    - Créer les leads automatiquement depuis les emails
    - Lier les emails aux leads créés

  3. CRON
    - Toutes les 5 minutes
    - Parse les emails de team@taxiassur.com et noreply@taxiassur.com
    - Crée automatiquement les leads manquants
*/

-- CRON pour parser les emails formulaire et créer les leads automatiquement
SELECT cron.schedule(
  'parse-form-emails-create-leads-auto',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/parse-form-emails-create-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := jsonb_build_object(),
    timeout_milliseconds := 30000
  );
  $$
);

-- Fonction pour forcer la synchronisation manuelle
CREATE OR REPLACE FUNCTION force_sync_form_emails()
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Appeler l'edge function
  SELECT content::jsonb INTO v_result
  FROM http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/parse-form-emails-create-leads',
    jsonb_build_object(),
    'application/json',
    jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    )
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index pour accélérer la recherche des emails de formulaire
CREATE INDEX IF NOT EXISTS idx_email_messages_form_emails 
ON email_messages(from_email, subject) 
WHERE from_email IN ('team@taxiassur.com', 'noreply@taxiassur.com');

-- Index pour accélérer la recherche des emails sans lead
CREATE INDEX IF NOT EXISTS idx_email_messages_no_lead 
ON email_messages(lead_id) 
WHERE lead_id IS NULL;
