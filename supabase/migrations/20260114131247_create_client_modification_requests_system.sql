/*
  # Client Modification Requests System

  1. New Tables
    - `client_modification_requests`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, FK to crm_leads)
      - `request_type` (text: address, rib, vehicle)
      - `status` (text: pending, approved, rejected)
      - `old_data` (jsonb) - Previous values
      - `new_data` (jsonb) - Requested new values
      - `reason` (text) - Reason for modification
      - `requested_at` (timestamptz)
      - `processed_at` (timestamptz)
      - `processed_by` (uuid, FK to admin_users)
      - `admin_notes` (text)
  
  2. Security
    - Enable RLS
    - Clients can create and view their own requests
    - Admins can view and process all requests
*/

CREATE TABLE IF NOT EXISTS client_modification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('address', 'rib', 'vehicle', 'contact', 'other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  old_data jsonb DEFAULT '{}',
  new_data jsonb NOT NULL,
  reason text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_mod_requests_lead_id ON client_modification_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_mod_requests_status ON client_modification_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_mod_requests_type ON client_modification_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_client_mod_requests_requested_at ON client_modification_requests(requested_at DESC);

ALTER TABLE client_modification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can create modification requests"
  ON client_modification_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Clients can view their own requests via token"
  ON client_modification_requests
  FOR SELECT TO anon, authenticated
  USING (
    lead_id IN (
      SELECT id FROM crm_leads 
      WHERE access_token IS NOT NULL
    )
  );

CREATE POLICY "Admins can view all modification requests"
  ON client_modification_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update modification requests"
  ON client_modification_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE OR REPLACE FUNCTION update_client_modification_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_client_mod_requests_updated ON client_modification_requests;
CREATE TRIGGER tr_client_mod_requests_updated
  BEFORE UPDATE ON client_modification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_client_modification_timestamp();

CREATE OR REPLACE FUNCTION process_modification_request(
  p_request_id uuid,
  p_status text,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_request record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_request FROM client_modification_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already processed');
  END IF;
  
  UPDATE client_modification_requests
  SET 
    status = p_status,
    processed_at = now(),
    processed_by = auth.uid(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;
  
  IF p_status = 'approved' THEN
    CASE v_request.request_type
      WHEN 'address' THEN
        UPDATE crm_leads
        SET 
          address = COALESCE((v_request.new_data->>'street'), address),
          postal_code = COALESCE((v_request.new_data->>'postal_code'), postal_code),
          city = COALESCE((v_request.new_data->>'city'), city)
        WHERE id = v_request.lead_id;
        
      WHEN 'rib' THEN
        UPDATE crm_leads
        SET 
          iban = COALESCE((v_request.new_data->>'iban'), iban),
          bic = COALESCE((v_request.new_data->>'bic'), bic)
        WHERE id = v_request.lead_id;
        
      WHEN 'vehicle' THEN
        UPDATE crm_leads
        SET 
          vehicle_registration = COALESCE((v_request.new_data->>'license_plate'), vehicle_registration),
          vehicle_brand = COALESCE((v_request.new_data->>'brand'), vehicle_brand),
          vehicle_model = COALESCE((v_request.new_data->>'model'), vehicle_model)
        WHERE id = v_request.lead_id;
    END CASE;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', p_status
  );
END;
$$;

COMMENT ON TABLE client_modification_requests IS 'Stores client requests for data modifications (address, RIB, vehicle)';
