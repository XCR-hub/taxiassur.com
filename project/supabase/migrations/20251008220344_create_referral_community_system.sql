/*
  # Système de Parrainage et Communauté

  ## Description
  Crée l'infrastructure complète pour le système de parrainage communautaire.
  Permet aux chauffeurs de devenir ambassadeurs et de partager des liens personnalisés.

  ## Tables Créées
  1. `referral_programs` - Programmes de parrainage actifs
  2. `ambassadors` - Chauffeurs ambassadeurs avec statut
  3. `referrals` - Suivi des parrainages et conversions
  4. `community_challenges` - Challenges communautaires
  5. `testimonials` - Témoignages participatifs
  6. `user_generated_content` - Contenu créé par la communauté

  ## Sécurité
  - RLS activé sur toutes les tables
  - Ambassadeurs peuvent gérer leurs propres liens
  - Admins peuvent tout gérer
*/

-- =====================================================
-- TABLE 1: REFERRAL PROGRAMS
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  referrer_reward text DEFAULT '10€ sur prochaine cotisation',
  referred_reward text DEFAULT '5% réduction première année',
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  start_date timestamptz DEFAULT NOW(),
  end_date timestamptz,
  total_referrals integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active programs"
  ON referral_programs FOR SELECT
  USING (status = 'active');

CREATE POLICY "Service role can manage programs"
  ON referral_programs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE 2: AMBASSADORS
-- =====================================================
CREATE TABLE IF NOT EXISTS ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  city text,
  referral_code text UNIQUE NOT NULL,
  referral_url text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'suspended')),
  badge text DEFAULT 'bronze' CHECK (badge IN ('bronze', 'silver', 'gold', 'platinum')),
  total_referrals integer DEFAULT 0,
  successful_conversions integer DEFAULT 0,
  total_earnings numeric(10,2) DEFAULT 0,
  joined_at timestamptz DEFAULT NOW(),
  last_referral_at timestamptz,
  social_links jsonb DEFAULT '{}',
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambassadors can view own data"
  ON ambassadors FOR SELECT
  USING (auth.uid()::text = id::text OR email = auth.jwt()->>'email');

CREATE POLICY "Ambassadors can update own profile"
  ON ambassadors FOR UPDATE
  USING (auth.uid()::text = id::text OR email = auth.jwt()->>'email')
  WITH CHECK (auth.uid()::text = id::text OR email = auth.jwt()->>'email');

CREATE POLICY "Public can view active ambassadors"
  ON ambassadors FOR SELECT
  USING (status = 'active' AND badge IN ('gold', 'platinum'));

CREATE POLICY "Service role can manage ambassadors"
  ON ambassadors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE 3: REFERRALS
-- =====================================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid REFERENCES ambassadors(id) ON DELETE CASCADE,
  program_id uuid REFERENCES referral_programs(id),
  referral_code text NOT NULL,
  referred_name text,
  referred_email text,
  referred_phone text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'rejected')),
  conversion_value numeric(10,2),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_page text,
  user_agent text,
  ip_address inet,
  referred_at timestamptz DEFAULT NOW(),
  converted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_referrals_ambassador ON referrals(ambassador_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambassadors can view own referrals"
  ON referrals FOR SELECT
  USING (ambassador_id IN (
    SELECT id FROM ambassadors WHERE email = auth.jwt()->>'email'
  ));

CREATE POLICY "Anyone can create referral"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can manage referrals"
  ON referrals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE 4: COMMUNITY CHALLENGES
-- =====================================================
CREATE TABLE IF NOT EXISTS community_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  goal_type text DEFAULT 'referrals' CHECK (goal_type IN ('referrals', 'testimonials', 'shares', 'reviews')),
  goal_value integer NOT NULL,
  current_value integer DEFAULT 0,
  reward text,
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  start_date timestamptz DEFAULT NOW(),
  end_date timestamptz,
  participants integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active challenges"
  ON community_challenges FOR SELECT
  USING (status = 'active');

CREATE POLICY "Service role can manage challenges"
  ON community_challenges FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE 5: TESTIMONIALS (User Generated Content)
-- =====================================================
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_email text,
  author_city text,
  author_occupation text DEFAULT 'Chauffeur de taxi',
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  is_featured boolean DEFAULT false,
  photo_url text,
  video_url text,
  allow_public_display boolean DEFAULT true,
  verification_token text UNIQUE,
  verified_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_testimonials_status ON testimonials(status);
CREATE INDEX idx_testimonials_featured ON testimonials(is_featured) WHERE is_featured = true;

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved testimonials"
  ON testimonials FOR SELECT
  USING (status = 'approved' OR status = 'featured');

CREATE POLICY "Anyone can submit testimonial"
  ON testimonials FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authors can view own testimonials"
  ON testimonials FOR SELECT
  USING (author_email = auth.jwt()->>'email');

CREATE POLICY "Service role can manage testimonials"
  ON testimonials FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE 6: USER GENERATED CONTENT
-- =====================================================
CREATE TABLE IF NOT EXISTS user_generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text CHECK (content_type IN ('story', 'tip', 'question', 'photo', 'video')),
  title text NOT NULL,
  content text NOT NULL,
  author_name text NOT NULL,
  author_email text,
  author_city text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  shares integer DEFAULT 0,
  media_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_ugc_status ON user_generated_content(status);
CREATE INDEX idx_ugc_type ON user_generated_content(content_type);

ALTER TABLE user_generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved UGC"
  ON user_generated_content FOR SELECT
  USING (status IN ('approved', 'featured'));

CREATE POLICY "Anyone can submit UGC"
  ON user_generated_content FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can manage UGC"
  ON user_generated_content FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Fonction pour générer un code de parrainage unique
CREATE OR REPLACE FUNCTION generate_referral_code(base_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  -- Nettoyer le nom de base
  base_name := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]', '', 'g'));
  base_name := SUBSTRING(base_name, 1, 10);
  
  -- Générer un code unique
  LOOP
    code := base_name || FLOOR(RANDOM() * 10000)::text;
    
    SELECT COUNT(*) > 0 INTO exists
    FROM ambassadors
    WHERE referral_code = code;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Fonction pour mettre à jour les stats ambassador
CREATE OR REPLACE FUNCTION update_ambassador_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'converted' AND OLD.status != 'converted' THEN
    UPDATE ambassadors
    SET 
      successful_conversions = successful_conversions + 1,
      last_referral_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.ambassador_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_ambassador_stats
  AFTER UPDATE OF status ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_ambassador_stats();

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Programme de parrainage par défaut
INSERT INTO referral_programs (
  name,
  description,
  referrer_reward,
  referred_reward,
  status
) VALUES (
  'Programme Ambassadeurs TaxiAssur 2025',
  'Parrainez d''autres chauffeurs et gagnez des récompenses',
  '10€ sur votre prochaine cotisation',
  '5% de réduction la première année',
  'active'
) ON CONFLICT DO NOTHING;

-- Challenge communautaire initial
INSERT INTO community_challenges (
  title,
  description,
  goal_type,
  goal_value,
  reward,
  status,
  end_date
) VALUES (
  '🚖 100 Taxis Assurés = 100 Arbres Plantés 🌳',
  'Aidez-nous à atteindre 100 nouveaux assurés et nous planterons 100 arbres avec Ecosia !',
  'referrals',
  100,
  '100 arbres plantés + tirage au sort d''1 an d''assurance offert',
  'active',
  NOW() + INTERVAL '90 days'
) ON CONFLICT DO NOTHING;
