/*
  # Ajouter les 7 statuts simplifiés au pipeline

  Ajout des nouveaux noms de statuts à l'enum existant
*/

-- Ajouter les nouveaux statuts s'ils n'existent pas
DO $$
BEGIN
  -- 1. NOUVEAU_LEAD
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'NOUVEAU_LEAD' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'NOUVEAU_LEAD';
    RAISE NOTICE 'Ajouté: NOUVEAU_LEAD';
  END IF;

  -- 2. COLLECTE_DOCUMENTS
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COLLECTE_DOCUMENTS' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'COLLECTE_DOCUMENTS';
    RAISE NOTICE 'Ajouté: COLLECTE_DOCUMENTS';
  END IF;

  -- 3. DEVIS
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DEVIS' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'DEVIS';
    RAISE NOTICE 'Ajouté: DEVIS';
  END IF;

  -- 4. DECISION_CLIENT
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DECISION_CLIENT' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'DECISION_CLIENT';
    RAISE NOTICE 'Ajouté: DECISION_CLIENT';
  END IF;

  -- 5. PAIEMENT
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAIEMENT' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'PAIEMENT';
    RAISE NOTICE 'Ajouté: PAIEMENT';
  END IF;

  -- 6. CONTRAT_SIGNATURE
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONTRAT_SIGNATURE' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'CONTRAT_SIGNATURE';
    RAISE NOTICE 'Ajouté: CONTRAT_SIGNATURE';
  END IF;

  -- 7. CLIENT_ACTIF
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CLIENT_ACTIF' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'CLIENT_ACTIF';
    RAISE NOTICE 'Ajouté: CLIENT_ACTIF';
  END IF;

  -- Statuts spéciaux
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RELANCE' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'RELANCE';
    RAISE NOTICE 'Ajouté: RELANCE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PERDU' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'PERDU';
    RAISE NOTICE 'Ajouté: PERDU';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RECONTACT_PROGRAMME' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'RECONTACT_PROGRAMME';
    RAISE NOTICE 'Ajouté: RECONTACT_PROGRAMME';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SINISTRE' AND enumtypid = 'lead_status'::regtype) THEN
    ALTER TYPE lead_status ADD VALUE 'SINISTRE';
    RAISE NOTICE 'Ajouté: SINISTRE';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Statuts ajoutés à l''enum lead_status';
END $$;
