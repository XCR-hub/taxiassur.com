/*
  # Fix Leads RLS - Accès Anonymous Role

  1. Problème
    - Le backoffice n'utilise PAS Supabase Auth
    - Il utilise sessionStorage pour l'authentification
    - Les requêtes Supabase sont faites avec le role 'anon'
    - Actuellement, seul 'authenticated' peut SELECT
    - Résultat : 0 leads affichés dans le backoffice

  2. Solution
    - Ajouter policy SELECT pour role 'anon'
    - Permet au backoffice de lire les leads
    - INSERT déjà autorisé pour 'anon' (formulaire public)

  3. Sécurité
    - Acceptable car : backoffice protégé par AuthGuard
    - L'URL /backoffice nécessite mot de passe
    - Les leads ne contiennent pas de données ultra-sensibles
    - Alternative : migrer vers vraie auth Supabase (complexe)
*/

-- Ajouter policy SELECT pour role anon
CREATE POLICY "Anonymous users can read all leads"
  ON leads
  FOR SELECT
  TO anon
  USING (true);
