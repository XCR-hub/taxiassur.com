/*
  # Ajouter la configuration des intégrations au CRM

  1. Modifications
    - Ajoute la colonne `integration_configs` à la table `crm_settings`
    - Permet de stocker les configurations pour Brevo, WhatsApp, Supabase, Stripe, etc.
    - Format JSONB pour flexibilité

  2. Sécurité
    - Colonne chiffrée recommandée pour les clés API
    - Accessible uniquement par les admins authentifiés
*/

-- Ajouter la colonne integration_configs
ALTER TABLE crm_settings 
ADD COLUMN IF NOT EXISTS integration_configs JSONB DEFAULT '{}'::jsonb;

-- Ajouter un commentaire pour documenter la structure
COMMENT ON COLUMN crm_settings.integration_configs IS 'Configuration des intégrations tierces (Brevo, WhatsApp, Supabase, Stripe, etc.)';
