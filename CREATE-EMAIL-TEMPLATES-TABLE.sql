-- ══════════════════════════════════════════════════════════════════
--  CRÉER TABLE EMAIL TEMPLATES + TEMPLATES PRODUCTION
-- ══════════════════════════════════════════════════════════════════

-- Créer table email_templates
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  category text NOT NULL,
  variables text[] DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email templates readable by all"
  ON email_templates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Email templates writable by authenticated"
  ON email_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- TEMPLATE 1: Premier Contact
INSERT INTO email_templates (
  name, subject, body, category, variables, metadata
) VALUES (
  'backlink_premier_contact',
  'Collaboration {{site_name}} × TaxiAssur.com',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f97316; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background: #fff; }
    .cta { background: #f97316; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>TaxiAssur.com</h2>
      <p>Leader Assurance Taxi & VTC en France</p>
    </div>
    
    <div class="content">
      <p>Bonjour {{contact_name}},</p>
      
      <p>Je suis Thomas Moreau, responsable partenariats chez <strong>TaxiAssur.com</strong>.</p>
      
      <p>J''ai récemment découvert <strong>{{site_name}}</strong> et j''ai été impressionné par la qualité de vos contenus sur {{niche}}.</p>
      
      <p><strong>Pourquoi je vous contacte ?</strong></p>
      
      <p>Nous accompagnons <strong>+2 500 chauffeurs de taxi et VTC</strong> en France avec des solutions d''assurance adaptées à leur activité. Notre expertise et nos ressources pourraient intéresser votre audience.</p>
      
      <p><strong>Ce que je propose :</strong></p>
      <ul>
        <li>✅ Un article invité de qualité (800-1200 mots) sur un sujet pertinent pour vos lecteurs</li>
        <li>✅ Contenus 100% originaux, rédigés par nos experts assurance</li>
        <li>✅ Valeur ajoutée réelle pour votre audience</li>
        <li>✅ Backlink naturel et contextuel vers TaxiAssur.com</li>
      </ul>
      
      <p><strong>Exemples de sujets possibles :</strong></p>
      <ul>
        <li>"Les 7 erreurs à éviter dans son assurance taxi professionnel"</li>
        <li>"Comment optimiser ses coûts d''assurance en tant que chauffeur indépendant"</li>
        <li>"Guide complet : Assurance flottes de véhicules professionnels"</li>
      </ul>
      
      <p>Seriez-vous intéressé par cette collaboration ? Je peux vous envoyer un exemple d''article si vous le souhaitez.</p>
      
      <a href="mailto:partenariats@taxiassur.com?subject=Collaboration {{site_name}}" class="cta">
        Oui, parlons-en !
      </a>
      
      <div class="signature">
        <p>Cordialement,</p>
        <p><strong>Thomas Moreau</strong><br>
        Responsable Partenariats<br>
        TaxiAssur.com<br>
        📧 partenariats@taxiassur.com<br>
        📱 +33 1 89 20 20 20<br>
        🌐 <a href="https://taxiassur.com">taxiassur.com</a></p>
      </div>
    </div>
    
    <div class="footer">
      <p>TaxiAssur.com - Leader de l''assurance taxi & VTC en France</p>
      <p>+2 500 professionnels nous font confiance | Note 4.8/5 sur Trustpilot</p>
      <p><small>Vous recevez cet email car nous pensons qu''une collaboration pourrait être mutuellement bénéfique. Si vous ne souhaitez plus être contacté, <a href="mailto:partenariats@taxiassur.com?subject=Désabonnement">cliquez ici</a>.</small></p>
    </div>
  </div>
</body>
</html>',
  'backlink_outreach',
  ARRAY['contact_name', 'site_name', 'niche'],
  '{"tone": "professionnel", "language": "fr", "follow_up_delay_days": 7}'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  body = EXCLUDED.body,
  subject = EXCLUDED.subject,
  updated_at = now();

-- TEMPLATE 2: Relance 1
INSERT INTO email_templates (
  name, subject, body, category, variables, metadata
) VALUES (
  'backlink_relance_1',
  'Re: Collaboration {{site_name}} × TaxiAssur.com',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; background: #fff; }
    .highlight { background: #fef3c7; padding: 10px; border-left: 4px solid #f97316; margin: 20px 0; }
    .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Bonjour {{contact_name}},</p>
      
      <p>Je reviens vers vous suite à mon email du {{date_premier_contact}} concernant une collaboration entre {{site_name}} et TaxiAssur.com.</p>
      
      <div class="highlight">
        <p><strong>💡 Pour faciliter votre décision, voici 3 exemples concrets d''articles que nous pourrions créer pour {{site_name}} :</strong></p>
        <ol>
          <li><strong>"Les 5 garanties essentielles pour une assurance taxi en 2025"</strong> (900 mots)<br>
          <small>→ Guide pratique avec checklist téléchargeable</small></li>
          
          <li><strong>"Comment choisir son assurance quand on lance son activité VTC"</strong> (1100 mots)<br>
          <small>→ Comparatif détaillé + calculateur de budget</small></li>
          
          <li><strong>"Sinistre en service : la procédure complète à suivre"</strong> (800 mots)<br>
          <small>→ Pas à pas avec documents à télécharger</small></li>
        </ol>
      </div>
      
      <p><strong>Ce qui est inclus :</strong></p>
      <ul>
        <li>✅ Rédaction complète par nos experts</li>
        <li>✅ Images libres de droits (3-5 par article)</li>
        <li>✅ Infographies personnalisées si besoin</li>
        <li>✅ Optimisation SEO (mots-clés, structure)</li>
        <li>✅ Révisions illimitées jusqu''à validation</li>
      </ul>
      
      <p>Seriez-vous disponible pour un appel de 15 minutes cette semaine ? Je peux m''adapter à votre planning.</p>
      
      <p>Au plaisir d''échanger avec vous,</p>
      
      <div class="signature">
        <p><strong>Thomas Moreau</strong><br>
        Responsable Partenariats - TaxiAssur.com<br>
        📧 partenariats@taxiassur.com | 📱 +33 1 89 20 20 20</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'backlink_outreach',
  ARRAY['contact_name', 'site_name', 'date_premier_contact'],
  '{"tone": "professionnel", "language": "fr", "follow_up_delay_days": 7}'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  body = EXCLUDED.body,
  updated_at = now();

-- TEMPLATE 3: Relance Finale
INSERT INTO email_templates (
  name, subject, body, category, variables, metadata
) VALUES (
  'backlink_relance_finale',
  'Dernière chance : {{site_name}} × TaxiAssur.com',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; background: #fff; }
    .bonus { background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Bonjour {{contact_name}},</p>
      
      <p>C''est mon dernier email concernant la collaboration {{site_name}} × TaxiAssur.com.</p>
      
      <p>Je comprends que vous êtes probablement très occupé, alors je vais être direct :</p>
      
      <div class="bonus">
        <p><strong>🎁 OFFRE SPÉCIALE (valable 72h) :</strong></p>
        <p>En plus de l''article invité gratuit, nous offrons :</p>
        <ul>
          <li>✅ <strong>2 articles supplémentaires</strong> (valeur 600€)</li>
          <li>✅ <strong>1 infographie personnalisée</strong> aux couleurs de votre site</li>
          <li>✅ <strong>Partage sur nos réseaux sociaux</strong> (+5K abonnés)</li>
          <li>✅ <strong>Mention dans notre newsletter</strong> (2 800 professionnels)</li>
        </ul>
        <p><small>💰 Valeur totale: 950€ - <strong>OFFERT</strong> pour lancer la collaboration</small></p>
      </div>
      
      <p>Si vous n''êtes pas intéressé, pas de problème ! Je comprendrai et ne vous dérangerai plus.</p>
      
      <p>Mais si cette offre vous intéresse, répondez simplement "OUI" à cet email et je vous envoie le planning de collaboration dans l''heure.</p>
      
      <p>Merci de votre temps et à bientôt (ou pas 😊),</p>
      
      <div class="signature">
        <p><strong>Thomas Moreau</strong><br>
        Responsable Partenariats - TaxiAssur.com<br>
        📧 partenariats@taxiassur.com | 📱 +33 1 89 20 20 20</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'backlink_outreach',
  ARRAY['contact_name', 'site_name'],
  '{"tone": "direct", "language": "fr", "is_final": true}'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  body = EXCLUDED.body,
  updated_at = now();

-- TEMPLATE 4: Confirmation
INSERT INTO email_templates (
  name, subject, body, category, variables, metadata
) VALUES (
  'backlink_confirmation',
  '🎉 Collaboration confirmée : Prochaines étapes',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; background: #fff; }
    .success { background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .steps { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <div class="success">
        <h2>🎉 Merci {{contact_name}} !</h2>
        <p>Je suis ravi que nous collaborions ensemble.</p>
      </div>
      
      <p><strong>Voici les prochaines étapes :</strong></p>
      
      <div class="steps">
        <p><strong>📅 Semaine 1 (cette semaine)</strong></p>
        <ul>
          <li>Je vous envoie 3 propositions de sujets d''articles</li>
          <li>Vous choisissez celui qui vous convient le mieux</li>
          <li>On valide les mots-clés et la structure ensemble</li>
        </ul>
        
        <p><strong>✍️ Semaine 2</strong></p>
        <ul>
          <li>Rédaction de l''article (800-1200 mots)</li>
          <li>Sélection des images et création infographie</li>
          <li>Envoi du brouillon pour validation</li>
        </ul>
        
        <p><strong>🚀 Semaine 3</strong></p>
        <ul>
          <li>Corrections et ajustements si besoin</li>
          <li>Article finalisé prêt à publier</li>
          <li>Vous publiez quand vous voulez</li>
        </ul>
      </div>
      
      <p><strong>📋 J''ai besoin de quelques infos :</strong></p>
      <ol>
        <li>Thématiques préférées pour votre audience ?</li>
        <li>Mots-clés à privilégier ?</li>
        <li>Guidelines éditoriales de {{site_name}} ?</li>
        <li>Format d''image préféré ? (16:9, 4:3, etc.)</li>
      </ol>
      
      <p>Répondez à cet email avec ces infos et on démarre ! 🚀</p>
      
      <div class="signature">
        <p>Merci encore pour votre confiance,</p>
        <p><strong>Thomas Moreau</strong><br>
        Responsable Partenariats - TaxiAssur.com<br>
        📧 partenariats@taxiassur.com | 📱 +33 1 89 20 20 20</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'backlink_outreach',
  ARRAY['contact_name', 'site_name'],
  '{"tone": "enthusiaste", "language": "fr", "stage": "accepted"}'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  body = EXCLUDED.body,
  updated_at = now();

-- Vérification
SELECT 
  '✅ TABLE + 4 TEMPLATES CRÉÉS' as resultat,
  COUNT(*) as nb_templates,
  string_agg(name, ', ' ORDER BY name) as templates
FROM email_templates
WHERE category = 'backlink_outreach';
