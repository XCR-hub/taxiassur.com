/*
  # Add Missing Foreign Key Indexes - Lead Tables (Batch 6)

  1. Changes
    - Adds indexes for lead-related foreign keys
    - 13 indexes added

  2. Tables Covered
    - lead_communications (2 FKs)
    - lead_company_quotes (1 FK)
    - lead_contracts (3 FKs)
    - lead_documents (1 FK)
    - lead_payments (2 FKs)
    - lead_pipeline_history (2 FKs)
    - lead_quotes (1 FK)
    - lead_reminders (1 FK)

  3. Performance Impact
    - Faster lead queries
    - Better pipeline tracking
    - Improved payment lookups
*/

-- lead_communications
CREATE INDEX IF NOT EXISTS idx_lead_communications_lead_id_fk 
ON public.lead_communications(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_communications_parent_communication_id_fk 
ON public.lead_communications(parent_communication_id);

-- lead_company_quotes
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_submitted_by_fk 
ON public.lead_company_quotes(submitted_by);

-- lead_contracts
CREATE INDEX IF NOT EXISTS idx_lead_contracts_lead_id_fk 
ON public.lead_contracts(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_contracts_payment_id_fk 
ON public.lead_contracts(payment_id);

CREATE INDEX IF NOT EXISTS idx_lead_contracts_quote_id_fk 
ON public.lead_contracts(quote_id);

-- lead_documents
CREATE INDEX IF NOT EXISTS idx_lead_documents_lead_id_fk 
ON public.lead_documents(lead_id);

-- lead_payments
CREATE INDEX IF NOT EXISTS idx_lead_payments_lead_id_fk 
ON public.lead_payments(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_payments_quote_id_fk 
ON public.lead_payments(quote_id);

-- lead_pipeline_history
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_history_lead_id_fk 
ON public.lead_pipeline_history(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_pipeline_history_stage_id_fk 
ON public.lead_pipeline_history(stage_id);

-- lead_quotes
CREATE INDEX IF NOT EXISTS idx_lead_quotes_lead_id_fk 
ON public.lead_quotes(lead_id);

-- lead_reminders
CREATE INDEX IF NOT EXISTS idx_lead_reminders_lead_id_fk 
ON public.lead_reminders(lead_id);
