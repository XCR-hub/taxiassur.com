/*
  # Système d'Intégration Téléphonique Keyyo

  1. Nouvelles Tables
    - telephony_providers - Configuration fournisseurs VoIP
    - telephony_users - Mapping utilisateurs <-> extensions  
    - telephony_calls - Historique des appels (compatibilité Keyyo)
    - telephony_recordings - Enregistrements audio

  2. Fonctionnalités
    - Click-to-Call avec Keyyo
    - Import automatique historique d'appels
    - Téléchargement enregistrements
    - Statistiques par commercial
*/

-- Storage bucket
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('telephony-recordings', 'telephony-recordings', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Providers
CREATE TABLE IF NOT EXISTS telephony_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users mapping
CREATE TABLE IF NOT EXISTS telephony_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES telephony_providers(id) ON DELETE CASCADE,
  extension text,
  phone_number text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

-- Calls history
CREATE TABLE IF NOT EXISTS telephony_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES telephony_providers(id) ON DELETE SET NULL,
  external_id text,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  status text NOT NULL DEFAULT 'initiated',
  initiated_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  talk_time_seconds integer DEFAULT 0,
  has_recording boolean DEFAULT false,
  recording_url text,
  notes text,
  summary text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recordings
CREATE TABLE IF NOT EXISTS telephony_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES telephony_calls(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES telephony_providers(id) ON DELETE SET NULL,
  storage_path text,
  file_name text,
  file_size_bytes bigint,
  mime_type text DEFAULT 'audio/mpeg',
  duration_seconds integer,
  external_url text,
  external_id text,
  downloaded_at timestamptz,
  transcription text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tel_calls_lead ON telephony_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_tel_calls_user ON telephony_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_tel_calls_status ON telephony_calls(status);
CREATE INDEX IF NOT EXISTS idx_tel_calls_date ON telephony_calls(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tel_recordings_call ON telephony_recordings(call_id);

-- RLS
ALTER TABLE telephony_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephony_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephony_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephony_recordings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "providers_admin" ON telephony_providers;
CREATE POLICY "providers_admin" ON telephony_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "providers_view" ON telephony_providers;
CREATE POLICY "providers_view" ON telephony_providers FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "users_view_own" ON telephony_users;
CREATE POLICY "users_view_own" ON telephony_users FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_admin" ON telephony_users;
CREATE POLICY "users_admin" ON telephony_users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "calls_view_own" ON telephony_calls;
CREATE POLICY "calls_view_own" ON telephony_calls FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR lead_id IN (SELECT id FROM crm_leads WHERE assigned_to = auth.uid()));

DROP POLICY IF EXISTS "calls_create" ON telephony_calls;
CREATE POLICY "calls_create" ON telephony_calls FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "calls_update_own" ON telephony_calls;
CREATE POLICY "calls_update_own" ON telephony_calls FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "calls_service" ON telephony_calls;
CREATE POLICY "calls_service" ON telephony_calls FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "recordings_view" ON telephony_recordings;
CREATE POLICY "recordings_view" ON telephony_recordings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM telephony_calls WHERE id = call_id AND (user_id = auth.uid() OR lead_id IN (SELECT id FROM crm_leads WHERE assigned_to = auth.uid()))));

DROP POLICY IF EXISTS "recordings_service" ON telephony_recordings;
CREATE POLICY "recordings_service" ON telephony_recordings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Storage
DROP POLICY IF EXISTS "tel_storage_view" ON storage.objects;
CREATE POLICY "tel_storage_view" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'telephony-recordings');

DROP POLICY IF EXISTS "tel_storage_service" ON storage.objects;
CREATE POLICY "tel_storage_service" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'telephony-recordings') WITH CHECK (bucket_id = 'telephony-recordings');

-- Function: Get call stats
CREATE OR REPLACE FUNCTION get_call_statistics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_calls', COUNT(*),
      'outbound', COUNT(*) FILTER (WHERE direction = 'outbound'),
      'inbound', COUNT(*) FILTER (WHERE direction = 'inbound'),
      'answered', COUNT(*) FILTER (WHERE status = 'answered'),
      'missed', COUNT(*) FILTER (WHERE status = 'missed'),
      'total_minutes', COALESCE(SUM(talk_time_seconds) / 60, 0)
    )
    FROM telephony_calls
    WHERE user_id = p_user_id
    AND initiated_at > now() - interval '30 days'
  );
END;
$$;

-- Function: Auto-link to lead
CREATE OR REPLACE FUNCTION auto_link_call_to_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT id INTO v_lead_id FROM crm_leads
  WHERE phone = CASE WHEN NEW.direction = 'inbound' THEN NEW.from_number ELSE NEW.to_number END
  OR mobile = CASE WHEN NEW.direction = 'inbound' THEN NEW.from_number ELSE NEW.to_number END
  LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    NEW.lead_id := v_lead_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_auto_link_call ON telephony_calls;
CREATE TRIGGER trig_auto_link_call BEFORE INSERT ON telephony_calls
  FOR EACH ROW EXECUTE FUNCTION auto_link_call_to_lead();

-- Insert Keyyo provider
INSERT INTO telephony_providers (name, display_name, is_active, config)
VALUES ('keyyo', 'Keyyo', false, '{"api_key":"","base_url":"https://api.keyyo.com/v1"}'::jsonb)
ON CONFLICT (name) DO NOTHING;