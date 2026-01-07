/*
  # Système Transcription Appels + Analyse Sentiment

  1. Tables
    - call_recordings - Enregistrements appels
    - call_transcriptions - Transcriptions texte
    - call_sentiment_analysis - Analyse sentiment
    - call_insights - Insights IA extraits

  2. Features
    - Transcription auto (Whisper API)
    - Analyse sentiment temps réel
    - Détection émotions
    - Extraction keywords
    - Résumé automatique
    - Action items detection
*/

CREATE TABLE IF NOT EXISTS call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  lead_id uuid REFERENCES leads(id),
  call_direction text NOT NULL, -- inbound, outbound
  phone_number text NOT NULL,
  duration_seconds int NOT NULL,
  recording_url text,
  file_size_mb numeric(10,2),
  recording_date timestamptz NOT NULL,
  status text DEFAULT 'recorded', -- recorded, transcribing, completed, failed
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES call_recordings(id) ON DELETE CASCADE UNIQUE,
  full_text text NOT NULL,
  segments jsonb NOT NULL, -- Array of {start, end, speaker, text}
  language text DEFAULT 'fr',
  confidence_score numeric(5,2),
  word_count int,
  transcription_provider text DEFAULT 'whisper',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_sentiment_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES call_recordings(id) ON DELETE CASCADE UNIQUE,
  overall_sentiment text NOT NULL, -- positive, neutral, negative
  sentiment_score numeric(5,2) NOT NULL, -- -1 to +1
  emotions jsonb DEFAULT '{}'::jsonb, -- {joy: 0.8, anger: 0.1, ...}
  customer_satisfaction_score int, -- 1-10
  agent_performance_score int, -- 1-10
  key_moments jsonb DEFAULT '[]'::jsonb, -- Moments clés du call
  red_flags text[], -- Signaux d'alerte
  positive_signals text[],
  analysis_provider text DEFAULT 'openai',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES call_recordings(id) ON DELETE CASCADE,
  insight_type text NOT NULL, -- summary, action_item, objection, question, commitment
  content text NOT NULL,
  priority text DEFAULT 'medium', -- low, medium, high, urgent
  assigned_to uuid REFERENCES auth.users(id),
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_recordings_user ON call_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_lead ON call_recordings(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_date ON call_recordings(recording_date DESC);
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_call ON call_transcriptions(call_id);
CREATE INDEX IF NOT EXISTS idx_call_sentiment_call ON call_sentiment_analysis(call_id);
CREATE INDEX IF NOT EXISTS idx_call_insights_call ON call_insights(call_id);
CREATE INDEX IF NOT EXISTS idx_call_insights_assigned ON call_insights(assigned_to) WHERE is_completed = false;

-- RLS
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recordings" ON call_recordings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create recordings" ON call_recordings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view transcriptions of own calls" ON call_transcriptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM call_recordings WHERE call_recordings.id = call_transcriptions.call_id AND call_recordings.user_id = auth.uid()));
CREATE POLICY "System create transcriptions" ON call_transcriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users view sentiment of own calls" ON call_sentiment_analysis FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM call_recordings WHERE call_recordings.id = call_sentiment_analysis.call_id AND call_recordings.user_id = auth.uid()));
CREATE POLICY "System create sentiment" ON call_sentiment_analysis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users view insights of own calls" ON call_insights FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM call_recordings WHERE call_recordings.id = call_insights.call_id AND call_recordings.user_id = auth.uid()));
CREATE POLICY "Users update assigned insights" ON call_insights FOR UPDATE TO authenticated USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE POLICY "System create insights" ON call_insights FOR INSERT TO authenticated WITH CHECK (true);
