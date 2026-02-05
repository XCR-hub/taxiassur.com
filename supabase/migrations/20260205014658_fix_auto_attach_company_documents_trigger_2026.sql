/*
  # Fix auto_attach_company_documents trigger

  1. Problème
    - Le trigger `trigger_auto_attach_on_quote` sur `lead_company_quotes` appelle `auto_attach_company_documents()`
    - Cette fonction référence des colonnes qui n'existent pas: `is_mandatory`, `auto_attach_on`
    - Cela cause l'erreur lors de l'insertion de quotes

  2. Solution
    - Désactiver temporairement ce trigger
    - Recréer la fonction pour qu'elle soit compatible avec le schéma actuel
*/

-- 1. Désactiver le trigger problématique
DROP TRIGGER IF EXISTS trigger_auto_attach_on_quote ON lead_company_quotes;

-- 2. Recréer la fonction de manière simplifiée
CREATE OR REPLACE FUNCTION auto_attach_company_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour l'instant, ne rien faire
  -- Cette fonction sera réimplémentée correctement plus tard
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Note: Le trigger peut être réactivé plus tard quand la logique d'attachement automatique sera nécessaire
