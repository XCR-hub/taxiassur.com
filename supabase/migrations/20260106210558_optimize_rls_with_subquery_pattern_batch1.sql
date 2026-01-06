/*
  # Optimize RLS Policies - Use Subquery Pattern for Helper Functions

  1. Changes
    - Updates policies to use (select is_admin()) instead of is_admin()
    - Updates policies to use (select is_admin_or_commercial()) instead of is_admin_or_commercial()
    - Prevents per-row evaluation of auth checks

  2. Security
    - Maintains existing access control
    - Significantly improves query performance at scale
    - Single evaluation per query instead of per row

  3. Tables Affected (Batch 1)
    - company_documents
    - insurance_companies
    - newsletter_subscribers
    - review_requests
    - email_providers_config
    - email_send_log
    - email_templates_unified
    - lead_company_quotes
    - ai_autonomous_actions
    - smart_reminders
*/

-- company_documents policies
DROP POLICY IF EXISTS "Company documents access" ON public.company_documents;
CREATE POLICY "Company documents access"
ON public.company_documents FOR SELECT TO authenticated
USING ((select is_admin_or_commercial()));

DROP POLICY IF EXISTS "Admins manage company documents" ON public.company_documents;
CREATE POLICY "Admins manage company documents"
ON public.company_documents FOR ALL TO authenticated
USING ((select is_admin_or_commercial()))
WITH CHECK ((select is_admin_or_commercial()));

-- insurance_companies policies
DROP POLICY IF EXISTS "Insurance companies access" ON public.insurance_companies;
CREATE POLICY "Insurance companies access"
ON public.insurance_companies FOR SELECT TO authenticated
USING ((select is_admin_or_commercial()));

DROP POLICY IF EXISTS "Admins manage insurance companies" ON public.insurance_companies;
CREATE POLICY "Admins manage insurance companies"
ON public.insurance_companies FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- newsletter_subscribers policies
DROP POLICY IF EXISTS "Authenticated manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Authenticated manage newsletter subscribers"
ON public.newsletter_subscribers FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- review_requests policies
DROP POLICY IF EXISTS "View review requests" ON public.review_requests;
CREATE POLICY "View review requests"
ON public.review_requests FOR SELECT TO authenticated
USING ((select is_admin()));

-- email_providers_config policies
DROP POLICY IF EXISTS "Admins manage email providers" ON public.email_providers_config;
CREATE POLICY "Admins manage email providers"
ON public.email_providers_config FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- email_send_log policies
DROP POLICY IF EXISTS "Admins view email logs" ON public.email_send_log;
CREATE POLICY "Admins view email logs"
ON public.email_send_log FOR SELECT TO authenticated
USING ((select is_admin()));

-- email_templates_unified policies
DROP POLICY IF EXISTS "Admins manage email templates" ON public.email_templates_unified;
CREATE POLICY "Admins manage email templates"
ON public.email_templates_unified FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- lead_company_quotes policies with admin check
DROP POLICY IF EXISTS "Les admins peuvent tout voir sur lead_company_quotes" ON public.lead_company_quotes;
CREATE POLICY "Les admins peuvent tout voir sur lead_company_quotes"
ON public.lead_company_quotes FOR SELECT TO authenticated
USING ((select is_admin()));

DROP POLICY IF EXISTS "Les commerciaux peuvent créer des devis/refus" ON public.lead_company_quotes;
CREATE POLICY "Les commerciaux peuvent créer des devis/refus"
ON public.lead_company_quotes FOR INSERT TO authenticated
WITH CHECK ((select is_admin_or_commercial()));

DROP POLICY IF EXISTS "Les commerciaux peuvent mettre à jour leurs devis" ON public.lead_company_quotes;
CREATE POLICY "Les commerciaux peuvent mettre à jour leurs devis"
ON public.lead_company_quotes FOR UPDATE TO authenticated
USING ((select is_admin_or_commercial()))
WITH CHECK ((select is_admin_or_commercial()));

-- ai_autonomous_actions policies
DROP POLICY IF EXISTS "Admins can manage autonomous actions" ON public.ai_autonomous_actions;
CREATE POLICY "Admins can manage autonomous actions"
ON public.ai_autonomous_actions FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

-- smart_reminders policies
DROP POLICY IF EXISTS "Admins can manage reminders" ON public.smart_reminders;
CREATE POLICY "Admins can manage reminders"
ON public.smart_reminders FOR ALL TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));
