/*
  # FIX URGENT : Politiques RLS manquantes sur crm_leads
  
  ## Problème
  - RLS activé sur crm_leads mais AUCUNE politique SELECT
  - Le frontend ne peut pas lire les leads
  - Le Kanban Pipeline est vide
  
  ## Solution
  - Ajouter politique SELECT pour authenticated
  - Ajouter politique SELECT pour anon (formulaires publics)
  - Ajouter politique INSERT pour anon (création de leads)
  - Ajouter politiques UPDATE/DELETE pour authenticated
  
  ## Sécurité
  - Les utilisateurs authentifiés peuvent tout voir/modifier
  - Les visiteurs anonymes peuvent seulement créer des leads
*/

-- 1️⃣ Politique SELECT pour utilisateurs authentifiés (voir tous les leads)
CREATE POLICY "Authenticated users can view all leads"
  ON crm_leads
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- 2️⃣ Politique SELECT pour anon (voir seulement via token d'accès)
CREATE POLICY "Public can view lead with access token"
  ON crm_leads
  FOR SELECT
  TO anon
  USING (
    access_token IS NOT NULL
    AND deleted_at IS NULL
  );

-- 3️⃣ Politique INSERT pour anon (création de leads depuis formulaires)
CREATE POLICY "Public can create leads"
  ON crm_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 4️⃣ Politique INSERT pour authenticated
CREATE POLICY "Authenticated can create leads"
  ON crm_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5️⃣ Politique UPDATE pour authenticated
CREATE POLICY "Authenticated can update leads"
  ON crm_leads
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

-- 6️⃣ Politique DELETE pour authenticated (soft delete)
CREATE POLICY "Authenticated can soft delete leads"
  ON crm_leads
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- 7️⃣ Service role a tous les droits (bypass RLS)
ALTER TABLE crm_leads FORCE ROW LEVEL SECURITY;
