/*
  # Synchronisation des IDs admin_users avec auth.users
  
  ## Problème
  Les IDs dans admin_users ne correspondent pas aux IDs dans auth.users
  Ce qui empêche l'authentification de fonctionner correctement
  
  ## Solution
  1. Mettre à jour l'ID de master@taxiassur.com pour qu'il corresponde à auth.users
  2. S'assurer que tous les futurs admins auront le bon ID
*/

-- Mettre à jour l'ID du master admin pour qu'il corresponde à auth.users
UPDATE admin_users
SET id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'master@taxiassur.com' 
  LIMIT 1
)
WHERE email = 'master@taxiassur.com'
AND id != (
  SELECT id 
  FROM auth.users 
  WHERE email = 'master@taxiassur.com' 
  LIMIT 1
);

-- Log du résultat
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM admin_users au
  INNER JOIN auth.users u ON au.id = u.id AND au.email = u.email;
  
  RAISE NOTICE 'Admins avec IDs synchronisés: %', admin_count;
END $$;
