/*
  # Add Missing Foreign Key Indexes - Client Portal Tables (Batch 3)

  1. Changes
    - Adds indexes for client portal foreign keys
    - 14 indexes added

  2. Tables Covered
    - client_contracts (1 FK)
    - client_document_requests (5 FKs)
    - client_documents (2 FKs)
    - client_invoices (2 FKs)
    - client_portal_activities (1 FK)
    - client_portal_users (1 FK)
    - content_generation_history (1 FK)
    - conversion_funnel (1 FK)

  3. Performance Impact
    - Faster client portal queries
    - Better document management performance
    - Improved invoice lookups
*/

-- client_contracts
CREATE INDEX IF NOT EXISTS idx_client_contracts_insurer_id_fk 
ON public.client_contracts(insurer_id);

-- client_document_requests
CREATE INDEX IF NOT EXISTS idx_client_document_requests_client_id_fk 
ON public.client_document_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_client_document_requests_contract_id_fk 
ON public.client_document_requests(contract_id);

CREATE INDEX IF NOT EXISTS idx_client_document_requests_portal_user_id_fk 
ON public.client_document_requests(portal_user_id);

CREATE INDEX IF NOT EXISTS idx_client_document_requests_template_id_fk 
ON public.client_document_requests(template_id);

CREATE INDEX IF NOT EXISTS idx_client_document_requests_validated_by_fk 
ON public.client_document_requests(validated_by);

-- client_documents
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id_fk 
ON public.client_documents(client_id);

CREATE INDEX IF NOT EXISTS idx_client_documents_contract_id_fk 
ON public.client_documents(contract_id);

-- client_invoices
CREATE INDEX IF NOT EXISTS idx_client_invoices_client_id_fk 
ON public.client_invoices(client_id);

CREATE INDEX IF NOT EXISTS idx_client_invoices_contract_id_fk 
ON public.client_invoices(contract_id);

-- client_portal_activities
CREATE INDEX IF NOT EXISTS idx_client_portal_activities_portal_user_id_fk 
ON public.client_portal_activities(portal_user_id);

-- client_portal_users
CREATE INDEX IF NOT EXISTS idx_client_portal_users_contract_id_fk 
ON public.client_portal_users(contract_id);

-- content_generation_history
CREATE INDEX IF NOT EXISTS idx_content_generation_history_schedule_id_fk 
ON public.content_generation_history(schedule_id);

-- conversion_funnel
CREATE INDEX IF NOT EXISTS idx_conversion_funnel_session_id_fk 
ON public.conversion_funnel(session_id);
