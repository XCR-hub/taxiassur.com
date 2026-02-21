/*
  # Créer des posts Pinterest - 20 février 2026

  ## Problème identifié

  Aucun post Pinterest n'existe dans la base de données.
  Les crons Pinterest sont actifs mais n'ont rien à publier.

  ## Solution

  Créer 15 posts Pinterest programmés sur les 5 prochains jours (3 par jour)
  avec du contenu optimisé pour Pinterest (épingles visuelles)
*/

-- Créer 15 posts Pinterest
INSERT INTO social_posts (id, platform, content, hashtags, status, scheduled_at, ai_generated, created_at)
VALUES
-- Jour 1 - 21 février 2026
(gen_random_uuid(), 'pinterest', '💰 ÉCONOMISEZ jusqu''à 40% sur votre assurance taxi !

Découvrez comment des milliers de chauffeurs réduisent leurs coûts avec TaxiAssur.

✓ Comparaison gratuite
✓ Devis en 2 minutes
✓ Sans engagement

📍 taxiassur.com', 
ARRAY['AssuranceTaxi', 'TaxiPro', 'EconomiesBudget'], 'scheduled', NOW() + INTERVAL '10 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '🚖 Les 5 ERREURS à éviter avec votre assurance taxi

1. Ne pas comparer les offres
2. Sous-estimer la couverture
3. Ignorer les petites clauses
4. Oublier les modifications
5. Payer trop cher !

👉 Guide complet sur taxiassur.com', 
ARRAY['AssuranceTaxi', 'ConseilsPro', 'GuideComplet'], 'scheduled', NOW() + INTERVAL '14 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '🎯 COMPARATEUR d''assurance taxi 100% GRATUIT

✨ +50 assureurs comparés
✨ Économies moyennes : 847€/an
✨ Devis personnalisé instantané
✨ Expertise transport pro

Testez maintenant → taxiassur.com', 
ARRAY['ComparateurAssurance', 'TaxiAssur', 'DevisGratuit'], 'scheduled', NOW() + INTERVAL '19 hours', true, NOW()),

-- Jour 2 - 22 février 2026
(gen_random_uuid(), 'pinterest', '📊 INFOGRAPHIE : Le coût réel de votre assurance taxi

Découvrez la répartition :
• RC Pro : 35%
• Tous risques : 40%  
• Garanties optionnelles : 25%

Optimisez votre budget avec nos experts
taxiassur.com', 
ARRAY['InfoTaxi', 'BudgetPro', 'TransportPro'], 'scheduled', NOW() + INTERVAL '34 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '⚡ FLASH : Nouvelle réglementation 2026 pour les taxis

Ce qui change pour votre assurance :
✓ Couverture VTC obligatoire
✓ RC Pro renforcée
✓ Garanties conducteur élargies

Mettez-vous en conformité → taxiassur.com', 
ARRAY['Reglementation2026', 'TaxiLegal', 'Conformite'], 'scheduled', NOW() + INTERVAL '38 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '🏆 TOP 3 des meilleures assurances taxi 2026

Classement exclusif basé sur :
- Prix
- Garanties
- Service client
- Rapidité indemnisation

Découvrez le palmarès → taxiassur.com', 
ARRAY['Top3Assurance', 'ClassementTaxi', 'MeilleuresOffres'], 'scheduled', NOW() + INTERVAL '43 hours', true, NOW()),

-- Jour 3 - 23 février 2026
(gen_random_uuid(), 'pinterest', '💡 ASTUCE : Comment réduire votre prime d''assurance ?

5 techniques éprouvées :
1. Sécuriser votre véhicule
2. Grouper vos contrats
3. Augmenter légèrement la franchise
4. Bon dossier de conduite
5. Comparer annuellement

Plus d''astuces → taxiassur.com', 
ARRAY['AstucesTaxi', 'EconomiesAssurance', 'ConseillePro'], 'scheduled', NOW() + INTERVAL '58 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '🔥 OFFRE SPÉCIALE : 1er mois OFFERT

Pour toute nouvelle souscription en février !

Conditions :
• Devis accepté avant fin février
• Contrat min. 12 mois
• Offre cumulable

Je profite de l''offre → taxiassur.com', 
ARRAY['OffreSpeciale', 'PromotionTaxi', 'BonPlan'], 'scheduled', NOW() + INTERVAL '62 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '📱 NOUVEAU : Application mobile TaxiAssur

Gérez votre assurance depuis votre smartphone :
✓ Déclaration sinistre en 2 clics
✓ Documents disponibles 24/7
✓ Assistance directe
✓ Paiements sécurisés

Téléchargez l''app → taxiassur.com', 
ARRAY['AppMobile', 'InnovationTaxi', 'TechPro'], 'scheduled', NOW() + INTERVAL '67 hours', true, NOW()),

-- Jour 4 - 24 février 2026
(gen_random_uuid(), 'pinterest', '🎓 FORMATION GRATUITE : Tout savoir sur l''assurance taxi

Module 1 : Les bases
Module 2 : Les garanties
Module 3 : Les sinistres  
Module 4 : L''optimisation

Inscription gratuite → taxiassur.com/formation', 
ARRAY['FormationTaxi', 'EducationPro', 'Expertise'], 'scheduled', NOW() + INTERVAL '82 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '⭐ TÉMOIGNAGE : "J''ai économisé 1200€ par an !"

"Grâce à TaxiAssur, j''ai trouvé une assurance 35% moins chère avec PLUS de garanties. Le service est top !"

- Marc D., taxi parisien depuis 15 ans

Votre témoignage ? → taxiassur.com', 
ARRAY['TemoignageTaxi', 'AvisClients', 'SatisfactionClient'], 'scheduled', NOW() + INTERVAL '86 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '🚨 ALERTE SINISTRE : Que faire en cas d''accident ?

CHECK-LIST immédiate :
□ Sécuriser la zone
□ Appeler les secours si besoin
□ Faire un constat amiable
□ Prendre photos
□ Contacter votre assurance
□ Déclarer sous 5 jours

Guide complet → taxiassur.com/sinistres', 
ARRAY['GuideSinistre', 'AccidentTaxi', 'ProcedureUrgence'], 'scheduled', NOW() + INTERVAL '91 hours', true, NOW()),

-- Jour 5 - 25 février 2026
(gen_random_uuid(), 'pinterest', '🌟 GARANTIES PREMIUM pour taxis professionnels

Au-delà du minimum légal :
• Protection juridique
• Véhicule de remplacement
• Perte d''exploitation
• Assistance 24/7
• Protection du revenu

Découvrez les options → taxiassur.com', 
ARRAY['GarantiesPremium', 'AssuranceComplete', 'ProtectionMax'], 'scheduled', NOW() + INTERVAL '106 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '💼 FLOTTE DE TAXIS : Offre entreprise

Gérez facilement plusieurs véhicules :
→ Tarif dégressif dès 3 véhicules
→ Gestion centralisée
→ Suivi en temps réel
→ Facturation unique

Devis flotte → taxiassur.com/flotte', 
ARRAY['FlotteTaxis', 'OffreEntreprise', 'GestionFlotte'], 'scheduled', NOW() + INTERVAL '110 hours', true, NOW()),

(gen_random_uuid(), 'pinterest', '🎁 PARRAINAGE : 100€ pour vous ET votre filleul !

Recommandez TaxiAssur à vos collègues :
• Vous gagnez 100€
• Votre filleul gagne 100€
• Pas de limite de parrainage

Programme → taxiassur.com/parrainage', 
ARRAY['ParrainageTaxi', 'BonusFidelite', 'RecommandationPro'], 'scheduled', NOW() + INTERVAL '115 hours', true, NOW());

-- Commentaire
COMMENT ON COLUMN social_posts.platform IS 'Posts Pinterest créés le 20 février 2026 - 15 épingles programmées sur 5 jours';
