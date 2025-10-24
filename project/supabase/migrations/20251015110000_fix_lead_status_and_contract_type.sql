/*
  # Correction Nomenclature Leads - Status vs Lead_Status

  ## Problème
  Confusion entre le type de contrat (`status`) et l'état du lead (`lead_status`)

  ## Solution
  1. **`status`** = Type de contrat : "taxi", "vtc", "autre", **"rc-pro"** (NOUVEAU)
  2. **`lead_status`** = État de traitement : "nouveau", "contacté", "devis envoyé", "client", "perdu"

  ## Modifications
  - Ajouter "rc-pro" aux valeurs possibles du champ `status`
  - Renommer les valeurs de `lead_status` en français :
    - "new" → "nouveau"
    - "contacted" → "contacté"
    - "interested" → "devis envoyé"
    - "converted" → "client"
    - "lost" → "perdu"
  - Mettre à jour les données existantes
  - Recréer les contraintes CHECK

  ## Sécurité
  - Migration safe avec conversion automatique des données
  - Pas de perte de données
*/

-- ============================================================================
-- 1. SUPPRIMER LES ANCIENNES CONTRAINTES
-- ============================================================================

-- Supprimer contrainte sur status
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Supprimer contrainte sur lead_status
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_lead_status;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_status_check;

-- ============================================================================
-- 2. MIGRER LES DONNÉES EXISTANTES (lead_status anglais → français)
-- ============================================================================

UPDATE leads
SET lead_status = CASE lead_status
  WHEN 'new' THEN 'nouveau'
  WHEN 'contacted' THEN 'contacté'
  WHEN 'interested' THEN 'devis envoyé'
  WHEN 'quote_sent' THEN 'devis envoyé'
  WHEN 'converted' THEN 'client'
  WHEN 'lost' THEN 'perdu'
  ELSE 'nouveau' -- Fallback pour valeurs inconnues
END
WHERE lead_status IN ('new', 'contacted', 'interested', 'quote_sent', 'converted', 'lost');

-- ============================================================================
-- 3. CRÉER LES NOUVELLES CONTRAINTES
-- ============================================================================

-- Contrainte sur status (Type de contrat)
-- Valeurs : taxi, vtc, autre, rc-pro
ALTER TABLE leads
ADD CONSTRAINT valid_contract_type CHECK (
  status IN ('taxi', 'vtc', 'autre', 'rc-pro')
);

COMMENT ON CONSTRAINT valid_contract_type ON leads IS
'Type de contrat demandé : taxi, vtc, autre, ou rc-pro (responsabilité civile professionnelle)';

-- Contrainte sur lead_status (État du lead)
-- Valeurs : nouveau, contacté, devis envoyé, client, perdu
ALTER TABLE leads
ADD CONSTRAINT valid_lead_status CHECK (
  lead_status IN ('nouveau', 'contacté', 'devis envoyé', 'client', 'perdu')
);

COMMENT ON CONSTRAINT valid_lead_status ON leads IS
'État de traitement du lead : nouveau, contacté, devis envoyé, client, ou perdu';

-- ============================================================================
-- 4. METTRE À JOUR LES VALEURS PAR DÉFAUT
-- ============================================================================

-- Valeur par défaut pour status (taxi)
ALTER TABLE leads
ALTER COLUMN status SET DEFAULT 'taxi';

-- Valeur par défaut pour lead_status (nouveau)
ALTER TABLE leads
ALTER COLUMN lead_status SET DEFAULT 'nouveau';

-- ============================================================================
-- 5. AJOUTER DES COMMENTAIRES EXPLICITES
-- ============================================================================

COMMENT ON COLUMN leads.status IS
'Type de contrat demandé par le prospect : taxi, vtc, autre, ou rc-pro';

COMMENT ON COLUMN leads.lead_status IS
'État de traitement du lead dans le CRM : nouveau, contacté, devis envoyé, client, ou perdu';

-- ============================================================================
-- 6. CRÉER UNE VUE POUR FACILITER LES STATISTIQUES
-- ============================================================================

CREATE OR REPLACE VIEW leads_stats AS
SELECT
  -- Statistiques par type de contrat
  status as contract_type,
  COUNT(*) as total_leads,

  -- Statistiques par état
  SUM(CASE WHEN lead_status = 'nouveau' THEN 1 ELSE 0 END) as nouveaux,
  SUM(CASE WHEN lead_status = 'contacté' THEN 1 ELSE 0 END) as contactes,
  SUM(CASE WHEN lead_status = 'devis envoyé' THEN 1 ELSE 0 END) as devis_envoyes,
  SUM(CASE WHEN lead_status = 'client' THEN 1 ELSE 0 END) as clients,
  SUM(CASE WHEN lead_status = 'perdu' THEN 1 ELSE 0 END) as perdus,

  -- Taux de conversion
  ROUND(
    100.0 * SUM(CASE WHEN lead_status = 'client' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
    2
  ) as taux_conversion_pct,

  -- Date de mise à jour
  MAX(updated_at) as derniere_mise_a_jour
FROM leads
GROUP BY status;

COMMENT ON VIEW leads_stats IS
'Vue statistiques des leads par type de contrat et état de traitement';

-- Grant permissions sur la vue
GRANT SELECT ON leads_stats TO anon, authenticated;

-- ============================================================================
-- 7. FONCTION UTILITAIRE : Obtenir le libellé français
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contract_type_label(p_status text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_status
    WHEN 'taxi' THEN 'Taxi'
    WHEN 'vtc' THEN 'VTC'
    WHEN 'autre' THEN 'Autre'
    WHEN 'rc-pro' THEN 'RC Pro'
    ELSE 'Inconnu'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION get_lead_status_label(p_lead_status text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_lead_status
    WHEN 'nouveau' THEN 'Nouveau'
    WHEN 'contacté' THEN 'Contacté'
    WHEN 'devis envoyé' THEN 'Devis Envoyé'
    WHEN 'client' THEN 'Client'
    WHEN 'perdu' THEN 'Perdu'
    ELSE 'Inconnu'
  END;
END;
$$;

COMMENT ON FUNCTION get_contract_type_label IS 'Retourne le libellé français du type de contrat';
COMMENT ON FUNCTION get_lead_status_label IS 'Retourne le libellé français de l''état du lead';

-- ============================================================================
-- 8. TRIGGER : Valider les valeurs avant insertion/update
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_lead_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normaliser le status en minuscules
  NEW.status := LOWER(TRIM(NEW.status));

  -- Normaliser le lead_status en minuscules
  NEW.lead_status := LOWER(TRIM(NEW.lead_status));

  -- Valider que le status existe
  IF NEW.status NOT IN ('taxi', 'vtc', 'autre', 'rc-pro') THEN
    RAISE EXCEPTION 'Type de contrat invalide: %. Valeurs autorisées: taxi, vtc, autre, rc-pro', NEW.status;
  END IF;

  -- Valider que le lead_status existe
  IF NEW.lead_status NOT IN ('nouveau', 'contacté', 'devis envoyé', 'client', 'perdu') THEN
    RAISE EXCEPTION 'État lead invalide: %. Valeurs autorisées: nouveau, contacté, devis envoyé, client, perdu', NEW.lead_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_validate_lead_fields ON leads;
CREATE TRIGGER trigger_validate_lead_fields
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION validate_lead_fields();

COMMENT ON TRIGGER trigger_validate_lead_fields ON leads IS
'Valide et normalise automatiquement les champs status et lead_status';

-- ============================================================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 20251015110000 appliquée avec succès';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NOMENCLATURE CORRIGÉE:';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣ TYPE DE CONTRAT (status):';
  RAISE NOTICE '   ✅ taxi     - Assurance Taxi';
  RAISE NOTICE '   ✅ vtc      - Assurance VTC';
  RAISE NOTICE '   ✅ autre    - Autre type';
  RAISE NOTICE '   ✅ rc-pro   - RC Professionnelle (NOUVEAU)';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣ ÉTAT DU LEAD (lead_status):';
  RAISE NOTICE '   ✅ nouveau        - Lead non traité';
  RAISE NOTICE '   ✅ contacté       - Lead contacté';
  RAISE NOTICE '   ✅ devis envoyé   - Devis envoyé au client';
  RAISE NOTICE '   ✅ client         - Converti en client';
  RAISE NOTICE '   ✅ perdu          - Lead perdu';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 OUTILS CRÉÉS:';
  RAISE NOTICE '   ✅ Vue leads_stats pour statistiques';
  RAISE NOTICE '   ✅ Fonctions get_contract_type_label()';
  RAISE NOTICE '   ✅ Fonctions get_lead_status_label()';
  RAISE NOTICE '   ✅ Trigger de validation automatique';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Données existantes migrées automatiquement';
  RAISE NOTICE '';
END $$;
