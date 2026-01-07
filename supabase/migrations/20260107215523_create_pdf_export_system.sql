/*
  # Système d'Export PDF Avancé

  1. Nouvelles Tables
    - `pdf_templates` - Templates de documents PDF
    - `pdf_exports` - Historique des exports PDF
    - `pdf_settings` - Configuration personnalisée par client

  2. Fonctionnalités
    - Templates personnalisables (factures, contrats, rapports)
    - Génération asynchrone
    - Stockage sécurisé dans Supabase Storage
    - Watermarking et signatures électroniques
    - Multi-langues

  3. Security
    - RLS activé sur toutes les tables
    - Accès authentifié uniquement
    - Logs d'accès aux PDFs sensibles
*/

-- Table des templates PDF
CREATE TABLE IF NOT EXISTS pdf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL, -- invoice, contract, report, quote, letter
  html_template text NOT NULL,
  css_styles text,
  variables jsonb DEFAULT '[]'::jsonb,
  header_html text,
  footer_html text,
  page_size text DEFAULT 'A4',
  orientation text DEFAULT 'portrait',
  margins jsonb DEFAULT '{"top": "2cm", "right": "2cm", "bottom": "2cm", "left": "2cm"}'::jsonb,
  is_active boolean DEFAULT true,
  language text DEFAULT 'fr',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Table des exports PDF générés
CREATE TABLE IF NOT EXISTS pdf_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES pdf_templates(id),
  user_id uuid REFERENCES auth.users(id),
  lead_id uuid REFERENCES leads(id),
  filename text NOT NULL,
  title text NOT NULL,
  file_path text,
  file_size bigint,
  status text DEFAULT 'pending',
  error_message text,
  data jsonb,
  metadata jsonb,
  download_count int DEFAULT 0,
  last_downloaded_at timestamptz,
  expires_at timestamptz,
  is_signed boolean DEFAULT false,
  signature_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table des paramètres PDF par utilisateur
CREATE TABLE IF NOT EXISTS pdf_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  company_name text,
  company_logo_url text,
  company_address text,
  company_phone text,
  company_email text,
  company_website text,
  tax_id text,
  default_language text DEFAULT 'fr',
  watermark_text text,
  watermark_enabled boolean DEFAULT false,
  auto_numbering_prefix text,
  auto_numbering_start int DEFAULT 1,
  footer_text text,
  signature_image_url text,
  custom_css text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des logs d'accès aux PDFs
CREATE TABLE IF NOT EXISTS pdf_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_export_id uuid REFERENCES pdf_exports(id) ON DELETE CASCADE,
  accessed_by uuid REFERENCES auth.users(id),
  ip_address text,
  user_agent text,
  action text,
  accessed_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_templates_category ON pdf_templates(category);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_active ON pdf_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pdf_exports_user ON pdf_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_lead ON pdf_exports(lead_id);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_status ON pdf_exports(status);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_created ON pdf_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_access_logs_export ON pdf_access_logs(pdf_export_id);

-- Enable RLS
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins full access templates"
  ON pdf_templates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Users view active templates"
  ON pdf_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users view own exports"
  ON pdf_exports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users create exports"
  ON pdf_exports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own exports"
  ON pdf_exports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all exports"
  ON pdf_exports FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Users manage own settings"
  ON pdf_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own logs"
  ON pdf_access_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM pdf_exports WHERE pdf_exports.id = pdf_access_logs.pdf_export_id AND pdf_exports.user_id = auth.uid()));

CREATE POLICY "System create logs"
  ON pdf_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fonction pour incrémenter téléchargements
CREATE OR REPLACE FUNCTION increment_pdf_download_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action = 'download' THEN
    UPDATE pdf_exports SET download_count = download_count + 1, last_downloaded_at = now() WHERE id = NEW.pdf_export_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_increment_pdf_downloads
  AFTER INSERT ON pdf_access_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_pdf_download_count();

-- Templates par défaut
INSERT INTO pdf_templates (name, description, category, html_template, variables, language)
VALUES
('Facture Standard', 'Facture pour assurance taxi', 'invoice', '<div class="invoice"><h1>FACTURE</h1></div>', '["companyName","clientName","invoiceNumber"]'::jsonb, 'fr'),
('Contrat Assurance', 'Contrat assurance taxi', 'contract', '<div class="contract"><h1>CONTRAT</h1></div>', '["companyName","clientName","contractNumber"]'::jsonb, 'fr'),
('Devis Personnalisé', 'Devis détaillé', 'quote', '<div class="quote"><h1>DEVIS</h1></div>', '["clientName","quoteRef"]'::jsonb, 'fr'),
('Rapport Mensuel', 'Rapport activité', 'report', '<div class="report"><h1>RAPPORT</h1></div>', '["periodStart","periodEnd"]'::jsonb, 'fr')
ON CONFLICT DO NOTHING;
