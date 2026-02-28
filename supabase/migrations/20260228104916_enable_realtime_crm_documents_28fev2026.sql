/*
  # Activer Realtime sur crm_lead_documents

  1. Changements
    - Active la publication realtime sur la table `crm_lead_documents`
    - Permet aux clients d'écouter les changements INSERT, UPDATE, DELETE en temps réel

  2. Sécurité
    - Les policies RLS existantes s'appliquent toujours
    - Seuls les utilisateurs authentifiés avec les bonnes permissions peuvent recevoir les events
*/

-- Activer la publication realtime sur crm_lead_documents
ALTER PUBLICATION supabase_realtime ADD TABLE crm_lead_documents;

-- Vérifier que la table a RLS activé (devrait déjà être le cas)
-- ALTER TABLE crm_lead_documents ENABLE ROW LEVEL SECURITY;

-- Commentaire pour référence
COMMENT ON TABLE crm_lead_documents IS 'Table des documents des leads - Realtime activé pour mise à jour live du CRM';
