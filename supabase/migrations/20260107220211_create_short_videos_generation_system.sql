/*
  # Système Génération Vidéos Courtes

  1. Tables
    - video_templates - Templates vidéo (TikTok, Reels, Shorts)
    - video_generations - Vidéos générées
    - video_scripts - Scripts générés par IA
    - video_analytics - Métriques performance

  2. Features
    - Génération auto scripts IA
    - Voix-off IA multi-langues
    - Sous-titres automatiques
    - Templates personnalisables
    - Export multi-formats
*/

CREATE TABLE IF NOT EXISTS video_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  platform text NOT NULL, -- tiktok, reels, youtube_shorts
  duration_seconds int NOT NULL,
  resolution text DEFAULT '1080x1920',
  fps int DEFAULT 30,
  template_config jsonb NOT NULL,
  thumbnail_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  topic text NOT NULL,
  target_audience text,
  tone text DEFAULT 'professional',
  script_text text NOT NULL,
  hook text,
  call_to_action text,
  hashtags text[],
  estimated_duration_seconds int,
  ai_provider text,
  ai_model text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  template_id uuid REFERENCES video_templates(id),
  script_id uuid REFERENCES video_scripts(id),
  title text NOT NULL,
  description text,
  video_url text,
  thumbnail_url text,
  duration_seconds int,
  file_size_mb numeric(10,2),
  status text DEFAULT 'queued', -- queued, processing, completed, failed
  progress_percentage int DEFAULT 0,
  error_message text,
  platform text,
  publish_status text DEFAULT 'draft', -- draft, scheduled, published
  scheduled_at timestamptz,
  published_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES video_generations(id) ON DELETE CASCADE,
  platform text NOT NULL,
  views int DEFAULT 0,
  likes int DEFAULT 0,
  comments int DEFAULT 0,
  shares int DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  watch_time_seconds int DEFAULT 0,
  completion_rate numeric(5,2) DEFAULT 0,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_templates_platform ON video_templates(platform);
CREATE INDEX IF NOT EXISTS idx_video_scripts_user ON video_scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_user ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);
CREATE INDEX IF NOT EXISTS idx_video_analytics_video ON video_analytics(video_id);

-- RLS
ALTER TABLE video_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone view active templates" ON video_templates FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Users manage own scripts" ON video_scripts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own videos" ON video_generations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view own analytics" ON video_analytics FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM video_generations WHERE video_generations.id = video_analytics.video_id AND video_generations.user_id = auth.uid()));

-- Insérer templates par défaut
INSERT INTO video_templates (name, description, platform, duration_seconds, template_config) VALUES
('TikTok Classique', 'Template TikTok standard 9:16', 'tiktok', 30, '{"style":"modern","effects":["fade","zoom"]}'::jsonb),
('Instagram Reels', 'Template Reels Instagram', 'reels', 30, '{"style":"trendy","effects":["slide","flash"]}'::jsonb),
('YouTube Shorts', 'Template Shorts YouTube', 'youtube_shorts', 60, '{"style":"clean","effects":["cut","pan"]}'::jsonb)
ON CONFLICT DO NOTHING;
