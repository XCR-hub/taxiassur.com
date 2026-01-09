/*
  # Fix fonction création campagne newsletter
  
  Correction de l'agrégation SQL pour éviter l'erreur GROUP BY
*/

CREATE OR REPLACE FUNCTION create_auto_newsletter_campaign()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_articles jsonb;
  v_campaign_id uuid;
  v_article_count int;
BEGIN
  -- Compter d'abord les articles
  SELECT COUNT(*)
  INTO v_article_count
  FROM blog_posts
  WHERE published = true
    AND created_at > now() - interval '24 hours';
  
  -- Vérifier qu'il y a des articles
  IF v_article_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Aucun nouvel article trouvé'
    );
  END IF;
  
  -- Récupérer les articles
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'excerpt', excerpt,
      'slug', slug,
      'category', category,
      'featured_image', featured_image,
      'created_at', created_at
    )
  )
  INTO v_new_articles
  FROM (
    SELECT *
    FROM blog_posts
    WHERE published = true
      AND created_at > now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT 5
  ) articles;
  
  -- Créer la campagne
  INSERT INTO newsletter_campaigns (
    subject,
    preview_text,
    template,
    articles,
    status,
    scheduled_for,
    target_categories
  )
  VALUES (
    'Nouvelles actualités assurance taxi - ' || to_char(now(), 'DD/MM/YYYY'),
    'Découvrez les ' || v_article_count || ' derniers articles du jour',
    'weekly_digest',
    v_new_articles,
    'scheduled',
    now() + interval '1 hour',
    ARRAY['assurance-taxi', 'actualites']
  )
  RETURNING id INTO v_campaign_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', v_campaign_id,
    'article_count', v_article_count
  );
END;
$$;
