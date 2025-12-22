/*
  # Configuration Initiale TaxiAssur - Base de Données Supabase

  ## Description
  Cette migration crée toute la structure nécessaire pour le projet TaxiAssur :
  - Table des leads (demandes de devis)
  - Politiques de sécurité RLS
  - Indexes pour les performances
  - Triggers pour la maintenance automatique

  ## Tables Créées
  1. **leads** - Stockage des demandes de devis clients

  ## Sécurité
  - RLS activé sur toutes les tables
  - Politique d'insertion publique pour le formulaire web
  - Lecture/modification réservée au service_role

  ## Performances
  - Index sur email, created_at, lead_status, source
  - Trigger automatique pour updated_at
*/

-- ============================================
-- 1. TABLE LEADS (Demandes de Devis)
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations client
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  status text DEFAULT 'taxi',
  immatriculation text,

  -- Données de sécurité et tracking
  fingerprint text,
  behavior_score integer DEFAULT 0,
  time_on_page integer DEFAULT 0,
  source text DEFAULT 'website_form',

  -- Gestion du lead
  lead_status text DEFAULT 'new',
  emails_sent integer DEFAULT 0,
  last_email_sent_at timestamptz,
  conversion_date timestamptz,

  -- Métadonnées flexibles
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Contraintes de validation
  CONSTRAINT valid_status CHECK (status IN ('taxi', 'vtc', 'autre')),
  CONSTRAINT valid_lead_status CHECK (lead_status IN ('new', 'contacted', 'interested', 'converted', 'lost')),
  CONSTRAINT valid_behavior_score CHECK (behavior_score >= 0 AND behavior_score <= 100),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================
-- 2. INDEX POUR PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);

-- ============================================
-- 3. FONCTION DE MISE À JOUR AUTOMATIQUE
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Politique pour le service_role (accès complet backoffice)
CREATE POLICY "Service role has full access to leads"
  ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politique pour les utilisateurs anonymes (formulaire web)
CREATE POLICY "Allow anonymous users to submit leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Politique pour les utilisateurs authentifiés (consultation uniquement)
CREATE POLICY "Authenticated users can read all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 5. VUES UTILES POUR LE BACKOFFICE
-- ============================================

-- Vue des statistiques globales
CREATE OR REPLACE VIEW leads_stats AS
SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE lead_status = 'new') as new_leads,
  COUNT(*) FILTER (WHERE lead_status = 'contacted') as contacted_leads,
  COUNT(*) FILTER (WHERE lead_status = 'interested') as interested_leads,
  COUNT(*) FILTER (WHERE lead_status = 'converted') as converted_leads,
  COUNT(*) FILTER (WHERE lead_status = 'lost') as lost_leads,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_leads,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_leads,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_leads,
  ROUND(AVG(behavior_score), 2) as avg_behavior_score,
  ROUND(AVG(time_on_page) / 1000, 2) as avg_time_on_page_seconds
FROM leads;

-- Vue des leads récents (7 derniers jours)
CREATE OR REPLACE VIEW recent_leads AS
SELECT
  id,
  name,
  email,
  phone,
  city,
  status,
  lead_status,
  behavior_score,
  created_at
FROM leads
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ============================================
-- 6. FONCTIONS UTILES
-- ============================================

-- Fonction pour obtenir les statistiques par ville
CREATE OR REPLACE FUNCTION get_leads_by_city()
RETURNS TABLE (
  city text,
  count bigint,
  converted bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.city,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE l.lead_status = 'converted') as converted,
    ROUND(
      (COUNT(*) FILTER (WHERE l.lead_status = 'converted')::numeric / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as conversion_rate
  FROM leads l
  GROUP BY l.city
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. COMMENTAIRES POUR DOCUMENTATION
-- ============================================

COMMENT ON TABLE leads IS 'Stockage des demandes de devis clients TaxiAssur';
COMMENT ON COLUMN leads.name IS 'Nom complet du client';
COMMENT ON COLUMN leads.email IS 'Email du client (validé par contrainte)';
COMMENT ON COLUMN leads.phone IS 'Numéro de téléphone';
COMMENT ON COLUMN leads.city IS 'Ville d''activité du taxi/VTC';
COMMENT ON COLUMN leads.status IS 'Type de professionnel: taxi, vtc, autre';
COMMENT ON COLUMN leads.fingerprint IS 'Empreinte navigateur pour détection de doublons';
COMMENT ON COLUMN leads.behavior_score IS 'Score de comportement utilisateur (0-100)';
COMMENT ON COLUMN leads.time_on_page IS 'Temps passé sur la page avant soumission (ms)';
COMMENT ON COLUMN leads.lead_status IS 'Statut du lead: new, contacted, interested, converted, lost';
COMMENT ON COLUMN leads.emails_sent IS 'Nombre d''emails envoyés pour ce lead';
COMMENT ON COLUMN leads.metadata IS 'Données supplémentaires au format JSON';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
