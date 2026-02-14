/*
  # Fix generate_lead_access_token - Search Path

  1. Problème
    - La fonction digest() de pgcrypto n'est pas accessible
    - Le search_path est limité à 'public'

  2. Solution
    - Ajouter 'extensions' au search_path
    - Ou utiliser extensions.digest() explicitement
*/

-- Version 1 : Modifier le search_path
CREATE OR REPLACE FUNCTION public.generate_lead_access_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_token text;
BEGIN
  -- Générer un token SHA256 unique
  v_token := encode(digest(gen_random_uuid()::text || now()::text || random()::text, 'sha256'), 'hex');
  RETURN v_token;
END;
$function$;

-- Tester la fonction
DO $$
DECLARE
  v_test_token text;
BEGIN
  v_test_token := generate_lead_access_token();
  RAISE NOTICE 'Token généré (longueur: %): %', LENGTH(v_test_token), LEFT(v_test_token, 20) || '...';
  
  IF LENGTH(v_test_token) != 64 THEN
    RAISE EXCEPTION 'Token invalide : longueur % au lieu de 64', LENGTH(v_test_token);
  END IF;
  
  RAISE NOTICE '✅ Fonction generate_lead_access_token OK';
END $$;
