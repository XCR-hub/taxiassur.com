/*
  # Fix Marketing Templates

  Crée et peuple la table marketing_templates pour l'interface
  /backoffice/marketing-templates

  ## Données ajoutées
  - 3 templates WhatsApp
  - 3 templates LinkedIn
  - 2 templates Email
  - 1 template Presse
*/

-- Créer table si elle n'existe pas
CREATE TABLE IF NOT EXISTS marketing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  template_type text NOT NULL,
  content text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_templates_category ON marketing_templates(category);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_type ON marketing_templates(template_type);

ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read marketing_templates" ON marketing_templates;
CREATE POLICY "Public read marketing_templates"
  ON marketing_templates FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated write marketing_templates" ON marketing_templates;
CREATE POLICY "Authenticated write marketing_templates"
  ON marketing_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Supprimer templates existants
DELETE FROM marketing_templates;

-- Insérer templates WhatsApp
INSERT INTO marketing_templates (category, name, template_type, content, variables) VALUES
('whatsapp', 'Message Court', 'status', 'Salut {{prenom}}, j''utilise TaxiAssur pour mes assurances taxi. Devis gratuit en 1 min → https://taxiassur.com/devis?ref={{code_ambassadeur}}', '{"prenom": "Jean", "code_ambassadeur": "AMB123"}'),
('whatsapp', 'Message Standard', 'group', 'Bonjour à tous, si vous voulez comparer rapidement vos tarifs d''assurance taxi, essayez le simulateur TaxiAssur : https://taxiassur.com/devis?ref={{code_ambassadeur}}', '{"code_ambassadeur": "AMB123"}'),
('whatsapp', 'Message Long', 'personal', 'Salut {{prenom}}, je viens de tester TaxiAssur, ils m''ont fait un devis en 1 minute. Si tu veux, utilise mon lien : https://taxiassur.com/devis?ref={{code_ambassadeur}}', '{"prenom": "Jean", "code_ambassadeur": "AMB123"}');

-- Insérer templates LinkedIn
INSERT INTO marketing_templates (category, name, template_type, content, variables) VALUES
('linkedin', 'Post Lancement', 'post', '🚀 TaxiAssur est lancé ! Chauffeurs de taxi : obtenez un devis gratuit en 1 minute. 🔗 https://taxiassur.com/devis?ref=linkedin #assurancetaxi #taxi', '{}'),
('linkedin', 'Post Témoignage', 'post', '✅ "Grâce à TaxiAssur j''ai réduit ma prime de 30%" — Jean, taxi Paris. Testez : https://taxiassur.com/devis?ref=linkedin #assurancetaxi', '{}'),
('linkedin', 'Description Courte', 'page', 'TaxiAssur — Spécialiste assurance taxi en France. Devis gratuit en 1 minute — RC Pro, flotte & couverture dédiée.', '{}');

-- Insérer templates Email
INSERT INTO marketing_templates (category, name, template_type, content, variables) VALUES
('email', 'Confirmation Lead', 'auto', 'Bonjour {{name}}, Merci pour votre demande de devis. Nous avons bien reçu vos informations. Un conseiller vous contactera sous 24h.', '{"name": "Jean"}'),
('email', 'Relance 7 jours', 'auto', 'Bonjour {{name}}, Votre devis TaxiAssur est toujours disponible. Besoin d''aide pour finaliser ? Appelez-nous au 01 23 45 67 89.', '{"name": "Jean"}');

-- Insérer template Presse
INSERT INTO marketing_templates (category, name, template_type, content, variables) VALUES
('presse', 'Communiqué Lancement', 'press_release', 'TaxiAssur lance un simulateur gratuit d''assurance pour chauffeurs de taxi. Devis instantané, programme ambassadeurs, outils gratuits.', '{}');

-- Vérification
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM marketing_templates;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MARKETING TEMPLATES CRÉÉS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Templates créés: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '📱 WhatsApp: 3 templates';
  RAISE NOTICE '💼 LinkedIn: 3 templates';
  RAISE NOTICE '📧 Email: 2 templates';
  RAISE NOTICE '📰 Presse: 1 template';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Marketing Templates: PRÊT';
  RAISE NOTICE '============================================';
END $$;
