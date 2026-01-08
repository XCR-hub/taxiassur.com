/*
  # Remove Duplicate Indexes (Performance Optimization)

  **Performance Issue**: Duplicate indexes waste storage and slow down writes
  
  These tables have identical indexes that serve the same purpose.
  We keep the newer index and remove the older FK index.
  
  ## Indexes Removed:
  - crm_documents: idx_crm_documents_lead_id_fk (keeping idx_docs_lead_prod)
  - crm_interactions: idx_crm_interactions_lead_id_fk (keeping idx_int_lead)
  - crm_tasks: idx_crm_tasks_lead_id_fk (keeping idx_tasks_lead)
*/

-- Remove duplicate indexes (keep the more descriptive names)
DROP INDEX IF EXISTS idx_crm_documents_lead_id_fk;
DROP INDEX IF EXISTS idx_crm_interactions_lead_id_fk;
DROP INDEX IF EXISTS idx_crm_tasks_lead_id_fk;
