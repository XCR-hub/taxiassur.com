/*
  # Activation Automatisation Réseaux Sociaux

  1. Configuration
    - Activer Facebook et LinkedIn
    - Configurer publication automatique
    - Ajouter templates de contenu

  2. Tables Modifiées
    - `social_networks` : Activer Facebook & LinkedIn
    - `social_posts` : Créer posts automatiques
    - `content_schedule` : Calendrier publication

  3. Automation
    - Publication auto articles blog
    - Publication auto actualités
    - Contenu spécifique réseaux sociaux
*/

-- Activer Facebook avec configuration API
INSERT INTO social_networks (platform, account_name, is_active, is_connected, auto_publish, metadata)
VALUES (
  'facebook',
  'TaxiAssur France',
  true,
  true,
  true,
  jsonb_build_object(
    'page_id', 'configured_via_env',
    'access_token_set', true,
    'post_frequency', 'daily',
    'best_times', ARRAY['09:00', '12:30', '18:00'],
    'content_types', ARRAY['news', 'blog', 'tips', 'testimonials']
  )
)
ON CONFLICT (platform) DO UPDATE SET
  is_active = true,
  is_connected = true,
  auto_publish = true,
  metadata = EXCLUDED.metadata;

-- Activer LinkedIn avec configuration API
INSERT INTO social_networks (platform, account_name, is_active, is_connected, auto_publish, metadata)
VALUES (
  'linkedin',
  'TaxiAssur - Assurance Professionnelle Taxi',
  true,
  true,
  true,
  jsonb_build_object(
    'company_id', 'configured_via_env',
    'access_token_set', true,
    'post_frequency', '3_per_week',
    'best_times', ARRAY['08:00', '12:00', '17:00'],
    'content_types', ARRAY['news', 'blog', 'industry_insights', 'regulations']
  )
)
ON CONFLICT (platform) DO UPDATE SET
  is_active = true,
  is_connected = true,
  auto_publish = true,
  metadata = EXCLUDED.metadata;

-- Templates de contenu pour Facebook
CREATE TABLE IF NOT EXISTS social_content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  template_type text NOT NULL,
  template_name text NOT NULL,
  content_template text NOT NULL,
  variables jsonb DEFAULT '[]',
  hashtags text[] DEFAULT '{}',
  emoji_style text DEFAULT 'moderate',
  cta_type text DEFAULT 'website',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Templates Facebook
INSERT INTO social_content_templates (platform, template_type, template_name, content_template, variables, hashtags, emoji_style, cta_type)
VALUES
-- Template News
(
  'facebook',
  'news',
  'Actualité du secteur',
  E'📰 ACTUALITÉ TAXI\n\n{{title}}\n\n{{excerpt}}\n\n👉 Lire l''article complet et obtenir votre devis personnalisé :\n{{url}}\n\n💬 Votre avis compte ! Partagez en commentaires.',
  '["title", "excerpt", "url"]',
  ARRAY['#taxi', '#assurance', '#chauffeur', '#professionnel'],
  'moderate',
  'website'
),
-- Template Blog
(
  'facebook',
  'blog',
  'Article de blog',
  E'✍️ NOUVEAU SUR LE BLOG\n\n{{title}}\n\n{{excerpt}}\n\n📖 Découvrez tous nos conseils :\n{{url}}\n\n💰 Devis gratuit en 2 minutes !\n\n#TaxiAssur',
  '["title", "excerpt", "url"]',
  ARRAY['#assurancetaxi', '#conseil', '#économie'],
  'high',
  'website'
),
-- Template Témoignage
(
  'facebook',
  'testimonial',
  'Avis client',
  E'⭐ ILS NOUS FONT CONFIANCE\n\n"{{testimonial}}"\n\n{{client_name}} - {{city}}\n\n✅ Vous aussi, bénéficiez de notre expertise !\n👉 Devis gratuit : {{url}}',
  '["testimonial", "client_name", "city", "url"]',
  ARRAY['#satisfaction', '#avis', '#confiance'],
  'moderate',
  'quote'
),
-- Template Astuce
(
  'facebook',
  'tip',
  'Conseil pratique',
  E'💡 ASTUCE DU JOUR\n\n{{tip_title}}\n\n{{tip_content}}\n\n📞 Besoin d''un conseil personnalisé ?\nContactez nos experts : 01 80 85 57 86\n\n👉 Ou obtenez votre devis en ligne : {{url}}',
  '["tip_title", "tip_content", "url"]',
  ARRAY['#astuce', '#conseil', '#professionnels'],
  'moderate',
  'engagement'
);

-- Templates LinkedIn (plus professionnels)
INSERT INTO social_content_templates (platform, template_type, template_name, content_template, variables, hashtags, emoji_style, cta_type)
VALUES
-- Template News LinkedIn
(
  'linkedin',
  'news',
  'Actualité professionnelle',
  E'📊 ACTUALITÉ DU SECTEUR TAXI\n\n{{title}}\n\n{{excerpt}}\n\nCette évolution impacte directement les professionnels du transport de personnes.\n\n🔗 Analyse complète sur TaxiAssur.com : {{url}}\n\n💼 TaxiAssur accompagne les taxis dans leur développement professionnel.',
  '["title", "excerpt", "url"]',
  ARRAY['#Taxi', '#Assurance', '#TransportProfessionnel', '#Réglementation'],
  'low',
  'thought_leadership'
),
-- Template Article Expert
(
  'linkedin',
  'blog',
  'Article expertise',
  E'📄 EXPERTISE ASSURANCE TAXI\n\n{{title}}\n\nPoints clés :\n{{key_points}}\n\nLa maîtrise de ces enjeux est essentielle pour optimiser votre protection professionnelle.\n\n📖 Lire notre analyse : {{url}}\n\n#ExpertiseAssurance #GestionRisques',
  '["title", "key_points", "url"]',
  ARRAY['#AssuranceProfessionnelle', '#RisquesProfessionnels', '#Taxi'],
  'low',
  'website'
),
-- Template Réglementation
(
  'linkedin',
  'regulation',
  'Veille réglementaire',
  E'⚖️ ÉVOLUTION RÉGLEMENTAIRE\n\n{{regulation_title}}\n\nImpacts pour les professionnels :\n{{impacts}}\n\nTaxiAssur vous aide à vous conformer aux nouvelles exigences.\n\n📞 Conseil personnalisé : 01 80 85 57 86',
  '["regulation_title", "impacts"]',
  ARRAY['#Réglementation', '#Conformité', '#TransportPersonnes'],
  'none',
  'lead_generation'
);

-- Calendrier de publication automatique
CREATE TABLE IF NOT EXISTS social_automation_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  day_of_week integer NOT NULL, -- 0=dimanche, 1=lundi, etc.
  time_of_day time NOT NULL,
  content_type text NOT NULL,
  template_id uuid REFERENCES social_content_templates(id),
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Planning Facebook (7 posts/semaine)
INSERT INTO social_automation_schedule (platform, day_of_week, time_of_day, content_type, is_active)
VALUES
  ('facebook', 1, '09:00', 'news', true),        -- Lundi matin
  ('facebook', 2, '12:30', 'tip', true),         -- Mardi midi
  ('facebook', 3, '18:00', 'blog', true),        -- Mercredi soir
  ('facebook', 4, '09:00', 'testimonial', true), -- Jeudi matin
  ('facebook', 5, '12:30', 'news', true),        -- Vendredi midi
  ('facebook', 6, '10:00', 'tip', true),         -- Samedi matin
  ('facebook', 0, '19:00', 'blog', true);        -- Dimanche soir

-- Planning LinkedIn (3 posts/semaine - plus ciblé)
INSERT INTO social_automation_schedule (platform, day_of_week, time_of_day, content_type, is_active)
VALUES
  ('linkedin', 2, '08:00', 'news', true),        -- Mardi matin
  ('linkedin', 3, '12:00', 'blog', true),        -- Mercredi midi
  ('linkedin', 4, '17:00', 'regulation', true);  -- Jeudi fin d'après-midi

-- Fonction pour générer post automatique depuis actualité
CREATE OR REPLACE FUNCTION generate_social_post_from_news()
RETURNS trigger AS $$
DECLARE
  fb_template RECORD;
  li_template RECORD;
  post_url text;
BEGIN
  -- Seulement pour les articles publiés
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN

    post_url := 'https://taxiassur.com/actualites/' || NEW.slug;

    -- Post Facebook
    SELECT * INTO fb_template
    FROM social_content_templates
    WHERE platform = 'facebook' AND template_type = 'news' AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      INSERT INTO social_posts (
        network_id,
        platform,
        content,
        post_url,
        status,
        metadata
      )
      SELECT
        sn.id,
        'facebook',
        replace(
          replace(
            replace(fb_template.content_template, '{{title}}', NEW.title),
            '{{excerpt}}', NEW.excerpt
          ),
          '{{url}}', post_url
        ),
        post_url,
        'scheduled',
        jsonb_build_object(
          'source', 'news_article',
          'source_id', NEW.id,
          'auto_generated', true
        )
      FROM social_networks sn
      WHERE sn.platform = 'facebook' AND sn.auto_publish = true;
    END IF;

    -- Post LinkedIn
    SELECT * INTO li_template
    FROM social_content_templates
    WHERE platform = 'linkedin' AND template_type = 'news' AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      INSERT INTO social_posts (
        network_id,
        platform,
        content,
        post_url,
        status,
        metadata
      )
      SELECT
        sn.id,
        'linkedin',
        replace(
          replace(
            replace(li_template.content_template, '{{title}}', NEW.title),
            '{{excerpt}}', NEW.excerpt
          ),
          '{{url}}', post_url
        ),
        post_url,
        'scheduled',
        jsonb_build_object(
          'source', 'news_article',
          'source_id', NEW.id,
          'auto_generated', true
        )
      FROM social_networks sn
      WHERE sn.platform = 'linkedin' AND sn.auto_publish = true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger auto-génération posts sociaux depuis news
DROP TRIGGER IF EXISTS auto_generate_social_posts ON news_articles;
CREATE TRIGGER auto_generate_social_posts
  AFTER INSERT OR UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION generate_social_post_from_news();

-- Fonction similaire pour articles blog
CREATE OR REPLACE FUNCTION generate_social_post_from_blog()
RETURNS trigger AS $$
DECLARE
  fb_template RECORD;
  li_template RECORD;
  post_url text;
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN

    post_url := 'https://taxiassur.com/blog/' || NEW.slug;

    -- Facebook
    SELECT * INTO fb_template
    FROM social_content_templates
    WHERE platform = 'facebook' AND template_type = 'blog' AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      INSERT INTO social_posts (network_id, platform, content, post_url, status, metadata)
      SELECT
        sn.id, 'facebook',
        replace(replace(replace(fb_template.content_template, '{{title}}', NEW.title), '{{excerpt}}', COALESCE(NEW.meta_description, substring(NEW.content, 1, 150))), '{{url}}', post_url),
        post_url, 'scheduled',
        jsonb_build_object('source', 'blog_post', 'source_id', NEW.id, 'auto_generated', true)
      FROM social_networks sn
      WHERE sn.platform = 'facebook' AND sn.auto_publish = true;
    END IF;

    -- LinkedIn
    SELECT * INTO li_template
    FROM social_content_templates
    WHERE platform = 'linkedin' AND template_type = 'blog' AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      INSERT INTO social_posts (network_id, platform, content, post_url, status, metadata)
      SELECT
        sn.id, 'linkedin',
        replace(replace(replace(li_template.content_template, '{{title}}', NEW.title), '{{key_points}}', COALESCE(NEW.meta_description, substring(NEW.content, 1, 150))), '{{url}}', post_url),
        post_url, 'scheduled',
        jsonb_build_object('source', 'blog_post', 'source_id', NEW.id, 'auto_generated', true)
      FROM social_networks sn
      WHERE sn.platform = 'linkedin' AND sn.auto_publish = true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour blog
DROP TRIGGER IF EXISTS auto_generate_social_posts_blog ON blog_posts;
CREATE TRIGGER auto_generate_social_posts_blog
  AFTER INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_social_post_from_blog();

-- Vérification
DO $$
DECLARE
  fb_active BOOLEAN;
  li_active BOOLEAN;
  templates_count INTEGER;
  schedule_count INTEGER;
BEGIN
  SELECT is_active INTO fb_active FROM social_networks WHERE platform = 'facebook';
  SELECT is_active INTO li_active FROM social_networks WHERE platform = 'linkedin';
  SELECT COUNT(*) INTO templates_count FROM social_content_templates WHERE is_active = true;
  SELECT COUNT(*) INTO schedule_count FROM social_automation_schedule WHERE is_active = true;

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ Facebook activé: %', CASE WHEN fb_active THEN 'OUI' ELSE 'NON' END;
  RAISE NOTICE '✅ LinkedIn activé: %', CASE WHEN li_active THEN 'OUI' ELSE 'NON' END;
  RAISE NOTICE '✅ Templates créés: %', templates_count;
  RAISE NOTICE '✅ Planning posts: %/semaine', schedule_count;
  RAISE NOTICE '✅ Auto-génération: Activée (triggers)';
  RAISE NOTICE '════════════════════════════════════════';
END $$;
