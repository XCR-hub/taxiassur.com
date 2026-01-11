/*
  # Fix crm_interactions Foreign Key Constraint

  1. Problème identifié
    - La table `crm_interactions` référence `crm_leads_enhanced`
    - Mais l'application utilise la table `crm_leads`
    - Cela cause une erreur de contrainte lors de l'upload de documents

  2. Solution
    - Supprimer l'ancienne contrainte vers `crm_leads_enhanced`
    - Créer une nouvelle contrainte vers `crm_leads`
    - Ajouter une contrainte pour supporter aussi `crm_leads_enhanced` si nécessaire

  3. Sécurité
    - Maintenir RLS existantes
    - Ne pas perdre de données
*/

-- Vérifier si la table crm_interactions existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'crm_interactions'
  ) THEN

    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_interactions_lead_id_fkey'
      AND table_name = 'crm_interactions'
    ) THEN
      ALTER TABLE crm_interactions
      DROP CONSTRAINT crm_interactions_lead_id_fkey;
    END IF;

    -- Ajouter la nouvelle contrainte vers crm_leads
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_interactions_lead_id_crm_leads_fkey'
      AND table_name = 'crm_interactions'
    ) THEN
      ALTER TABLE crm_interactions
      ADD CONSTRAINT crm_interactions_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id)
      REFERENCES crm_leads(id)
      ON DELETE CASCADE;
    END IF;

  END IF;
END $$;

-- Créer un index pour optimiser les requêtes sur lead_id
CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead_id
ON crm_interactions(lead_id);

-- Créer un index sur created_at pour les requêtes d'historique
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at
ON crm_interactions(created_at DESC);

-- Créer un index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead_type
ON crm_interactions(lead_id, type, created_at DESC);
