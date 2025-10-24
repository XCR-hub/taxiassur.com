/*
  # RECONSTRUCTION COMPLÈTE TABLE LEADS

  ## Problème
  - ERROR: 42703: column "lead_status" does not exist
  - La table existe mais n'a pas la bonne structure
  - Colonnes essentielles manquantes

  ## Solution
  - Sauvegarder les données existantes (si il y en a)
  - Recréer la table avec la structure complète
  - Restaurer les données

  ## Structure complète requise par le frontend
  Colonnes essentielles :
  - id, name, email, phone, city, status, immatriculation
  - fingerprint, behavior_score, time_on_page, source
  - lead_status, emails_sent, last_email_sent_at
  - notes, prime_realisee, contacted_at, devis_envoye_at, client_at
  - created_at, updated_at, metadata
*/

-- ============================================================================
-- 1. DIAGNOSTIC : Afficher la structure actuelle
-- ============================================================================

SELECT 'STRUCTURE ACTUELLE DE LA TABLE LEADS:' as info;

SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- Compter les leads existants
SELECT COUNT(*) as total_leads_existants FROM leads;

-- ============================================================================
-- 2. SAUVEGARDE : Créer une table temporaire avec les données existantes
-- ============================================================================

-- Supprimer l'ancienne sauvegarde si elle existe
DROP TABLE IF EXISTS leads_backup;

-- Créer une sauvegarde complète
CREATE TABLE leads_backup AS
SELECT * FROM leads;

SELECT 'SAUVEGARDE CRÉÉE:' as info, COUNT(*) as leads_sauvegardes FROM leads_backup;

-- ============================================================================
-- 3. SUPPRESSION : Supprimer la table actuelle
-- ============================================================================

-- Supprimer les policies RLS
DROP POLICY IF EXISTS "Allow anonymous users to submit leads" ON leads;
DROP POLICY IF EXISTS "Anonymous users can read all leads" ON leads;
DROP POLICY IF EXISTS "Allow anon to update leads" ON leads;
DROP POLICY IF EXISTS "Service role has full access to leads" ON leads;
DROP POLICY IF EXISTS "Enable insert for anon" ON leads;
DROP POLICY IF EXISTS "Enable read for anon" ON leads;
DROP POLICY IF EXISTS "Enable update for anon" ON leads;

-- Supprimer les index
DROP INDEX IF EXISTS idx_leads_email;
DROP INDEX IF EXISTS idx_leads_created_at;
DROP INDEX IF EXISTS idx_leads_lead_status;
DROP INDEX IF EXISTS idx_leads_source;
DROP INDEX IF EXISTS idx_leads_city;

-- Supprimer les ENUM s'ils existent
DROP TYPE IF EXISTS lead_status_enum CASCADE;
DROP TYPE IF EXISTS status_enum CASCADE;
DROP TYPE IF EXISTS contract_type_enum CASCADE;

-- Supprimer la table
DROP TABLE IF EXISTS leads CASCADE;

SELECT 'TABLE LEADS SUPPRIMÉE' as info;

-- ============================================================================
-- 4. CRÉATION : Recréer la table avec la structure complète
-- ============================================================================

CREATE TABLE leads (
  -- Identifiant unique
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations client (OBLIGATOIRES)
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,

  -- Type de contrat
  status text DEFAULT 'taxi',

  -- Immatriculation (optionnelle)
  immatriculation text,

  -- Données de sécurité et tracking
  fingerprint text,
  behavior_score integer DEFAULT 0,
  time_on_page integer DEFAULT 0,
  source text DEFAULT 'website_form',

  -- Gestion du lead (État du lead)
  lead_status text DEFAULT 'nouveau',
  emails_sent integer DEFAULT 0,
  last_email_sent_at timestamptz,
  conversion_date timestamptz,

  -- Suivi commercial
  notes text,
  prime_realisee numeric(10,2),
  contacted_at timestamptz,
  devis_envoye_at timestamptz,
  client_at timestamptz,
  assigned_to text,

  -- Métadonnées flexibles
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Contraintes
  CONSTRAINT valid_status CHECK (status IN ('taxi', 'vtc', 'autre')),
  CONSTRAINT valid_lead_status CHECK (lead_status IN ('nouveau', 'contacté', 'devis envoyé', 'client', 'perdu')),
  CONSTRAINT valid_behavior_score CHECK (behavior_score >= 0 AND behavior_score <= 100)
);

SELECT 'TABLE LEADS RECRÉÉE AVEC SUCCÈS' as info;

-- ============================================================================
-- 5. INDEXES : Créer les index pour les performances
-- ============================================================================

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_lead_status ON leads(lead_status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_city ON leads(city);

SELECT 'INDEX CRÉÉS' as info;

-- ============================================================================
-- 6. RLS : Activer Row Level Security
-- ============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy pour anonymous (insertion formulaire web)
CREATE POLICY "Allow anonymous users to submit leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy pour anonymous (lecture backoffice)
CREATE POLICY "Anonymous users can read all leads"
  ON leads
  FOR SELECT
  TO anon
  USING (true);

-- Policy pour anonymous (update backoffice)
CREATE POLICY "Allow anon to update leads"
  ON leads
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy pour service_role (accès complet)
CREATE POLICY "Service role has full access to leads"
  ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

SELECT 'POLICIES RLS CRÉÉES' as info;

-- ============================================================================
-- 7. RESTAURATION : Restaurer les données depuis la sauvegarde
-- ============================================================================

DO $$
DECLARE
  backup_count integer;
BEGIN
  -- Compter les leads dans la sauvegarde
  SELECT COUNT(*) INTO backup_count FROM leads_backup;

  IF backup_count > 0 THEN
    -- Restaurer les données (en mappant les colonnes existantes)
    INSERT INTO leads (
      id,
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
      lead_status,
      emails_sent,
      last_email_sent_at,
      conversion_date,
      notes,
      prime_realisee,
      contacted_at,
      devis_envoye_at,
      client_at,
      assigned_to,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      COALESCE(id, gen_random_uuid()),
      COALESCE(name, 'Inconnu'),
      COALESCE(email, 'noemail@temp.com'),
      COALESCE(phone, '0000000000'),
      COALESCE(city, 'Non renseignée'),
      COALESCE(status, 'taxi'),
      immatriculation,
      fingerprint,
      COALESCE(behavior_score, 0),
      COALESCE(time_on_page, 0),
      COALESCE(source, 'website_form'),
      COALESCE(lead_status, 'nouveau'),
      COALESCE(emails_sent, 0),
      last_email_sent_at,
      conversion_date,
      notes,
      prime_realisee,
      contacted_at,
      devis_envoye_at,
      client_at,
      assigned_to,
      COALESCE(metadata, '{}'::jsonb),
      COALESCE(created_at, now()),
      COALESCE(updated_at, now())
    FROM leads_backup
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '% leads restaurés depuis la sauvegarde', backup_count;
  ELSE
    RAISE NOTICE 'Aucun lead à restaurer (table vide)';
  END IF;
END $$;

-- ============================================================================
-- 8. CONFIRMATION : Afficher la structure finale
-- ============================================================================

SELECT 'STRUCTURE FINALE DE LA TABLE LEADS:' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- Compter les leads
SELECT 'TOTAL LEADS:' as info, COUNT(*) as total FROM leads;

-- Afficher les derniers leads
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

-- ============================================================================
-- 9. NETTOYAGE : Supprimer la sauvegarde (facultatif)
-- ============================================================================

-- Décommentez cette ligne si vous voulez supprimer la sauvegarde
-- DROP TABLE IF EXISTS leads_backup;

SELECT 'RECONSTRUCTION TERMINÉE !' as info;
SELECT 'La table leads_backup contient la sauvegarde des anciennes données.' as note;
SELECT 'Vous pouvez la supprimer avec: DROP TABLE leads_backup;' as conseil;
