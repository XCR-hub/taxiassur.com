/*
  # Migration Complète - Table Leads avec RLS

  Ce fichier contient TOUTES les instructions SQL nécessaires pour :
  1. Créer la table leads
  2. Configurer Row Level Security (RLS)
  3. Ajouter les politiques de sécurité

  INSTRUCTIONS :
  1. Allez sur votre Dashboard Supabase
  2. SQL Editor (menu gauche)
  3. Copiez-collez ce fichier complet
  4. Cliquez "Run"
  5. Vérifiez qu'il n'y a pas d'erreur
*/

-- =============================================================================
-- ÉTAPE 1 : Créer la table leads (si elle n'existe pas déjà)
-- =============================================================================

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

-- =============================================================================
-- ÉTAPE 2 : Activer Row Level Security (RLS)
-- =============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ÉTAPE 3 : Supprimer toutes les anciennes politiques (nettoyage)
-- =============================================================================

-- Supprime les politiques si elles existent déjà
DROP POLICY IF EXISTS "Allow anonymous users to submit leads" ON leads;
DROP POLICY IF EXISTS "Service role can read all leads" ON leads;
DROP POLICY IF EXISTS "Service role can update all leads" ON leads;
DROP POLICY IF EXISTS "Service role can delete all leads" ON leads;
DROP POLICY IF EXISTS "Enable insert for anon" ON leads;
DROP POLICY IF EXISTS "Enable read for service_role" ON leads;
DROP POLICY IF EXISTS "Enable update for service_role" ON leads;

-- =============================================================================
-- ÉTAPE 4 : Créer les nouvelles politiques RLS
-- =============================================================================

-- POLITIQUE 1 : Permettre aux visiteurs anonymes de soumettre des leads
-- (Formulaire du site web)
CREATE POLICY "Allow anonymous users to submit leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- POLITIQUE 2 : Permettre au service_role de lire tous les leads
-- (Backoffice)
CREATE POLICY "Service role can read all leads"
  ON leads
  FOR SELECT
  TO service_role
  USING (true);

-- POLITIQUE 3 : Permettre au service_role de modifier tous les leads
-- (Backoffice)
CREATE POLICY "Service role can update all leads"
  ON leads
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- POLITIQUE 4 : Permettre au service_role de supprimer tous les leads
-- (Backoffice)
CREATE POLICY "Service role can delete all leads"
  ON leads
  FOR DELETE
  TO service_role
  USING (true);

-- =============================================================================
-- ÉTAPE 5 : Créer des index pour améliorer les performances
-- =============================================================================

-- Index sur email (recherche rapide)
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Index sur lead_status (filtrage rapide par statut)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);

-- Index sur created_at (tri par date)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- =============================================================================
-- ÉTAPE 6 : Créer une fonction pour mettre à jour updated_at automatiquement
-- =============================================================================

-- Supprime la fonction si elle existe
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Crée la fonction
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprime le trigger s'il existe
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;

-- Crée le trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ÉTAPE 7 : Vérification - Afficher toutes les politiques créées
-- =============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;

-- =============================================================================
-- ÉTAPE 8 : Vérification - Compter les leads existants
-- =============================================================================

SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE lead_status = 'nouveau') as nouveaux,
  COUNT(*) FILTER (WHERE lead_status = 'contacte') as contactes,
  COUNT(*) FILTER (WHERE lead_status = 'devis_envoye') as devis_envoyes,
  COUNT(*) FILTER (WHERE lead_status = 'client') as clients
FROM leads;

-- =============================================================================
-- RÉSULTAT ATTENDU
-- =============================================================================

/*
  Si tout s'est bien passé, vous devriez voir :

  1. ÉTAPE 7 : 4 politiques listées
     - Allow anonymous users to submit leads (INSERT, anon)
     - Service role can read all leads (SELECT, service_role)
     - Service role can update all leads (UPDATE, service_role)
     - Service role can delete all leads (DELETE, service_role)

  2. ÉTAPE 8 : Nombre de leads par statut
     - Affiche vos leads existants

  Si vous voyez ces résultats, la migration est RÉUSSIE ! ✅

  TESTS À FAIRE APRÈS :

  1. Test formulaire public :
     - Allez sur https://taxiassur.com
     - Remplissez le formulaire
     - ✅ Le lead doit être créé

  2. Test backoffice :
     - Allez sur /backoffice/leads
     - ✅ Vous devez voir tous les leads
     - ✅ Vous devez pouvoir modifier un lead
     - ✅ Vous devez pouvoir changer le statut

  3. Test sécurité :
     - Un visiteur anonyme ne peut PAS lire les leads (seulement les créer)
     - Seul le backoffice (service_role) peut lire/modifier/supprimer
*/
