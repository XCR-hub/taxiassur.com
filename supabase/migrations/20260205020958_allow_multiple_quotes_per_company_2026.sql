/*
  # Permettre plusieurs devis de la même compagnie pour un lead

  ## Changements

  - Supprime la contrainte UNIQUE(lead_id, company_id) sur lead_company_quotes
  - Permet d'avoir plusieurs devis (initial, révisé, mis à jour) de la même compagnie pour un lead
  - Un lead peut maintenant recevoir:
    - Devis initial
    - Devis révisé avec d'autres garanties
    - Devis mis à jour avec nouveaux prix
    - Plusieurs versions du même devis

  ## Sécurité

  - Les RLS policies existantes restent en place
  - Aucun changement sur les permissions

  ## Impact

  - Résout l'erreur: "duplicate key value violates unique constraint 'lead_company_quotes_lead_id_company_id_key'"
  - Les commerciaux peuvent uploader plusieurs devis de la même compagnie
*/

-- Supprimer la contrainte UNIQUE sur (lead_id, company_id)
ALTER TABLE lead_company_quotes
DROP CONSTRAINT IF EXISTS lead_company_quotes_lead_id_company_id_key;

-- Ajouter une colonne pour versionner les devis (optionnel, pour traçabilité)
ALTER TABLE lead_company_quotes
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Index composite pour retrouver facilement tous les devis d'une compagnie pour un lead
-- (triés par date de création pour avoir le plus récent en premier)
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_lead_company_created
ON lead_company_quotes(lead_id, company_id, created_at DESC);

-- Commentaire sur la table
COMMENT ON TABLE lead_company_quotes IS 'Stocke les devis des compagnies pour chaque lead. Un lead peut avoir plusieurs devis de la même compagnie (versions, révisions, mises à jour).';
COMMENT ON COLUMN lead_company_quotes.version IS 'Numéro de version du devis (1 = initial, 2+ = révisions)';
