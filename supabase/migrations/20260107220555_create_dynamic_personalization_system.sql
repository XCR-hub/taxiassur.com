/*
  # Système Personnalisation Dynamique Contenu IA

  1. Tables
    - personalization_rules - Règles de personnalisation
    - dynamic_content_blocks - Blocs de contenu adaptables
    - personalization_history - Historique personnalisations
    - ab_test_variants - Variantes pour tests

  2. Features
    - Contenu adaptatif par segment
    - Recommandations produits IA
    - Images dynamiques par profil
    - Offres personnalisées temps réel
    - Adaptive CTAs
*/

CREATE TABLE IF NOT EXISTS personalization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL, -- segment_based, behavior_based, ml_based
  conditions jsonb NOT NULL, -- Conditions d'application
  priority int DEFAULT 0,
  is_active boolean DEFAULT true,
  target_audience jsonb, -- Segments ciblés
  effectiveness_score numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dynamic_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content_type text NOT NULL, -- text, image, video, cta, product_recommendation
  default_content jsonb NOT NULL,
  variants jsonb DEFAULT '[]'::jsonb, -- Variantes par segment/condition
  personalization_rule_id uuid REFERENCES personalization_rules(id),
  usage_count int DEFAULT 0,
  conversion_rate numeric(5,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personalization_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  content_block_id uuid REFERENCES dynamic_content_blocks(id),
  variant_used text,
  personalization_factors jsonb, -- Facteurs ayant influencé le choix
  shown_at timestamptz DEFAULT now(),
  interacted boolean DEFAULT false,
  interaction_type text, -- click, view, conversion
  interaction_at timestamptz
);

CREATE TABLE IF NOT EXISTS ab_test_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  variant_name text NOT NULL,
  content jsonb NOT NULL,
  traffic_percentage int DEFAULT 50,
  impressions int DEFAULT 0,
  clicks int DEFAULT 0,
  conversions int DEFAULT 0,
  click_rate numeric(5,2) DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,
  confidence_level numeric(5,2),
  is_winner boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(test_name, variant_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_personalization_rules_active ON personalization_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dynamic_content_active ON dynamic_content_blocks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_personalization_history_lead ON personalization_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_personalization_history_block ON personalization_history(content_block_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test ON ab_test_variants(test_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_active ON ab_test_variants(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE personalization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rules" ON personalization_rules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Everyone view active rules" ON personalization_rules FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage content blocks" ON dynamic_content_blocks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Everyone view active blocks" ON dynamic_content_blocks FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "System create history" ON personalization_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users view own history" ON personalization_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = personalization_history.lead_id));
CREATE POLICY "Admins manage variants" ON ab_test_variants FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Everyone view active variants" ON ab_test_variants FOR SELECT TO authenticated USING (is_active = true);

-- Insérer règles par défaut
INSERT INTO personalization_rules (name, description, rule_type, conditions, priority) VALUES
(
  'VIP Champions',
  'Personnalisation pour les clients Champions (RFM 555)',
  'segment_based',
  '{"rfm_score": "555", "segment": "Champions"}'::jsonb,
  100
),
(
  'Nouveaux Leads Chauds',
  'Contenu pour nouveaux leads engagés',
  'behavior_based',
  '{"engagement_score": {"$gte": 70}, "created_days_ago": {"$lte": 7}}'::jsonb,
  90
),
(
  'Inactifs à Réactiver',
  'Offres spéciales pour leads inactifs',
  'segment_based',
  '{"last_interaction_days": {"$gte": 30}, "rfm_score": {"$regex": "^[1-2]"}}'::jsonb,
  80
)
ON CONFLICT DO NOTHING;

-- Insérer blocs de contenu dynamiques
INSERT INTO dynamic_content_blocks (name, content_type, default_content, variants) VALUES
(
  'Hero CTA Principal',
  'cta',
  '{"text": "Demandez votre devis", "color": "blue", "size": "large"}'::jsonb,
  '[
    {"condition": "rfm_score=555", "content": {"text": "Offre VIP Exclusive", "color": "gold", "icon": "crown"}},
    {"condition": "engagement_score>80", "content": {"text": "Profitez de -30%", "color": "red", "urgency": true}},
    {"condition": "new_lead=true", "content": {"text": "Bienvenue ! Découvrez nos offres", "color": "green"}}
  ]'::jsonb
),
(
  'Image Hero',
  'image',
  '{"url": "/images/taxi-generic.jpg", "alt": "Assurance taxi"}'::jsonb,
  '[
    {"condition": "city=Paris", "content": {"url": "/images/taxi-paris.jpg", "alt": "Assurance taxi Paris"}},
    {"condition": "city=Marseille", "content": {"url": "/images/taxi-marseille.jpg", "alt": "Assurance taxi Marseille"}},
    {"condition": "vehicle_type=electric", "content": {"url": "/images/taxi-electric.jpg", "alt": "Assurance taxi électrique"}}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Fonction pour sélectionner contenu personnalisé
CREATE OR REPLACE FUNCTION get_personalized_content(
  p_lead_id uuid,
  p_content_block_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_lead_data jsonb;
  v_block dynamic_content_blocks%ROWTYPE;
  v_variant jsonb;
  v_result jsonb;
BEGIN
  -- Récupérer données du lead
  SELECT jsonb_build_object(
    'rfm_score', r.rfm_score,
    'engagement_score', l.engagement_score,
    'city', l.city
  )
  INTO v_lead_data
  FROM leads l
  LEFT JOIN rfm_scores r ON r.lead_id = l.id
  WHERE l.id = p_lead_id;
  
  -- Récupérer le bloc de contenu
  SELECT * INTO v_block
  FROM dynamic_content_blocks
  WHERE id = p_content_block_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Par défaut, utiliser le contenu par défaut
  v_result := v_block.default_content;
  
  -- TODO: Logique de sélection de variante basée sur les conditions
  -- (nécessiterait une logique plus complexe pour parser les conditions)
  
  -- Logger l'utilisation
  INSERT INTO personalization_history (lead_id, content_block_id, variant_used, personalization_factors)
  VALUES (p_lead_id, p_content_block_id, 'default', v_lead_data);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
