/*
  # Ajout colonnes manquantes Newsletter

  1. Ajout colonnes engagement
  2. Ajout colonnes préférences
  3. Ajout token de désabonnement
*/

-- Ajouter colonnes manquantes à newsletter_subscribers
DO $$ 
BEGIN
  -- first_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_subscribers' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE newsletter_subscribers ADD COLUMN first_name text;
  END IF;
  
  -- engagement_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_subscribers' AND column_name = 'engagement_score'
  ) THEN
    ALTER TABLE newsletter_subscribers ADD COLUMN engagement_score int DEFAULT 50;
  END IF;
  
  -- frequency
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_subscribers' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE newsletter_subscribers ADD COLUMN frequency text DEFAULT 'weekly' 
      CHECK (frequency IN ('daily', 'weekly', 'monthly'));
  END IF;
  
  -- categories
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_subscribers' AND column_name = 'categories'
  ) THEN
    ALTER TABLE newsletter_subscribers ADD COLUMN categories text[] 
      DEFAULT ARRAY['assurance-taxi', 'actualites'];
  END IF;
  
  -- preferred_time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_subscribers' AND column_name = 'preferred_time'
  ) THEN
    ALTER TABLE newsletter_subscribers ADD COLUMN preferred_time time DEFAULT '09:00:00';
  END IF;
  
  -- last_opened_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_subscribers' AND column_name = 'last_opened_at'
  ) THEN
    ALTER TABLE newsletter_subscribers ADD COLUMN last_opened_at timestamptz;
  END IF;
  
  -- unsubscribe_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_subscribers' AND column_name = 'unsubscribe_token'
  ) THEN
    ALTER TABLE newsletter_subscribers ADD COLUMN unsubscribe_token text UNIQUE 
      DEFAULT encode(gen_random_bytes(32), 'hex');
  END IF;
END $$;

-- Créer les indexes manquants
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_engagement 
  ON newsletter_subscribers(engagement_score DESC);
  
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_categories 
  ON newsletter_subscribers USING GIN(categories);
