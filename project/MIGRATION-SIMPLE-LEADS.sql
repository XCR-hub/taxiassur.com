-- =============================================================================
-- MIGRATION SIMPLE - LEADS TABLE + RLS
-- À copier-coller directement dans SQL Editor de Supabase
-- =============================================================================

-- Créer la table leads si elle n'existe pas
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text,
  status text DEFAULT 'taxi',
  immatriculation text,
  lead_status text DEFAULT 'nouveau',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  contacted_at timestamptz,
  devis_envoye_at timestamptz,
  client_at timestamptz,
  prime_realisee numeric(10,2),
  notes text,
  source text DEFAULT 'website',
  assigned_to text
);

-- Activer RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Allow anonymous users to submit leads" ON leads;
DROP POLICY IF EXISTS "Service role can read all leads" ON leads;
DROP POLICY IF EXISTS "Service role can update all leads" ON leads;
DROP POLICY IF EXISTS "Service role can delete all leads" ON leads;
DROP POLICY IF EXISTS "Enable insert for anon" ON leads;
DROP POLICY IF EXISTS "Enable read for service_role" ON leads;
DROP POLICY IF EXISTS "Enable update for service_role" ON leads;

-- Créer les nouvelles politiques
CREATE POLICY "Allow anonymous users to submit leads"
  ON leads FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Service role can read all leads"
  ON leads FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can update all leads"
  ON leads FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can delete all leads"
  ON leads FOR DELETE TO service_role USING (true);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Créer la fonction pour updated_at
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vérification : afficher les politiques
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;
