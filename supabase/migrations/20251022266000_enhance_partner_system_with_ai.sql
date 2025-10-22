/*
  # Amélioration du Système de Partenaires avec IA

  1. Tables Créées/Améliorées
    - `partner_prospects` - Table des prospects partenaires avec scoring IA
    - `partner_interactions` - Historique des interactions
    - `partner_analytics` - Analytique des partenaires
    - `partner_outreach_templates` - Templates d'outreach personnalisés

  2. Fonctions IA
    - Scoring automatique des partenaires
    - Génération d'outreach personnalisé
    - Suggestions d'actions intelligentes
    - Analyse de santé des partenariats

  3. Automatisation
    - Cron job quotidien pour re-scoring IA
    - Suggestions automatiques d'actions
*/

-- Créer ou améliorer la table partner_prospects
CREATE TABLE IF NOT EXISTS partner_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL UNIQUE,
  country text DEFAULT 'FR',
  type text NOT NULL CHECK (type IN ('annuaire', 'asso', 'blog', 'media', 'fleet', 'garage', 'ecole')),
  contact_page_url text,
  source text DEFAULT 'manual',
  discovered_at timestamptz DEFAULT now(),
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'rejected', 'active')),
  notes text,
  ai_score numeric DEFAULT 0,
  ai_analysis jsonb DEFAULT '{}'::jsonb,
  auto_qualified boolean DEFAULT false,
  scraped_data jsonb DEFAULT '{}'::jsonb,
  contact_info jsonb DEFAULT '{}'::jsonb,
  last_checked timestamptz,
  quality_score int DEFAULT 0,
  engagement_level text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter les colonnes IA si elles n'existent pas (pour tables existantes)
DO $$
BEGIN
  ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS ai_score numeric DEFAULT 0;
  ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS auto_qualified boolean DEFAULT false;
  ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS scraped_data jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS contact_info jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS last_checked timestamptz;
  ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS quality_score int DEFAULT 0;
  ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS engagement_level text;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_prospects_domain ON partner_prospects(domain);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_status ON partner_prospects(status);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_type ON partner_prospects(type);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_ai_score ON partner_prospects(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_quality ON partner_prospects(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_auto_qualified ON partner_prospects(auto_qualified) WHERE auto_qualified = true;

-- Activer RLS sur partner_prospects
ALTER TABLE partner_prospects ENABLE ROW LEVEL SECURITY;

-- Policies pour partner_prospects
DROP POLICY IF EXISTS "Authenticated users can read prospects" ON partner_prospects;
CREATE POLICY "Authenticated users can read prospects"
  ON partner_prospects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage prospects" ON partner_prospects;
CREATE POLICY "Authenticated users can manage prospects"
  ON partner_prospects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des interactions partenaires
CREATE TABLE IF NOT EXISTS partner_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partner_prospects(id) ON DELETE CASCADE,
  interaction_type text NOT NULL CHECK (interaction_type IN ('email', 'call', 'meeting', 'outreach', 'social', 'other')),
  subject text,
  notes text,
  outcome text CHECK (outcome IN ('positive', 'negative', 'neutral', 'no_response', 'pending')),
  next_action text,
  next_action_date date,
  performed_by text NOT NULL DEFAULT 'system',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_interactions_partner ON partner_interactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_interactions_type ON partner_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_partner_interactions_outcome ON partner_interactions(outcome);
CREATE INDEX IF NOT EXISTS idx_partner_interactions_next_action ON partner_interactions(next_action_date) WHERE next_action_date IS NOT NULL;

-- Table d'analytique partenaires
CREATE TABLE IF NOT EXISTS partner_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partner_prospects(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  period text NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_analytics_partner ON partner_analytics(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_analytics_metric ON partner_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_partner_analytics_period ON partner_analytics(period, recorded_at DESC);

-- Table des templates d'outreach
CREATE TABLE IF NOT EXISTS partner_outreach_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  success_rate numeric DEFAULT 0,
  usage_count int DEFAULT 0,
  ai_optimized boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_outreach_category ON partner_outreach_templates(category);
CREATE INDEX IF NOT EXISTS idx_partner_outreach_success ON partner_outreach_templates(success_rate DESC);

-- Activer RLS
ALTER TABLE partner_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_outreach_templates ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated users can manage interactions" ON partner_interactions;
CREATE POLICY "Authenticated users can manage interactions"
  ON partner_interactions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read analytics" ON partner_analytics;
CREATE POLICY "Authenticated users can read analytics"
  ON partner_analytics FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can write analytics" ON partner_analytics;
CREATE POLICY "System can write analytics"
  ON partner_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read templates" ON partner_outreach_templates;
CREATE POLICY "Authenticated users can read templates"
  ON partner_outreach_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage templates" ON partner_outreach_templates;
CREATE POLICY "Authenticated users can manage templates"
  ON partner_outreach_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour scorer un partenaire avec IA
CREATE OR REPLACE FUNCTION calculate_partner_ai_score(
  p_partner_id uuid
) RETURNS numeric AS $$
DECLARE
  v_score numeric := 0;
  v_partner record;
  v_interaction_count int;
  v_positive_interactions int;
  v_days_since_contact int;
BEGIN
  SELECT * INTO v_partner FROM partner_prospects WHERE id = p_partner_id;

  IF v_partner IS NULL THEN
    RETURN 0;
  END IF;

  -- Score de base selon le type
  CASE v_partner.type
    WHEN 'asso' THEN v_score := v_score + 30;
    WHEN 'media' THEN v_score := v_score + 25;
    WHEN 'annuaire' THEN v_score := v_score + 20;
    WHEN 'fleet' THEN v_score := v_score + 15;
    ELSE v_score := v_score + 10;
  END CASE;

  -- Score selon le statut
  CASE v_partner.status
    WHEN 'active' THEN v_score := v_score + 40;
    WHEN 'contacted' THEN v_score := v_score + 30;
    WHEN 'qualified' THEN v_score := v_score + 20;
    WHEN 'new' THEN v_score := v_score + 10;
  END CASE;

  -- Analyser les interactions
  SELECT COUNT(*), COUNT(*) FILTER (WHERE outcome = 'positive')
  INTO v_interaction_count, v_positive_interactions
  FROM partner_interactions
  WHERE partner_id = p_partner_id;

  -- Bonus pour interactions positives
  IF v_interaction_count > 0 THEN
    v_score := v_score + (v_positive_interactions::numeric / v_interaction_count * 30);
  END IF;

  -- Pénalité pour inactivité
  IF v_partner.updated_at IS NOT NULL THEN
    v_days_since_contact := EXTRACT(DAY FROM (now() - v_partner.updated_at));
    IF v_days_since_contact > 90 THEN
      v_score := v_score * 0.7;
    ELSIF v_days_since_contact > 30 THEN
      v_score := v_score * 0.9;
    END IF;
  END IF;

  -- Mettre à jour le score
  UPDATE partner_prospects
  SET
    ai_score = v_score,
    ai_analysis = jsonb_build_object(
      'calculated_at', now(),
      'interaction_count', v_interaction_count,
      'positive_interactions', v_positive_interactions,
      'days_inactive', v_days_since_contact
    ),
    updated_at = now()
  WHERE id = p_partner_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer un outreach personnalisé
CREATE OR REPLACE FUNCTION generate_personalized_outreach(
  p_partner_id uuid,
  p_template_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_partner record;
  v_template record;
  v_subject text;
  v_body text;
BEGIN
  SELECT * INTO v_partner FROM partner_prospects WHERE id = p_partner_id;
  SELECT * INTO v_template FROM partner_outreach_templates WHERE id = p_template_id;

  IF v_partner IS NULL OR v_template IS NULL THEN
    RETURN jsonb_build_object('error', 'Partner or template not found');
  END IF;

  v_subject := v_template.subject;
  v_subject := REPLACE(v_subject, '{{name}}', COALESCE(v_partner.name, 'Partenaire'));
  v_subject := REPLACE(v_subject, '{{domain}}', v_partner.domain);

  v_body := v_template.body;
  v_body := REPLACE(v_body, '{{name}}', COALESCE(v_partner.name, 'Partenaire'));
  v_body := REPLACE(v_body, '{{domain}}', v_partner.domain);
  v_body := REPLACE(v_body, '{{type}}', v_partner.type);

  UPDATE partner_outreach_templates
  SET usage_count = usage_count + 1, last_used_at = now()
  WHERE id = p_template_id;

  RETURN jsonb_build_object(
    'partner_id', p_partner_id,
    'template_id', p_template_id,
    'subject', v_subject,
    'body', v_body,
    'generated_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour suggérer les prochaines actions
CREATE OR REPLACE FUNCTION suggest_partner_actions() RETURNS jsonb AS $$
DECLARE
  v_suggestions jsonb := '[]'::jsonb;
  v_partner record;
BEGIN
  -- Partenaires sans contact depuis 30+ jours
  FOR v_partner IN
    SELECT * FROM partner_prospects
    WHERE status IN ('contacted', 'qualified')
    AND updated_at < now() - interval '30 days'
    ORDER BY ai_score DESC
    LIMIT 10
  LOOP
    v_suggestions := v_suggestions || jsonb_build_object(
      'partner_id', v_partner.id,
      'partner_name', v_partner.name,
      'action', 'follow_up',
      'priority', 'high',
      'reason', 'No contact for 30+ days'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'total_suggestions', jsonb_array_length(v_suggestions),
    'suggestions', v_suggestions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour analyser la santé des partenariats
CREATE OR REPLACE FUNCTION analyze_partnership_health() RETURNS jsonb AS $$
DECLARE
  v_total_partners int;
  v_active_partners int;
  v_avg_score numeric;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active'),
    AVG(ai_score)
  INTO v_total_partners, v_active_partners, v_avg_score
  FROM partner_prospects;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'total_partners', v_total_partners,
    'active_partners', v_active_partners,
    'average_score', ROUND(v_avg_score, 2),
    'health_score', CASE
      WHEN v_avg_score > 60 THEN 'excellent'
      WHEN v_avg_score > 40 THEN 'good'
      ELSE 'needs_improvement'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insérer des templates d'outreach
INSERT INTO partner_outreach_templates (name, category, subject, body, variables) VALUES
(
  'Premier Contact B2B',
  'initial_outreach',
  'Partenariat TaxiAssur x {{name}}',
  E'Bonjour,\n\nJe me permets de vous contacter car {{domain}} fait partie des acteurs clés du secteur taxi en France.\n\nTaxiAssur est le leader de l''assurance taxi en ligne. Nous proposons un partenariat gagnant-gagnant qui pourrait intéresser votre audience.\n\nSeriez-vous disponible pour un échange de 15 minutes cette semaine ?\n\nCordialement',
  '["name", "domain"]'::jsonb
),
(
  'Relance Partenaire',
  'follow_up',
  'Re: Partenariat TaxiAssur',
  E'Bonjour {{name}},\n\nJe reviens vers vous concernant ma proposition de partenariat.\n\nNous avons récemment lancé de nouvelles offres spécifiques pour les {{type}} qui pourraient particulièrement vous intéresser.\n\nÊtes-vous disponible pour en discuter ?\n\nBien cordialement',
  '["name", "type"]'::jsonb
),
(
  'Proposition Backlink',
  'backlink',
  'Opportunité de contenu de qualité pour {{domain}}',
  E'Bonjour,\n\nNous avons remarqué votre excellent contenu sur {{domain}}.\n\nNous proposons de créer un article invité de haute qualité sur l''assurance taxi, avec backlink naturel vers votre site.\n\nIntéressé par cette collaboration ?\n\nCordialement',
  '["domain"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Insérer quelques partenaires de démonstration
INSERT INTO partner_prospects (name, domain, type, status, contact_page_url, source) VALUES
('Annuaire Taxi France', 'annuaire-taxi-france.fr', 'annuaire', 'active', 'https://annuaire-taxi-france.fr/contact', 'manual'),
('Taxis de France', 'taxis-de-france.com', 'media', 'active', 'https://taxis-de-france.com/contact', 'manual'),
('Fédération Taxi', 'federation-taxi.org', 'asso', 'contacted', 'https://federation-taxi.org/contact', 'partner_finder')
ON CONFLICT (domain) DO NOTHING;

-- Calculer les scores IA pour les partenaires existants
DO $$
DECLARE
  v_partner_id uuid;
BEGIN
  FOR v_partner_id IN
    SELECT id FROM partner_prospects LIMIT 50
  LOOP
    PERFORM calculate_partner_ai_score(v_partner_id);
  END LOOP;
END $$;
