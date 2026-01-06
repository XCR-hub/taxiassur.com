/*
  # Add Missing Foreign Key Indexes - CRM Tables Part 1 (Batch 4)

  1. Changes
    - Adds indexes for CRM-related foreign keys
    - 16 indexes added

  2. Tables Covered
    - crm_ai_suggestions (2 FKs)
    - crm_automation_history (2 FKs)
    - crm_automation_rules (1 FK)
    - crm_automation_triggers (1 FK)
    - crm_call_recordings (2 FKs)
    - crm_contracts_signed (4 FKs)
    - crm_documents (3 FKs)
    - crm_email_analytics (2 FKs)

  3. Performance Impact
    - Faster CRM queries
    - Better automation performance
    - Improved contract lookups
*/

-- crm_ai_suggestions
CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_accepted_by_fk 
ON public.crm_ai_suggestions(accepted_by);

CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_lead_id_fk 
ON public.crm_ai_suggestions(lead_id);

-- crm_automation_history
CREATE INDEX IF NOT EXISTS idx_crm_automation_history_lead_id_fk 
ON public.crm_automation_history(lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_automation_history_rule_id_fk 
ON public.crm_automation_history(rule_id);

-- crm_automation_rules
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_created_by_fk 
ON public.crm_automation_rules(created_by);

-- crm_automation_triggers
CREATE INDEX IF NOT EXISTS idx_crm_automation_triggers_automation_rule_id_fk 
ON public.crm_automation_triggers(automation_rule_id);

-- crm_call_recordings
CREATE INDEX IF NOT EXISTS idx_crm_call_recordings_interaction_id_fk 
ON public.crm_call_recordings(interaction_id);

CREATE INDEX IF NOT EXISTS idx_crm_call_recordings_lead_id_fk 
ON public.crm_call_recordings(lead_id);

-- crm_contracts_signed
CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_insurer_id_fk 
ON public.crm_contracts_signed(insurer_id);

CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_lead_id_fk 
ON public.crm_contracts_signed(lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_quote_id_fk 
ON public.crm_contracts_signed(quote_id);

CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_signed_by_fk 
ON public.crm_contracts_signed(signed_by);

-- crm_documents
CREATE INDEX IF NOT EXISTS idx_crm_documents_lead_id_fk 
ON public.crm_documents(lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_documents_uploaded_by_fk 
ON public.crm_documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_crm_documents_validated_by_fk 
ON public.crm_documents(validated_by);

-- crm_email_analytics
CREATE INDEX IF NOT EXISTS idx_crm_email_analytics_interaction_id_fk 
ON public.crm_email_analytics(interaction_id);

CREATE INDEX IF NOT EXISTS idx_crm_email_analytics_lead_id_fk 
ON public.crm_email_analytics(lead_id);
