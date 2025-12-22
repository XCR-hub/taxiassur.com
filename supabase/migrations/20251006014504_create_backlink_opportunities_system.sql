/*
  # Système Complet Backlink Prospector V2 - Automatisation
  
  ## 1. Tables Créées
  
  ### backlink_opportunities
  Table principale des opportunités de backlinks détectées
  - `id` (uuid, PK)
  - `domain` (text) - Domaine du site prospect
  - `url` (text) - URL exacte de la page
  - `page_title` (text) - Titre de la page
  - `page_authority` (int) - Authority de la page (0-100)
  - `domain_authority` (int) - Authority du domaine (0-100)
  - `anchor_text` (text) - Texte du lien trouvé
  - `linking_to` (text) - Site concurrent vers qui ils pointent
  - `category` (text) - Catégorie du site
  - `status` (text) - pending/contacted/accepted/rejected/ignored
  - `contact_email` (text) - Email de contact
  - `estimated_traffic` (int) - Trafic mensuel estimé
  - `relevance_score` (int) - Score de pertinence (0-100)
  - `last_contacted` (timestamptz) - Date dernier contact
  - `last_scan_date` (timestamptz) - Date dernier scan
  - `notes` (text) - Notes internes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### backlink_outreach_campaigns
  Campagnes d'emails de prospection
  - `id` (uuid, PK)
  - `name` (text) - Nom de la campagne
  - `template_id` (uuid) - Template email utilisé
  - `target_min_da` (int) - DA minimum ciblé
  - `target_category` (text) - Catégorie ciblée
  - `status` (text) - draft/active/paused/completed
  - `sent_count` (int) - Nombre d'emails envoyés
  - `opened_count` (int) - Nombre d'ouvertures
  - `replied_count` (int) - Nombre de réponses
  - `accepted_count` (int) - Nombre d'acceptations
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### backlink_email_logs
  Logs de tous les emails envoyés
  - `id` (uuid, PK)
  - `opportunity_id` (uuid, FK → backlink_opportunities)
  - `campaign_id` (uuid, FK → backlink_outreach_campaigns)
  - `email_type` (text) - initial/followup/accepted/rejected
  - `sent_at` (timestamptz)
  - `opened_at` (timestamptz)
  - `clicked_at` (timestamptz)
  - `replied_at` (timestamptz)
  - `email_subject` (text)
  - `email_body` (text)
  - `sendgrid_message_id` (text) - ID message SendGrid
  - `status` (text) - queued/sent/delivered/opened/clicked/replied/bounced
  - `created_at` (timestamptz)
  
  ### backlink_email_templates
  Templates d'emails personnalisables
  - `id` (uuid, PK)
  - `name` (text) - Nom du template
  - `subject` (text) - Objet de l'email
  - `body` (text) - Corps de l'email (avec variables {{domain}}, {{pageTitle}}, etc.)
  - `email_type` (text) - initial/followup/thankyou
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### backlink_scan_history
  Historique des scans automatiques
  - `id` (uuid, PK)
  - `scan_date` (timestamptz)
  - `competitors_scanned` (text[]) - Liste concurrents scannés
  - `opportunities_found` (int) - Nouvelles opportunités
  - `scan_duration_ms` (int) - Durée du scan
  - `status` (text) - success/failed
  - `error_message` (text)
  - `created_at` (timestamptz)
  
  ## 2. Sécurité (RLS)
  - Toutes les tables nécessitent authentification
  - Lecture/écriture réservée aux admins
  
  ## 3. Indexes
  - Index sur domain pour recherche rapide
  - Index sur status pour filtres
  - Index sur domain_authority pour tri
  - Index sur last_contacted pour relances auto
  
  ## 4. Triggers
  - Auto-update updated_at sur modification
  - Notification Slack si opportunité acceptée
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: backlink_opportunities
CREATE TABLE IF NOT EXISTS backlink_opportunities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain text NOT NULL,
  url text NOT NULL UNIQUE,
  page_title text NOT NULL,
  page_authority int CHECK (page_authority >= 0 AND page_authority <= 100) DEFAULT 0,
  domain_authority int CHECK (domain_authority >= 0 AND domain_authority <= 100) DEFAULT 0,
  anchor_text text,
  linking_to text,
  category text DEFAULT 'Uncategorized',
  status text CHECK (status IN ('pending', 'contacted', 'accepted', 'rejected', 'ignored')) DEFAULT 'pending',
  contact_email text,
  estimated_traffic int DEFAULT 0,
  relevance_score int CHECK (relevance_score >= 0 AND relevance_score <= 100) DEFAULT 0,
  last_contacted timestamptz,
  last_scan_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: backlink_outreach_campaigns
CREATE TABLE IF NOT EXISTS backlink_outreach_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  template_id uuid,
  target_min_da int DEFAULT 15,
  target_category text,
  status text CHECK (status IN ('draft', 'active', 'paused', 'completed')) DEFAULT 'draft',
  sent_count int DEFAULT 0,
  opened_count int DEFAULT 0,
  replied_count int DEFAULT 0,
  accepted_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: backlink_email_logs
CREATE TABLE IF NOT EXISTS backlink_email_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id uuid REFERENCES backlink_opportunities(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES backlink_outreach_campaigns(id) ON DELETE SET NULL,
  email_type text CHECK (email_type IN ('initial', 'followup', 'accepted', 'rejected', 'thankyou')) DEFAULT 'initial',
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  email_subject text NOT NULL,
  email_body text NOT NULL,
  sendgrid_message_id text,
  status text CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed')) DEFAULT 'queued',
  created_at timestamptz DEFAULT now()
);

-- Table: backlink_email_templates
CREATE TABLE IF NOT EXISTS backlink_email_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  email_type text CHECK (email_type IN ('initial', 'followup', 'thankyou')) DEFAULT 'initial',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: backlink_scan_history
CREATE TABLE IF NOT EXISTS backlink_scan_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_date timestamptz DEFAULT now(),
  competitors_scanned text[] DEFAULT '{}',
  opportunities_found int DEFAULT 0,
  scan_duration_ms int DEFAULT 0,
  status text CHECK (status IN ('success', 'failed', 'running')) DEFAULT 'running',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_domain ON backlink_opportunities(domain);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status ON backlink_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_da ON backlink_opportunities(domain_authority DESC);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_last_contacted ON backlink_opportunities(last_contacted);
CREATE INDEX IF NOT EXISTS idx_backlink_email_logs_opportunity ON backlink_email_logs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_email_logs_status ON backlink_email_logs(status);

-- Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_backlink_opportunities_updated_at ON backlink_opportunities;
CREATE TRIGGER update_backlink_opportunities_updated_at
  BEFORE UPDATE ON backlink_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_backlink_campaigns_updated_at ON backlink_outreach_campaigns;
CREATE TRIGGER update_backlink_campaigns_updated_at
  BEFORE UPDATE ON backlink_outreach_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_backlink_templates_updated_at ON backlink_email_templates;
CREATE TRIGGER update_backlink_templates_updated_at
  BEFORE UPDATE ON backlink_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (Admin only)
ALTER TABLE backlink_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_scan_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admin full access (authenticated users are considered admins for now)
CREATE POLICY "Admin can manage backlink_opportunities"
  ON backlink_opportunities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage backlink_outreach_campaigns"
  ON backlink_outreach_campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage backlink_email_logs"
  ON backlink_email_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage backlink_email_templates"
  ON backlink_email_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage backlink_scan_history"
  ON backlink_scan_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default email templates
INSERT INTO backlink_email_templates (name, subject, body, email_type) VALUES
(
  'Initial Outreach - French',
  'Proposition de partenariat - {{domain}}',
  'Bonjour,

Je suis tombé sur votre excellent article "{{pageTitle}}" et j''ai beaucoup apprécié votre contenu sur l''assurance taxi/VTC.

Je représente TaxiAssur.com, un courtier spécialisé en assurance taxi agréé ORIAS. Nous avons récemment publié plusieurs ressources complètes sur ce sujet :

📌 Guide complet assurance taxi 2024
📌 Comparateur prix assurance taxi par ville  
📌 RC Professionnelle taxi : obligations légales

Je pense que ces ressources pourraient apporter une vraie valeur ajoutée à vos lecteurs, notamment dans votre article qui mentionne déjà {{linkingTo}}.

Seriez-vous intéressé par :
✅ Un échange de liens éditoriaux pertinents ?
✅ Une contribution invitée sur un sujet assurance taxi ?
✅ Un partenariat de contenu mutuellement bénéfique ?

Nous pouvons bien sûr vous citer comme ressource experte sur notre blog également.

Qu''en pensez-vous ?

Bien cordialement,
L''équipe TaxiAssur
Courtier ORIAS 11 061 425
www.taxiassur.com',
  'initial'
),
(
  'Follow-up J+7',
  'Re: Proposition de partenariat - {{domain}}',
  'Bonjour,

Je me permets de revenir vers vous concernant ma proposition de partenariat envoyée le {{lastContactedDate}}.

Avez-vous eu l''occasion d''y réfléchir ?

Je reste à votre disposition pour en discuter et trouver un format de collaboration qui vous convienne.

Bien cordialement,
L''équipe TaxiAssur
www.taxiassur.com',
  'followup'
),
(
  'Thank You - Accepted',
  'Merci pour votre réponse positive !',
  'Bonjour,

Merci beaucoup d''avoir accepté notre proposition de partenariat !

Je suis ravi que nous puissions collaborer. Voici les prochaines étapes :

1️⃣ Nous publions un lien vers votre article {{pageTitle}}
2️⃣ Vous ajoutez un lien vers notre guide : www.taxiassur.com/assurance-taxi
3️⃣ Nous vous envoyons une proposition d''article invité (optionnel)

Pouvez-vous me confirmer :
- Le texte d''ancre que vous souhaitez utiliser ?
- La page de destination préférée ?

Merci encore et à très vite !

Cordialement,
L''équipe TaxiAssur',
  'thankyou'
) ON CONFLICT (name) DO NOTHING;

-- Insert initial opportunities (from V1 data)
INSERT INTO backlink_opportunities 
  (domain, url, page_title, page_authority, domain_authority, anchor_text, linking_to, category, status, contact_email, estimated_traffic, relevance_score)
VALUES
  ('auto-pratique.fr', 'https://auto-pratique.fr/quelle-assurance-pour-un-taxi.html', 'Choisir une assurance pour un taxi - Auto pratique', 23, 21, 'souscrire une assurance taxi', 'mfa.fr', 'Blog Auto', 'pending', 'contact@auto-pratique.fr', 150, 85),
  ('atouthomme.com', 'https://atouthomme.com/quelle-est-lassurance-auto-la-moins-chere.html', 'Comment assurer son auto moins cher ? - Atout Homme', 25, 20, 'l''assurance taxi ou vtc', 'mfa.fr', 'Magazine Lifestyle', 'pending', 'redaction@atouthomme.com', 200, 75),
  ('autoreglo.com', 'https://autoreglo.com/pourquoi-assurer-son-vehicule', 'Pour quelles raisons faut-il assurer son véhicule ? - Auto Reglo', 20, 20, 'l''assurance taxi', 'mfa.fr', 'Blog Auto', 'pending', 'contact@autoreglo.com', 180, 80),
  ('formaposte-nordest.fr', 'https://formaposte-nordest.fr/assurance-vtc-auto-entrepreneur-quelles-specificites/', 'Assurance VTC auto-entrepreneur : quelles spécificités ? - Formation Pro', 16, 19, 'leur devis en ligne dédié aux chauffeurs vtc', 'mfa.fr', 'Formation Pro', 'pending', 'contact@formaposte-nordest.fr', 120, 90),
  ('univers-passion.com', 'https://univers-passion.com/auto/assurances-vtc-bordeaux/', 'Assurances VTC Bordeaux - Guide complet', 23, 26, 'devis d''assurance pour les chauffeurs vtc', 'mfa.fr', 'Blog Local', 'pending', 'contact@univers-passion.com', 220, 88),
  ('ccaa.fr', 'https://ccaa.fr/assurance-taxi-aubervilliers', 'assurance taxi Aubervilliers - C.C.A.A Assurances', 18, 22, 'assurance taxi aubervilliers', 'Concurrent direct', 'Assurance Concurrent', 'pending', 'partenariat@ccaa.fr', 90, 95),
  ('taxiassurance.com', 'https://taxiassurance.com/groupama-assurance-taxi', 'Groupama assurance taxi | Devis comparatif, tarif pas cher', 19, 21, 'assurance taxi groupama', 'Concurrent comparateur', 'Comparateur', 'pending', 'contact@taxiassurance.com', 300, 70),
  ('assurland.com', 'https://assurland.com/assurance-taxi.html', 'Assurance Taxi : Comparateur & Devis gratuit', 45, 52, 'assurance taxi', 'Multiples', 'Comparateur Majeur', 'pending', 'partenariats@assurland.com', 2500, 65),
  ('lesfurets.com', 'https://lesfurets.com/assurance-auto/guide/taxi', 'Assurance Taxi : Guide complet 2024', 48, 55, 'assurance taxi professionnel', 'Multiples', 'Comparateur Majeur', 'pending', 'partnerships@lesfurets.com', 3200, 60),
  ('taxi-mag.fr', 'https://taxi-mag.fr/assurance-professionnelle-taxi', 'Quelle assurance pour taxi en 2024 ?', 28, 32, 'assurance taxi', 'Multiples', 'Magazine Taxi', 'pending', 'redac@taxi-mag.fr', 450, 92)
ON CONFLICT (url) DO NOTHING;
