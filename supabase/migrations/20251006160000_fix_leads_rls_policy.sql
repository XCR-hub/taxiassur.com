/*
  # Fix RLS Policy pour la table leads

  ## Problème
  - La table leads n'avait qu'une policy pour service_role
  - Les insertions depuis le frontend (avec anon key) étaient bloquées
  - Les leads apparaissaient vides car l'insertion échouait silencieusement

  ## Solution
  - Ajouter une policy INSERT pour anon (users non authentifiés)
  - Permettre à n'importe qui de soumettre un lead (formulaire public)
  - Les autres opérations (SELECT, UPDATE, DELETE) restent restreintes à service_role

  ## Sécurité
  - INSERT uniquement pour anon (pas de SELECT/UPDATE/DELETE)
  - RLS reste actif pour protéger les données existantes
  - Service role garde accès complet
*/

-- Policy pour permettre à anon d'insérer des leads (formulaire public)
CREATE POLICY "Allow anonymous users to insert leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Note: Les autres opérations (SELECT, UPDATE, DELETE) restent limitées à service_role uniquement
-- Cela protège les données tout en permettant les soumissions de formulaire publiques
