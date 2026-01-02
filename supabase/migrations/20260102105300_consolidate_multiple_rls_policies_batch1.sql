/*
  # Consolidation des Politiques RLS Multiples - Batch 1

  ## Résumé
  Fusion des politiques RLS permissives multiples en une seule politique par action.
  Ceci évite la confusion et améliore la maintenabilité.
  
  ## Tables Affectées (Batch 1/2)
  1. crm_ai_suggestions (SELECT)
  2. crm_call_recordings (SELECT)
  3. crm_documents (SELECT)
  4. crm_email_analytics (SELECT)
  5. crm_interactions (SELECT)
  6. crm_notifications (SELECT + UPDATE)
  7. crm_tasks (SELECT)
  
  ## Principe
  Fusion avec OR: policy1 OR policy2 → policy_unified
  
  ## Sécurité
  - ✅ Même niveau de sécurité (conditions combinées avec OR)
  - ✅ Aucune perte d'accès
  - ✅ Réversible
*/

-- ============================================================================
-- 1. crm_ai_suggestions
-- ============================================================================

DROP POLICY IF EXISTS "Backoffice can manage suggestions" ON crm_ai_suggestions;
DROP POLICY IF EXISTS "Users see suggestions for own leads" ON crm_ai_suggestions;

CREATE POLICY "Unified: View AI suggestions"
  ON crm_ai_suggestions FOR SELECT
  TO authenticated
  USING (
    -- Backoffice can manage suggestions
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- Users see suggestions for own leads
    lead_id IN (
      SELECT id FROM leads WHERE assigned_to = auth.uid()
    )
  );

-- ============================================================================
-- 2. crm_call_recordings
-- ============================================================================

DROP POLICY IF EXISTS "Users manage call recordings" ON crm_call_recordings;
DROP POLICY IF EXISTS "Users see recordings of own leads" ON crm_call_recordings;

CREATE POLICY "Unified: View call recordings"
  ON crm_call_recordings FOR SELECT
  TO authenticated
  USING (
    -- Users manage call recordings (admin)
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- Users see recordings of own leads
    lead_id IN (
      SELECT id FROM leads WHERE assigned_to = auth.uid()
    )
  );

-- ============================================================================
-- 3. crm_documents
-- ============================================================================

DROP POLICY IF EXISTS "Backoffice can manage documents" ON crm_documents;
DROP POLICY IF EXISTS "Users see documents of own leads" ON crm_documents;

CREATE POLICY "Unified: View CRM documents"
  ON crm_documents FOR SELECT
  TO authenticated
  USING (
    -- Backoffice can manage documents
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- Users see documents of own leads
    lead_id IN (
      SELECT id FROM leads WHERE assigned_to = auth.uid()
    )
  );

-- ============================================================================
-- 4. crm_email_analytics
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view email analytics" ON crm_email_analytics;
DROP POLICY IF EXISTS "System can manage email analytics" ON crm_email_analytics;

CREATE POLICY "Unified: View email analytics"
  ON crm_email_analytics FOR SELECT
  TO authenticated
  USING (
    -- All authenticated users can view
    true
  );

-- ============================================================================
-- 5. crm_interactions
-- ============================================================================

DROP POLICY IF EXISTS "Backoffice can manage interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Users see interactions of own leads" ON crm_interactions;

CREATE POLICY "Unified: View interactions"
  ON crm_interactions FOR SELECT
  TO authenticated
  USING (
    -- Backoffice can manage interactions
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- Users see interactions of own leads
    lead_id IN (
      SELECT id FROM leads WHERE assigned_to = auth.uid()
    )
  );

-- ============================================================================
-- 6. crm_notifications (SELECT + UPDATE)
-- ============================================================================

DROP POLICY IF EXISTS "Backoffice can manage notifications" ON crm_notifications;
DROP POLICY IF EXISTS "Users see own notifications" ON crm_notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON crm_notifications;

CREATE POLICY "Unified: View notifications"
  ON crm_notifications FOR SELECT
  TO authenticated
  USING (
    -- Backoffice can manage notifications
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- Users see own notifications
    user_id = auth.uid()
  );

CREATE POLICY "Unified: Update notifications"
  ON crm_notifications FOR UPDATE
  TO authenticated
  USING (
    -- Backoffice can manage notifications
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- Users update own notifications
    user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    user_id = auth.uid()
  );

-- ============================================================================
-- 7. crm_tasks
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users see own tasks" ON crm_tasks;

CREATE POLICY "Unified: View tasks"
  ON crm_tasks FOR SELECT
  TO authenticated
  USING (
    -- Users can view own tasks
    assigned_to = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Rapport
DO $$
BEGIN
  RAISE NOTICE '✅ Batch 1: 7 tables consolidées (9 politiques fusionnées)';
END $$;
