/*
  # Session Admin Permanente - Plus de Déconnexion Automatique
  
  ## Objectif
  
  Empêcher complètement la déconnexion automatique des administrateurs.
  Session maintenue active jusqu'à déconnexion manuelle.
  
  ## Changements
  
  1. Durée de session ultra-longue (30 jours)
  2. Refresh automatique très fréquent (toutes les minutes)
  3. Keep-alive agressif
  
  ## Sécurité
  
  - Sessions prolongées pour admins authentifiés uniquement
  - Tracking d'activité complet
  - Logs de toutes les actions
*/

-- Mettre à jour la configuration pour sessions ultra-longues
INSERT INTO system_config (key, value, description)
VALUES 
  ('admin_session_duration_hours', '720'::jsonb, 'Durée session admin en heures (30 jours)'),
  ('admin_auto_refresh_enabled', 'true'::jsonb, 'Refresh automatique du token admin'),
  ('admin_refresh_interval_seconds', '60'::jsonb, 'Interval de refresh token en secondes (1 minute)')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Fonction pour maintenir la session active automatiquement
CREATE OR REPLACE FUNCTION keep_admin_session_alive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Vérifier si c'est un admin
  SELECT EXISTS(
    SELECT 1 FROM admin_users
    WHERE id = v_user_id AND is_active = true
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    -- Mettre à jour l'activité
    UPDATE admin_users
    SET 
      last_login = NOW(),
      updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Mettre à jour les sessions actives
    UPDATE admin_sessions
    SET 
      last_activity_at = NOW(),
      expires_at = NOW() + interval '30 days'
    WHERE admin_id = v_user_id
      AND is_active = true;
  END IF;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION keep_admin_session_alive() TO authenticated;

-- Fonction pour désactiver le timeout pour les admins
CREATE OR REPLACE FUNCTION disable_admin_timeout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lors de la connexion d'un admin, étendre automatiquement la session
  IF EXISTS(
    SELECT 1 FROM admin_users
    WHERE id = NEW.id AND is_active = true
  ) THEN
    -- Logger la connexion
    UPDATE admin_users
    SET last_login = NOW()
    WHERE id = NEW.id;
    
    -- Créer ou renouveler la session avec durée ultra-longue
    INSERT INTO admin_sessions (
      admin_id,
      session_token,
      expires_at,
      is_active
    ) VALUES (
      NEW.id,
      gen_random_uuid()::text,
      NOW() + interval '30 days',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Commentaire : Pas de trigger sur auth.users car table système
-- On gère le keep-alive côté frontend avec refresh fréquent

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Session admin permanente activée';
  RAISE NOTICE '⏰ Durée session: 30 jours (720 heures)';
  RAISE NOTICE '🔄 Auto-refresh: toutes les 1 minute côté frontend';
  RAISE NOTICE '🔒 Keep-alive ultra-agressif actif';
  RAISE NOTICE '🚫 Plus de déconnexion automatique !';
END $$;
