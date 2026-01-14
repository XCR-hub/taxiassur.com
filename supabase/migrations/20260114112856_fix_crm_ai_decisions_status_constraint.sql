/*
  # Fix Status Constraint et Population IA Governance

  1. Modifications
    - Mettre à jour la contrainte status pour accepter les valeurs minuscules
    - Ajouter colonnes manquantes
    - Insérer décisions IA de démonstration
  
  2. Valeurs Status Acceptées
    - PENDING, pending
    - APPROVED, approved  
    - EXECUTED, executed, auto_applied
    - REJECTED, rejected
    - FAILED, failed
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE crm_ai_decisions DROP CONSTRAINT IF EXISTS crm_ai_decisions_status_check;

-- Ajouter la nouvelle contrainte avec les valeurs en minuscules ET majuscules
ALTER TABLE crm_ai_decisions 
ADD CONSTRAINT crm_ai_decisions_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'auto_applied', 'executed', 'failed', 'PENDING', 'APPROVED', 'EXECUTED', 'REJECTED', 'FAILED'));

-- Ajouter les colonnes manquantes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_decisions' AND column_name = 'agent') THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN agent TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_decisions' AND column_name = 'title') THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN title TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_decisions' AND column_name = 'description') THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_decisions' AND column_name = 'confidence_score') THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN confidence_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_decisions' AND column_name = 'suggested_action') THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN suggested_action TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_decisions' AND column_name = 'data_sources') THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN data_sources TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_decisions' AND column_name = 'approved_by') THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN approved_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_ai_decisions' AND column_name = 'applied_at') THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN applied_at TIMESTAMPTZ;
  END IF;
END $$;

-- Insérer des décisions IA de démonstration
INSERT INTO crm_ai_decisions (
  id, lead_id, agent, decision_type, title, description, rationale, 
  confidence, confidence_score, suggested_action, data_sources, 
  status, actions, created_at
)
SELECT 
  gen_random_uuid(),
  id,
  'lead_scorer',
  'evaluation',
  'Lead à fort potentiel détecté',
  'Ce lead présente des caractéristiques d''un profil à forte conversion basé sur l''historique.',
  'Analyse comportementale : engagement élevé, profil correspondant aux clients les plus rentables',
  85.5,
  85.5,
  'Prioriser le suivi commercial immédiat',
  ARRAY['lead_behavior', 'conversion_history', 'market_data'],
  'pending',
  '{"priority": "high", "recommended_followup_delay": "24h"}'::jsonb,
  NOW() - INTERVAL '2 hours'
FROM crm_leads 
WHERE status IN ('NEW_LEAD', 'CONTACT_ATTEMPTED')
LIMIT 2
ON CONFLICT (id) DO NOTHING;

-- Email Composer decisions
INSERT INTO crm_ai_decisions (
  id, lead_id, agent, decision_type, title, description, rationale,
  confidence, confidence_score, suggested_action, data_sources,
  status, actions, created_at, approved_by, applied_at
)
SELECT 
  gen_random_uuid(),
  id,
  'email_composer',
  'automation',
  'Email de relance personnalisé généré',
  'Email optimisé basé sur le profil du lead et les meilleures pratiques de conversion.',
  'Analyse du ton préféré du lead et des taux d''ouverture passés pour ce segment',
  92.0,
  92.0,
  'Envoyer email avec objet "Votre assurance taxi sur-mesure"',
  ARRAY['email_history', 'engagement_data', 'ab_test_results'],
  'approved',
  '{"email_template": "warm_followup", "send_time": "09:00"}'::jsonb,
  NOW() - INTERVAL '5 hours',
  'system',
  NOW() - INTERVAL '4 hours'
FROM crm_leads 
WHERE status IN ('NEW_LEAD', 'CONTACT_ATTEMPTED')
LIMIT 2
ON CONFLICT (id) DO NOTHING;

-- Risk Analyzer
INSERT INTO crm_ai_decisions (
  id, lead_id, agent, decision_type, title, description, rationale,
  confidence, confidence_score, suggested_action, data_sources,
  status, actions, created_at, applied_at
)
SELECT 
  gen_random_uuid(),
  id,
  'risk_analyzer',
  'alert',
  'Risque de souscription faible identifié',
  'Le profil présente un faible risque selon nos critères.',
  'Historique propre, zone géographique favorable, activité stable',
  88.0,
  88.0,
  'Approuver la souscription avec tarif standard',
  ARRAY['risk_database', 'claims_history', 'geographic_data'],
  'auto_applied',
  '{"risk_level": "low", "premium_adjustment": 0}'::jsonb,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '23 hours'
FROM crm_leads 
WHERE status = 'QUOTE_SENT'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Negotiation Assistant
INSERT INTO crm_ai_decisions (
  id, lead_id, agent, decision_type, title, description, rationale,
  confidence, confidence_score, suggested_action, data_sources,
  status, actions, created_at
)
SELECT 
  gen_random_uuid(),
  id,
  'negotiation_assistant',
  'suggestion',
  'Marge de négociation recommandée',
  'Possibilité d''offrir une réduction de 5% pour accélérer la conversion.',
  'Lead sensible au prix selon les interactions, concurrent détecté',
  78.5,
  78.5,
  'Proposer -5% sur la prime si engagement sous 48h',
  ARRAY['conversation_analysis', 'competitor_pricing', 'budget_signals'],
  'pending',
  '{"max_discount": 5, "condition": "quick_close"}'::jsonb,
  NOW() - INTERVAL '3 hours'
FROM crm_leads 
WHERE status IN ('DOCUMENTS_REQUIRED', 'QUOTE_SENT')
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Sentiment Analyzer (décision générale)
INSERT INTO crm_ai_decisions (
  id, agent, decision_type, title, description, rationale,
  confidence, confidence_score, suggested_action, data_sources,
  status, actions, created_at
) VALUES (
  gen_random_uuid(),
  'sentiment_analyzer',
  'alert',
  'Augmentation des sentiments négatifs détectée',
  'Les communications récentes montrent une hausse de 15% des sentiments négatifs.',
  'Analyse sémantique des emails : frustration liée aux délais de réponse',
  91.0,
  91.0,
  'Former équipe sur les temps de réponse',
  ARRAY['email_sentiment', 'chat_transcripts', 'nps_scores'],
  'pending',
  '{"alert_type": "sentiment_decline", "affected_leads": 8}'::jsonb,
  NOW() - INTERVAL '6 hours'
) ON CONFLICT (id) DO NOTHING;

-- Churn Predictor
INSERT INTO crm_ai_decisions (
  id, agent, decision_type, title, description, rationale,
  confidence, confidence_score, suggested_action, data_sources,
  status, actions, created_at, approved_by, applied_at
) VALUES (
  gen_random_uuid(),
  'churn_predictor',
  'prediction',
  '3 clients à risque de résiliation identifiés',
  'Modèle ML détecte des signaux de churn chez 3 clients actifs.',
  'Baisse engagement, recherche concurrents, renouvellement proche',
  87.5,
  87.5,
  'Lancer campagne de rétention ciblée',
  ARRAY['engagement_metrics', 'renewal_dates', 'competitor_research'],
  'approved',
  '{"at_risk_count": 3, "campaign": "retention_premium"}'::jsonb,
  NOW() - INTERVAL '12 hours',
  'admin',
  NOW() - INTERVAL '11 hours'
) ON CONFLICT (id) DO NOTHING;

-- Cross-Sell Recommender
INSERT INTO crm_ai_decisions (
  id, agent, decision_type, title, description, rationale,
  confidence, confidence_score, suggested_action, data_sources,
  status, actions, created_at
) VALUES (
  gen_random_uuid(),
  'cross_sell_recommender',
  'suggestion',
  'Opportunité RC Pro identifiée sur 5 clients',
  '5 clients avec un seul véhicule pourraient être intéressés par RC Pro.',
  'Profils correspondants : activité complémentaire, flotte en croissance',
  82.0,
  82.0,
  'Proposer RC Pro avec offre découverte -10%',
  ARRAY['client_profile', 'usage_patterns', 'cross_sell_history'],
  'pending',
  '{"opportunity_count": 5, "product": "rc_pro", "estimated_revenue": 2500}'::jsonb,
  NOW() - INTERVAL '8 hours'
) ON CONFLICT (id) DO NOTHING;

-- Response Generator
INSERT INTO crm_ai_decisions (
  id, lead_id, agent, decision_type, title, description, rationale,
  confidence, confidence_score, suggested_action, data_sources,
  status, actions, created_at, applied_at
)
SELECT 
  gen_random_uuid(),
  id,
  'response_generator',
  'automation',
  'Réponse automatique générée',
  'Message personnalisé créé pour répondre à la demande du lead.',
  'Détection d''intent : demande de devis, contexte : première interaction',
  89.0,
  89.0,
  'Envoyer réponse avec devis personnalisé',
  ARRAY['message_history', 'intent_detection', 'template_library'],
  'auto_applied',
  '{"response_type": "quote_request", "auto_sent": true}'::jsonb,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '25 minutes'
FROM crm_leads 
WHERE status = 'NEW_LEAD'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_crm_ai_decisions_agent ON crm_ai_decisions(agent);
CREATE INDEX IF NOT EXISTS idx_crm_ai_decisions_status ON crm_ai_decisions(status);
CREATE INDEX IF NOT EXISTS idx_crm_ai_decisions_lead_id ON crm_ai_decisions(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_ai_decisions_created_at ON crm_ai_decisions(created_at DESC);
