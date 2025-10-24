-- ============================================================================
-- TEST D'INSERTION LEAD
-- ============================================================================
-- Ce script teste si un lead peut être inséré correctement
-- avec exactement les mêmes données que le formulaire frontend

-- Afficher la structure avant test
SELECT 'STRUCTURE ACTUELLE:' as info;
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('name', 'email', 'phone', 'city', 'status', 'lead_status', 'immatriculation')
ORDER BY column_name;

-- Test d'insertion (exactement comme le frontend)
INSERT INTO leads (
  name,
  email,
  phone,
  city,
  status,
  immatriculation,
  fingerprint,
  behavior_score,
  time_on_page,
  source,
  lead_status
) VALUES (
  'Test Formulaire',
  'test@example.com',
  '0612345678',
  'Paris',
  'taxi',
  'AB-123-CD',
  'test-fingerprint-123',
  75,
  45000,
  'website_form',
  'nouveau'
)
RETURNING
  id,
  name,
  email,
  city,
  status,
  lead_status,
  created_at;

-- Vérifier que le lead a été créé
SELECT 'LEAD CRÉÉ AVEC SUCCÈS !' as result;

-- Afficher tous les leads
SELECT
  id,
  name,
  email,
  city,
  status,
  lead_status,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 5;
