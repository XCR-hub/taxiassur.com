/*
  # FIX LEAD_STATUS : CONVERSION ENUM → TEXT

  ## Problème
  - ERROR: 22P02: invalid input value for enum lead_status_enum: "taxi"
  - La colonne lead_status est un ENUM PostgreSQL
  - Le code essaie d'insérer des valeurs qui ne sont pas dans l'ENUM
  - Conflit entre les colonnes status et lead_status

  ## Solution
  - Supprimer l'ENUM lead_status_enum
  - Convertir lead_status en TEXT avec contrainte CHECK
  - S'assurer que la structure correspond au code

  ## Structure attendue
  - status → Type de contrat : 'taxi', 'vtc', 'autre'
  - lead_status → État du lead : 'nouveau', 'contacté', 'devis envoyé', 'client', 'perdu'
*/

-- ============================================================================
-- 1. VÉRIFIER LA STRUCTURE ACTUELLE
-- ============================================================================

-- Afficher les colonnes et leurs types
SELECT
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('status', 'lead_status')
ORDER BY column_name;

-- ============================================================================
-- 2. CONVERSION lead_status : ENUM → TEXT
-- ============================================================================

-- Étape 1 : Modifier le type de la colonne en TEXT
DO $$
BEGIN
  -- Convertir lead_status en TEXT (supprime automatiquement la dépendance à l'ENUM)
  ALTER TABLE leads
    ALTER COLUMN lead_status TYPE text
    USING lead_status::text;

  RAISE NOTICE 'lead_status converted to TEXT';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'lead_status might already be TEXT or conversion failed: %', SQLERRM;
END $$;

-- Étape 2 : Supprimer l'ENUM s'il existe encore
DROP TYPE IF EXISTS lead_status_enum CASCADE;

-- Étape 3 : Définir la valeur par défaut
ALTER TABLE leads
  ALTER COLUMN lead_status SET DEFAULT 'nouveau';

-- Étape 4 : Supprimer les anciennes contraintes
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_lead_status;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_status_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS lead_status_check;

-- Étape 5 : Ajouter la nouvelle contrainte CHECK
ALTER TABLE leads
  ADD CONSTRAINT valid_lead_status CHECK (
    lead_status IN ('nouveau', 'contacté', 'devis envoyé', 'client', 'perdu')
  );

-- ============================================================================
-- 3. VÉRIFIER/RÉPARER LA COLONNE STATUS
-- ============================================================================

-- Convertir status en TEXT si c'est un ENUM
DO $$
BEGIN
  ALTER TABLE leads
    ALTER COLUMN status TYPE text
    USING status::text;

  RAISE NOTICE 'status converted to TEXT';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'status might already be TEXT or conversion failed: %', SQLERRM;
END $$;

-- Supprimer l'ENUM status s'il existe
DROP TYPE IF EXISTS status_enum CASCADE;
DROP TYPE IF EXISTS contract_type_enum CASCADE;

-- Définir la valeur par défaut
ALTER TABLE leads
  ALTER COLUMN status SET DEFAULT 'taxi';

-- Supprimer les anciennes contraintes
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_contract_type;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS status_check;

-- Ajouter la nouvelle contrainte CHECK
ALTER TABLE leads
  ADD CONSTRAINT valid_status CHECK (
    status IN ('taxi', 'vtc', 'autre')
  );

-- ============================================================================
-- 4. MIGRER LES DONNÉES EXISTANTES (si nécessaire)
-- ============================================================================

-- Nettoyer les valeurs invalides dans lead_status
UPDATE leads
SET lead_status = 'nouveau'
WHERE lead_status NOT IN ('nouveau', 'contacté', 'devis envoyé', 'client', 'perdu')
   OR lead_status IS NULL;

-- Nettoyer les valeurs invalides dans status
UPDATE leads
SET status = 'taxi'
WHERE status NOT IN ('taxi', 'vtc', 'autre')
   OR status IS NULL;

-- ============================================================================
-- 5. S'ASSURER QUE TOUTES LES COLONNES ESSENTIELLES EXISTENT
-- ============================================================================

DO $$
BEGIN
  -- name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'name') THEN
    ALTER TABLE leads ADD COLUMN name text NOT NULL DEFAULT 'Inconnu';
    ALTER TABLE leads ALTER COLUMN name DROP DEFAULT;
  END IF;

  -- email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email') THEN
    ALTER TABLE leads ADD COLUMN email text NOT NULL DEFAULT 'noemail@temp.com';
    ALTER TABLE leads ALTER COLUMN email DROP DEFAULT;
  END IF;

  -- phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'phone') THEN
    ALTER TABLE leads ADD COLUMN phone text NOT NULL DEFAULT '0000000000';
    ALTER TABLE leads ALTER COLUMN phone DROP DEFAULT;
  END IF;

  -- city
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'city') THEN
    ALTER TABLE leads ADD COLUMN city text NOT NULL DEFAULT 'Non renseignée';
    ALTER TABLE leads ALTER COLUMN city DROP DEFAULT;
  END IF;

  -- immatriculation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'immatriculation') THEN
    ALTER TABLE leads ADD COLUMN immatriculation text;
  END IF;

  -- fingerprint
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'fingerprint') THEN
    ALTER TABLE leads ADD COLUMN fingerprint text;
  END IF;

  -- behavior_score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'behavior_score') THEN
    ALTER TABLE leads ADD COLUMN behavior_score integer DEFAULT 0;
  END IF;

  -- time_on_page
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'time_on_page') THEN
    ALTER TABLE leads ADD COLUMN time_on_page integer DEFAULT 0;
  END IF;

  -- source
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source') THEN
    ALTER TABLE leads ADD COLUMN source text DEFAULT 'website_form';
  END IF;

  -- created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'created_at') THEN
    ALTER TABLE leads ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'updated_at') THEN
    ALTER TABLE leads ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ============================================================================
-- 6. CONFIRMATION FINALE
-- ============================================================================

-- Afficher la structure finale
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- Compter les leads
SELECT COUNT(*) as total_leads FROM leads;

-- Afficher un échantillon
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
LIMIT 3;
