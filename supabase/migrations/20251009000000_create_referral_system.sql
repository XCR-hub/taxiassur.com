/*
  # Système de Parrainage Complet TaxiAssur

  1. Nouvelles Tables
    - `ambassadors` : Ambassadeurs / parrains
      - `id` (uuid, primary key)
      - `name` (text) : Nom complet
      - `email` (text unique) : Email
      - `phone` (text) : Téléphone
      - `city` (text) : Ville
      - `photo_url` (text) : URL photo profil
      - `bio` (text) : Mini bio
      - `referral_code` (text unique) : Code parrain unique
      - `badge_url` (text) : URL badge généré
      - `qr_code_url` (text) : URL QR code
      - `status` (text) : active, suspended
      - `vip_access` (boolean) : Accès prioritaire
      - `ranking_points` (integer) : Points classement
      - `created_at` (timestamptz)

    - `referral_leads` : Leads référés
      - `id` (uuid, primary key)
      - `ambassador_id` (uuid, foreign key)
      - `lead_id` (uuid, foreign key vers leads)
      - `referral_code` (text) : Code utilisé
      - `status` (text) : pending, qualified, converted, rejected
      - `conversion_date` (timestamptz) : Date conversion
      - `created_at` (timestamptz)

    - `ambassador_stats` : Statistiques parrains
      - `ambassador_id` (uuid, primary key)
      - `total_referrals` (integer) : Total leads référés
      - `qualified_referrals` (integer) : Leads qualifiés
      - `converted_referrals` (integer) : Contrats signés
      - `conversion_rate` (decimal) : Taux conversion
      - `monthly_referrals` (integer) : Référencements ce mois
      - `rank_position` (integer) : Position classement
      - `last_updated` (timestamptz)

    - `ambassador_rewards` : Récompenses obtenues
      - `id` (uuid, primary key)
      - `ambassador_id` (uuid, foreign key)
      - `reward_type` (text) : badge, featured, vip, certificate
      - `reward_name` (text) : Nom récompense
      - `earned_at` (timestamptz)
      - `details` (jsonb) : Détails supplémentaires

  2. Sécurité
    - RLS activé sur toutes les tables
    - Ambassadeurs peuvent lire leurs propres données
    - Admin peut tout gérer
    - Leads référés trackés automatiquement
*/

-- Table Ambassadeurs
CREATE TABLE IF NOT EXISTS ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  photo_url text,
  bio text,
  referral_code text UNIQUE NOT NULL,
  badge_url text,
  qr_code_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  vip_access boolean DEFAULT false,
  ranking_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table Leads Référés
CREATE TABLE IF NOT EXISTS referral_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'converted', 'rejected')),
  conversion_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table Statistiques Ambassadeurs
CREATE TABLE IF NOT EXISTS ambassador_stats (
  ambassador_id uuid PRIMARY KEY REFERENCES ambassadors(id) ON DELETE CASCADE,
  total_referrals integer DEFAULT 0,
  qualified_referrals integer DEFAULT 0,
  converted_referrals integer DEFAULT 0,
  conversion_rate decimal DEFAULT 0,
  monthly_referrals integer DEFAULT 0,
  rank_position integer DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Table Récompenses
CREATE TABLE IF NOT EXISTS ambassador_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid REFERENCES ambassadors(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('badge', 'featured', 'vip', 'certificate', 'gold', 'platinum')),
  reward_name text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_ambassadors_referral_code ON ambassadors(referral_code);
CREATE INDEX IF NOT EXISTS idx_ambassadors_status ON ambassadors(status);
CREATE INDEX IF NOT EXISTS idx_ambassadors_city ON ambassadors(city);
CREATE INDEX IF NOT EXISTS idx_referral_leads_ambassador ON referral_leads(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_referral_leads_status ON referral_leads(status);
CREATE INDEX IF NOT EXISTS idx_referral_leads_code ON referral_leads(referral_code);

-- RLS Policies

-- Ambassadors : tout le monde peut lire les ambassadeurs actifs (pour page publique)
ALTER TABLE ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active ambassadors"
  ON ambassadors FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Anyone can insert ambassador application"
  ON ambassadors FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Ambassadors can update own profile"
  ON ambassadors FOR UPDATE
  TO authenticated
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Referral Leads : ambassadeurs voient leurs leads
ALTER TABLE referral_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambassadors can view own referrals"
  ON referral_leads FOR SELECT
  TO authenticated
  USING (
    ambassador_id IN (
      SELECT id FROM ambassadors 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Public can insert referral leads"
  ON referral_leads FOR INSERT
  TO public
  WITH CHECK (true);

-- Ambassador Stats : ambassadeurs voient leurs stats
ALTER TABLE ambassador_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambassadors can view own stats"
  ON ambassador_stats FOR SELECT
  TO authenticated
  USING (
    ambassador_id IN (
      SELECT id FROM ambassadors 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Public can view stats for rankings"
  ON ambassador_stats FOR SELECT
  TO public
  USING (true);

-- Rewards : public peut voir pour social proof
ALTER TABLE ambassador_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view rewards"
  ON ambassador_rewards FOR SELECT
  TO public
  USING (true);

-- Fonction : Mettre à jour les stats automatiquement
CREATE OR REPLACE FUNCTION update_ambassador_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Mise à jour stats après insertion/update referral_lead
  UPDATE ambassador_stats
  SET
    total_referrals = (
      SELECT COUNT(*) FROM referral_leads 
      WHERE ambassador_id = NEW.ambassador_id
    ),
    qualified_referrals = (
      SELECT COUNT(*) FROM referral_leads 
      WHERE ambassador_id = NEW.ambassador_id 
      AND status IN ('qualified', 'converted')
    ),
    converted_referrals = (
      SELECT COUNT(*) FROM referral_leads 
      WHERE ambassador_id = NEW.ambassador_id 
      AND status = 'converted'
    ),
    monthly_referrals = (
      SELECT COUNT(*) FROM referral_leads 
      WHERE ambassador_id = NEW.ambassador_id 
      AND created_at >= date_trunc('month', now())
    ),
    last_updated = now()
  WHERE ambassador_id = NEW.ambassador_id;

  -- Calculer taux de conversion
  UPDATE ambassador_stats
  SET conversion_rate = 
    CASE 
      WHEN total_referrals > 0 
      THEN (converted_referrals::decimal / total_referrals::decimal) * 100
      ELSE 0
    END
  WHERE ambassador_id = NEW.ambassador_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mise à jour automatique des stats
DROP TRIGGER IF EXISTS trigger_update_ambassador_stats ON referral_leads;
CREATE TRIGGER trigger_update_ambassador_stats
  AFTER INSERT OR UPDATE ON referral_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_ambassador_stats();

-- Fonction : Créer stats lors création ambassadeur
CREATE OR REPLACE FUNCTION create_ambassador_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ambassador_stats (ambassador_id)
  VALUES (NEW.id)
  ON CONFLICT (ambassador_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger création stats
DROP TRIGGER IF EXISTS trigger_create_ambassador_stats ON ambassadors;
CREATE TRIGGER trigger_create_ambassador_stats
  AFTER INSERT ON ambassadors
  FOR EACH ROW
  EXECUTE FUNCTION create_ambassador_stats();

-- Fonction : Calculer classement mensuel
CREATE OR REPLACE FUNCTION calculate_monthly_rankings()
RETURNS void AS $$
BEGIN
  WITH ranked_ambassadors AS (
    SELECT 
      ambassador_id,
      ROW_NUMBER() OVER (ORDER BY monthly_referrals DESC, converted_referrals DESC) as rank
    FROM ambassador_stats
  )
  UPDATE ambassador_stats
  SET rank_position = ranked_ambassadors.rank
  FROM ranked_ambassadors
  WHERE ambassador_stats.ambassador_id = ranked_ambassadors.ambassador_id;
END;
$$ LANGUAGE plpgsql;
