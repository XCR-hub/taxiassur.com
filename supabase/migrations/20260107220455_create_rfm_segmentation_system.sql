/*
  # Système Segmentation RFM Automatique

  1. Tables
    - rfm_scores - Scores RFM par lead
    - rfm_segments - Segments définis
    - rfm_history - Évolution historique
    - segment_assignments - Assignations segments

  2. Méthodologie RFM
    - Recency (Récence) : Dernière interaction
    - Frequency (Fréquence) : Nombre d'interactions
    - Monetary (Valeur) : Valeur générée
*/

CREATE TABLE IF NOT EXISTS rfm_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) UNIQUE,
  recency_score int NOT NULL CHECK (recency_score BETWEEN 1 AND 5),
  frequency_score int NOT NULL CHECK (frequency_score BETWEEN 1 AND 5),
  monetary_score int NOT NULL CHECK (monetary_score BETWEEN 1 AND 5),
  rfm_score text NOT NULL, -- Ex: "555", "311"
  total_score int NOT NULL CHECK (total_score BETWEEN 3 AND 15),
  last_interaction_date timestamptz,
  interaction_count int DEFAULT 0,
  total_value numeric(10,2) DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  next_calculation_at timestamptz
);

CREATE TABLE IF NOT EXISTS rfm_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  rfm_pattern text, -- Ex: "5[4-5][3-5]" pour regex matching
  priority int NOT NULL,
  color text,
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  automation_config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rfm_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  recency_score int NOT NULL,
  frequency_score int NOT NULL,
  monetary_score int NOT NULL,
  rfm_score text NOT NULL,
  total_score int NOT NULL,
  segment_id uuid REFERENCES rfm_segments(id),
  recorded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS segment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  segment_id uuid REFERENCES rfm_segments(id),
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(lead_id, segment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfm_scores_lead ON rfm_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_rfm_scores_total ON rfm_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_rfm_scores_rfm ON rfm_scores(rfm_score);
CREATE INDEX IF NOT EXISTS idx_rfm_history_lead ON rfm_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_rfm_history_recorded ON rfm_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_segment_assignments_lead ON segment_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_segment_assignments_active ON segment_assignments(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE rfm_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfm_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view RFM scores of accessible leads" ON rfm_scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = rfm_scores.lead_id));
CREATE POLICY "System update RFM scores" ON rfm_scores FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Everyone view active segments" ON rfm_segments FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage segments" ON rfm_segments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Users view history of accessible leads" ON rfm_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = rfm_history.lead_id));
CREATE POLICY "Users view assignments" ON segment_assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = segment_assignments.lead_id));

-- Insérer segments RFM par défaut
INSERT INTO rfm_segments (name, description, rfm_pattern, priority, color, recommended_actions) VALUES
(
  'Champions',
  'Meilleurs clients : engagés récemment, fréquemment et dépensent beaucoup',
  '^5[4-5][4-5]$',
  1,
  '#10B981',
  '["reward_program","exclusive_offers","vip_treatment","testimonial_request"]'::jsonb
),
(
  'Fidèles',
  'Clients loyaux avec bonne fréquence mais valeur moyenne',
  '^[3-5][4-5][2-3]$',
  2,
  '#3B82F6',
  '["upsell","cross_sell","loyalty_program","referral_incentive"]'::jsonb
),
(
  'Potentiel Élevé',
  'Dépenseurs récents avec potentiel de fidélisation',
  '^5[1-2][4-5]$',
  3,
  '#8B5CF6',
  '["onboarding_campaign","engagement_boost","product_education"]'::jsonb
),
(
  'Nouveaux Clients',
  'Clients très récents à développer',
  '^5[1-2][1-2]$',
  4,
  '#06B6D4',
  '["welcome_series","quick_wins","satisfaction_survey"]'::jsonb
),
(
  'Prometteurs',
  'Engagés récemment mais peu fréquents',
  '^[4-5][1-2][1-3]$',
  5,
  '#14B8A6',
  '["engagement_campaign","value_demonstration","trial_extension"]'::jsonb
),
(
  'Besoin Attention',
  'Bonne valeur mais engagement en baisse',
  '^[2-3][3-5][3-5]$',
  6,
  '#F59E0B',
  '["reactivation_email","special_offer","feedback_request","win_back"]'::jsonb
),
(
  'En Sommeil',
  'Inactifs depuis longtemps, valeur moyenne',
  '^[1-2][1-2][2-3]$',
  7,
  '#EF4444',
  '["reactivation_campaign","survey","special_discount","last_chance"]'::jsonb
),
(
  'Perdus',
  'Inactifs longue durée, faible valeur',
  '^[1-2][1-2]1$',
  8,
  '#6B7280',
  '["minimal_contact","data_cleanup","unsubscribe_option"]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Fonction pour calculer le score RFM
CREATE OR REPLACE FUNCTION calculate_rfm_score(
  p_lead_id uuid
)
RETURNS void AS $$
DECLARE
  v_recency_days int;
  v_frequency int;
  v_monetary numeric(10,2);
  v_r_score int;
  v_f_score int;
  v_m_score int;
  v_rfm_score text;
BEGIN
  -- Calculer récence (jours depuis dernière interaction)
  SELECT EXTRACT(DAY FROM (now() - MAX(created_at)))::int
  INTO v_recency_days
  FROM ai_chat_messages
  WHERE session_id IN (SELECT id FROM ai_chat_sessions WHERE lead_id = p_lead_id);
  
  -- Calculer fréquence (nombre d'interactions)
  SELECT COUNT(*)::int
  INTO v_frequency
  FROM ai_chat_messages
  WHERE session_id IN (SELECT id FROM ai_chat_sessions WHERE lead_id = p_lead_id);
  
  -- Calculer valeur monétaire (à adapter selon votre business)
  v_monetary := 0;
  
  -- Scorer R (plus récent = meilleur score)
  v_r_score := CASE
    WHEN v_recency_days <= 7 THEN 5
    WHEN v_recency_days <= 30 THEN 4
    WHEN v_recency_days <= 90 THEN 3
    WHEN v_recency_days <= 180 THEN 2
    ELSE 1
  END;
  
  -- Scorer F
  v_f_score := CASE
    WHEN v_frequency >= 20 THEN 5
    WHEN v_frequency >= 10 THEN 4
    WHEN v_frequency >= 5 THEN 3
    WHEN v_frequency >= 2 THEN 2
    ELSE 1
  END;
  
  -- Scorer M
  v_m_score := 3; -- Par défaut, à adapter
  
  v_rfm_score := v_r_score::text || v_f_score::text || v_m_score::text;
  
  -- Insérer ou mettre à jour
  INSERT INTO rfm_scores (lead_id, recency_score, frequency_score, monetary_score, rfm_score, total_score, interaction_count, total_value)
  VALUES (p_lead_id, v_r_score, v_f_score, v_m_score, v_rfm_score, v_r_score + v_f_score + v_m_score, v_frequency, v_monetary)
  ON CONFLICT (lead_id) DO UPDATE
  SET recency_score = v_r_score,
      frequency_score = v_f_score,
      monetary_score = v_m_score,
      rfm_score = v_rfm_score,
      total_score = v_r_score + v_f_score + v_m_score,
      interaction_count = v_frequency,
      total_value = v_monetary,
      calculated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
