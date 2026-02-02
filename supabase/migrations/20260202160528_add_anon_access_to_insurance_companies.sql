/*
  # Accès anonyme aux compagnies d'assurance

  1. Modifications
    - Ajout policy RLS pour lecture publique des compagnies d'assurance
    - Permet aux prospects de voir les logos et informations des compagnies

  2. Sécurité
    - Lecture seule
    - Données non sensibles (logos, noms, téléphones)
*/

-- Policy pour permettre l'accès anonyme en lecture aux compagnies d'assurance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'insurance_companies'
      AND policyname = 'Public can view insurance companies'
  ) THEN
    CREATE POLICY "Public can view insurance companies"
      ON insurance_companies
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;
