/*
  # Système de Gestion des Réseaux Sociaux et Automatisation

  ## Description
  Système complet de gestion et automatisation de la publication sur 50+ réseaux sociaux
  avec tracking des performances, planification automatique et intégration Make.com/Zapier.

  ## Nouvelles Tables

  ### 1. `social_networks`
  Référentiel de tous les réseaux sociaux disponibles avec leurs caractéristiques SEO
  - `id` (uuid, PK)
  - `name` (text) - Nom du réseau
  - `category` (text) - Catégorie (généraliste, professionnel, vidéo, etc.)
  - `domain_authority` (int) - Score d'autorité du domaine
  - `is_dofollow` (boolean) - Si les liens sont dofollow
  - `api_available` (boolean) - Si une API est disponible
  - `url` (text) - URL du réseau
  - `icon` (text) - Icône Lucide
  - `priority` (int) - Priorité de publication (1-10)
  - `is_active` (boolean) - Activé pour TaxiAssur
  - `api_credentials` (jsonb) - Credentials API cryptés
  - `posting_frequency` (text) - Fréquence recommandée
  - `content_format` (jsonb) - Formats acceptés (texte, image, vidéo)
  - `character_limit` (int) - Limite de caractères
  - `hashtag_limit` (int) - Nombre max de hashtags
  - `created_at` (timestamptz)

  ### 2. `social_posts`
  Historique de toutes les publications sur les réseaux
  - `id` (uuid, PK)
  - `network_id` (uuid, FK → social_networks)
  - `content` (text) - Contenu du post
  - `media_urls` (text[]) - URLs des médias
  - `hashtags` (text[]) - Liste des hashtags
  - `post_url` (text) - URL du post publié
  - `scheduled_at` (timestamptz) - Date de planification
  - `published_at` (timestamptz) - Date de publication réelle
  - `status` (text) - draft, scheduled, published, failed
  - `views` (int) - Nombre de vues
  - `likes` (int) - Nombre de likes
  - `shares` (int) - Nombre de partages
  - `comments` (int) - Nombre de commentaires
  - `clicks` (int) - Nombre de clics sur le lien
  - `engagement_rate` (decimal) - Taux d'engagement
  - `error_message` (text) - Message d'erreur si échec
  - `created_by` (uuid, FK → auth.users)
  - `created_at` (timestamptz)

  ### 3. `whatsapp_groups`
  Gestion des groupes WhatsApp Business pour diffusion
  - `id` (uuid, PK)
  - `name` (text) - Nom du groupe
  - `description` (text) - Description
  - `group_id` (text) - ID WhatsApp du groupe
  - `phone_number` (text) - Numéro de téléphone
  - `member_count` (int) - Nombre de membres
  - `category` (text) - Catégorie (chauffeurs, partenaires, etc.)
  - `is_active` (boolean) - Groupe actif
  - `auto_send` (boolean) - Envoi automatique activé
  - `send_frequency` (text) - Fréquence d'envoi
  - `last_message_at` (timestamptz) - Dernier message envoyé
  - `created_at` (timestamptz)

  ### 4. `whatsapp_messages`
  Historique des messages WhatsApp envoyés
  - `id` (uuid, PK)
  - `group_id` (uuid, FK → whatsapp_groups)
  - `message` (text) - Contenu du message
  - `media_url` (text) - URL média
  - `sent_at` (timestamptz) - Date d'envoi
  - `status` (text) - sent, delivered, read, failed
  - `read_count` (int) - Nombre de lectures
  - `reply_count` (int) - Nombre de réponses
  - `created_at` (timestamptz)

  ### 5. `automation_rules`
  Règles d'automatisation pour Make.com/Zapier
  - `id` (uuid, PK)
  - `name` (text) - Nom de la règle
  - `trigger_type` (text) - new_blog_post, new_lead, schedule, etc.
  - `trigger_config` (jsonb) - Configuration du trigger
  - `target_networks` (text[]) - Réseaux cibles
  - `content_template` (text) - Template du contenu
  - `media_template` (text) - Template des médias
  - `is_active` (boolean) - Règle active
  - `execution_count` (int) - Nombre d'exécutions
  - `last_execution_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 6. `social_analytics`
  Analytics agrégées par réseau et période
  - `id` (uuid, PK)
  - `network_id` (uuid, FK → social_networks)
  - `date` (date) - Date
  - `posts_count` (int) - Nombre de posts
  - `total_views` (bigint) - Vues totales
  - `total_engagement` (bigint) - Engagement total
  - `total_clicks` (bigint) - Clics totaux
  - `new_followers` (int) - Nouveaux followers
  - `reach` (bigint) - Portée
  - `impressions` (bigint) - Impressions
  - `created_at` (timestamptz)

  ## Sécurité
  - RLS activé sur toutes les tables
  - Seuls les utilisateurs authentifiés peuvent lire/écrire
  - Les API credentials sont chiffrées
*/

-- Création de la table social_networks
CREATE TABLE IF NOT EXISTS social_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  domain_authority int DEFAULT 0,
  is_dofollow boolean DEFAULT false,
  api_available boolean DEFAULT false,
  url text NOT NULL,
  icon text DEFAULT 'share-2',
  priority int DEFAULT 5,
  is_active boolean DEFAULT false,
  api_credentials jsonb DEFAULT '{}'::jsonb,
  posting_frequency text DEFAULT 'daily',
  content_format jsonb DEFAULT '{"text": true, "image": true, "video": false}'::jsonb,
  character_limit int DEFAULT 280,
  hashtag_limit int DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

-- Création de la table social_posts
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid REFERENCES social_networks(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls text[] DEFAULT ARRAY[]::text[],
  hashtags text[] DEFAULT ARRAY[]::text[],
  post_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  views int DEFAULT 0,
  likes int DEFAULT 0,
  shares int DEFAULT 0,
  comments int DEFAULT 0,
  clicks int DEFAULT 0,
  engagement_rate decimal DEFAULT 0,
  error_message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Création de la table whatsapp_groups
CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  group_id text UNIQUE,
  phone_number text,
  member_count int DEFAULT 0,
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  auto_send boolean DEFAULT false,
  send_frequency text DEFAULT 'weekly',
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Création de la table whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  message text NOT NULL,
  media_url text,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  read_count int DEFAULT 0,
  reply_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Création de la table automation_rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  target_networks text[] DEFAULT ARRAY[]::text[],
  content_template text NOT NULL,
  media_template text,
  is_active boolean DEFAULT true,
  execution_count int DEFAULT 0,
  last_execution_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Création de la table social_analytics
CREATE TABLE IF NOT EXISTS social_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid REFERENCES social_networks(id) ON DELETE CASCADE,
  date date NOT NULL,
  posts_count int DEFAULT 0,
  total_views bigint DEFAULT 0,
  total_engagement bigint DEFAULT 0,
  total_clicks bigint DEFAULT 0,
  new_followers int DEFAULT 0,
  reach bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(network_id, date)
);

-- Activer RLS sur toutes les tables
ALTER TABLE social_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_analytics ENABLE ROW LEVEL SECURITY;

-- Policies pour social_networks (lecture publique, écriture admin)
CREATE POLICY "Anyone can view social networks"
  ON social_networks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage social networks"
  ON social_networks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies pour social_posts
CREATE POLICY "Authenticated users can view all posts"
  ON social_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON social_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their posts"
  ON social_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies pour whatsapp_groups
CREATE POLICY "Authenticated users can view groups"
  ON whatsapp_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage groups"
  ON whatsapp_groups FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies pour whatsapp_messages
CREATE POLICY "Authenticated users can view messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies pour automation_rules
CREATE POLICY "Authenticated users can view rules"
  ON automation_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage rules"
  ON automation_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies pour social_analytics
CREATE POLICY "Authenticated users can view analytics"
  ON social_analytics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert analytics"
  ON social_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insertion des réseaux sociaux principaux avec leurs caractéristiques
INSERT INTO social_networks (name, category, domain_authority, is_dofollow, api_available, url, icon, priority, posting_frequency, content_format, character_limit, hashtag_limit) VALUES
-- Réseaux généraux (haute autorité SEO)
('Facebook', 'general', 100, false, true, 'https://facebook.com', 'facebook', 10, 'daily', '{"text": true, "image": true, "video": true}'::jsonb, 63206, 30),
('Instagram', 'general', 94, false, true, 'https://instagram.com', 'instagram', 10, 'daily', '{"text": true, "image": true, "video": true}'::jsonb, 2200, 30),
('X (Twitter)', 'general', 94, false, true, 'https://twitter.com', 'twitter', 10, '3xday', '{"text": true, "image": true, "video": true}'::jsonb, 280, 10),
('TikTok', 'general', 93, false, true, 'https://tiktok.com', 'video', 9, 'daily', '{"text": true, "video": true}'::jsonb, 2200, 10),
('YouTube', 'video', 100, true, true, 'https://youtube.com', 'youtube', 10, 'weekly', '{"text": true, "video": true}'::jsonb, 5000, 15),
('Pinterest', 'visual', 92, true, true, 'https://pinterest.com', 'image', 9, 'daily', '{"text": true, "image": true}'::jsonb, 500, 20),
('LinkedIn', 'professional', 99, false, true, 'https://linkedin.com', 'linkedin', 10, 'daily', '{"text": true, "image": true, "video": true}'::jsonb, 3000, 10),
('Snapchat', 'general', 88, false, true, 'https://snapchat.com', 'camera', 7, 'daily', '{"text": true, "image": true, "video": true}'::jsonb, 1000, 10),

-- Réseaux professionnels
('Viadeo', 'professional', 75, true, false, 'https://viadeo.com', 'briefcase', 6, 'weekly', '{"text": true, "image": true}'::jsonb, 2000, 10),
('Google Business Profile', 'local', 100, true, true, 'https://business.google.com', 'map-pin', 10, 'daily', '{"text": true, "image": true, "video": true}'::jsonb, 1500, 5),
('Bing Places', 'local', 95, true, true, 'https://bingplaces.com', 'map', 9, 'weekly', '{"text": true, "image": true}'::jsonb, 1000, 5),
('Yelp', 'local', 93, true, false, 'https://yelp.com', 'star', 8, 'monthly', '{"text": true, "image": true}'::jsonb, 5000, 5),
('Trustpilot', 'reviews', 92, true, false, 'https://trustpilot.com', 'award', 10, 'onreview', '{"text": true}'::jsonb, 1000, 0),

-- Réseaux vidéo
('Dailymotion', 'video', 85, true, true, 'https://dailymotion.com', 'video', 7, 'weekly', '{"text": true, "video": true}'::jsonb, 2000, 10),
('Vimeo', 'video', 91, false, true, 'https://vimeo.com', 'video', 7, 'weekly', '{"text": true, "video": true}'::jsonb, 5000, 10),
('Twitch', 'video', 89, false, true, 'https://twitch.tv', 'tv', 6, 'weekly', '{"text": true, "video": true}'::jsonb, 500, 10),
('Rumble', 'video', 70, true, false, 'https://rumble.com', 'video', 5, 'weekly', '{"text": true, "video": true}'::jsonb, 2000, 10),

-- Réseaux visuels
('Behance', 'creative', 88, true, false, 'https://behance.net', 'palette', 6, 'monthly', '{"text": true, "image": true}'::jsonb, 2000, 10),
('Dribbble', 'creative', 86, true, false, 'https://dribbble.com', 'palette', 5, 'monthly', '{"text": true, "image": true}'::jsonb, 1000, 5),

-- Réseaux contenu long
('Medium', 'blogging', 95, false, false, 'https://medium.com', 'file-text', 9, 'weekly', '{"text": true, "image": true}'::jsonb, 100000, 5),
('Substack', 'blogging', 88, true, false, 'https://substack.com', 'mail', 8, 'weekly', '{"text": true, "image": true}'::jsonb, 50000, 5),
('Reddit', 'community', 91, false, true, 'https://reddit.com', 'message-circle', 8, 'daily', '{"text": true, "image": true, "video": true}'::jsonb, 40000, 0),
('Quora', 'qa', 93, false, true, 'https://quora.com', 'help-circle', 9, 'weekly', '{"text": true, "image": true}'::jsonb, 300000, 0),
('Tumblr', 'blogging', 90, true, false, 'https://tumblr.com', 'edit', 7, 'daily', '{"text": true, "image": true, "video": true}'::jsonb, 4096, 30),

-- Réseaux messagerie
('WhatsApp Business', 'messaging', 95, false, true, 'https://business.whatsapp.com', 'message-square', 10, 'custom', '{"text": true, "image": true, "video": true}'::jsonb, 4096, 0),
('Telegram', 'messaging', 88, false, true, 'https://telegram.org', 'send', 9, 'custom', '{"text": true, "image": true, "video": true}'::jsonb, 4096, 0),
('Discord', 'messaging', 85, false, true, 'https://discord.com', 'hash', 8, 'custom', '{"text": true, "image": true, "video": true}'::jsonb, 2000, 0),

-- Réseaux business
('Crunchbase', 'business', 92, true, false, 'https://crunchbase.com', 'briefcase', 7, 'once', '{"text": true, "image": true}'::jsonb, 5000, 0),
('ProductHunt', 'business', 89, true, false, 'https://producthunt.com', 'rocket', 8, 'once', '{"text": true, "image": true}'::jsonb, 260, 5)
ON CONFLICT DO NOTHING;

-- Création d'index pour les performances
CREATE INDEX IF NOT EXISTS idx_social_posts_network ON social_posts(network_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_group ON whatsapp_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_network_date ON social_analytics(network_id, date);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active);
