/*
  # Add RLS Policies for CRM Vehicles and Workflows

  1. Security
    - Add RLS policies for crm_vehicles
    - Add RLS policies for crm_workflows
    - Add RLS policies for crm_workflow_runs

  2. Policy Strategy
    - Restrict to authenticated users only (backoffice admins)
    - These are operational tables used by the CRM system
*/

-- CRM Vehicles
CREATE POLICY "Authenticated users can view vehicles"
  ON crm_vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON crm_vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON crm_vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vehicles"
  ON crm_vehicles FOR DELETE
  TO authenticated
  USING (true);

-- CRM Workflows
CREATE POLICY "Authenticated users can view workflows"
  ON crm_workflows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert workflows"
  ON crm_workflows FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update workflows"
  ON crm_workflows FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete workflows"
  ON crm_workflows FOR DELETE
  TO authenticated
  USING (true);

-- CRM Workflow Runs
CREATE POLICY "Authenticated users can view workflow runs"
  ON crm_workflow_runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert workflow runs"
  ON crm_workflow_runs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update workflow runs"
  ON crm_workflow_runs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete workflow runs"
  ON crm_workflow_runs FOR DELETE
  TO authenticated
  USING (true);
