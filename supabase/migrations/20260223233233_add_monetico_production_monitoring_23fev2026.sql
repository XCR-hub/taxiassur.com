/*
  # Monitoring Paiements Monético Production - 23 Février 2026

  1. Améliorations
    - Index sur le mode de paiement (test/production) pour requêtes rapides
    - Index sur le statut pour monitoring des paiements réussis/échoués
    - Vue pour statistiques production
    - Fonction pour obtenir les stats du jour

  2. Sécurité
    - RLS maintenu sur toutes les tables
*/

-- Index pour filtrer rapidement par mode (test vs production)
CREATE INDEX IF NOT EXISTS idx_monetico_payments_mode
  ON monetico_payments ((monetico_data->>'mode'));

-- Index pour filtrer par statut
CREATE INDEX IF NOT EXISTS idx_monetico_payments_status
  ON monetico_payments (status);

-- Index combiné pour statistiques rapides
CREATE INDEX IF NOT EXISTS idx_monetico_payments_date_status
  ON monetico_payments (created_at, status)
  WHERE monetico_data->>'mode' = 'PRODUCTION';

-- Vue pour statistiques des paiements production
CREATE OR REPLACE VIEW monetico_production_stats AS
SELECT
  DATE(created_at) as date,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM monetico_payments
WHERE monetico_data->>'mode' = 'PRODUCTION'
GROUP BY DATE(created_at), status
ORDER BY date DESC, status;

-- Fonction pour obtenir les stats du jour en production
CREATE OR REPLACE FUNCTION get_monetico_production_today()
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  total_amount NUMERIC,
  avg_amount NUMERIC
) SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.status::TEXT,
    COUNT(*)::BIGINT as count,
    SUM(mp.amount)::NUMERIC as total_amount,
    AVG(mp.amount)::NUMERIC as avg_amount
  FROM monetico_payments mp
  WHERE DATE(mp.created_at) = CURRENT_DATE
    AND mp.monetico_data->>'mode' = 'PRODUCTION'
  GROUP BY mp.status;
END;
$$;

-- Fonction pour obtenir les derniers paiements production
CREATE OR REPLACE FUNCTION get_monetico_recent_production(limit_count INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  reference TEXT,
  amount NUMERIC,
  status TEXT,
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ,
  mode TEXT
) SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.id,
    mp.reference,
    mp.amount,
    mp.status,
    mp.customer_email,
    mp.customer_name,
    mp.created_at,
    (mp.monetico_data->>'mode')::TEXT as mode
  FROM monetico_payments mp
  WHERE mp.monetico_data->>'mode' = 'PRODUCTION'
  ORDER BY mp.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Permissions pour les vues et fonctions
GRANT SELECT ON monetico_production_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_monetico_production_today() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monetico_recent_production(INT) TO authenticated;

-- Commentaires pour documentation
COMMENT ON VIEW monetico_production_stats IS 'Statistiques quotidiennes des paiements Monético en production';
COMMENT ON FUNCTION get_monetico_production_today() IS 'Obtient les statistiques des paiements production du jour';
COMMENT ON FUNCTION get_monetico_recent_production(INT) IS 'Obtient les derniers paiements en production';
