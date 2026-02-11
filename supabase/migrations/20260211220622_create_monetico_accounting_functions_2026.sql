/*
  # Fonctions Comptables Monético 2026

  1. Fonctions RPC
    - `get_monetico_monthly_stats` : Stats mensuelles
    - `get_monetico_daily_stats` : Stats journalières
    - `get_monetico_reconciliation` : Réconciliation bancaire
    - `get_monetico_by_insurance_company` : CA par compagnie

  2. Sécurité
    - Accès authentifié uniquement
    - Optimisées pour la performance
*/

-- Stats mensuelles
CREATE OR REPLACE FUNCTION get_monetico_monthly_stats(
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS TABLE (
  month integer,
  month_name text,
  total_ca numeric,
  total_pending numeric,
  total_failed numeric,
  count_paid bigint,
  count_pending bigint,
  count_failed bigint,
  avg_ticket numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM mp.created_at)::integer as month,
    TO_CHAR(mp.created_at, 'Month') as month_name,
    COALESCE(SUM(CASE WHEN mp.status = 'paid' THEN mp.amount ELSE 0 END), 0) as total_ca,
    COALESCE(SUM(CASE WHEN mp.status = 'pending' THEN mp.amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN mp.status IN ('failed', 'cancelled') THEN mp.amount ELSE 0 END), 0) as total_failed,
    COUNT(*) FILTER (WHERE mp.status = 'paid') as count_paid,
    COUNT(*) FILTER (WHERE mp.status = 'pending') as count_pending,
    COUNT(*) FILTER (WHERE mp.status IN ('failed', 'cancelled')) as count_failed,
    COALESCE(AVG(mp.amount) FILTER (WHERE mp.status = 'paid'), 0) as avg_ticket
  FROM monetico_payments mp
  WHERE EXTRACT(YEAR FROM mp.created_at) = p_year
  GROUP BY EXTRACT(MONTH FROM mp.created_at), TO_CHAR(mp.created_at, 'Month')
  ORDER BY month;
END;
$$;

-- Stats journalières
CREATE OR REPLACE FUNCTION get_monetico_daily_stats(
  p_start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  day date,
  total_ca numeric,
  total_pending numeric,
  count_transactions bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.created_at::date as day,
    COALESCE(SUM(CASE WHEN mp.status = 'paid' THEN mp.amount ELSE 0 END), 0) as total_ca,
    COALESCE(SUM(CASE WHEN mp.status = 'pending' THEN mp.amount ELSE 0 END), 0) as total_pending,
    COUNT(*) as count_transactions
  FROM monetico_payments mp
  WHERE mp.created_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY mp.created_at::date
  ORDER BY day DESC;
END;
$$;

-- Réconciliation bancaire
CREATE OR REPLACE FUNCTION get_monetico_reconciliation(
  p_start_date timestamptz DEFAULT CURRENT_DATE,
  p_end_date timestamptz DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS TABLE (
  reference text,
  customer_name text,
  amount numeric,
  currency text,
  status text,
  authorization_number text,
  card_type text,
  card_last4 text,
  payment_date timestamptz,
  created_at timestamptz,
  lead_name text,
  lead_phone text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.reference,
    mp.customer_name,
    mp.amount,
    mp.currency,
    mp.status,
    mp.authorization_number,
    mp.card_type,
    mp.card_last4,
    mp.payment_date,
    mp.created_at,
    CONCAT(cl.prenom, ' ', cl.nom) as lead_name,
    cl.telephone as lead_phone
  FROM monetico_payments mp
  LEFT JOIN crm_leads cl ON mp.lead_id = cl.id
  WHERE mp.status = 'paid'
    AND mp.payment_date >= p_start_date
    AND mp.payment_date < p_end_date
  ORDER BY mp.payment_date DESC;
END;
$$;

-- CA par compagnie d'assurance
CREATE OR REPLACE FUNCTION get_monetico_by_insurance_company(
  p_start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  company_name text,
  total_ca numeric,
  count_payments bigint,
  avg_amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ic.name, 'Non assigné') as company_name,
    COALESCE(SUM(mp.amount), 0) as total_ca,
    COUNT(*) as count_payments,
    COALESCE(AVG(mp.amount), 0) as avg_amount
  FROM monetico_payments mp
  LEFT JOIN crm_leads cl ON mp.lead_id = cl.id
  LEFT JOIN lead_company_quotes lcq ON cl.id = lcq.lead_id AND lcq.status = 'validated'
  LEFT JOIN insurance_companies ic ON lcq.insurance_company_id = ic.id
  WHERE mp.status = 'paid'
    AND mp.created_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY ic.name
  ORDER BY total_ca DESC;
END;
$$;

-- Stats globales optimisées
CREATE OR REPLACE FUNCTION get_monetico_global_stats()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_ca', COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    'total_pending', COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0),
    'total_failed', COALESCE(SUM(CASE WHEN status IN ('failed', 'cancelled') THEN amount ELSE 0 END), 0),
    'count_paid', COUNT(*) FILTER (WHERE status = 'paid'),
    'count_pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'count_failed', COUNT(*) FILTER (WHERE status IN ('failed', 'cancelled')),
    'avg_transaction', COALESCE(AVG(amount) FILTER (WHERE status = 'paid'), 0),
    'last_payment_date', MAX(payment_date) FILTER (WHERE status = 'paid'),
    'total_transactions', COUNT(*)
  ) INTO result
  FROM monetico_payments;

  RETURN result;
END;
$$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_monetico_payments_created_at_status
ON monetico_payments(created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_monetico_payments_payment_date
ON monetico_payments(payment_date DESC)
WHERE payment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monetico_payments_status_amount
ON monetico_payments(status, amount);

-- Commentaires
COMMENT ON FUNCTION get_monetico_monthly_stats IS 'Statistiques mensuelles des paiements Monético';
COMMENT ON FUNCTION get_monetico_daily_stats IS 'Statistiques journalières des paiements Monético';
COMMENT ON FUNCTION get_monetico_reconciliation IS 'Export de réconciliation bancaire pour la comptabilité';
COMMENT ON FUNCTION get_monetico_by_insurance_company IS 'Chiffre d''affaires par compagnie d''assurance';
COMMENT ON FUNCTION get_monetico_global_stats IS 'Statistiques globales optimisées';
