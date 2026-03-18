/*
  # Add email notifications to claims RPCs

  ## Summary
  Updates the insert_client_claim and update_claim_tracking RPC functions
  to call the notify-claim edge function after each operation.

  1. Changes
    - insert_client_claim: After inserting a claim, calls notify-claim with type=new_claim
    - update_claim_tracking: After updating a claim, calls notify-claim with type=status_update
      (only when status or client_visible fields change)

  2. Implementation
    - Uses net.http_post (pg_net extension) for async fire-and-forget HTTP calls
    - Falls back gracefully if pg_net is not available (no error thrown)
    - Fetches client email/name from crm_leads for the notification payload
*/

CREATE OR REPLACE FUNCTION public.insert_client_claim(
  p_email text,
  p_claim_type text,
  p_description text DEFAULT NULL,
  p_claim_date date DEFAULT NULL,
  p_vehicle_info text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead record;
  v_claim record;
  v_claim_ref text;
  v_supabase_url text;
  v_anon_key text;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email invalide');
  END IF;

  SELECT id, first_name, last_name, email, immatriculation, company_name
  INTO v_lead
  FROM crm_leads
  WHERE email = lower(trim(p_email)) AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  v_claim_ref := 'SIN-' || to_char(now(), 'YYYYMM') || '-' || upper(substring(gen_random_uuid()::text, 1, 6));

  INSERT INTO crm_claims (
    lead_id,
    claim_type,
    description,
    claim_date,
    vehicle_info,
    status,
    reference_number,
    reported_by_client
  ) VALUES (
    v_lead.id,
    p_claim_type,
    p_description,
    COALESCE(p_claim_date, CURRENT_DATE),
    p_vehicle_info,
    'DECLARED',
    v_claim_ref,
    true
  )
  RETURNING * INTO v_claim;

  v_supabase_url := current_setting('app.supabase_url', true);
  v_anon_key := current_setting('app.anon_key', true);

  IF v_supabase_url IS NOT NULL AND v_anon_key IS NOT NULL AND v_lead.id IS NOT NULL THEN
    BEGIN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/notify-claim',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body := json_build_object(
          'type', 'new_claim',
          'claim_id', v_claim.id,
          'claim_reference', v_claim_ref,
          'client_name', trim(COALESCE(v_lead.first_name, '') || ' ' || COALESCE(v_lead.last_name, '')),
          'client_email', v_lead.email,
          'claim_type', p_claim_type,
          'claim_date', COALESCE(p_claim_date, CURRENT_DATE)::text,
          'description', p_description,
          'immatriculation', v_lead.immatriculation
        )::text
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN json_build_object(
    'success', true,
    'claim_id', v_claim.id,
    'reference', v_claim_ref,
    'status', 'DECLARED'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_claim_tracking(
  p_claim_id uuid,
  p_status text DEFAULT NULL,
  p_internal_notes text DEFAULT NULL,
  p_client_visible_status text DEFAULT NULL,
  p_client_visible_notes text DEFAULT NULL,
  p_expert_name text DEFAULT NULL,
  p_expert_company text DEFAULT NULL,
  p_expert_phone text DEFAULT NULL,
  p_expert_email text DEFAULT NULL,
  p_expert_mission_date date DEFAULT NULL,
  p_expert_appointment_date timestamptz DEFAULT NULL,
  p_expertise_garage_name text DEFAULT NULL,
  p_expertise_garage_address text DEFAULT NULL,
  p_expertise_garage_phone text DEFAULT NULL,
  p_expertise_date date DEFAULT NULL,
  p_repair_garage_name text DEFAULT NULL,
  p_repair_garage_address text DEFAULT NULL,
  p_repair_garage_phone text DEFAULT NULL,
  p_repair_start_date date DEFAULT NULL,
  p_repair_end_date date DEFAULT NULL,
  p_indemnisation_amount numeric DEFAULT NULL,
  p_indemnisation_date date DEFAULT NULL,
  p_indemnisation_paid_at date DEFAULT NULL,
  p_add_event_type text DEFAULT NULL,
  p_add_event_title text DEFAULT NULL,
  p_add_event_description text DEFAULT NULL,
  p_add_event_visible_to_client boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claim record;
  v_lead record;
  v_old_status text;
  v_supabase_url text;
  v_anon_key text;
  v_send_notification boolean := false;
BEGIN
  SELECT c.*, l.email AS lead_email, l.first_name, l.last_name, l.immatriculation
  INTO v_claim
  FROM crm_claims c
  LEFT JOIN crm_leads l ON l.id = c.lead_id
  WHERE c.id = p_claim_id;

  IF v_claim IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sinistre introuvable');
  END IF;

  v_old_status := v_claim.status;

  UPDATE crm_claims SET
    status = COALESCE(p_status, status),
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    client_visible_status = COALESCE(p_client_visible_status, client_visible_status),
    client_visible_notes = COALESCE(p_client_visible_notes, client_visible_notes),
    expert_name = COALESCE(p_expert_name, expert_name),
    expert_company = COALESCE(p_expert_company, expert_company),
    expert_phone = COALESCE(p_expert_phone, expert_phone),
    expert_email = COALESCE(p_expert_email, expert_email),
    expert_mission_date = COALESCE(p_expert_mission_date, expert_mission_date),
    expert_appointment_date = COALESCE(p_expert_appointment_date, expert_appointment_date),
    expertise_garage_name = COALESCE(p_expertise_garage_name, expertise_garage_name),
    expertise_garage_address = COALESCE(p_expertise_garage_address, expertise_garage_address),
    expertise_garage_phone = COALESCE(p_expertise_garage_phone, expertise_garage_phone),
    expertise_date = COALESCE(p_expertise_date, expertise_date),
    repair_garage_name = COALESCE(p_repair_garage_name, repair_garage_name),
    repair_garage_address = COALESCE(p_repair_garage_address, repair_garage_address),
    repair_garage_phone = COALESCE(p_repair_garage_phone, repair_garage_phone),
    repair_start_date = COALESCE(p_repair_start_date, repair_start_date),
    repair_end_date = COALESCE(p_repair_end_date, repair_end_date),
    indemnisation_amount = COALESCE(p_indemnisation_amount, indemnisation_amount),
    indemnisation_date = COALESCE(p_indemnisation_date, indemnisation_date),
    indemnisation_paid_at = COALESCE(p_indemnisation_paid_at, indemnisation_paid_at),
    updated_at = now()
  WHERE id = p_claim_id;

  IF p_add_event_type IS NOT NULL AND p_add_event_title IS NOT NULL THEN
    INSERT INTO crm_claim_events (claim_id, event_type, title, description, visible_to_client)
    VALUES (p_claim_id, p_add_event_type, p_add_event_title, p_add_event_description, p_add_event_visible_to_client);
  END IF;

  IF (p_status IS NOT NULL AND p_status != v_old_status)
     OR p_client_visible_status IS NOT NULL
     OR p_client_visible_notes IS NOT NULL THEN
    v_send_notification := true;
  END IF;

  IF v_send_notification AND v_claim.lead_email IS NOT NULL THEN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_anon_key := current_setting('app.anon_key', true);

    IF v_supabase_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/notify-claim',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
          ),
          body := json_build_object(
            'type', 'status_update',
            'claim_id', p_claim_id,
            'claim_reference', v_claim.reference_number,
            'client_name', trim(COALESCE(v_claim.first_name, '') || ' ' || COALESCE(v_claim.last_name, '')),
            'client_email', v_claim.lead_email,
            'claim_type', v_claim.claim_type,
            'status', COALESCE(p_status, v_old_status),
            'client_visible_status', p_client_visible_status,
            'client_visible_notes', p_client_visible_notes,
            'immatriculation', v_claim.immatriculation
          )::text
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'claim_id', p_claim_id);
END;
$$;
