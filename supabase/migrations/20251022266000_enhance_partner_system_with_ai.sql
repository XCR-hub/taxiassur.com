/*
  # Amélioration du Système de Partenaires avec IA

  1. Tables Améliorées
    - `partner_prospects` - Amélioration avec scoring IA
      - Ajout colonnes: `ai_score`, `ai_analysis`, `auto_qualified`
      - Ajout colonnes: `scraped_data`, `contact_info`, `last_checked`

    - `partner_interactions` - Historique des interactions
      - `id` (uuid, PK)
      - `partner_id` (uuid, FK)
      - `interaction_type` (text) - 'email', 'call', 'meeting', 'outreach'
      - `subject` (text)
      - `notes` (text)
      - `outcome` (text) - 'positive', 'negative', 'neutral', 'no_response'
      - `next_action` (text)
      - `next_action_date` (date)
      - `performed_by` (text)
      - `created_at` (timestamptz)

    - `partner_analytics` - Analytique des partenaires
      - `id` (uuid, PK)
      - `partner_id` (uuid, FK)
      - `metric_type` (text) - 'backlinks', 'referrals', 'leads', 'revenue'
      - `value` (numeric)
      - `period` (text) - 'daily', 'weekly', 'monthly'
      - `recorded_at` (timestamptz)

    - `partner_outreach_templates` - Templates d'outreach personnalisés
      - `id` (uuid, PK)
      - `name` (text)
      - `category` (text)
      - `subject` (text)
      - `body` (text)
      - `variables` (jsonb) - Variables dynamiques
      - `success_rate` (numeric)
      - `usage_count` (int)
      - `created_at` (timestamptz)

  2. Fonctions IA
    - Fonction pour scorer un partenaire avec IA
    - Fonction pour générer un outreach personnalisé
    - Fonction pour analyser les interactions
    - Fonction pour prédire le meilleur moment de contact
    - Fonction pour suggérer des actions

  3. Automatisation
    - Cron job pour re-scorer les partenaires
    - Cron job pour suggérer les prochaines actions
    - Cron job pour vérifier la santé des partenariats
*/

-- Améliorer la table partner_prospects avec colonnes IA
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS ai_score numeric DEFAULT 0;
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT '{}'::jsonb;
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS auto_qualified boolean DEFAULT false;
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS scraped_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS contact_info jsonb DEFAULT '{}'::jsonb;
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS last_checked timestamptz;
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS quality_score int DEFAULT 0;
ALTER TABLE partner_prospects ADD COLUMN IF NOT EXISTS engagement_level text;

CREATE INDEX IF NOT EXISTS idx_partner_prospects_ai_score ON partner_prospects(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_quality ON partner_prospects(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_auto_qualified ON partner_prospects(auto_qualified) WHERE auto_qualified = true;

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
CREATE POLICY "Authenticated users can manage interactions"
  ON partner_interactions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read analytics"
  ON partner_analytics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can write analytics"
  ON partner_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read templates"
  ON partner_outreach_templates FOR SELECT
  TO authenticated
  USING (true);

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
  -- Récupérer les infos du partenaire
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
      'days_inactive', v_days_since_contact,
      'score_breakdown', jsonb_build_object(
        'type_score', CASE v_partner.type WHEN 'asso' THEN 30 WHEN 'media' THEN 25 ELSE 10 END,
        'status_score', CASE v_partner.status WHEN 'active' THEN 40 WHEN 'contacted' THEN 30 ELSE 10 END,
        'interaction_score', CASE WHEN v_interaction_count > 0 THEN v_positive_interactions::numeric / v_interaction_count * 30 ELSE 0 END
      )
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
  v_personalization jsonb;
BEGIN
  -- Récupérer partenaire et template
  SELECT * INTO v_partner FROM partner_prospects WHERE id = p_partner_id;
  SELECT * INTO v_template FROM partner_outreach_templates WHERE id = p_template_id;

  IF v_partner IS NULL OR v_template IS NULL THEN
    RETURN jsonb_build_object('error', 'Partner or template not found');
  END IF;

  -- Personnaliser le sujet
  v_subject := v_template.subject;
  v_subject := REPLACE(v_subject, '{{name}}', COALESCE(v_partner.name, 'Partenaire'));
  v_subject := REPLACE(v_subject, '{{domain}}', v_partner.domain);

  -- Personnaliser le corps
  v_body := v_template.body;
  v_body := REPLACE(v_body, '{{name}}', COALESCE(v_partner.name, 'Partenaire'));
  v_body := REPLACE(v_body, '{{domain}}', v_partner.domain);
  v_body := REPLACE(v_body, '{{type}}', v_partner.type);
  v_body := REPLACE(v_body, '{{date}}', to_char(now(), 'DD/MM/YYYY'));

  -- Créer la personnalisation
  v_personalization := jsonb_build_object(
    'partner_id', p_partner_id,
    'template_id', p_template_id,
    'subject', v_subject,
    'body', v_body,
    'partner_name', v_partner.name,
    'partner_domain', v_partner.domain,
    'partner_type', v_partner.type,
    'generated_at', now()
  );

  -- Incrémenter l'usage du template
  UPDATE partner_outreach_templates
  SET
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = p_template_id;

  RETURN v_personalization;
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
      'reason', 'No contact for 30+ days',
      'days_inactive', EXTRACT(DAY FROM (now() - v_partner.updated_at))
    );
  END LOOP;

  -- Nouveaux partenaires à qualifier
  FOR v_partner IN
    SELECT * FROM partner_prospects
    WHERE status = 'new'
    AND ai_score > 50
    ORDER BY ai_score DESC
    LIMIT 5
  LOOP
    v_suggestions := v_suggestions || jsonb_build_object(
      'partner_id', v_partner.id,
      'partner_name', v_partner.name,
      'action', 'qualify',
      'priority', 'medium',
      'reason', 'High AI score, ready to qualify',
      'ai_score', v_partner.ai_score
    );
  END LOOP;

  -- Partenaires avec interactions positives à upgrader
  FOR v_partner IN
    SELECT p.*, COUNT(pi.id) as positive_count
    FROM partner_prospects p
    JOIN partner_interactions pi ON pi.partner_id = p.id
    WHERE pi.outcome = 'positive'
    AND p.status = 'contacted'
    GROUP BY p.id
    HAVING COUNT(pi.id) >= 2
    ORDER BY COUNT(pi.id) DESC
    LIMIT 5
  LOOP
    v_suggestions := v_suggestions || jsonb_build_object(
      'partner_id', v_partner.id,
      'partner_name', v_partner.name,
      'action', 'upgrade_to_active',
      'priority', 'high',
      'reason', 'Multiple positive interactions',
      'positive_interactions', v_partner.positive_count
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
  v_analysis jsonb;
  v_total_partners int;
  v_active_partners int;
  v_inactive_partners int;
  v_avg_score numeric;
  v_top_performers jsonb;
  v_needs_attention jsonb;
BEGIN
  -- Statistiques globales
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE updated_at < now() - interval '60 days'),
    AVG(ai_score)
  INTO v_total_partners, v_active_partners, v_inactive_partners, v_avg_score
  FROM partner_prospects;

  -- Top performers
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'domain', domain,
      'ai_score', ai_score,
      'status', status
    )
  )
  INTO v_top_performers
  FROM (
    SELECT * FROM partner_prospects
    WHERE ai_score > 0
    ORDER BY ai_score DESC
    LIMIT 10
  ) top;

  -- Partenaires nécessitant attention
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'domain', domain,
      'days_inactive', EXTRACT(DAY FROM (now() - updated_at)),
      'status', status
    )
  )
  INTO v_needs_attention
  FROM (
    SELECT * FROM partner_prospects
    WHERE status IN ('contacted', 'active')
    AND updated_at < now() - interval '45 days'
    ORDER BY updated_at ASC
    LIMIT 10
  ) attention;

  v_analysis := jsonb_build_object(
    'generated_at', now(),
    'overview', jsonb_build_object(
      'total_partners', v_total_partners,
      'active_partners', v_active_partners,
      'inactive_partners', v_inactive_partners,
      'average_score', ROUND(v_avg_score, 2),
      'health_score', CASE
        WHEN v_avg_score > 60 THEN 'excellent'
        WHEN v_avg_score > 40 THEN 'good'
        WHEN v_avg_score > 20 THEN 'fair'
        ELSE 'needs_improvement'
      END
    ),
    'top_performers', COALESCE(v_top_performers, '[]'::jsonb),
    'needs_attention', COALESCE(v_needs_attention, '[]'::jsonb)
  );

  RETURN v_analysis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job pour re-scorer tous les partenaires (quotidien à 3h)
SELECT cron.schedule(
  'partner-ai-scoring',
  '0 3 * * *',
  $$
    DO $$
    DECLARE
      v_partner_id uuid;
    BEGIN
      FOR v_partner_id IN
        SELECT id FROM partner_prospects WHERE status IN ('new', 'contacted', 'qualified', 'active')
      LOOP
        PERFORM calculate_partner_ai_score(v_partner_id);
      END LOOP;
    END $$;
  $$
);

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

-- Mettre à jour les partenaires existants avec scoring IA initial
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