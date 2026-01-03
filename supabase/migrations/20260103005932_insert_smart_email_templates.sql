/*
  # Templates d'emails intelligents par type de contact
  
  Insertion des templates optimisés pour chaque type de prospect :
  1. Entreprises de taxi → Devis assurance
  2. Magazines/Médias → Partenariat média
  3. Annuaires → Partenariat annuaire
  4. Sites web → Backlinks
*/

-- Template 1: Devis assurance pour entreprises de taxi
INSERT INTO smart_email_templates (name, contact_type, subject_template, html_template, variables, ai_personalization_enabled)
VALUES (
  'Devis Taxi - Comparaison Assurance',
  'prospect_taxi',
  '{{company_name}} - Comparez votre assurance taxi et économisez jusqu''à 30%',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-button { background: #FF6B35; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
    .benefits { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .benefit-item { margin: 10px 0; padding-left: 25px; position: relative; }
    .benefit-item:before { content: "✓"; position: absolute; left: 0; color: #FF6B35; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚕 TaxiAssur</h1>
      <p>L''assurance taxi qui vous fait économiser</p>
    </div>
    <div class="content">
      <p>Bonjour {{contact_name}},</p>
      
      <p>Je suis {{sender_name}} de TaxiAssur. J''ai remarqué que <strong>{{company_name}}</strong> opère dans le secteur du taxi{{#if city}} à {{city}}{{/if}}.</p>
      
      <p><strong>Saviez-vous que 78% des chauffeurs de taxi paient trop cher leur assurance ?</strong></p>
      
      <div class="benefits">
        <h3>Avec TaxiAssur, nos clients économisent en moyenne :</h3>
        <div class="benefit-item">30% sur leur prime annuelle</div>
        <div class="benefit-item">Couverture étendue RC Pro + Protection juridique incluse</div>
        <div class="benefit-item">Assistance 24h/24 partout en France</div>
        <div class="benefit-item">Gestion simplifiée des sinistres en ligne</div>
        <div class="benefit-item">Attestation envoyée en 24h chrono</div>
      </div>
      
      <p><strong>Je vous propose un audit gratuit de votre contrat actuel</strong> pour identifier vos opportunités d''économies.</p>
      
      <div class="cta">
        <a href="https://taxiassur.com/devis?ref={{contact_id}}" class="cta-button">
          Obtenir mon devis gratuit en 2 minutes
        </a>
      </div>
      
      <p>Aucun engagement. Comparaison 100% gratuite.</p>
      
      <p>Cordialement,<br>
      {{sender_name}}<br>
      <strong>Expert Assurance Taxi</strong><br>
      TaxiAssur<br>
      📞 {{phone}}<br>
      ✉️ {{sender_email}}</p>
    </div>
  </div>
</body>
</html>',
  '{"company_name": "", "contact_name": "", "city": "", "sender_name": "L''équipe TaxiAssur", "sender_email": "contact@taxiassur.com", "phone": "01 XX XX XX XX", "contact_id": ""}',
  true
) ON CONFLICT DO NOTHING;

-- Template 2: Partenariat média/magazine
INSERT INTO smart_email_templates (name, contact_type, subject_template, html_template, variables, ai_personalization_enabled)
VALUES (
  'Partenariat Média - Collaboration Éditoriale',
  'partner_media',
  'Collaboration {{media_name}} × TaxiAssur - Offre exclusive pour vos lecteurs',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2C3E50 0%, #3498db 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
    .partnership-box { background: #f0f8ff; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-button { background: #3498db; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤝 Partenariat Média</h1>
      <p>TaxiAssur × {{media_name}}</p>
    </div>
    <div class="content">
      <p>Bonjour {{contact_name}},</p>
      
      <p>Je suis {{sender_name}} de TaxiAssur, le leader de l''assurance taxi en ligne avec <strong>plus de 15 000 chauffeurs assurés en France</strong>.</p>
      
      <p>{{media_name}} étant une référence dans {{media_sector}}, je vous propose un <strong>partenariat média gagnant-gagnant</strong> :</p>
      
      <div class="partnership-box">
        <h3>🎯 Ce que nous proposons :</h3>
        <ul>
          <li><strong>Offre exclusive</strong> pour vos lecteurs/audience (-20% la 1ère année)</li>
          <li><strong>Contenu expert</strong> : articles, interviews, études de cas</li>
          <li><strong>Co-branding</strong> sur nos communications (15K+ abonnés)</li>
          <li><strong>Commission attractive</strong> sur chaque contrat signé</li>
          <li><strong>Backlink de qualité</strong> (DA {{domain_authority}}+)</li>
        </ul>
      </div>
      
      <p><strong>Pourquoi ce partenariat ?</strong></p>
      <ul>
        <li>Vos lecteurs bénéficient d''une offre exclusive</li>
        <li>Vous monétisez votre audience qualifiée</li>
        <li>Nous gagnons en visibilité sur votre média</li>
      </ul>
      
      <div class="cta">
        <a href="https://taxiassur.com/partners/apply?ref={{contact_id}}" class="cta-button">
          Discutons de cette collaboration
        </a>
      </div>
      
      <p>Je reste à votre disposition pour échanger sur les modalités.</p>
      
      <p>Cordialement,<br>
      {{sender_name}}<br>
      <strong>Responsable Partenariats</strong><br>
      TaxiAssur<br>
      ✉️ {{sender_email}}<br>
      🌐 taxiassur.com</p>
    </div>
  </div>
</body>
</html>',
  '{"media_name": "", "contact_name": "", "media_sector": "votre secteur", "sender_name": "L''équipe Partenariats TaxiAssur", "sender_email": "partners@taxiassur.com", "domain_authority": "40", "contact_id": ""}',
  true
) ON CONFLICT DO NOTHING;

-- Template 3: Partenariat annuaire
INSERT INTO smart_email_templates (name, contact_type, subject_template, html_template, variables, ai_personalization_enabled)
VALUES (
  'Partenariat Annuaire - Référencement',
  'partner_directory',
  '{{directory_name}} - Partenariat référencement TaxiAssur',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
    .offer-box { background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-button { background: #27ae60; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Partenariat Annuaire</h1>
      <p>Référencement TaxiAssur</p>
    </div>
    <div class="content">
      <p>Bonjour {{contact_name}},</p>
      
      <p>Je gère les partenariats chez TaxiAssur, spécialiste de l''assurance taxi en ligne.</p>
      
      <p>Votre annuaire <strong>{{directory_name}}</strong> étant très bien référencé sur Google{{#if directory_focus}} dans la catégorie {{directory_focus}}{{/if}}, je souhaite proposer notre référencement dans vos listings.</p>
      
      <div class="offer-box">
        <h3>💼 Notre proposition :</h3>
        <ul>
          <li><strong>Listing premium</strong> avec logo et description complète</li>
          <li><strong>Lien dofollow</strong> vers taxiassur.com</li>
          <li><strong>Mise à jour régulière</strong> de nos informations</li>
          <li><strong>Partenariat long terme</strong> (visibilité mutuelle)</li>
        </ul>
        
        <p><strong>En échange :</strong> Nous mentionnons {{directory_name}} comme partenaire référent sur notre site (15K+ visiteurs/mois)</p>
      </div>
      
      <p><strong>TaxiAssur en quelques chiffres :</strong></p>
      <ul>
        <li>🚕 15 000+ chauffeurs assurés</li>
        <li>⭐ 4.8/5 sur Trustpilot (500+ avis)</li>
        <li>🏆 Leader de l''assurance taxi digitale</li>
        <li>🌐 15 000+ visiteurs mensuels</li>
      </ul>
      
      <div class="cta">
        <a href="https://taxiassur.com/partners/directory?ref={{contact_id}}" class="cta-button">
          Valider notre référencement
        </a>
      </div>
      
      <p>Merci de me confirmer vos conditions de référencement.</p>
      
      <p>Cordialement,<br>
      {{sender_name}}<br>
      <strong>Partenariats & SEO</strong><br>
      TaxiAssur<br>
      ✉️ {{sender_email}}</p>
    </div>
  </div>
</body>
</html>',
  '{"directory_name": "", "contact_name": "", "directory_focus": "", "sender_name": "L''équipe TaxiAssur", "sender_email": "partners@taxiassur.com", "contact_id": ""}',
  true
) ON CONFLICT DO NOTHING;

-- Template 4: Demande de backlink
INSERT INTO smart_email_templates (name, contact_type, subject_template, html_template, variables, ai_personalization_enabled)
VALUES (
  'Backlink - Échange de liens qualité',
  'backlink_site',
  '{{website_name}} - Opportunité backlink mutuel (DA {{domain_authority}})',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
    .seo-stats { background: #f3e5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-button { background: #8e44ad; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔗 Backlink Mutuel</h1>
      <p>Opportunité SEO</p>
    </div>
    <div class="content">
      <p>Bonjour {{contact_name}},</p>
      
      <p>Je suis {{sender_name}}, en charge du SEO chez TaxiAssur.</p>
      
      <p>En analysant {{website_name}}, j''ai remarqué votre excellent contenu sur {{website_topic}}. Nos deux sites partagent une audience similaire dans {{common_niche}}.</p>
      
      <div class="seo-stats">
        <h3>🎯 Proposition d''échange :</h3>
        <p><strong>Votre site :</strong></p>
        <ul>
          <li>DA: {{domain_authority}} | DR: {{domain_rating}}</li>
          <li>Thématique: {{website_topic}}</li>
        </ul>
        
        <p><strong>Notre site (taxiassur.com) :</strong></p>
        <ul>
          <li>DA: 42 | DR: 38</li>
          <li>15 000+ visiteurs mensuels</li>
          <li>500+ backlinks de qualité</li>
          <li>Contenu frais publié chaque semaine</li>
        </ul>
      </div>
      
      <p><strong>Ce que je propose :</strong></p>
      <ul>
        <li>Nous publions un article mentionnant {{website_name}} avec un lien dofollow</li>
        <li>Vous publiez un article mentionnant TaxiAssur avec un lien dofollow</li>
        <li>Contenu de qualité, naturel et pertinent pour nos audiences respectives</li>
        <li>Ancre de lien optimisée SEO</li>
      </ul>
      
      <p><strong>Je peux aussi proposer :</strong> Rédaction d''un article invité de qualité (800+ mots) pour votre site si vous préférez.</p>
      
      <div class="cta">
        <a href="https://taxiassur.com/seo/backlink-exchange?ref={{contact_id}}" class="cta-button">
          Accepter l''échange de backlinks
        </a>
      </div>
      
      <p>Qu''en pensez-vous ? Nous pouvons commencer dès cette semaine.</p>
      
      <p>Cordialement,<br>
      {{sender_name}}<br>
      <strong>SEO Manager</strong><br>
      TaxiAssur<br>
      ✉️ {{sender_email}}<br>
      🌐 taxiassur.com</p>
    </div>
  </div>
</body>
</html>',
  '{"website_name": "", "contact_name": "", "website_topic": "", "common_niche": "assurance et mobilité", "domain_authority": "30", "domain_rating": "25", "sender_name": "L''équipe SEO TaxiAssur", "sender_email": "seo@taxiassur.com", "contact_id": ""}',
  true
) ON CONFLICT DO NOTHING;