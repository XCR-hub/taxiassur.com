/*
  # Système de Gestion des Sinistres

  ## 1. Tables
    - `claims` : Sinistres déclarés par les clients
    - `claim_notes` : Notes et messages sur les sinistres
    - `claim_status_history` : Historique des changements de statut

  ## 2. Sécurité
    - RLS activé
    - Client peut créer et voir ses propres sinistres
    - Commercial peut tout gérer
*/

-- ============================================================================
-- TABLE CLAIMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id),
  
  claim_number TEXT UNIQUE NOT NULL,
  claim_date TIMESTAMPTZ NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('accident', 'theft', 'fire', 'glass', 'vandalism', 'other')),
  
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  
  status TEXT DEFAULT 'declared' CHECK (status IN ('declared', 'investigating', 'approved', 'rejected', 'paid')),
  
  estimated_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2),
  paid_date TIMESTAMPTZ,
  
  documents JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  assigned_to UUID REFERENCES admin_users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_lead ON claims(lead_id);
CREATE INDEX IF NOT EXISTS idx_claims_contract ON claims(contract_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_date ON claims(claim_date);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can create own claims"
  ON claims FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = claims.lead_id
      AND crm_leads.workflow_stage = 'active'
    )
  );

CREATE POLICY "Client can view own claims"
  ON claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = claims.lead_id
    )
  );

CREATE POLICY "Commercial can manage claims"
  ON claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('admin', 'commercial')
    )
  );

-- ============================================================================
-- TABLE CLAIM NOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS claim_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  
  note_type TEXT DEFAULT 'internal' CHECK (note_type IN ('internal', 'client_visible', 'company')),
  content TEXT NOT NULL,
  
  author_id UUID REFERENCES admin_users(id),
  author_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_notes_claim ON claim_notes(claim_id);

ALTER TABLE claim_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can view visible notes"
  ON claim_notes FOR SELECT
  USING (
    note_type = 'client_visible'
    AND EXISTS (
      SELECT 1 FROM claims
      WHERE claims.id = claim_notes.claim_id
    )
  );

CREATE POLICY "Commercial can manage notes"
  ON claim_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('admin', 'commercial')
    )
  );

-- ============================================================================
-- TABLE CLAIM STATUS HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS claim_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  
  old_status TEXT,
  new_status TEXT NOT NULL,
  
  changed_by UUID REFERENCES admin_users(id),
  change_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_status_history_claim ON claim_status_history(claim_id);

ALTER TABLE claim_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can view status history"
  ON claim_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.id = claim_status_history.claim_id
    )
  );

CREATE POLICY "Commercial can manage history"
  ON claim_status_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('admin', 'commercial')
    )
  );

-- ============================================================================
-- TRIGGER: Historique changement statut
-- ============================================================================

CREATE OR REPLACE FUNCTION track_claim_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO claim_status_history (claim_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    
    -- Notification client si changement significatif
    IF NEW.status IN ('approved', 'rejected', 'paid') THEN
      INSERT INTO notification_queue (lead_id, channel, recipient, template_key, priority, variables)
      SELECT
        NEW.lead_id,
        'email',
        cl.email,
        'claim_status_changed',
        'high',
        jsonb_build_object(
          'claim_number', NEW.claim_number,
          'new_status', NEW.status,
          'first_name', cl.first_name
        )
      FROM crm_leads cl
      WHERE cl.id = NEW.lead_id;
    END IF;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_claim_status ON claims;
CREATE TRIGGER trigger_track_claim_status
  BEFORE UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION track_claim_status_change();

-- ============================================================================
-- FONCTIONS UTILES
-- ============================================================================

-- Statistiques sinistres
CREATE OR REPLACE FUNCTION get_claims_stats(p_lead_id UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_claims', COUNT(*),
    'declared', COUNT(*) FILTER (WHERE status = 'declared'),
    'investigating', COUNT(*) FILTER (WHERE status = 'investigating'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'paid', COUNT(*) FILTER (WHERE status = 'paid'),
    'total_paid', COALESCE(SUM(paid_amount), 0),
    'average_processing_days', COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400), 0)
  ) INTO stats
  FROM claims
  WHERE lead_id = p_lead_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_claims_stats(UUID) TO authenticated, anon;
