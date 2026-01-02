/*
  # Ajout des types de documents manquants

  1. Modifications
    - Ajoute "autorisation_stationnement" et "rib" aux types de documents acceptés
    - Mise à jour du constraint sur prospect_documents

  2. Types ajoutés
    - autorisation_stationnement: Autorisation de stationnement taxi
    - rib: Relevé d'Identité Bancaire
*/

-- Supprimer l'ancien constraint
ALTER TABLE prospect_documents DROP CONSTRAINT IF EXISTS valid_prospect_document_type;

-- Créer le nouveau constraint avec les types supplémentaires
ALTER TABLE prospect_documents ADD CONSTRAINT valid_prospect_document_type CHECK (
  document_type IN (
    'licence_taxi',
    'permis_conduire',
    'piece_identite',
    'carte_grise',
    'releve_information',
    'autorisation_stationnement',
    'rib',
    'autre'
  )
);

-- Commentaires
COMMENT ON CONSTRAINT valid_prospect_document_type ON prospect_documents IS 'Types de documents acceptés incluant autorisation de stationnement et RIB';
