
-- Remove obsolete triggers that point to wrong Supabase URL or duplicate functionality
-- trg_notify_document_upload: uses old URL bpwcakjtwgdtfwghylwv and app.settings key (never works)
-- Keep only the working triggers:
--   trg_notify_team_on_prospect_upload (team email via queue - just fixed)
--   trigger_notify_admin_prospect_document (CRM notification)
--   trigger_prospect_confirmation_email (prospect confirmation via queue)

DROP TRIGGER IF EXISTS trg_notify_document_upload ON prospect_documents;
