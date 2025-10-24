/*
  # IDENTIFICATION SOURCES DE DONNÉES RÉELLES

  Script pour lister toutes les données réelles disponibles
  dans Supabase qui peuvent être intégrées dans les pages
*/

-- ============================================
-- 1. BLOG POSTS - Articles publiés
-- ============================================

DO $$
DECLARE
  total_blog INTEGER;
  published_blog INTEGER;
  sample_blog RECORD;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '📝 BLOG POSTS';
  RAISE NOTICE '============================================';

  SELECT COUNT(*), COUNT(*) FILTER (WHERE published = true)
  INTO total_blog, published_blog
  FROM blog_posts;

  RAISE NOTICE 'Total articles: %', total_blog;
  RAISE NOTICE 'Publiés: %', published_blog;
  RAISE NOTICE '';

  IF published_blog > 0 THEN
    RAISE NOTICE 'Exemples articles publiés:';
    FOR sample_blog IN
      SELECT title, slug, created_at
      FROM blog_posts
      WHERE published = true
      ORDER BY created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  - % (slug: %)',
        sample_blog.title,
        sample_blog.slug;
    END LOOP;
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 2. FAQ - Questions publiées
-- ============================================

DO $$
DECLARE
  total_faq INTEGER;
  published_faq INTEGER;
  sample_faq RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '❓ FAQ';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT COUNT(*) INTO total_faq FROM faq;

    -- Vérifier si colonne published existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'faq' AND column_name = 'published'
    ) THEN
      SELECT COUNT(*) INTO published_faq FROM faq WHERE published = true;
    ELSE
      published_faq := total_faq; -- Toutes publiées si pas de colonne
    END IF;

    RAISE NOTICE 'Total FAQ: %', total_faq;
    RAISE NOTICE 'Publiées: %', published_faq;
    RAISE NOTICE '';

    IF published_faq > 0 THEN
      RAISE NOTICE 'Exemples FAQ:';
      FOR sample_faq IN
        SELECT question, category
        FROM faq
        ORDER BY created_at DESC
        LIMIT 5
      LOOP
        RAISE NOTICE '  - % (catégorie: %)',
          LEFT(sample_faq.question, 60),
          COALESCE(sample_faq.category, 'Général');
      END LOOP;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 3. CITY PAGES - Pages villes
-- ============================================

DO $$
DECLARE
  total_cities INTEGER;
  published_cities INTEGER;
  sample_city RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🏙️ PAGES VILLES';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE published = true)
    INTO total_cities, published_cities
    FROM city_pages;

    RAISE NOTICE 'Total villes: %', total_cities;
    RAISE NOTICE 'Publiées: %', published_cities;
    RAISE NOTICE '';

    IF published_cities > 0 THEN
      RAISE NOTICE 'Top 5 villes par population:';
      FOR sample_city IN
        SELECT city, region, population, taxi_count
        FROM city_pages
        WHERE published = true
        ORDER BY population DESC NULLS LAST
        LIMIT 5
      LOOP
        RAISE NOTICE '  - % (%, pop: %, taxis: %)',
          sample_city.city,
          sample_city.region,
          COALESCE(sample_city.population::TEXT, 'N/A'),
          COALESCE(sample_city.taxi_count::TEXT, 'N/A');
      END LOOP;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 4. LEADS - Données leads
-- ============================================

DO $$
DECLARE
  total_leads INTEGER;
  new_leads INTEGER;
  contacted_leads INTEGER;
  converted_leads INTEGER;
  leads_this_month INTEGER;
  avg_response_time INTERVAL;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '👥 LEADS';
  RAISE NOTICE '============================================';

  SELECT COUNT(*) INTO total_leads FROM leads;
  SELECT COUNT(*) INTO new_leads FROM leads WHERE status = 'new';
  SELECT COUNT(*) INTO contacted_leads FROM leads WHERE status = 'contacted';
  SELECT COUNT(*) INTO converted_leads FROM leads WHERE status = 'converted';

  SELECT COUNT(*) INTO leads_this_month
  FROM leads
  WHERE created_at >= date_trunc('month', CURRENT_DATE);

  RAISE NOTICE 'Total leads: %', total_leads;
  RAISE NOTICE '  - Nouveaux: %', new_leads;
  RAISE NOTICE '  - Contactés: %', contacted_leads;
  RAISE NOTICE '  - Convertis: %', converted_leads;
  RAISE NOTICE 'Leads ce mois: %', leads_this_month;

  IF total_leads > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Taux conversion: %.1f%%',
      (converted_leads::NUMERIC / total_leads * 100);
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 5. SEO METRICS - Données Google Search Console
-- ============================================

DO $$
DECLARE
  total_pages INTEGER;
  total_impressions BIGINT;
  total_clicks BIGINT;
  avg_ctr NUMERIC;
  avg_position NUMERIC;
  top_page RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔍 SEO METRICS (Google Search Console)';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT
      COUNT(DISTINCT url),
      SUM(impressions),
      SUM(clicks),
      AVG(CASE WHEN impressions > 0 THEN (clicks::NUMERIC / impressions * 100) ELSE 0 END),
      AVG(position)
    INTO
      total_pages,
      total_impressions,
      total_clicks,
      avg_ctr,
      avg_position
    FROM seo_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days';

    RAISE NOTICE 'Pages suivies: %', COALESCE(total_pages, 0);
    RAISE NOTICE 'Impressions (30j): %', COALESCE(total_impressions, 0);
    RAISE NOTICE 'Clics (30j): %', COALESCE(total_clicks, 0);
    RAISE NOTICE 'CTR moyen: %.2f%%', COALESCE(avg_ctr, 0);
    RAISE NOTICE 'Position moyenne: %.1f', COALESCE(avg_position, 0);
    RAISE NOTICE '';

    IF total_pages > 0 THEN
      RAISE NOTICE 'Top 5 pages par clics:';
      FOR top_page IN
        SELECT
          url,
          SUM(clicks) as total_clicks,
          SUM(impressions) as total_impressions,
          AVG(position) as avg_pos
        FROM seo_metrics
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY url
        ORDER BY SUM(clicks) DESC
        LIMIT 5
      LOOP
        RAISE NOTICE '  - % (% clics, pos %.1f)',
          top_page.url,
          top_page.total_clicks,
          top_page.avg_pos;
      END LOOP;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Table seo_metrics: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 6. ANALYTICS - Événements tracking
-- ============================================

DO $$
DECLARE
  total_events INTEGER;
  page_views INTEGER;
  form_submissions INTEGER;
  conversions INTEGER;
  events_today INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 ANALYTICS EVENTS';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT COUNT(*) INTO total_events FROM analytics_events;

    SELECT COUNT(*) INTO page_views
    FROM analytics_events
    WHERE event_type = 'page_view';

    SELECT COUNT(*) INTO form_submissions
    FROM analytics_events
    WHERE event_type = 'form_submit';

    SELECT COUNT(*) INTO conversions
    FROM analytics_events
    WHERE event_type = 'conversion';

    SELECT COUNT(*) INTO events_today
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE;

    RAISE NOTICE 'Total événements: %', total_events;
    RAISE NOTICE '  - Pages vues: %', page_views;
    RAISE NOTICE '  - Formulaires: %', form_submissions;
    RAISE NOTICE '  - Conversions: %', conversions;
    RAISE NOTICE 'Événements aujourd''hui: %', events_today;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Table analytics_events: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 7. EMAIL LOGS - Historique emails
-- ============================================

DO $$
DECLARE
  total_emails INTEGER;
  sent_emails INTEGER;
  opened_emails INTEGER;
  clicked_emails INTEGER;
  bounced_emails INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📧 EMAIL LOGS';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT COUNT(*) INTO total_emails FROM email_logs;

    SELECT COUNT(*) INTO sent_emails
    FROM email_logs
    WHERE status = 'sent';

    SELECT COUNT(*) INTO opened_emails
    FROM email_logs
    WHERE status = 'opened';

    SELECT COUNT(*) INTO clicked_emails
    FROM email_logs
    WHERE status = 'clicked';

    SELECT COUNT(*) INTO bounced_emails
    FROM email_logs
    WHERE status = 'bounced';

    RAISE NOTICE 'Total emails: %', total_emails;
    RAISE NOTICE '  - Envoyés: %', sent_emails;
    RAISE NOTICE '  - Ouverts: %', opened_emails;
    RAISE NOTICE '  - Cliqués: %', clicked_emails;
    RAISE NOTICE '  - Bounced: %', bounced_emails;

    IF sent_emails > 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE 'Taux ouverture: %.1f%%',
        (opened_emails::NUMERIC / sent_emails * 100);
      IF opened_emails > 0 THEN
        RAISE NOTICE 'Taux clic: %.1f%%',
          (clicked_emails::NUMERIC / opened_emails * 100);
      END IF;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Table email_logs: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 8. SOCIAL NETWORKS - Configuration réseaux
-- ============================================

DO $$
DECLARE
  linkedin_active BOOLEAN;
  pinterest_active BOOLEAN;
  youtube_active BOOLEAN;
  social_posts INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📱 RÉSEAUX SOCIAUX';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM social_networks
      WHERE platform = 'linkedin'
      AND enabled = true
      AND access_token IS NOT NULL
    ) INTO linkedin_active;

    SELECT EXISTS (
      SELECT 1 FROM social_networks
      WHERE platform = 'pinterest'
      AND enabled = true
      AND access_token IS NOT NULL
    ) INTO pinterest_active;

    SELECT EXISTS (
      SELECT 1 FROM social_networks
      WHERE platform = 'youtube'
      AND enabled = true
      AND access_token IS NOT NULL
    ) INTO youtube_active;

    RAISE NOTICE 'LinkedIn: %', CASE WHEN linkedin_active THEN '✅ Actif' ELSE '❌ Inactif' END;
    RAISE NOTICE 'Pinterest: %', CASE WHEN pinterest_active THEN '✅ Actif' ELSE '❌ Inactif' END;
    RAISE NOTICE 'YouTube: %', CASE WHEN youtube_active THEN '✅ Actif' ELSE '❌ Inactif' END;

    -- Compter posts programmés
    SELECT COUNT(*) INTO social_posts
    FROM social_posts
    WHERE scheduled_for IS NOT NULL
    AND published = false;

    RAISE NOTICE '';
    RAISE NOTICE 'Posts programmés: %', social_posts;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Tables social: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 9. BACKLINKS - Opportunités
-- ============================================

DO $$
DECLARE
  total_opportunities INTEGER;
  contacted INTEGER;
  acquired INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔗 BACKLINKS';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT COUNT(*) INTO total_opportunities FROM backlink_opportunities;

    SELECT COUNT(*) INTO contacted
    FROM backlink_opportunities
    WHERE status = 'contacted';

    SELECT COUNT(*) INTO acquired
    FROM backlink_opportunities
    WHERE status = 'acquired';

    RAISE NOTICE 'Opportunités totales: %', total_opportunities;
    RAISE NOTICE '  - Contactées: %', contacted;
    RAISE NOTICE '  - Acquises: %', acquired;

    IF total_opportunities > 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE 'Taux acquisition: %.1f%%',
        (acquired::NUMERIC / total_opportunities * 100);
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Table backlink_opportunities: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- RÉSUMÉ FINAL - Sources disponibles
-- ============================================

DO $$
DECLARE
  blog_count INTEGER;
  faq_count INTEGER;
  city_count INTEGER;
  lead_count INTEGER;
  seo_pages INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RÉSUMÉ DONNÉES DISPONIBLES';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Compter données disponibles
  SELECT COUNT(*) INTO blog_count FROM blog_posts WHERE published = true;

  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'faq' AND column_name = 'published'
    ) THEN
      SELECT COUNT(*) INTO faq_count FROM faq WHERE published = true;
    ELSE
      SELECT COUNT(*) INTO faq_count FROM faq;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    faq_count := 0;
  END;

  BEGIN
    SELECT COUNT(*) INTO city_count FROM city_pages WHERE published = true;
  EXCEPTION WHEN OTHERS THEN
    city_count := 0;
  END;

  SELECT COUNT(*) INTO lead_count FROM leads;

  BEGIN
    SELECT COUNT(DISTINCT url) INTO seo_pages
    FROM seo_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days';
  EXCEPTION WHEN OTHERS THEN
    seo_pages := 0;
  END;

  RAISE NOTICE '📊 DONNÉES PRÊTES POUR INTÉGRATION:';
  RAISE NOTICE '';
  RAISE NOTICE '✅ % articles de blog publiés', blog_count;
  RAISE NOTICE '✅ % questions FAQ', faq_count;
  RAISE NOTICE '✅ % pages villes', city_count;
  RAISE NOTICE '✅ % leads capturés', lead_count;
  RAISE NOTICE '✅ % pages avec métriques SEO', seo_pages;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 INTÉGRATIONS POSSIBLES:';
  RAISE NOTICE '  - Homepage: stats leads + articles récents';
  RAISE NOTICE '  - Blog: liste articles dynamique depuis DB';
  RAISE NOTICE '  - FAQ: questions depuis DB';
  RAISE NOTICE '  - Villes: pages générées depuis city_pages';
  RAISE NOTICE '  - Dashboard: métriques SEO temps réel';
  RAISE NOTICE '  - Actualités: derniers articles + stats';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
