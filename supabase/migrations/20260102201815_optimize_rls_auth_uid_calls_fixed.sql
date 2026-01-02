/*
  # Optimize RLS Policies with auth.uid() - Fixed Version
  
  This migration optimizes RLS policies that call auth.uid() for each row.
  By wrapping auth.uid() in a SELECT subquery, it's evaluated once per query instead of once per row.
  
  ## Policies Optimized
  
  1. feature_flag_overrides: "Unified: View flag overrides"
  2. feature_flags: "Unified: View feature flags"
  3. loyalty_program: "Unified: View loyalty program"
  4. testimonials: "Unified: View testimonials"
  5. crm_ai_suggestions: "Unified: View AI suggestions"
  6. crm_call_recordings: "Unified: View call recordings"
  7. crm_documents: "Unified: View CRM documents"
  8. crm_interactions: "Unified: View interactions"
  9. crm_notifications: "Unified: View notifications", "Unified: Update notifications"
  
  ## Performance Impact
  
  This change significantly improves query performance at scale by reducing the number of
  function calls from O(n) to O(1) per query.
*/

-- feature_flag_overrides
DROP POLICY IF EXISTS "Unified: View flag overrides" ON public.feature_flag_overrides;
CREATE POLICY "Unified: View flag overrides"
  ON public.feature_flag_overrides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );

-- feature_flags
DROP POLICY IF EXISTS "Unified: View feature flags" ON public.feature_flags;
CREATE POLICY "Unified: View feature flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );

-- loyalty_program
DROP POLICY IF EXISTS "Unified: View loyalty program" ON public.loyalty_program;
CREATE POLICY "Unified: View loyalty program"
  ON public.loyalty_program
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );

-- testimonials
DROP POLICY IF EXISTS "Unified: View testimonials" ON public.testimonials;
CREATE POLICY "Unified: View testimonials"
  ON public.testimonials
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );

-- crm_ai_suggestions
DROP POLICY IF EXISTS "Unified: View AI suggestions" ON public.crm_ai_suggestions;
CREATE POLICY "Unified: View AI suggestions"
  ON public.crm_ai_suggestions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = crm_ai_suggestions.lead_id
      AND leads.assigned_to = (SELECT auth.uid())
    )
  );

-- crm_call_recordings
DROP POLICY IF EXISTS "Unified: View call recordings" ON public.crm_call_recordings;
CREATE POLICY "Unified: View call recordings"
  ON public.crm_call_recordings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = crm_call_recordings.lead_id
      AND leads.assigned_to = (SELECT auth.uid())
    )
  );

-- crm_documents
DROP POLICY IF EXISTS "Unified: View CRM documents" ON public.crm_documents;
CREATE POLICY "Unified: View CRM documents"
  ON public.crm_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = crm_documents.lead_id
      AND leads.assigned_to = (SELECT auth.uid())
    )
  );

-- crm_interactions
DROP POLICY IF EXISTS "Unified: View interactions" ON public.crm_interactions;
CREATE POLICY "Unified: View interactions"
  ON public.crm_interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = crm_interactions.lead_id
      AND leads.assigned_to = (SELECT auth.uid())
    )
  );

-- crm_notifications: View policy
DROP POLICY IF EXISTS "Unified: View notifications" ON public.crm_notifications;
CREATE POLICY "Unified: View notifications"
  ON public.crm_notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = (SELECT auth.uid())
      AND admin_users.role IN ('super_admin', 'admin')
      AND admin_users.is_active = true
    )
  );

-- crm_notifications: Update policy
DROP POLICY IF EXISTS "Unified: Update notifications" ON public.crm_notifications;
CREATE POLICY "Unified: Update notifications"
  ON public.crm_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
