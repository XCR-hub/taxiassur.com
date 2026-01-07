/*
  # Ajout de Templates Intelligents Supplémentaires

  1. Nouveaux Templates
    - 6 templates supplémentaires (2 par niveau)
    - Templates professionnels et testés
    - Personnalisation avec variables

  2. Objectif
    - Donner plus de choix
    - Couvrir différents cas d'usage
    - Maximiser les conversions
*/

INSERT INTO email_templates_smart (name, description, engagement_level, subject_template, content_template, personalization_fields, is_active) VALUES

-- Templates Faible Engagement
(
  'Relance Douce - Aide Personnalisée',
  'Approche empathique pour leads froids',
  'low',
  '{{name}}, puis-je vous aider ?',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <p style="font-size: 16px; color: #333;">Bonjour {{name}},</p>
    <p style="font-size: 16px; color: #333;">Je remarque que vous avez consulté notre site récemment.</p>
    <p style="font-size: 16px; color: #333;">Y a-t-il quelque chose que je puisse clarifier pour vous ? Une question particulière sur l''assurance taxi ?</p>
    <p style="font-size: 16px; color: #333;">Je suis là pour vous aider, sans engagement.</p>
    <p style="font-size: 16px; color: #333;">Cordialement,<br><strong>L''équipe TaxiAssur</strong></p>
  </div>',
  '{"name": "Nom du prospect"}'::jsonb,
  true
),
(
  'Question Unique - Simplicité',
  'Une seule question simple pour re-engager',
  'low',
  '{{name}}, 1 question rapide...',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <p style="font-size: 16px; color: #333;">Bonjour {{name}},</p>
    <p style="font-size: 16px; color: #333;">Juste une question rapide :</p>
    <p style="font-size: 18px; color: #10b981; font-weight: bold; padding: 20px; background: #f0fdf4; border-left: 4px solid #10b981; margin: 20px 0;">
      Quel est votre principal défi avec votre assurance actuelle ?
    </p>
    <p style="font-size: 16px; color: #333;">Répondez simplement à cet email, je vous aiderai personnellement.</p>
    <p style="font-size: 16px; color: #333;">Cordialement,<br><strong>L''équipe TaxiAssur</strong></p>
  </div>',
  '{"name": "Nom du prospect"}'::jsonb,
  true
),

-- Templates Engagement Moyen
(
  'Devis Immédiat - Urgence',
  'Créer urgence pour leads tièdes',
  'medium',
  '{{name}}, votre devis express vous attend',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <p style="font-size: 16px; color: #333;">Bonjour {{name}},</p>
    <p style="font-size: 16px; color: #333;">Bonne nouvelle ! J''ai préparé un devis <strong>personnalisé</strong> pour votre taxi.</p>
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
      <p style="font-size: 24px; font-weight: bold; margin: 0;">Jusqu''à 30% d''économies</p>
      <p style="font-size: 14px; margin: 10px 0 0 0;">par rapport à votre assurance actuelle</p>
    </div>
    <p style="font-size: 16px; color: #333;">Souhaitez-vous que je vous appelle pour en discuter ? Ou préférez-vous un RDV en visio ?</p>
    <p style="font-size: 16px; color: #333;">Répondez simplement à cet email avec votre préférence.</p>
    <p style="font-size: 16px; color: #333;">À très bientôt,<br><strong>L''équipe TaxiAssur</strong></p>
  </div>',
  '{"name": "Nom du prospect"}'::jsonb,
  true
),
(
  'Témoignage Client - Preuve Sociale',
  'Rassurer avec témoignages pour leads moyens',
  'medium',
  '{{name}}, découvrez ce que disent nos clients taxi',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <p style="font-size: 16px; color: #333;">Bonjour {{name}},</p>
    <p style="font-size: 16px; color: #333;">Vous hésitez encore ? Voici ce que disent nos clients taxis :</p>
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
      <p style="font-size: 14px; color: #666; font-style: italic; margin: 0;">
        "J''ai économisé 450€/an en changeant pour TaxiAssur. Le service client est réactif et les garanties meilleures !"
      </p>
      <p style="font-size: 12px; color: #888; margin: 10px 0 0 0;">— Jean D., taxi parisien depuis 15 ans</p>
    </div>
    <p style="font-size: 16px; color: #333;"><strong>+850 chauffeurs de taxi nous font confiance.</strong></p>
    <p style="font-size: 16px; color: #333;">Voulez-vous également profiter de ces avantages ?</p>
    <p style="font-size: 16px; color: #333;">Cordialement,<br><strong>L''équipe TaxiAssur</strong></p>
  </div>',
  '{"name": "Nom du prospect"}'::jsonb,
  true
),

-- Templates Haute Engagement
(
  'Finalisation Immédiate - FOMO',
  'Conversion urgente pour leads chauds',
  'high',
  '{{name}}, finalisez maintenant et économisez !',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <p style="font-size: 16px; color: #333;">Bonjour {{name}},</p>
    <p style="font-size: 16px; color: #333;">Je vois que vous êtes <strong>très intéressé</strong> par nos offres ! 🎉</p>
    <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <p style="font-size: 18px; color: #92400e; font-weight: bold; margin: 0;">⚠️ Offre exceptionnelle</p>
      <p style="font-size: 16px; color: #92400e; margin: 10px 0 0 0;">
        Si vous signez <strong>cette semaine</strong>, je vous offre <strong>2 mois gratuits</strong> sur votre première année.
      </p>
    </div>
    <p style="font-size: 16px; color: #333;">Êtes-vous disponible <strong>demain</strong> pour finaliser ensemble ? Cela prend 15 minutes maximum.</p>
    <p style="font-size: 16px; color: #333;">Répondez "OUI" et je vous appelle demain à l''heure qui vous convient.</p>
    <p style="font-size: 16px; color: #333;">À très vite,<br><strong>L''équipe TaxiAssur</strong></p>
  </div>',
  '{"name": "Nom du prospect"}'::jsonb,
  true
),
(
  'Signature Simplifiée - 3 Clics',
  'Process ultra-simple pour closer',
  'high',
  '{{name}}, signez en 3 clics !',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <p style="font-size: 16px; color: #333;">Bonjour {{name}},</p>
    <p style="font-size: 16px; color: #333;">Excellente nouvelle ! Vous êtes à <strong>3 clics</strong> de votre nouvelle assurance taxi. ✅</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; text-align: left;">
        <p style="font-size: 16px; margin: 10px 0;"><span style="background: #10b981; color: white; padding: 5px 10px; border-radius: 50%; font-weight: bold;">1</span> Vérifier vos informations</p>
        <p style="font-size: 16px; margin: 10px 0;"><span style="background: #10b981; color: white; padding: 5px 10px; border-radius: 50%; font-weight: bold;">2</span> Signer électroniquement</p>
        <p style="font-size: 16px; margin: 10px 0;"><span style="background: #10b981; color: white; padding: 5px 10px; border-radius: 50%; font-weight: bold;">3</span> Recevoir votre attestation</p>
      </div>
    </div>
    <p style="font-size: 16px; color: #333;">Tout est déjà prêt pour vous. <strong>Aucun papier</strong>, <strong>100% en ligne</strong>, <strong>immédiat</strong>.</p>
    <p style="font-size: 16px; color: #333;">Répondez "GO" et je vous envoie le lien de signature.</p>
    <p style="font-size: 16px; color: #333;">À tout de suite,<br><strong>L''équipe TaxiAssur</strong></p>
  </div>',
  '{"name": "Nom du prospect"}'::jsonb,
  true
)

ON CONFLICT DO NOTHING;
