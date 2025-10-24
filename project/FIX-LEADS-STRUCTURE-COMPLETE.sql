/*
  # RÉPARATION COMPLÈTE STRUCTURE TABLE LEADS

  ## Problème
  - La table leads existe mais il manque des colonnes essentielles (name, email, phone, city)
  - Le code frontend essaie d'insérer dans ces colonnes
  - Résultat: ERROR 42703: column "name" does not exist

  ## Solution
  - Vérifier et ajouter TOUTES les colonnes manquantes
  - S'assurer que la structure correspond au code frontend
  - Conserver les données existantes (si il y en a)

  ## Colonnes requises par le frontend
  - id, name, email, phone, city, status, immatriculation
  - fingerprint, behavior_score, time_on_page, source
  - lead_status, emails_sent, last_email_sent_at
  - notes, prime_realisee, contacted_at, devis_envoye_at, client_at
  - created_at, updated_at
*/

-- ============================================================================
-- 1. AJOUTER LES COLONNES MANQUANTES
-- ============================================================================

DO $$
BEGIN
  -- Colonnes essentielles (client info)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'name') THEN
    ALTER TABLE leads ADD COLUMN name text NOT NULL DEFAULT 'Inconnu';
    ALTER TABLE leads ALTER COLUMN name DROP DEFAULT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email') THEN
    ALTER TABLE leads ADD COLUMN email text NOT NULL DEFAULT 'noemail@temp.com';
    ALTER TABLE leads ALTER COLUMN email DROP DEFAULT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'phone') THEN
    ALTER TABLE leads ADD COLUMN phone text NOT NULL DEFAULT '0000000000';
    ALTER TABLE leads ALTER COLUMN phone DROP DEFAULT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'city') THEN
    ALTER TABLE leads ADD COLUMN city text NOT NULL DEFAULT 'Non renseignée';
    ALTER TABLE leads ALTER COLUMN city DROP DEFAULT;
  END IF;

  -- Status et type de contrat
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'status') THEN
    ALTER TABLE leads ADD COLUMN status text DEFAULT 'taxi';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'immatriculation') THEN
    ALTER TABLE leads ADD COLUMN immatriculation text;
  END IF;

  -- Données de sécurité
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'fingerprint') THEN
    ALTER TABLE leads ADD COLUMN fingerprint text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'behavior_score') THEN
    ALTER TABLE leads ADD COLUMN behavior_score integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'time_on_page') THEN
    ALTER TABLE leads ADD COLUMN time_on_page integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source') THEN
    ALTER TABLE leads ADD COLUMN source text DEFAULT 'website_form';
  END IF;

  -- Gestion du lead
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'lead_status') THEN
    ALTER TABLE leads ADD COLUMN lead_status text DEFAULT 'nouveau';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'emails_sent') THEN
    ALTER TABLE leads ADD COLUMN emails_sent integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_email_sent_at') THEN
    ALTER TABLE leads ADD COLUMN last_email_sent_at timestamptz;
  END IF;

  -- Suivi commercial
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'notes') THEN
    ALTER TABLE leads ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'prime_realisee') THEN
    ALTER TABLE leads ADD COLUMN prime_realisee numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'contacted_at') THEN
    ALTER TABLE leads ADD COLUMN contacted_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'devis_envoye_at') THEN
    ALTER TABLE leads ADD COLUMN devis_envoye_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'client_at') THEN
    ALTER TABLE leads ADD COLUMN client_at timestamptz;
  END IF;

  -- Timestamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'created_at') THEN
    ALTER TABLE leads ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'updated_at') THEN
    ALTER TABLE leads ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Metadata flexible
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'metadata') THEN
    ALTER TABLE leads ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Colonne conversion_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'conversion_date') THEN
    ALTER TABLE leads ADD COLUMN conversion_date timestamptz;
  END IF;

  -- Assigned to (pour CRM)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'assigned_to') THEN
    ALTER TABLE leads ADD COLUMN assigned_to text;
  END IF;

END $$;

-- ============================================================================
-- 2. SUPPRIMER LES CONTRAINTES OBSOLÈTES
-- ============================================================================

ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_contract_type;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_lead_status;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_status_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_behavior_score;

-- ============================================================================
-- 3. AJOUTER LES NOUVELLES CONTRAINTES
-- ============================================================================

-- Contrainte sur status (type de contrat)
ALTER TABLE leads
ADD CONSTRAINT valid_contract_type CHECK (
  status IN ('taxi', 'vtc', 'autre')
);

-- Contrainte sur lead_status (état du lead) - VALEURS FRANÇAISES
ALTER TABLE leads
ADD CONSTRAINT valid_lead_status CHECK (
  lead_status IN ('nouveau', 'contacté', 'devis envoyé', 'client', 'perdu')
);

-- Contrainte sur behavior_score
ALTER TABLE leads
ADD CONSTRAINT valid_behavior_score CHECK (
  behavior_score >= 0 AND behavior_score <= 100
);

-- ============================================================================
-- 4. CRÉER LES INDEX POUR LA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);

-- ============================================================================
-- 5. S'ASSURER QUE RLS EST ACTIVÉ
-- ============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. VÉRIFIER QUE LES POLICIES EXISTENT
-- ============================================================================

-- Policy pour anonymous (insertion formulaire)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads'
    AND policyname = 'Allow anonymous users to submit leads'
  ) THEN
    CREATE POLICY "Allow anonymous users to submit leads"
      ON leads
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Policy pour anonymous (lecture backoffice)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads'
    AND policyname = 'Anonymous users can read all leads'
  ) THEN
    CREATE POLICY "Anonymous users can read all leads"
      ON leads
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Policy pour update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads'
    AND policyname = 'Allow anon to update leads'
  ) THEN
    CREATE POLICY "Allow anon to update leads"
      ON leads
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 7. CONFIRMATION
-- ============================================================================

-- Afficher la structure finale
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;
