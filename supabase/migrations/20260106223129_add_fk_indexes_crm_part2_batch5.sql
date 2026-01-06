/*
  # Add Missing Foreign Key Indexes - CRM Tables Part 2 (Batch 5)

  1. Changes
    - Adds indexes for remaining CRM foreign keys
    - 13 indexes added

  2. Tables Covered
    - crm_interactions (2 FKs)
    - crm_lead_activities (1 FK)
    - crm_notifications (2 FKs)
    - crm_quotes_sent (3 FKs)
    - crm_tasks (3 FKs)
    - cross_sell_history (2 FKs)
    - cross_sell_opportunities (2 FKs)

  3. Performance Impact
    - Faster CRM interaction queries
    - Better task management performance
    - Improved quote lookups
*/

-- crm_interactions
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_by_fk 
ON public.crm_interactions(created_by);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead_id_fk 
ON public.crm_interactions(lead_id);

-- crm_lead_activities
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead_id_fk 
ON public.crm_lead_activities(lead_id);

-- crm_notifications
CREATE INDEX IF NOT EXISTS idx_crm_notifications_lead_id_fk 
ON public.crm_notifications(lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_user_id_fk 
ON public.crm_notifications(user_id);

-- crm_quotes_sent
CREATE INDEX IF NOT EXISTS idx_crm_quotes_sent_insurer_id_fk 
ON public.crm_quotes_sent(insurer_id);

CREATE INDEX IF NOT EXISTS idx_crm_quotes_sent_lead_id_fk 
ON public.crm_quotes_sent(lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_quotes_sent_sent_by_fk 
ON public.crm_quotes_sent(sent_by);

-- crm_tasks
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_by_fk 
ON public.crm_tasks(assigned_by);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to_fk 
ON public.crm_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id_fk 
ON public.crm_tasks(lead_id);

-- cross_sell_history
CREATE INDEX IF NOT EXISTS idx_cross_sell_history_campaign_id_fk 
ON public.cross_sell_history(campaign_id);

CREATE INDEX IF NOT EXISTS idx_cross_sell_history_lead_id_fk 
ON public.cross_sell_history(lead_id);

-- cross_sell_opportunities
CREATE INDEX IF NOT EXISTS idx_cross_sell_opportunities_client_id_fk 
ON public.cross_sell_opportunities(client_id);

CREATE INDEX IF NOT EXISTS idx_cross_sell_opportunities_contract_id_fk 
ON public.cross_sell_opportunities(contract_id);
