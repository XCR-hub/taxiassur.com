/*
  # Fonctions Helper pour Réseaux Sociaux

  1. Fonctions
    - `increment_social_network_posts` - Incrémente le compteur de posts
    - `get_social_media_stats` - Obtient les statistiques
    - `cleanup_old_social_posts` - Nettoie les anciens posts
*/

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS get_social_media_stats();

-- Fonction pour incrémenter le compteur de posts
CREATE OR REPLACE FUNCTION increment_social_network_posts(network_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE social_networks
  SET 
    total_posts = total_posts + 1,
    last_post_at = NOW(),
    updated_at = NOW()
  WHERE id = network_id_param;
END;
$$;

-- Fonction pour obtenir les stats de publication
CREATE OR REPLACE FUNCTION get_social_media_stats()
RETURNS TABLE (
  platform text,
  total_posts bigint,
  posts_last_7_days bigint,
  posts_last_30_days bigint,
  last_post_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sn.platform,
    sn.total_posts,
    (
      SELECT COUNT(*)
      FROM social_posts sp
      WHERE sp.platform = sn.platform
        AND sp.created_at > NOW() - INTERVAL '7 days'
        AND sp.status = 'published'
    ) as posts_last_7_days,
    (
      SELECT COUNT(*)
      FROM social_posts sp
      WHERE sp.platform = sn.platform
        AND sp.created_at > NOW() - INTERVAL '30 days'
        AND sp.status = 'published'
    ) as posts_last_30_days,
    sn.last_post_at
  FROM social_networks sn
  WHERE sn.is_active = true
  ORDER BY sn.platform;
$$;

-- Fonction pour nettoyer les anciens posts (> 90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_social_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM social_posts
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('published', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO automation_logs (automation_name, status, message)
  VALUES (
    'cleanup_old_social_posts',
    'success',
    'Cleaned up ' || deleted_count || ' old social posts'
  );
  
  RETURN deleted_count;
END;
$$;
