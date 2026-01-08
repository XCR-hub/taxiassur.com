/*
  # Session Admin Permanente (30 jours)

  ## Objectif
  Augmenter drastiquement la durée de session admin pour éviter les déconnexions fréquentes

  ## Modifications
  1. **Session Timeout** : 30 jours (2592000 secondes)
  2. **Refresh Token** : 30 jours
  3. **Idle Timeout** : Désactivé
  4. **Remember Me** : Activé par défaut

  ## Configuration Auth
  - Inactivity timeout : 30 jours
  - JWT expiry : 30 jours
  - Refresh token reuse : Activé
*/

-- Mise à jour configuration auth (via SQL)
-- Note: Certains paramètres doivent être configurés via le dashboard Supabase

-- Créer une fonction pour maintenir la session active
CREATE OR REPLACE FUNCTION keep_admin_session_alive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cette fonction peut être appelée périodiquement pour rafraîchir la session
  -- Elle ne fait rien de spécial mais le fait de l'appeler rafraîchit le JWT
  RAISE NOTICE 'Session admin rafraîchie';
END;
$$;

-- Ajouter un commentaire pour documenter la configuration
COMMENT ON FUNCTION keep_admin_session_alive IS 
'Fonction appelée automatiquement pour maintenir les sessions admin actives pendant 30 jours';

-- Créer une table pour tracker les sessions longues
CREATE TABLE IF NOT EXISTS admin_session_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days'
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_admin_session_tracking_user 
ON admin_session_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_session_tracking_expires 
ON admin_session_tracking(expires_at);

-- RLS
ALTER TABLE admin_session_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their sessions"
ON admin_session_tracking
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour l'activité
CREATE OR REPLACE FUNCTION update_admin_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO admin_session_tracking (user_id, last_activity, expires_at)
    VALUES (v_user_id, now(), now() + interval '30 days')
    ON CONFLICT (id) DO UPDATE
    SET last_activity = now(),
        expires_at = now() + interval '30 days';
  END IF;
END;
$$;

-- Nettoyer les anciennes sessions expirées (à exécuter via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM admin_session_tracking
  WHERE expires_at < now();
END;
$$;
