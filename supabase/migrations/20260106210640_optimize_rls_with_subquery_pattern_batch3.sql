/*
  # Optimize RLS Policies - Use Subquery Pattern Batch 3

  1. Tables Affected
    - ai_decision_log
    - ai_agent_collaboration
    - contact_engagement_score
    - crm_lead_timeline
    - newsletter_campaigns
    - review_requests (additional policy)
    - social_networks
*/

-- ai_decision_log policies
DROP POLICY IF EXISTS "Admins read AI logs" ON public.ai_decision_log;
CREATE POLICY "Admins read AI logs"
ON public.ai_decision_log FOR SELECT TO authenticated
USING ((select is_admin()));

-- ai_agent_collaboration policies
DROP POLICY IF EXISTS "Admins read AI collaboration" ON public.ai_agent_collaboration;
CREATE POLICY "Admins read AI collaboration"
ON public.ai_agent_collaboration FOR SELECT TO authenticated
USING ((select is_admin()));

-- contact_engagement_score policies
DROP POLICY IF EXISTS "Admins read engagement scores" ON public.contact_engagement_score;
CREATE POLICY "Admins read engagement scores"
ON public.contact_engagement_score FOR SELECT TO authenticated
USING ((select is_admin()));

-- crm_lead_timeline policies
DROP POLICY IF EXISTS "Admins can view lead timeline" ON public.crm_lead_timeline;
CREATE POLICY "Admins can view lead timeline"
ON public.crm_lead_timeline FOR SELECT TO authenticated
USING ((select is_admin()));

-- newsletter_campaigns policies
DROP POLICY IF EXISTS "Authenticated manage newsletter campaigns" ON public.newsletter_campaigns;
CREATE POLICY "Authenticated manage newsletter campaigns"
ON public.newsletter_campaigns FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- review_requests additional policy
DROP POLICY IF EXISTS "Admins manage review requests all operations" ON public.review_requests;
CREATE POLICY "Admins manage review requests all operations"
ON public.review_requests FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- social_networks policies
DROP POLICY IF EXISTS "View social networks" ON public.social_networks;
CREATE POLICY "View social networks"
ON public.social_networks FOR SELECT TO authenticated
USING ((select is_admin()));
