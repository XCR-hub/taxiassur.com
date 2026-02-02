/*
  # Ajouter colonne last_sent_at pour tracking des envois de devis

  1. Modifications
    - Ajoute la colonne `last_sent_at` à la table `lead_company_quotes`
    - Permet de tracker quand un devis a été envoyé par email au prospect
    - Type timestamptz pour stocker la date/heure d'envoi

  2. Utilité
    - Permet au commercial de savoir quand le dernier devis a été envoyé
    - Utile pour les relances et le suivi commercial
*/

-- Ajouter colonne last_sent_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_company_quotes' AND column_name = 'last_sent_at'
  ) THEN
    ALTER TABLE lead_company_quotes ADD COLUMN last_sent_at timestamptz;
    COMMENT ON COLUMN lead_company_quotes.last_sent_at IS 'Date du dernier envoi du devis par email au prospect';
  END IF;
END $$;
