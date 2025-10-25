-- ============================================
-- CONFIGURATION COMPLÈTE SUPABASE - TAXIASSUR
-- ============================================
-- Date: 2025-10-07
-- Description: Script SQL complet pour configurer toutes les tables et fonctions
-- Exécutez ce script dans Supabase SQL Editor

-- ============================================
-- 1. POLITIQUE RLS POUR LECTURE PUBLIQUE
-- ============================================

-- Cette politique permet à l'API PHP de lire les leads
DROP POLICY IF EXISTS "Allow public read access to leads" ON leads;

CREATE POLICY "Allow public read access to leads"
  ON leads
  FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- 2. VÉRIFICATION DES TABLES EXISTANTES
-- ============================================

-- Vérifier toutes les tables
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Vérifier toutes les politiques RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 3. VÉRIFICATION DES DONNÉES
-- ============================================

-- Compter les leads
SELECT COUNT(*) as total_leads FROM leads;

-- Voir les 5 derniers leads
SELECT
  id,
  name,
  email,
  phone,
  city,
  status,
  lead_status,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 4. FONCTIONS UTILES POUR LE BACKOFFICE
-- ============================================

-- Fonction pour mettre à jour le statut d'un lead
CREATE OR REPLACE FUNCTION update_lead_status(
  p_lead_id uuid,
  p_new_status text,
  p_prime_realisee numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_timestamp timestamptz := now();
BEGIN
  -- Mettre à jour le lead
  UPDATE leads
  SET
    lead_status = p_new_status,
    updated_at = v_timestamp,
    contacted_at = CASE
      WHEN p_new_status = 'contacte' THEN v_timestamp
      ELSE contacted_at
    END,
    devis_envoye_at = CASE
      WHEN p_new_status = 'devis_envoye' THEN v_timestamp
      ELSE devis_envoye_at
    END,
    client_at = CASE
      WHEN p_new_status = 'client' THEN v_timestamp
      ELSE client_at
    END,
    prime_realisee = COALESCE(p_prime_realisee, prime_realisee),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_lead_id;

  -- Retourner le résultat
  SELECT json_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'new_status', p_new_status,
    'updated_at', v_timestamp
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fonction pour obtenir les statistiques des leads
CREATE OR REPLACE FUNCTION get_lead_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'nouveau', COUNT(*) FILTER (WHERE lead_status = 'nouveau'),
    'contacte', COUNT(*) FILTER (WHERE lead_status = 'contacte'),
    'devis_envoye', COUNT(*) FILTER (WHERE lead_status = 'devis_envoye'),
    'client', COUNT(*) FILTER (WHERE lead_status = 'client'),
    'perdu', COUNT(*) FILTER (WHERE lead_status = 'perdu'),
    'today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'month', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
  )
  INTO v_stats
  FROM leads;

  RETURN v_stats;
END;
$$;

-- ============================================
-- 5. PERMISSIONS SUR LES FONCTIONS
-- ============================================

-- Permettre l'accès public aux fonctions (via anon key)
GRANT EXECUTE ON FUNCTION update_lead_status TO anon;
GRANT EXECUTE ON FUNCTION get_lead_stats TO anon;

-- ============================================
-- 6. TEST DES POLITIQUES RLS
-- ============================================

-- Vérifier que les politiques sont actives
DO $$
DECLARE
  v_count integer;
BEGIN
  -- Test lecture publique
  SET ROLE anon;
  SELECT COUNT(*) INTO v_count FROM leads;
  RESET ROLE;

  RAISE NOTICE 'Test RLS réussi : % leads accessibles avec rôle anon', v_count;
END $$;

-- ============================================
-- 7. RÉSUMÉ DE LA CONFIGURATION
-- ============================================

SELECT
  'Configuration complète' as status,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'leads') as rls_policies,
  current_timestamp as executed_at;
