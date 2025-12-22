-- ══════════════════════════════════════════════════════════════════
--  FIX URGENT - Ajouter colonne contacted_at
-- ══════════════════════════════════════════════════════════════════

-- Ajouter colonnes manquantes
ALTER TABLE backlink_opportunities
ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
ADD COLUMN IF NOT EXISTS last_contact_date timestamptz,
ADD COLUMN IF NOT EXISTS email_sent_count integer DEFAULT 0;

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_contacted_at 
ON backlink_opportunities(contacted_at);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status_contacted 
ON backlink_opportunities(status, contacted_at);

-- Mettre à jour les opportunités déjà contactées
UPDATE backlink_opportunities
SET contacted_at = updated_at,
    last_contact_date = updated_at,
    email_sent_count = 1
WHERE status IN ('contacted', 'responded', 'negotiating', 'accepted');

-- Vérification
SELECT 
  'COLONNES AJOUTÉES ✅' as resultat,
  COUNT(*) as total_opportunites,
  COUNT(contacted_at) as avec_date_contact,
  COALESCE(SUM(email_sent_count), 0) as total_emails
FROM backlink_opportunities;
