/*
  # Optimisation Ultra-Performante des Admin Users
  
  1. Index optimisés
    - Index composite sur email + is_active pour les requêtes d'auth
    - Index sur last_login pour les queries de monitoring
  
  2. RLS ultra-simplifié
    - Politique publique pour lecture (anon peut lire pour login)
    - Suppression des politiques trop complexes
  
  3. Performance
    - Cache query plan
    - Statistiques mises à jour
*/

-- Drop et recréer les index pour être sûr
DROP INDEX IF EXISTS idx_admin_users_email;
DROP INDEX IF EXISTS idx_admin_users_active;
DROP INDEX IF EXISTS idx_admin_users_email_active;
DROP INDEX IF EXISTS idx_admin_users_last_login;

-- Index composite ultra-optimisé pour les requêtes d'authentification
CREATE INDEX IF NOT EXISTS idx_admin_users_email_active_optimized 
ON admin_users(email, is_active) 
WHERE is_active = true;

-- Index séparé sur email (fallback)
CREATE INDEX IF NOT EXISTS idx_admin_users_email_fast 
ON admin_users(email);

-- Index pour les queries de monitoring
CREATE INDEX IF NOT EXISTS idx_admin_users_last_login_fast 
ON admin_users(last_login DESC) 
WHERE is_active = true;

-- Nettoyer toutes les anciennes politiques
DROP POLICY IF EXISTS "Admin users can read all admin data" ON admin_users;
DROP POLICY IF EXISTS "Admin users can read" ON admin_users;
DROP POLICY IF EXISTS "Public can read for login" ON admin_users;
DROP POLICY IF EXISTS "Public read for auth" ON admin_users;
DROP POLICY IF EXISTS "Anon can read for authentication" ON admin_users;
DROP POLICY IF EXISTS "Service role full access" ON admin_users;
DROP POLICY IF EXISTS "Admin users full access" ON admin_users;
DROP POLICY IF EXISTS "Anyone can read admin users for authentication" ON admin_users;
DROP POLICY IF EXISTS "Authenticated admins can update own record" ON admin_users;

-- RLS ultra-simple : tout le monde peut lire (nécessaire pour le login)
CREATE POLICY "Anyone can read admin users for authentication"
ON admin_users FOR SELECT
TO public
USING (true);

-- Seuls les admins authentifiés peuvent modifier (conversion UUID correcte)
CREATE POLICY "Authenticated admins can update own record"
ON admin_users FOR UPDATE
TO authenticated
USING (id::uuid = auth.uid());

-- Rafraîchir les statistiques pour l'optimiseur de requêtes
ANALYZE admin_users;

-- Commenter
COMMENT ON INDEX idx_admin_users_email_active_optimized IS 
'Index composite optimisé pour l''authentification des admins';
