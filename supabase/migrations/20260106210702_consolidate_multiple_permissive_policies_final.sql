/*
  # Consolidate Multiple Permissive Policies - Final Cleanup

  1. Changes
    - Removes duplicate/overlapping permissive policies
    - Ensures only one policy per operation per role
    - Improves security clarity

  2. Tables Affected
    - company_documents
    - insurance_companies
    - newsletter_subscribers
    - review_requests

  3. Security
    - Maintains existing access patterns
    - Prevents policy conflicts
*/

-- company_documents: Remove redundant access policy, keep comprehensive one
DROP POLICY IF EXISTS "Company documents access" ON public.company_documents;
-- Keep "Admins manage company documents" which covers all operations including SELECT

-- insurance_companies: Remove redundant access policy
DROP POLICY IF EXISTS "Insurance companies access" ON public.insurance_companies;
-- Keep "Admins manage insurance companies" which covers all operations including SELECT

-- newsletter_subscribers: Keep both but ensure no overlap
-- "Public can subscribe to newsletter" is for INSERT only (anon + authenticated)
-- "Authenticated manage newsletter subscribers" is for ALL operations (authenticated only)
-- These don't actually overlap because the public one is just INSERT
-- But we should make the authenticated one only for UPDATE/DELETE to avoid overlap
DROP POLICY IF EXISTS "Authenticated manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Authenticated manage newsletter subscribers update delete"
ON public.newsletter_subscribers FOR UPDATE TO authenticated
USING ((select is_admin()))
WITH CHECK ((select is_admin()));

CREATE POLICY "Authenticated manage newsletter subscribers delete"
ON public.newsletter_subscribers FOR DELETE TO authenticated
USING ((select is_admin()));

CREATE POLICY "Authenticated manage newsletter subscribers select"
ON public.newsletter_subscribers FOR SELECT TO authenticated
USING ((select is_admin()));

-- review_requests: Remove redundant view policy
DROP POLICY IF EXISTS "View review requests" ON public.review_requests;
-- Keep "Admins manage review requests all operations" which covers all operations including SELECT
