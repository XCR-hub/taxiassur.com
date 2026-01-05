/*
  # Augmentation Durée Session Admin - Pas de Déconnexion

  ## Objectif
  
  Empêcher la déconnexion automatique des administrateurs dans le backoffice.
  Configuration pour sessions très longues (7 jours).

  ## Changements
  
  1. Configuration système → Durée session étendue
  2. Fonction refresh token automatique
  3. Hook pour maintenir session active
  
  ## Sécurité
  
  - Sessions prolongées UNIQUEMENT pour admins authentifiés
  - Refresh token automatique toutes les 2 minutes
  - Activity tracking pour détecter inactivité
*/

-- Configuration durée de session étendue pour backoffice
INSERT INTO system_config (key, value, description)
VALUES 
  ('admin_session_duration_hours', '168'::jsonb, 'Durée session admin en heures (7 jours)'),
  ('admin_auto_refresh_enabled', 'true'::jsonb, 'Refresh automatique du token admin'),
  ('admin_refresh_interval_minutes', '2'::jsonb, 'Interval de refresh token en minutes')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Fonction pour vérifier si une session admin est active
CREATE OR REPLACE FUNCTION is_admin_session_active()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  -- Récupérer l'utilisateur actuel
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Vérifier si c'est un admin (utiliser is_active au lieu de active)
  SELECT EXISTS(
    SELECT 1 FROM admin_users
    WHERE id = v_user_id
      AND is_active = true
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$$;

-- Fonction pour logger l'activité admin (keep-alive)
CREATE OR REPLACE FUNCTION log_admin_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Mettre à jour last_login pour maintenir session active
  UPDATE admin_users
  SET last_login = NOW()
  WHERE id = v_user_id;
END;
$$;

-- Table pour tracking des sessions admin (optionnel - pour monitoring)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT NOW(),
  last_activity_at timestamptz DEFAULT NOW(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id 
ON admin_sessions(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_active 
ON admin_sessions(is_active, expires_at)
WHERE is_active = true;

-- RLS pour admin_sessions
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies si elles existent
DROP POLICY IF EXISTS "Admins can view own sessions" ON admin_sessions;

-- Seuls les admins peuvent voir leurs propres sessions
CREATE POLICY "Admins can view own sessions"
  ON admin_sessions
  FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Fonction pour nettoyer les vieilles sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marquer comme inactives les sessions expirées
  UPDATE admin_sessions
  SET is_active = false
  WHERE is_active = true
    AND expires_at < NOW();
  
  -- Supprimer les sessions expirées depuis plus de 30 jours
  DELETE FROM admin_sessions
  WHERE expires_at < NOW() - interval '30 days';
END;
$$;

-- Fonction pour créer/renouveler session admin
CREATE OR REPLACE FUNCTION renew_admin_session(
  p_session_token text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_duration_hours int;
  v_expires_at timestamptz;
  v_session_id uuid;
BEGIN
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Non authentifié'
    );
  END IF;
  
  -- Vérifier que c'est bien un admin
  IF NOT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE id = v_admin_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pas un administrateur actif'
    );
  END IF;
  
  -- Récupérer durée configurée
  SELECT COALESCE((value::text)::int, 168) INTO v_duration_hours
  FROM system_config
  WHERE key = 'admin_session_duration_hours';
  
  v_expires_at := NOW() + (v_duration_hours || ' hours')::interval;
  
  -- Chercher session existante
  SELECT id INTO v_session_id
  FROM admin_sessions
  WHERE admin_id = v_admin_id
    AND session_token = p_session_token
    AND is_active = true;
  
  IF v_session_id IS NOT NULL THEN
    -- Mettre à jour session existante
    UPDATE admin_sessions
    SET
      last_activity_at = NOW(),
      expires_at = v_expires_at,
      ip_address = COALESCE(p_ip_address, ip_address),
      user_agent = COALESCE(p_user_agent, user_agent)
    WHERE id = v_session_id;
  ELSE
    -- Créer nouvelle session
    INSERT INTO admin_sessions (
      admin_id,
      session_token,
      ip_address,
      user_agent,
      expires_at
    ) VALUES (
      v_admin_id,
      p_session_token,
      p_ip_address,
      p_user_agent,
      v_expires_at
    )
    RETURNING id INTO v_session_id;
  END IF;
  
  -- Logger activité
  PERFORM log_admin_activity();
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'expires_at', v_expires_at,
    'duration_hours', v_duration_hours
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_admin_session_active() TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_admin_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION renew_admin_session(text, text, text) TO authenticated;

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Configuration session admin activée';
  RAISE NOTICE '⏰ Durée session: 7 jours (168 heures)';
  RAISE NOTICE '🔄 Auto-refresh: toutes les 2 minutes';
  RAISE NOTICE '🔒 Keep-alive actif pour backoffice';
END $$;
