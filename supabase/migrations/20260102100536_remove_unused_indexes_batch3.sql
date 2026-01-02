/*
  # Remove Unused Indexes - Batch 3 (Final)

  ## Indexes Removed (Batch 3 - Remaining 20 indexes)
  Includes recently created SEO indexation indexes that haven't been used yet.
*/

-- Sinistres
DROP INDEX IF EXISTS public.idx_sinistre_actors_insurer_id;
DROP INDEX IF EXISTS public.idx_sinistre_exchanges_sinistre_id;
DROP INDEX IF EXISTS public.idx_sinistres_client_id;

-- WhatsApp
DROP INDEX IF EXISTS public.idx_wa_messages_sent_by_user_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_group_id;

-- SEO Indexation (recently created, not yet used)
DROP INDEX IF EXISTS public.idx_seo_indexation_issues_status;
DROP INDEX IF EXISTS public.idx_seo_indexation_issues_priority;
DROP INDEX IF EXISTS public.idx_seo_indexation_issues_type;
DROP INDEX IF EXISTS public.idx_seo_indexation_issues_url;
DROP INDEX IF EXISTS public.idx_seo_indexation_issues_detected_at;
DROP INDEX IF EXISTS public.idx_seo_queue_status;
DROP INDEX IF EXISTS public.idx_seo_queue_priority;
DROP INDEX IF EXISTS public.idx_seo_queue_url;
DROP INDEX IF EXISTS public.idx_seo_queue_created_at;
DROP INDEX IF EXISTS public.idx_seo_stats_date;
DROP INDEX IF EXISTS public.idx_seo_stats_rate;

-- Note: SEO indexes will be recreated when queries start using them.
-- Better to add them back when actual usage is detected.