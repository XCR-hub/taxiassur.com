/*
  # Enhance CRM Claims - Full Tracking System

  ## Summary
  Adds comprehensive claim tracking fields to crm_claims for the full sinistre lifecycle:
  expert assignment, garage info, repair tracking, indemnisation, and timeline events.

  ## New Columns on crm_claims
  - `expert_name` — Name of the insurance expert assigned
  - `expert_company` — Expert's company name
  - `expert_phone` — Expert contact phone
  - `expert_email` — Expert contact email
  - `expert_mission_date` — Date the expert was assigned/missioned
  - `expert_appointment_date` — Date of expert visit appointment
  - `expertise_garage_name` — Garage for expertise inspection
  - `expertise_garage_address` — Garage address
  - `expertise_garage_phone` — Garage phone
  - `expertise_date` — Date expertise took place
  - `repair_garage_name` — Garage for repairs
  - `repair_garage_address` — Repair garage address
  - `repair_garage_phone` — Repair garage phone
  - `repair_start_date` — Repair start date
  - `repair_end_date` — Repair end (expected/actual)
  - `indemnisation_amount` — Proposed/accepted indemnisation amount
  - `indemnisation_date` — Date indemnisation was proposed
  - `indemnisation_paid_at` — Date payment was actually sent
  - `client_visible_status` — Client-facing status message (custom text)
  - `client_visible_notes` — Notes visible to the client in their portal

  ## New Table: crm_claim_events
  Timeline events visible to the client tracking each step in the claim process.

  ## Security
  - RLS enabled on crm_claim_events
  - Policies for authenticated admin access and anon read via lead_id
*/

-- Add expert and tracking columns to crm_claims
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_claims' AND column_name = 'expert_name') THEN
    ALTER TABLE crm_claims ADD COLUMN expert_name text;
    ALTER TABLE crm_claims ADD COLUMN expert_company text;
    ALTER TABLE crm_claims ADD COLUMN expert_phone text;
    ALTER TABLE crm_claims ADD COLUMN expert_email text;
    ALTER TABLE crm_claims ADD COLUMN expert_mission_date date;
    ALTER TABLE crm_claims ADD COLUMN expert_appointment_date timestamptz;
    ALTER TABLE crm_claims ADD COLUMN expertise_garage_name text;
    ALTER TABLE crm_claims ADD COLUMN expertise_garage_address text;
    ALTER TABLE crm_claims ADD COLUMN expertise_garage_phone text;
    ALTER TABLE crm_claims ADD COLUMN expertise_date date;
    ALTER TABLE crm_claims ADD COLUMN repair_garage_name text;
    ALTER TABLE crm_claims ADD COLUMN repair_garage_address text;
    ALTER TABLE crm_claims ADD COLUMN repair_garage_phone text;
    ALTER TABLE crm_claims ADD COLUMN repair_start_date date;
    ALTER TABLE crm_claims ADD COLUMN repair_end_date date;
    ALTER TABLE crm_claims ADD COLUMN indemnisation_amount numeric(10,2);
    ALTER TABLE crm_claims ADD COLUMN indemnisation_date date;
    ALTER TABLE crm_claims ADD COLUMN indemnisation_paid_at timestamptz;
    ALTER TABLE crm_claims ADD COLUMN client_visible_status text;
    ALTER TABLE crm_claims ADD COLUMN client_visible_notes text;
  END IF;
END $$;

-- Drop and recreate the claim_status constraint to include all needed statuses
ALTER TABLE crm_claims DROP CONSTRAINT IF EXISTS crm_claims_claim_status_check;
ALTER TABLE crm_claims ADD CONSTRAINT crm_claims_claim_status_check
  CHECK (claim_status IN (
    'open',
    'DECLARED',
    'DOCUMENTS_PENDING',
    'EXPERT_MISSIONED',
    'EXPERTISE_SCHEDULED',
    'EXPERTISE_DONE',
    'UNDER_REVIEW',
    'INDEMNISATION_PROPOSED',
    'REPAIR_IN_PROGRESS',
    'APPROVED',
    'REJECTED',
    'PAID',
    'CLOSED'
  ));

-- Timeline events table for client visibility
CREATE TABLE IF NOT EXISTS crm_claim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES crm_claims(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_date timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text,
  is_visible_to_client boolean DEFAULT true,
  created_by_admin boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_events_claim_id ON crm_claim_events(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_events_lead_id ON crm_claim_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_claim_events_date ON crm_claim_events(event_date DESC);

ALTER TABLE crm_claim_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage claim events"
  ON crm_claim_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert claim events"
  ON crm_claim_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update claim events"
  ON crm_claim_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can read visible claim events by lead"
  ON crm_claim_events
  FOR SELECT
  TO anon
  USING (is_visible_to_client = true);

-- Updated RPC: get_client_claims_by_email — includes tracking fields + events
CREATE OR REPLACE FUNCTION public.get_client_claims_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_is_active boolean;
  v_claims json;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email invalide');
  END IF;

  SELECT lead_id, is_active INTO v_lead_id, v_is_active
  FROM client_portal_users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_lead_id IS NULL OR NOT COALESCE(v_is_active, false) THEN
    RETURN json_build_object('success', false, 'error', 'Compte non trouvé ou inactif');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id',                       c.id,
      'claim_number',             c.claim_number,
      'incident_type',            c.incident_type,
      'claim_type',               c.claim_type,
      'incident_date',            c.incident_date,
      'incident_location',        c.incident_location,
      'incident_description',     c.incident_description,
      'claim_status',             c.claim_status,
      'client_visible_status',    c.client_visible_status,
      'client_visible_notes',     c.client_visible_notes,
      'estimated_amount',         c.estimated_amount,
      'indemnisation_amount',     c.indemnisation_amount,
      'indemnisation_date',       c.indemnisation_date,
      'indemnisation_paid_at',    c.indemnisation_paid_at,
      'expert_name',              c.expert_name,
      'expert_company',           c.expert_company,
      'expert_phone',             c.expert_phone,
      'expert_appointment_date',  c.expert_appointment_date,
      'expertise_garage_name',    c.expertise_garage_name,
      'expertise_garage_address', c.expertise_garage_address,
      'expertise_garage_phone',   c.expertise_garage_phone,
      'expertise_date',           c.expertise_date,
      'repair_garage_name',       c.repair_garage_name,
      'repair_garage_address',    c.repair_garage_address,
      'repair_garage_phone',      c.repair_garage_phone,
      'repair_start_date',        c.repair_start_date,
      'repair_end_date',          c.repair_end_date,
      'third_party_involved',     c.third_party_involved,
      'police_report_number',     c.police_report_number,
      'declared_at',              c.declared_at,
      'reviewed_at',              c.reviewed_at,
      'closed_at',                c.closed_at,
      'created_at',               c.created_at,
      'events', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id',          e.id,
            'event_type',  e.event_type,
            'event_date',  e.event_date,
            'title',       e.title,
            'description', e.description
          ) ORDER BY e.event_date ASC
        ), '[]'::json)
        FROM crm_claim_events e
        WHERE e.claim_id = c.id AND e.is_visible_to_client = true
      )
    ) ORDER BY c.created_at DESC
  )
  INTO v_claims
  FROM crm_claims c
  WHERE c.lead_id = v_lead_id;

  RETURN json_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'claims', COALESCE(v_claims, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_claims_by_email(text) TO anon, authenticated;

-- RPC: update_claim_tracking — for admin to update claim tracking fields
CREATE OR REPLACE FUNCTION public.update_claim_tracking(
  p_claim_id                 uuid,
  p_claim_status             text DEFAULT NULL,
  p_client_visible_status    text DEFAULT NULL,
  p_client_visible_notes     text DEFAULT NULL,
  p_expert_name              text DEFAULT NULL,
  p_expert_company           text DEFAULT NULL,
  p_expert_phone             text DEFAULT NULL,
  p_expert_email             text DEFAULT NULL,
  p_expert_mission_date      date DEFAULT NULL,
  p_expert_appointment_date  timestamptz DEFAULT NULL,
  p_expertise_garage_name    text DEFAULT NULL,
  p_expertise_garage_address text DEFAULT NULL,
  p_expertise_garage_phone   text DEFAULT NULL,
  p_expertise_date           date DEFAULT NULL,
  p_repair_garage_name       text DEFAULT NULL,
  p_repair_garage_address    text DEFAULT NULL,
  p_repair_garage_phone      text DEFAULT NULL,
  p_repair_start_date        date DEFAULT NULL,
  p_repair_end_date          date DEFAULT NULL,
  p_indemnisation_amount     numeric DEFAULT NULL,
  p_indemnisation_date       date DEFAULT NULL,
  p_indemnisation_paid_at    timestamptz DEFAULT NULL,
  p_internal_notes           text DEFAULT NULL,
  p_add_event_title          text DEFAULT NULL,
  p_add_event_description    text DEFAULT NULL,
  p_add_event_type           text DEFAULT NULL,
  p_event_visible_to_client  boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_new_event_id uuid;
BEGIN
  UPDATE crm_claims SET
    claim_status              = COALESCE(p_claim_status, claim_status),
    client_visible_status     = COALESCE(p_client_visible_status, client_visible_status),
    client_visible_notes      = COALESCE(p_client_visible_notes, client_visible_notes),
    expert_name               = COALESCE(p_expert_name, expert_name),
    expert_company            = COALESCE(p_expert_company, expert_company),
    expert_phone              = COALESCE(p_expert_phone, expert_phone),
    expert_email              = COALESCE(p_expert_email, expert_email),
    expert_mission_date       = COALESCE(p_expert_mission_date, expert_mission_date),
    expert_appointment_date   = COALESCE(p_expert_appointment_date, expert_appointment_date),
    expertise_garage_name     = COALESCE(p_expertise_garage_name, expertise_garage_name),
    expertise_garage_address  = COALESCE(p_expertise_garage_address, expertise_garage_address),
    expertise_garage_phone    = COALESCE(p_expertise_garage_phone, expertise_garage_phone),
    expertise_date            = COALESCE(p_expertise_date, expertise_date),
    repair_garage_name        = COALESCE(p_repair_garage_name, repair_garage_name),
    repair_garage_address     = COALESCE(p_repair_garage_address, repair_garage_address),
    repair_garage_phone       = COALESCE(p_repair_garage_phone, repair_garage_phone),
    repair_start_date         = COALESCE(p_repair_start_date, repair_start_date),
    repair_end_date           = COALESCE(p_repair_end_date, repair_end_date),
    indemnisation_amount      = COALESCE(p_indemnisation_amount, indemnisation_amount),
    indemnisation_date        = COALESCE(p_indemnisation_date, indemnisation_date),
    indemnisation_paid_at     = COALESCE(p_indemnisation_paid_at, indemnisation_paid_at),
    internal_notes            = COALESCE(p_internal_notes, internal_notes),
    updated_at                = now()
  WHERE id = p_claim_id
  RETURNING lead_id INTO v_lead_id;

  IF p_add_event_title IS NOT NULL THEN
    INSERT INTO crm_claim_events (
      claim_id, lead_id, event_type, title, description,
      is_visible_to_client, created_by_admin
    ) VALUES (
      p_claim_id, v_lead_id,
      COALESCE(p_add_event_type, 'update'),
      p_add_event_title,
      p_add_event_description,
      COALESCE(p_event_visible_to_client, true),
      true
    )
    RETURNING id INTO v_new_event_id;
  END IF;

  RETURN json_build_object('success', true, 'event_id', v_new_event_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_claim_tracking TO authenticated;

-- RPC: get_all_claims_for_admin
CREATE OR REPLACE FUNCTION public.get_all_claims_for_admin(
  p_status text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claims json;
  v_total int;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM crm_claims c
  WHERE (p_status IS NULL OR c.claim_status = p_status);

  SELECT json_agg(row_data ORDER BY row_data->>'created_at' DESC)
  INTO v_claims
  FROM (
    SELECT json_build_object(
      'id',                       c.id,
      'claim_number',             c.claim_number,
      'incident_type',            COALESCE(c.incident_type, c.claim_type),
      'claim_type',               c.claim_type,
      'incident_date',            c.incident_date,
      'incident_location',        c.incident_location,
      'incident_description',     c.incident_description,
      'claim_status',             c.claim_status,
      'client_visible_status',    c.client_visible_status,
      'client_visible_notes',     c.client_visible_notes,
      'estimated_amount',         c.estimated_amount,
      'indemnisation_amount',     c.indemnisation_amount,
      'indemnisation_date',       c.indemnisation_date,
      'indemnisation_paid_at',    c.indemnisation_paid_at,
      'expert_name',              c.expert_name,
      'expert_company',           c.expert_company,
      'expert_phone',             c.expert_phone,
      'expert_email',             c.expert_email,
      'expert_mission_date',      c.expert_mission_date,
      'expert_appointment_date',  c.expert_appointment_date,
      'expertise_garage_name',    c.expertise_garage_name,
      'expertise_garage_address', c.expertise_garage_address,
      'expertise_garage_phone',   c.expertise_garage_phone,
      'expertise_date',           c.expertise_date,
      'repair_garage_name',       c.repair_garage_name,
      'repair_garage_address',    c.repair_garage_address,
      'repair_garage_phone',      c.repair_garage_phone,
      'repair_start_date',        c.repair_start_date,
      'repair_end_date',          c.repair_end_date,
      'third_party_involved',     c.third_party_involved,
      'third_party_info',         c.third_party_info,
      'police_report_number',     c.police_report_number,
      'internal_notes',           c.internal_notes,
      'client_notes',             c.client_notes,
      'reported_by',              c.reported_by,
      'declared_at',              c.declared_at,
      'reviewed_at',              c.reviewed_at,
      'closed_at',                c.closed_at,
      'created_at',               c.created_at,
      'updated_at',               c.updated_at,
      'lead_id',                  c.lead_id,
      'lead_first_name',          l.first_name,
      'lead_last_name',           l.last_name,
      'lead_email',               l.email,
      'lead_phone',               l.phone,
      'events', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id',                   e.id,
            'event_type',           e.event_type,
            'event_date',           e.event_date,
            'title',                e.title,
            'description',          e.description,
            'is_visible_to_client', e.is_visible_to_client,
            'created_by_admin',     e.created_by_admin
          ) ORDER BY e.event_date ASC
        ), '[]'::json)
        FROM crm_claim_events e
        WHERE e.claim_id = c.id
      )
    ) AS row_data
    FROM crm_claims c
    LEFT JOIN crm_leads l ON l.id = c.lead_id
    WHERE (p_status IS NULL OR c.claim_status = p_status)
    ORDER BY c.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN json_build_object(
    'success', true,
    'total', v_total,
    'claims', COALESCE(v_claims, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_claims_for_admin TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
