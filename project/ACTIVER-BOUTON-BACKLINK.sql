-- ═══════════════════════════════════════════════════════════════
--  ACTIVER LE BOUTON "LANCER AUTOMATION" (10 SEC)
-- ═══════════════════════════════════════════════════════════════

-- 1. Vérifier si la table existe
SELECT 
  '📋 TABLE automation_campaigns' as section,
  COUNT(*) as existe
FROM information_schema.tables
WHERE table_name = 'automation_campaigns';

-- 2. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS automation_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  emails_sent integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  responses_received integer DEFAULT 0,
  backlinks_acquired integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  target_keywords text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. RLS
ALTER TABLE automation_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for all" ON automation_campaigns;
CREATE POLICY "Allow read access for all" ON automation_campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert" ON automation_campaigns;
CREATE POLICY "Allow authenticated users to insert" ON automation_campaigns FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update" ON automation_campaigns;
CREATE POLICY "Allow authenticated users to update" ON automation_campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Insérer une campagne de démarrage
INSERT INTO automation_campaigns (
  name,
  status,
  emails_sent,
  emails_opened,
  responses_received,
  backlinks_acquired,
  conversion_rate,
  target_keywords
) VALUES (
  'Campagne Assurance Taxi - Lancement',
  'active',
  0,
  0,
  0,
  0,
  0.0,
  ARRAY['assurance taxi', 'taxi professionnel', 'rc pro taxi']
) ON CONFLICT DO NOTHING;

-- 5. Ajouter quelques opportunités pour avoir des données à afficher
INSERT INTO backlink_opportunities (
  domain,
  url,
  title,
  description,
  domain_authority,
  relevance_score,
  estimated_traffic,
  spam_score,
  status,
  contact_email
) VALUES 
(
  'assurance-professionnelle.fr',
  'https://assurance-professionnelle.fr/partenaires',
  'Partenaires Assurance Professionnelle',
  'Site spécialisé en assurances professionnelles',
  45.0,
  85.0,
  1500.0,
  5.0,
  'new',
  'contact@assurance-professionnelle.fr'
),
(
  'taxi-infos.com',
  'https://taxi-infos.com/ressources',
  'Ressources pour Taxis',
  'Blog d''information pour professionnels du taxi',
  38.0,
  90.0,
  2000.0,
  3.0,
  'new',
  'redaction@taxi-infos.com'
),
(
  'transporteurs-mag.fr',
  'https://transporteurs-mag.fr/annuaire',
  'Annuaire Transporteurs',
  'Magazine des professionnels du transport',
  52.0,
  80.0,
  3000.0,
  2.0,
  'new',
  'contact@transporteurs-mag.fr'
)
ON CONFLICT (url) DO UPDATE SET
  domain_authority = EXCLUDED.domain_authority,
  relevance_score = EXCLUDED.relevance_score;

-- 6. Rafraîchir le cache
NOTIFY pgrst, 'reload schema';

-- 7. Vérifier les données
SELECT 
  '✅ CAMPAGNE CRÉÉE' as section,
  name,
  status,
  emails_sent,
  backlinks_acquired,
  conversion_rate
FROM automation_campaigns
LIMIT 1;

SELECT 
  '✅ OPPORTUNITÉS DISPONIBLES' as section,
  COUNT(*) as total_opportunites,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as nouvelles,
  ROUND(AVG(quality_score)::numeric, 2) as score_moyen
FROM backlink_opportunities;

-- 8. Afficher le statut du système
SELECT 
  '🎯 STATUT SYSTÈME' as section,
  (SELECT COUNT(*) FROM automation_campaigns) as campagnes_actives,
  (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'new') as opportunites_disponibles,
  (SELECT COUNT(*) FROM backlink_outreach_log) as emails_historique,
  'BOUTON DEVRAIT ÊTRE ACTIF ✅' as status_bouton;

SELECT '🎉 SYSTÈME PRÊT - RECHARGEZ LA PAGE!' as final_message;
