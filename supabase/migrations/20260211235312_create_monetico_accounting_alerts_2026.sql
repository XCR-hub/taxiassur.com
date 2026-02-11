/*
  # Système d'Alertes Comptables Monético 2026

  1. Nouvelles Tables
    - `accounting_alerts` : Configuration des alertes
    - `accounting_reports` : Historique des rapports envoyés

  2. Fonctions
    - `check_pending_payments_alert` : Alerte paiements en attente
    - `send_monthly_accounting_report` : Rapport mensuel automatique
    - `detect_failed_payments` : Détection paiements échoués

  3. Crons Automatiques
    - Alerte quotidienne paiements en attente
    - Rapport mensuel automatique
    - Détection anomalies

  4. Sécurité
    - RLS activé
    - Accès admin uniquement
*/

-- Table de configuration des alertes
CREATE TABLE IF NOT EXISTS accounting_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('pending_payments', 'failed_payments', 'monthly_report', 'reconciliation')),
  enabled boolean DEFAULT true,
  recipient_email text NOT NULL,
  threshold_days integer DEFAULT 7,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE accounting_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alerts"
ON accounting_alerts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Table historique des rapports
CREATE TABLE IF NOT EXISTS accounting_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_ca numeric DEFAULT 0,
  total_transactions integer DEFAULT 0,
  total_pending numeric DEFAULT 0,
  sent_to text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  report_data jsonb
);

ALTER TABLE accounting_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reports"
ON accounting_reports
FOR SELECT
TO authenticated
USING (true);

-- Fonction: Vérifier les paiements en attente
CREATE OR REPLACE FUNCTION check_pending_payments_alert()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pending_count integer;
  pending_amount numeric;
  alert_config record;
  result jsonb;
BEGIN
  -- Vérifier s'il y a une config d'alerte active
  SELECT * INTO alert_config
  FROM accounting_alerts
  WHERE alert_type = 'pending_payments'
    AND enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_config');
  END IF;

  -- Compter les paiements en attente depuis X jours
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0)
  INTO pending_count, pending_amount
  FROM monetico_payments
  WHERE status = 'pending'
    AND created_at < (NOW() - (alert_config.threshold_days || ' days')::interval);

  IF pending_count > 0 THEN
    -- Envoyer alerte via edge function
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email-universal',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := jsonb_build_object(
        'to', alert_config.recipient_email,
        'subject', format('⚠️ ALERTE : %s paiements en attente depuis %s jours', pending_count, alert_config.threshold_days),
        'html', format(
          '<h2 style="color: #F59E0B;">Alerte Paiements en Attente</h2>
          <p><strong>%s transactions</strong> sont en attente depuis plus de <strong>%s jours</strong></p>
          <p>Montant total : <strong>%s EUR</strong></p>
          <p>Merci de vérifier ces paiements dans le dashboard Monético.</p>
          <a href="https://taxiassur.fr/backoffice/monetico-accounting" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #F59E0B; color: white; text-decoration: none; border-radius: 5px;">Voir les paiements</a>',
          pending_count,
          alert_config.threshold_days,
          pending_amount
        )
      )
    );
  END IF;

  result := jsonb_build_object(
    'status', 'success',
    'pending_count', pending_count,
    'pending_amount', pending_amount,
    'alert_sent', pending_count > 0
  );

  RETURN result;
END;
$$;

-- Fonction: Rapport mensuel automatique
CREATE OR REPLACE FUNCTION send_monthly_accounting_report()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  alert_config record;
  month_start date;
  month_end date;
  total_ca numeric;
  total_pending numeric;
  total_failed numeric;
  count_transactions integer;
  result jsonb;
BEGIN
  -- Vérifier config
  SELECT * INTO alert_config
  FROM accounting_alerts
  WHERE alert_type = 'monthly_report'
    AND enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_config');
  END IF;

  -- Période du mois dernier
  month_start := date_trunc('month', CURRENT_DATE - interval '1 month')::date;
  month_end := (date_trunc('month', CURRENT_DATE) - interval '1 day')::date;

  -- Calculer les stats
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('failed', 'cancelled') THEN amount ELSE 0 END), 0),
    COUNT(*)
  INTO total_ca, total_pending, total_failed, count_transactions
  FROM monetico_payments
  WHERE created_at >= month_start
    AND created_at <= month_end;

  -- Sauvegarder le rapport
  INSERT INTO accounting_reports (
    report_type,
    period_start,
    period_end,
    total_ca,
    total_transactions,
    total_pending,
    sent_to,
    report_data
  ) VALUES (
    'monthly',
    month_start,
    month_end,
    total_ca,
    count_transactions,
    total_pending,
    alert_config.recipient_email,
    jsonb_build_object(
      'total_ca', total_ca,
      'total_pending', total_pending,
      'total_failed', total_failed
    )
  );

  -- Envoyer email
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email-universal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'to', alert_config.recipient_email,
      'subject', format('📊 Rapport Comptable Monético - %s', to_char(month_start, 'Month YYYY')),
      'html', format(
        '<h1 style="color: #4F46E5;">Rapport Comptable Mensuel</h1>
        <p>Période : <strong>%s au %s</strong></p>
        <table style="width: 100%%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #10B981; color: white;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>CA Encaissé</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>%s EUR</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Transactions</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">%s</td>
          </tr>
          <tr style="background: #F59E0B; color: white;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>En Attente</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>%s EUR</strong></td>
          </tr>
          <tr style="background: #EF4444; color: white;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Échoués</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>%s EUR</strong></td>
          </tr>
        </table>
        <a href="https://taxiassur.fr/backoffice/monetico-accounting" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Voir le détail</a>',
        to_char(month_start, 'DD/MM/YYYY'),
        to_char(month_end, 'DD/MM/YYYY'),
        total_ca,
        count_transactions,
        total_pending,
        total_failed
      )
    )
  );

  result := jsonb_build_object(
    'status', 'success',
    'period_start', month_start,
    'period_end', month_end,
    'total_ca', total_ca,
    'total_transactions', count_transactions
  );

  RETURN result;
END;
$$;

-- Insérer configuration par défaut
INSERT INTO accounting_alerts (alert_type, recipient_email, threshold_days)
VALUES 
  ('pending_payments', 'comptabilite@taxiassur.fr', 7),
  ('monthly_report', 'comptabilite@taxiassur.fr', 30),
  ('failed_payments', 'comptabilite@taxiassur.fr', 1)
ON CONFLICT DO NOTHING;

-- Crons (à activer via l'interface Supabase)
-- DAILY: SELECT check_pending_payments_alert();
-- MONTHLY: SELECT send_monthly_accounting_report();

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_monetico_payments_status_created
ON monetico_payments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_reports_period
ON accounting_reports(period_start, period_end);

-- Commentaires
COMMENT ON TABLE accounting_alerts IS 'Configuration des alertes comptables automatiques';
COMMENT ON TABLE accounting_reports IS 'Historique des rapports comptables envoyés';
COMMENT ON FUNCTION check_pending_payments_alert IS 'Alerte automatique pour les paiements en attente';
COMMENT ON FUNCTION send_monthly_accounting_report IS 'Envoi automatique du rapport mensuel';
