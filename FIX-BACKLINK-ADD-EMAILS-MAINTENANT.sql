-- ══════════════════════════════════════════════════════════════════
--  FIX: AJOUTER EMAILS CONTACT AUX OPPORTUNITÉS
-- ══════════════════════════════════════════════════════════════════

-- Vérifier combien ont des emails NULL
SELECT 
  COUNT(*) as total_opportunites,
  COUNT(*) FILTER (WHERE contact_email IS NULL) as sans_email,
  COUNT(*) FILTER (WHERE contact_email IS NOT NULL) as avec_email
FROM backlink_opportunities;

-- Mettre à jour avec emails génériques (contact@domain)
UPDATE backlink_opportunities
SET 
  contact_email = 'contact@' || domain,
  contact_name = INITCAP(SPLIT_PART(domain, '.', 1)),
  updated_at = now()
WHERE contact_email IS NULL;

-- Vérifier résultat
SELECT 
  domain,
  contact_name,
  contact_email,
  status
FROM backlink_opportunities
ORDER BY created_at DESC
LIMIT 10;

-- Message confirmation
SELECT 
  '✅ EMAILS AJOUTÉS' as resultat,
  COUNT(*) || ' opportunités mises à jour' as details
FROM backlink_opportunities
WHERE contact_email IS NOT NULL;
