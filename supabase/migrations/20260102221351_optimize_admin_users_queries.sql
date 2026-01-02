/*
  # Optimisation des requêtes admin_users

  1. Index composé
    - Ajoute un index sur (email, is_active) pour accélérer les requêtes de login
    
  2. Performance
    - Accélère les requêtes loadAdminUser qui filtrent par email ET is_active
*/

-- Index composé pour accélérer les requêtes de login
CREATE INDEX IF NOT EXISTS idx_admin_users_email_active 
ON admin_users(email, is_active) 
WHERE is_active = true;

-- Statistiques pour le query planner
ANALYZE admin_users;
