/*
  # Optimize RLS Policies - Use Subquery Pattern Batch 2

  1. Tables Affected
    - reminder_templates
    - system_config
    - ai_learning_metrics
    - admin_sessions
    - backlink_email_campaigns
    - backlink_email_tracking
    - unified_contacts
    - email_conversations
    - unified_email_campaigns
    - smart_email_templates
*/

-- reminder_templates policies
DROP POLICY IF EXISTS "Admins can manage templates" ON public.reminder_templates;
CREATE POLICY "Admins can manage templates"
ON public.reminder_templates FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- system_config policies
DROP POLICY IF EXISTS "Admins can manage system config" ON public.system_config;
CREATE POLICY "Admins can manage system config"
ON public.system_config FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- ai_learning_metrics policies
DROP POLICY IF EXISTS "Admins can view learning metrics" ON public.ai_learning_metrics;
CREATE POLICY "Admins can view learning metrics"
ON public.ai_learning_metrics FOR SELECT TO authenticated
USING ((select is_admin()));

-- admin_sessions policies
DROP POLICY IF EXISTS "Admins can view own sessions" ON public.admin_sessions;
CREATE POLICY "Admins can view own sessions"
ON public.admin_sessions FOR SELECT TO authenticated
USING ((select is_admin()));

-- backlink_email_campaigns policies
DROP POLICY IF EXISTS "Admins can view all campaigns" ON public.backlink_email_campaigns;
CREATE POLICY "Admins can view all campaigns"
ON public.backlink_email_campaigns FOR SELECT TO authenticated
USING ((select is_admin()));

DROP POLICY IF EXISTS "Admins can create campaigns" ON public.backlink_email_campaigns;
CREATE POLICY "Admins can create campaigns"
ON public.backlink_email_campaigns FOR INSERT TO authenticated
WITH CHECK ((select is_admin()));

DROP POLICY IF EXISTS "Admins can update campaigns" ON public.backlink_email_campaigns;
CREATE POLICY "Admins can update campaigns"
ON public.backlink_email_campaigns FOR UPDATE TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- backlink_email_tracking policies
DROP POLICY IF EXISTS "Admins can view all email tracking" ON public.backlink_email_tracking;
CREATE POLICY "Admins can view all email tracking"
ON public.backlink_email_tracking FOR SELECT TO authenticated
USING ((select is_admin()));

DROP POLICY IF EXISTS "Admins can create email tracking" ON public.backlink_email_tracking;
CREATE POLICY "Admins can create email tracking"
ON public.backlink_email_tracking FOR INSERT TO authenticated
WITH CHECK ((select is_admin()));

DROP POLICY IF EXISTS "Admins can update email tracking" ON public.backlink_email_tracking;
CREATE POLICY "Admins can update email tracking"
ON public.backlink_email_tracking FOR UPDATE TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- unified_contacts policies
DROP POLICY IF EXISTS "Admins manage all unified contacts" ON public.unified_contacts;
CREATE POLICY "Admins manage all unified contacts"
ON public.unified_contacts FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- email_conversations policies
DROP POLICY IF EXISTS "Admins manage all conversations" ON public.email_conversations;
CREATE POLICY "Admins manage all conversations"
ON public.email_conversations FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- unified_email_campaigns policies
DROP POLICY IF EXISTS "Admins manage all campaigns" ON public.unified_email_campaigns;
CREATE POLICY "Admins manage all campaigns"
ON public.unified_email_campaigns FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- smart_email_templates policies
DROP POLICY IF EXISTS "Admins manage templates" ON public.smart_email_templates;
CREATE POLICY "Admins manage templates"
ON public.smart_email_templates FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));
