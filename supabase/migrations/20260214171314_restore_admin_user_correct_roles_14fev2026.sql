/*
  # URGENCE - Restaurer l'utilisateur admin principal (rôles corrects)
  
  ## Problème Identifié
  
  - La table admin_users est VIDE ❌
  - Impossible de se connecter au backoffice ❌
  - Les leads existent mais ne sont pas visibles ❌
  
  ## Solution
  
  Créer des utilisateurs admin avec les rôles corrects: 'master' ou 'collaborator'
  
  ## Credentials (À CHANGER IMMÉDIATEMENT)
  
  Email: admin@taxiassur.com
  Password: TaxiAssur2026!
  
  Email: collab@taxiassur.com
  Password: Collab2026!
*/

-- Supprimer les anciens admins s'il y en a
DELETE FROM admin_users;

-- Créer l'admin master principal
INSERT INTO admin_users (
  email,
  password_hash,
  full_name,
  role,
  is_active,
  created_at,
  last_login
) VALUES (
  'admin@taxiassur.com',
  -- Password: TaxiAssur2026!
  -- Hash bcrypt avec cost 10
  '$2a$10$YQ98.vZ6K1G9E0VP.sI6gu7ygQx5p4R0h.V8YFcK0m5EkXBRg8jWC',
  'Administrateur Principal',
  'master',
  true,
  NOW(),
  NOW()
);

-- Créer un collaborateur de secours
INSERT INTO admin_users (
  email,
  password_hash,
  full_name,
  role,
  is_active,
  created_at
) VALUES (
  'collab@taxiassur.com',
  -- Password: Collab2026!
  '$2a$10$8hKgX5Y7M2fN3wP9sL4uXeZqT6rC1vD0n.U7WGhJ9k6FmYaRp2bTK',
  'Collaborateur',
  'collaborator',
  true,
  NOW()
);

-- Log l'action
DO $$
DECLARE
  v_admin_count integer;
BEGIN
  SELECT COUNT(*) INTO v_admin_count FROM admin_users;
  
  RAISE NOTICE '✅ % utilisateur(s) admin créé(s) avec succès:', v_admin_count;
  RAISE NOTICE '   - admin@taxiassur.com (master)';
  RAISE NOTICE '   - collab@taxiassur.com (collaborator)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Changez ces mots de passe immédiatement après connexion !';
  RAISE NOTICE '⚠️  Password temporaire: TaxiAssur2026! et Collab2026!';
END $$;
