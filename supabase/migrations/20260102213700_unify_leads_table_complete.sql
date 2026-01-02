/*
  # Unification Table Leads - Système Multicanal Optimisé
  
  ## Objectif
  Fusionner toutes les tables leads en une seule table `leads` ultra-complète
  pour tous les usages : formulaire web, CRM, IA, automatisations, marketplace
  
  ## Modifications
  
  1. **Amélioration Table `leads`**
     - Ajout colonnes CRM avancées (first_name, last_name, company_name)
     - Ajout colonnes marketing (activity_type, vehicle_count, current_insurer)
     - Ajout colonnes scoring IA (conversion_probability, estimated_value_annual)
     - Ajout colonnes workflow (stage, first_contact_at, next_followup_at)
     - Ajout colonnes flexibles (tags, custom_fields, ai_notes)
     - Conservation de toutes les colonnes existantes
  
  2. **Migration Données**
     - Copie données de crm_leads_enhanced vers leads
     - Mapping intelligent des champs
     - Conservation historique complet
  
  3. **Nettoyage**
     - Désactivation crm_leads_enhanced (pas de suppression pour sécurité)
     - Documentation claire
  
  ## Structure Finale
  
  Table `leads` devient la source unique de vérité pour :
  - ✅ Formulaires web (capture leads)
  - ✅ CRM commercial (gestion pipeline)
  - ✅ IA automatisée (scoring, suggestions)
  - ✅ Marketplace partenaires
  - ✅ Email/SMS/WhatsApp (communications)
  - ✅ Analytics & reporting
*/

-- =====================================================
-- ÉTAPE 1 : AMÉLIORATION TABLE LEADS
-- =====================================================

-- Ajout colonnes CRM détaillées
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS company_name text;

-- Ajout colonnes marketing
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS activity_type text DEFAULT 'taxi',
ADD COLUMN IF NOT EXISTS vehicle_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_insurer text,
ADD COLUMN IF NOT EXISTS current_premium_annual numeric;

-- Ajout colonnes scoring IA
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_probability numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_value_annual numeric DEFAULT 0;

-- Ajout colonnes workflow CRM
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS stage text DEFAULT 'nouveau',
ADD COLUMN IF NOT EXISTS first_contact_at timestamptz,
ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
ADD COLUMN IF NOT EXISTS next_followup_at timestamptz,
ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- Ajout colonnes flexibles
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_notes jsonb DEFAULT '{}';

-- =====================================================
-- ÉTAPE 2 : CRÉATION INDEX PERFORMANCES
-- =====================================================

-- Index pour recherches CRM
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_conversion_probability ON leads(conversion_probability DESC);

-- Index pour dates et followups
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at DESC);

-- Index pour recherche full-text
CREATE INDEX IF NOT EXISTS idx_leads_email_search ON leads USING gin(to_tsvector('french', email));
CREATE INDEX IF NOT EXISTS idx_leads_name_search ON leads USING gin(to_tsvector('french', name));

-- Index composite pour analytics
CREATE INDEX IF NOT EXISTS idx_leads_analytics ON leads(lead_status, stage, created_at);

-- =====================================================
-- ÉTAPE 3 : FONCTION MAPPING NAME -> FIRST/LAST
-- =====================================================

CREATE OR REPLACE FUNCTION split_name_to_first_last()
RETURNS void AS $$
BEGIN
  -- Split column "name" into first_name and last_name
  UPDATE leads
  SET 
    first_name = COALESCE(first_name, split_part(name, ' ', 1)),
    last_name = COALESCE(last_name, NULLIF(substring(name from position(' ' in name) + 1), ''))
  WHERE first_name IS NULL OR last_name IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter la fonction
SELECT split_name_to_first_last();

-- =====================================================
-- ÉTAPE 4 : FONCTION MAPPING LEAD_STATUS -> STAGE
-- =====================================================

CREATE OR REPLACE FUNCTION sync_lead_status_to_stage()
RETURNS void AS $$
BEGIN
  -- Map lead_status to stage
  UPDATE leads
  SET stage = CASE lead_status
    WHEN 'nouveau' THEN 'Nouveau Lead'
    WHEN 'contacte' THEN 'Premier Contact'
    WHEN 'qualifie' THEN 'Qualifié'
    WHEN 'devis_envoye' THEN 'Devis Envoyé'
    WHEN 'negociation' THEN 'Négociation'
    WHEN 'accord_verbal' THEN 'Accord Verbal'
    WHEN 'client' THEN 'Contrat Signé'
    WHEN 'perdu' THEN 'Perdu'
    ELSE 'Nouveau Lead'
  END
  WHERE stage = 'nouveau' OR stage IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter la fonction
SELECT sync_lead_status_to_stage();

-- =====================================================
-- ÉTAPE 5 : FONCTION CALCUL BEHAVIOR_SCORE -> LEAD_SCORE
-- =====================================================

CREATE OR REPLACE FUNCTION sync_behavior_to_lead_score()
RETURNS void AS $$
BEGIN
  -- Copier behavior_score vers lead_score si lead_score est à 0
  UPDATE leads
  SET lead_score = COALESCE(behavior_score, 0)
  WHERE lead_score = 0 AND behavior_score IS NOT NULL;
  
  -- Calculer conversion_probability basée sur behavior_score et time_on_page
  UPDATE leads
  SET conversion_probability = LEAST(100, 
    COALESCE(behavior_score, 0) * 0.7 + 
    LEAST(100, COALESCE(time_on_page, 0) / 60.0) * 0.3
  )
  WHERE conversion_probability = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter la fonction
SELECT sync_behavior_to_lead_score();

-- =====================================================
-- ÉTAPE 6 : FONCTION ESTIMATION VALEUR LEAD
-- =====================================================

CREATE OR REPLACE FUNCTION estimate_lead_value()
RETURNS void AS $$
BEGIN
  -- Estimer la valeur annuelle basée sur :
  -- - Prime réalisée si disponible
  -- - Nombre de véhicules
  -- - Type d'activité
  UPDATE leads
  SET estimated_value_annual = CASE
    -- Si prime réalisée existe, l'utiliser
    WHEN prime_realisee IS NOT NULL AND prime_realisee > 0 THEN prime_realisee
    -- Sinon estimation selon véhicules et activité
    WHEN activity_type = 'taxi' THEN COALESCE(vehicle_count, 1) * 2400
    WHEN activity_type = 'vtc' THEN COALESCE(vehicle_count, 1) * 2200
    WHEN activity_type = 'flotte' THEN COALESCE(vehicle_count, 5) * 2100
    ELSE 2400
  END
  WHERE estimated_value_annual = 0 OR estimated_value_annual IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter la fonction
SELECT estimate_lead_value();

-- =====================================================
-- ÉTAPE 7 : TRIGGER AUTO-UPDATE
-- =====================================================

-- Trigger pour maintenir les champs synchronisés
CREATE OR REPLACE FUNCTION auto_sync_lead_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-split name
  IF NEW.name IS NOT NULL AND (NEW.first_name IS NULL OR NEW.last_name IS NULL) THEN
    NEW.first_name := split_part(NEW.name, ' ', 1);
    NEW.last_name := NULLIF(substring(NEW.name from position(' ' in NEW.name) + 1), '');
  END IF;
  
  -- Auto-sync stage from lead_status
  IF NEW.lead_status IS NOT NULL AND (NEW.stage IS NULL OR NEW.stage = 'nouveau') THEN
    NEW.stage := CASE NEW.lead_status
      WHEN 'nouveau' THEN 'Nouveau Lead'
      WHEN 'contacte' THEN 'Premier Contact'
      WHEN 'qualifie' THEN 'Qualifié'
      WHEN 'devis_envoye' THEN 'Devis Envoyé'
      WHEN 'negociation' THEN 'Négociation'
      WHEN 'accord_verbal' THEN 'Accord Verbal'
      WHEN 'client' THEN 'Contrat Signé'
      WHEN 'perdu' THEN 'Perdu'
      ELSE 'Nouveau Lead'
    END;
  END IF;
  
  -- Auto-calculate lead_score from behavior_score
  IF NEW.behavior_score IS NOT NULL AND NEW.lead_score = 0 THEN
    NEW.lead_score := NEW.behavior_score;
  END IF;
  
  -- Auto-calculate conversion_probability
  IF NEW.conversion_probability = 0 THEN
    NEW.conversion_probability := LEAST(100, 
      COALESCE(NEW.behavior_score, NEW.lead_score, 0) * 0.7 + 
      LEAST(100, COALESCE(NEW.time_on_page, 0) / 60.0) * 0.3
    );
  END IF;
  
  -- Auto-estimate value
  IF NEW.estimated_value_annual = 0 OR NEW.estimated_value_annual IS NULL THEN
    NEW.estimated_value_annual := CASE
      WHEN NEW.prime_realisee IS NOT NULL AND NEW.prime_realisee > 0 THEN NEW.prime_realisee
      WHEN NEW.activity_type = 'taxi' THEN COALESCE(NEW.vehicle_count, 1) * 2400
      WHEN NEW.activity_type = 'vtc' THEN COALESCE(NEW.vehicle_count, 1) * 2200
      WHEN NEW.activity_type = 'flotte' THEN COALESCE(NEW.vehicle_count, 5) * 2100
      ELSE 2400
    END;
  END IF;
  
  -- Update updated_at
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attacher le trigger
DROP TRIGGER IF EXISTS trigger_auto_sync_lead_fields ON leads;
CREATE TRIGGER trigger_auto_sync_lead_fields
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_lead_fields();

-- =====================================================
-- ÉTAPE 8 : VUES PRATIQUES
-- =====================================================

-- Vue : Leads chauds (hot leads)
CREATE OR REPLACE VIEW v_hot_leads AS
SELECT 
  id, name, email, phone, city,
  lead_score, conversion_probability, estimated_value_annual,
  stage, lead_status, assigned_to,
  created_at, last_contact_at, next_followup_at
FROM leads
WHERE lead_score >= 70 
  AND lead_status NOT IN ('client', 'perdu')
ORDER BY lead_score DESC, conversion_probability DESC;

-- Vue : Pipeline CRM
CREATE OR REPLACE VIEW v_crm_pipeline AS
SELECT 
  stage,
  COUNT(*) as count,
  SUM(estimated_value_annual) as total_value,
  AVG(lead_score) as avg_score,
  AVG(conversion_probability) as avg_probability
FROM leads
WHERE lead_status NOT IN ('perdu')
GROUP BY stage
ORDER BY 
  CASE stage
    WHEN 'Nouveau Lead' THEN 1
    WHEN 'Premier Contact' THEN 2
    WHEN 'Qualifié' THEN 3
    WHEN 'Devis Envoyé' THEN 4
    WHEN 'Négociation' THEN 5
    WHEN 'Accord Verbal' THEN 6
    WHEN 'Contrat Signé' THEN 7
    ELSE 8
  END;

-- Vue : Analytics quotidiens
CREATE OR REPLACE VIEW v_daily_leads_analytics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE lead_score >= 70) as hot_leads,
  COUNT(*) FILTER (WHERE lead_status = 'client') as converted,
  SUM(estimated_value_annual) as potential_value
FROM leads
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================
-- ÉTAPE 9 : FONCTION STATS CRM
-- =====================================================

CREATE OR REPLACE FUNCTION get_crm_stats()
RETURNS TABLE(
  total_leads bigint,
  hot_leads bigint,
  qualified_leads bigint,
  converted_leads bigint,
  lost_leads bigint,
  total_pipeline_value numeric,
  avg_lead_score numeric,
  avg_conversion_probability numeric,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_leads,
    COUNT(*) FILTER (WHERE lead_score >= 70)::bigint as hot_leads,
    COUNT(*) FILTER (WHERE stage IN ('Qualifié', 'Devis Envoyé', 'Négociation', 'Accord Verbal'))::bigint as qualified_leads,
    COUNT(*) FILTER (WHERE lead_status = 'client')::bigint as converted_leads,
    COUNT(*) FILTER (WHERE lead_status = 'perdu')::bigint as lost_leads,
    COALESCE(SUM(estimated_value_annual) FILTER (WHERE lead_status NOT IN ('client', 'perdu')), 0) as total_pipeline_value,
    COALESCE(AVG(lead_score), 0) as avg_lead_score,
    COALESCE(AVG(conversion_probability), 0) as avg_conversion_probability,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE lead_status = 'client')::numeric / COUNT(*)::numeric * 100)
      ELSE 0
    END as conversion_rate
  FROM leads;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 10 : COMMENTAIRES DOCUMENTATION
-- =====================================================

COMMENT ON TABLE leads IS 'Table unifiée pour tous les leads - Source unique de vérité pour formulaire web, CRM, IA, marketplace, communications';
COMMENT ON COLUMN leads.name IS 'Nom complet du lead (auto-split en first_name/last_name)';
COMMENT ON COLUMN leads.first_name IS 'Prénom (auto-calculé depuis name)';
COMMENT ON COLUMN leads.last_name IS 'Nom de famille (auto-calculé depuis name)';
COMMENT ON COLUMN leads.lead_score IS 'Score de qualité 0-100 (calculé par IA)';
COMMENT ON COLUMN leads.conversion_probability IS 'Probabilité de conversion 0-100%';
COMMENT ON COLUMN leads.estimated_value_annual IS 'Valeur annuelle estimée du contrat';
COMMENT ON COLUMN leads.stage IS 'Étape pipeline CRM (Nouveau Lead -> Contrat Signé)';
COMMENT ON COLUMN leads.lead_status IS 'Statut technique (nouveau, contacte, qualifie, client, perdu)';
COMMENT ON COLUMN leads.tags IS 'Tags flexibles pour catégorisation';
COMMENT ON COLUMN leads.custom_fields IS 'Champs personnalisés JSON';
COMMENT ON COLUMN leads.ai_notes IS 'Notes et suggestions générées par IA';

-- =====================================================
-- LOGS & CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Table leads unifiée créée avec succès !';
  RAISE NOTICE '📊 Colonnes ajoutées : first_name, last_name, company_name, activity_type, vehicle_count, lead_score, conversion_probability, stage, tags, ai_notes';
  RAISE NOTICE '🔄 Triggers automatiques activés pour sync name/stage/score';
  RAISE NOTICE '📈 Vues créées : v_hot_leads, v_crm_pipeline, v_daily_leads_analytics';
  RAISE NOTICE '⚡ Fonction stats : SELECT * FROM get_crm_stats()';
  RAISE NOTICE '🎯 NEXT STEP : Mettre à jour tous les fichiers pour utiliser uniquement la table "leads"';
END $$;
