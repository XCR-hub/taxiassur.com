/*
  # Sécurisation des Politiques RLS pour social_networks
  
  Cette migration renforce la sécurité de la table social_networks en restreignant
  l'accès aux administrateurs uniquement.
  
  ## Changements
  
  1. Suppression de la politique permissive "Authenticated manage social networks"
  2. Création de politiques restrictives :
     - Seuls les admins peuvent gérer (INSERT/UPDATE/DELETE)
     - Le public peut voir les réseaux actifs (SELECT)
     - Les admins peuvent voir tous les réseaux
  
  ## Sécurité
  
  Avant : Tous les utilisateurs authentifiés pouvaient modifier les tokens
  Après : Seuls les super_admin et admin peuvent gérer les tokens
*/

-- Supprimer la politique trop permissive
DROP POLICY IF EXISTS "Authenticated manage social networks" ON public.social_networks;

-- Politique SELECT pour le public : voir uniquement les réseaux actifs (sans tokens)
CREATE POLICY "Public can view active networks"
  ON public.social_networks
  FOR SELECT
  TO public
  USING (is_active = true);

-- Politique SELECT pour les admins : voir tout
CREATE POLICY "Admins can view all networks"
  ON public.social_networks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );

-- Politique INSERT pour les admins
CREATE POLICY "Admins can insert networks"
  ON public.social_networks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );

-- Politique UPDATE pour les admins
CREATE POLICY "Admins can update networks"
  ON public.social_networks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );

-- Politique DELETE pour les admins
CREATE POLICY "Admins can delete networks"
  ON public.social_networks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );
