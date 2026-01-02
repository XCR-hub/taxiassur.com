/*
  # Activation de l'extension pgcrypto

  1. Extensions activées
    - pgcrypto: Fonctions cryptographiques nécessaires pour gen_random_bytes()
    
  2. Fonctionnalités
    - Génération de tokens sécurisés
    - Hachage et chiffrement
    - UUIDs aléatoires
*/

-- Activer l'extension pgcrypto si elle n'existe pas déjà
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Vérifier que l'extension est bien activée
COMMENT ON EXTENSION pgcrypto IS 'Extension cryptographique pour génération de tokens et hachage sécurisé';
