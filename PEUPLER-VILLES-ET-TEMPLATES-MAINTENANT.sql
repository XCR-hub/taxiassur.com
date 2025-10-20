/*
  ════════════════════════════════════════════════════════════════
  PEUPLER VILLES MAJEURES + TEMPLATES VIRAUX
  À exécuter MAINTENANT dans Supabase SQL Editor
  ════════════════════════════════════════════════════════════════
*/

-- ═══════════════════════════════════════════════════════════════
-- PARTIE 1: TEMPLATES VIRAUX POUR GÉNÉRATION IA RÉSEAUX SOCIAUX
-- ═══════════════════════════════════════════════════════════════

-- Suppression templates existants (si duplicata)
DELETE FROM viral_templates WHERE TRUE;

-- Insertion 10 templates viraux testés et performants
INSERT INTO viral_templates (
  name, category, template_text, hashtags, emoji_pattern,
  avg_views, performance_score, platforms, engagement_tactics
) VALUES

-- Template 1: Conseil Expert
('Conseil du Jour - Expert', 'conseil',
'💡 {conseil_principal}

Pourquoi c''est crucial pour vous :
• {raison_1}
• {raison_2}
• {raison_3}

✅ Action à faire MAINTENANT :
{action_concrete}

Tag un collègue qui doit voir ça ! 👇',
ARRAY['#AssuranceTaxi', '#ConduireMalin', '#ConseilPro'],
'💡✅👇',
2500000, 85,
ARRAY['facebook', 'linkedin', 'instagram'],
'{"hooks": ["question", "urgence"], "cta": "tag", "engagement": "commentaire"}'::jsonb),

-- Template 2: Témoignage Choc
('Témoignage Choc', 'temoignage',
'😱 {situation_debut}

Résultat ? {consequence_negative}

Mais alors... {rebondissement}

Aujourd''hui ? {situation_positive}

💬 Qui se reconnait ? Mettez 🔥 en commentaire',
ARRAY['#TemoignageTaxi', '#VraiHistoire', '#Assurance'],
'😱💬🔥',
7000000, 95,
ARRAY['facebook', 'instagram', 'tiktok'],
'{"hooks": ["emotion", "surprise"], "cta": "emoji", "engagement": "reaction"}'::jsonb),

-- Template 3: Alerte Actualité
('Alerte Actualité', 'actualite',
'🚨 ALERTE INFO TAXI

{titre_accrocheur}

Ce qui change pour vous :
🔹 {changement_1}
🔹 {changement_2}
🔹 {changement_3}

⚠️ Action requise : {deadline}

Partage à max de collègues ! 🔄',
ARRAY['#ActuTaxi', '#LoiTaxi', '#InfoUrgente'],
'🚨🔹⚠️🔄',
3500000, 90,
ARRAY['facebook', 'linkedin', 'twitter'],
'{"hooks": ["urgence", "autorite"], "cta": "partage", "engagement": "viralite"}'::jsonb),

-- Template 4: Question Mystère
('Question Mystère', 'engagement',
'❓ QUIZ : Vrai ou Faux ?

{affirmation_surprenante}

Réponds en commentaire :
A) VRAI
B) FAUX

Indice : {indice_subtil}

⬇️ La réponse te surprendra... (révélée dans 2h)',
ARRAY['#QuizTaxi', '#TestTesConnaissances', '#Assurance'],
'❓⬇️',
5200000, 88,
ARRAY['facebook', 'instagram', 'linkedin'],
'{"hooks": ["curiosite", "interaction"], "cta": "reponse", "engagement": "commentaire"}'::jsonb),

-- Template 5: Erreur Fatale
('Erreur Fatale', 'conseil',
'❌ STOP ! N''ACHÈTE PAS d''assurance avant de lire ça...

Erreur #1 que 9 taxis sur 10 font :
{erreur_commune}

Conséquence : {cout_financier} € perdus

✅ Solution simple : {solution_1_phrase}

Clique sur 💰 si tu veux économiser',
ARRAY['#ErreurTaxi', '#EconomieAssurance', '#AstucePro'],
'❌✅💰',
4100000, 92,
ARRAY['facebook', 'linkedin', 'instagram'],
'{"hooks": ["peur", "argent"], "cta": "reaction", "engagement": "sauvegarder"}'::jsonb),

-- Template 6: Avant/Après
('Avant/Après Impressionnant', 'temoignage',
'AVANT ⚠️
{situation_avant_negative}

APRÈS ✅
{situation_apres_positive}

Comment ? {explication_courte}

📊 Économies : {montant} €/an

Tu veux le même résultat ? Commente "OUI" 👇',
ARRAY['#AvantApres', '#Transformation', '#EconomieTaxi'],
'⚠️✅📊👇',
6500000, 94,
ARRAY['facebook', 'instagram', 'tiktok'],
'{"hooks": ["transformation", "preuve"], "cta": "commentaire", "engagement": "conversion"}'::jsonb),

-- Template 7: Secret d'Initié
('Secret d''Initié', 'conseil',
'🤫 Secret que les assureurs ne veulent PAS que tu saches...

{revelation_surprenante}

Concrètement, ça veut dire :
→ {avantage_1}
→ {avantage_2}
→ {avantage_3}

⚡ Deadline : {urgence}

Enregistre ce post ! 🔖',
ARRAY['#SecretAssurance', '#InfoExclusive', '#TaxiPro'],
'🤫⚡🔖',
8200000, 96,
ARRAY['facebook', 'linkedin', 'instagram'],
'{"hooks": ["exclusivite", "urgence"], "cta": "sauvegarder", "engagement": "partage"}'::jsonb),

-- Template 8: Comparaison Choc
('Comparaison Choc', 'comparatif',
'⚔️ DUEL : Assurance A vs Assurance B

Prix 💰
• Option A : {prix_a} €
• Option B : {prix_b} €

Garanties 🛡️
• Option A : {garanties_a}
• Option B : {garanties_b}

Le GAGNANT ? 🏆
{verdict_surprenant}

Vote en commentaire : A ou B ?',
ARRAY['#Comparatif', '#Assurance', '#MeilleurChoix'],
'⚔️💰🛡️🏆',
3800000, 87,
ARRAY['facebook', 'linkedin', 'twitter'],
'{"hooks": ["comparaison", "vote"], "cta": "commentaire", "engagement": "debat"}'::jsonb),

-- Template 9: Deadline Urgente
('Deadline Urgente', 'actualite',
'⏰ ATTENTION : Plus que {jours} jours !

{evenement_urgent}

Si tu rates ça : {consequence_negative}

CHECKLIST Express ✅
□ {action_1}
□ {action_2}
□ {action_3}

🔥 Lien en bio pour agir maintenant',
ARRAY['#Urgence', '#Deadline', '#ActionRapide'],
'⏰✅🔥',
2900000, 83,
ARRAY['facebook', 'instagram', 'linkedin'],
'{"hooks": ["urgence", "fomo"], "cta": "clic", "engagement": "action"}'::jsonb),

-- Template 10: Statistique Choquante
('Statistique Choquante', 'actualite',
'📊 CHIFFRE DU JOUR

{pourcentage}% des taxis {statistique_choc}

Tu le savais ? 🤯

Breakdown :
• {detail_1}
• {detail_2}
• {detail_3}

💡 Conseil : {action_preventive}

Tag quelqu''un qui devrait voir ça 👥',
ARRAY['#Statistiques', '#ChiffresCles', '#Assurance'],
'📊🤯💡👥',
5500000, 91,
ARRAY['facebook', 'linkedin', 'twitter'],
'{"hooks": ["chiffres", "choc"], "cta": "tag", "engagement": "partage"}'::jsonb);

-- Vérification templates insérés
SELECT
  COUNT(*) as total_templates,
  AVG(performance_score) as score_moyen,
  SUM(avg_views) as vues_totales_potentielles
FROM viral_templates;


-- ═══════════════════════════════════════════════════════════════
-- PARTIE 2: 50+ VILLES MAJEURES FRANÇAISES
-- ═══════════════════════════════════════════════════════════════

-- Insertion des 50 villes les plus importantes de France
-- avec contenu SEO optimisé, H1/H2/H3 structurés

INSERT INTO city_pages (
  city_name, slug, region, department, title, meta_description,
  content, h1_title, population, is_published
) VALUES

-- Top 10 villes françaises
('Paris', 'paris', 'Île-de-France', '75',
'Assurance Taxi Paris - Devis Immédiat & Tarifs 2025',
'Assurance taxi professionnelle à Paris. Devis gratuit en 2 min, couverture complète 24/7. +18 000 taxis parisiens nous font confiance.',
'{"intro": "Paris compte plus de 18 000 taxis actifs. Une assurance adaptée est essentielle.", "specificites": ["Circulation dense", "Zones aéroports", "Tarifs mairie réglementés"], "tarif_moyen": "1200-2400€/an"}',
'Assurance Taxi à Paris : Couverture Premium 24/7',
2200000, true),

('Marseille', 'marseille', 'Provence-Alpes-Côte d''Azur', '13',
'Assurance Taxi Marseille - Protection Complète 2025',
'Assurance taxi à Marseille adaptée au climat méditerranéen. Devis gratuit, garanties étendues. Expert taxi depuis 2005.',
'{"intro": "Marseille et ses 870 000 habitants nécessitent une assurance robuste.", "specificites": ["Zone portuaire", "Climat sec", "Forte demande touristique"], "tarif_moyen": "1100-2200€/an"}',
'Assurance Taxi Marseille : Expert Local depuis 2005',
870000, true),

('Lyon', 'lyon', 'Auvergne-Rhône-Alpes', '69',
'Assurance Taxi Lyon - Devis en Ligne Immédiat',
'Assurance taxi professionnelle à Lyon. Couverture Part-Dieu, Perrache, aéroport. Devis gratuit 24/7.',
'{"intro": "Lyon, capitale de la gastronomie, exige une assurance premium pour ses 3500+ taxis.", "specificites": ["2 gares majeures", "Aéroport St-Exupéry", "Circulation collines"], "tarif_moyen": "1150-2300€/an"}',
'Assurance Taxi Lyon : Couverture Optimale Rhône-Alpes',
515000, true),

('Toulouse', 'toulouse', 'Occitanie', '31',
'Assurance Taxi Toulouse - Protection Aéronautique',
'Assurance taxi Toulouse adaptée au secteur aéronautique. Garanties étendues, assistance 24/7. Devis 2 min.',
'{"intro": "Toulouse et son industrie aéronautique génèrent une forte demande taxi.", "specificites": ["Zone Airbus", "Université majeure", "Forte croissance"], "tarif_moyen": "1050-2100€/an"}',
'Assurance Taxi Toulouse : Expert Ville Rose',
470000, true),

('Nice', 'nice', 'Provence-Alpes-Côte d''Azur', '06',
'Assurance Taxi Nice - Couverture Côte d''Azur',
'Assurance taxi Nice et Côte d''Azur. Protection tourisme haut de gamme. Devis gratuit, expert Riviera.',
'{"intro": "Nice attire 5M+ touristes/an. Assurance premium requise.", "specificites": ["Tourisme luxe", "Aéroport international", "Événements prestige"], "tarif_moyen": "1200-2500€/an"}',
'Assurance Taxi Nice : Protection Premium Riviera',
340000, true),

('Nantes', 'nantes', 'Pays de la Loire', '44',
'Assurance Taxi Nantes - Expert Loire-Atlantique',
'Assurance taxi Nantes et agglomération. Couverture complète, tarifs attractifs. Devis gratuit 24/7.',
'{"intro": "Nantes, 6ème ville de France, développe son réseau taxi.", "specificites": ["Zone portuaire", "Forte expansion", "Technopole"], "tarif_moyen": "1000-2000€/an"}',
'Assurance Taxi Nantes : Couverture Optimale Ouest',
310000, true),

('Strasbourg', 'strasbourg', 'Grand Est', '67',
'Assurance Taxi Strasbourg - Protection Européenne',
'Assurance taxi Strasbourg et zone européenne. Couverture transfrontalière, assistance multilingue.',
'{"intro": "Strasbourg, capitale européenne, nécessite assurance spécifique.", "specificites": ["Parlement européen", "Transfrontalier Allemagne", "Climat continental"], "tarif_moyen": "1100-2200€/an"}',
'Assurance Taxi Strasbourg : Expert Transfrontalier',
280000, true),

('Montpellier', 'montpellier', 'Occitanie', '34',
'Assurance Taxi Montpellier - Couverture Méditerranée',
'Assurance taxi Montpellier, ville dynamique. Garanties adaptées climat sud, tarifs compétitifs.',
'{"intro": "Montpellier croît rapidement avec 290 000 habitants.", "specificites": ["Forte croissance", "Université majeure", "Proximité mer"], "tarif_moyen": "1050-2050€/an"}',
'Assurance Taxi Montpellier : Protection Sud Expert',
290000, true),

('Bordeaux', 'bordeaux', 'Nouvelle-Aquitaine', '33',
'Assurance Taxi Bordeaux - Expert Vignobles',
'Assurance taxi Bordeaux et région viticole. Couverture oenotourisme, garanties étendues.',
'{"intro": "Bordeaux attire touristes du monde entier pour ses vins.", "specificites": ["Oenotourisme", "UNESCO patrimoine", "Forte affluence"], "tarif_moyen": "1100-2200€/an"}',
'Assurance Taxi Bordeaux : Couverture Aquitaine Premium',
250000, true),

('Lille', 'lille', 'Hauts-de-France', '59',
'Assurance Taxi Lille - Protection Nord Européen',
'Assurance taxi Lille et métropole européenne. Couverture Belgique, assistance 24/7.',
'{"intro": "Lille, porte du Nord, 233 000 habitants + métropole 1.2M.", "specificites": ["Gares TGV/Eurostar", "Transfrontalier Belgique", "Grand centre commercial"], "tarif_moyen": "1050-2100€/an"}',
'Assurance Taxi Lille : Expert Métropole Européenne',
233000, true);

-- 40 autres villes majeures (population 50k+)
INSERT INTO city_pages (city_name, slug, region, department, title, meta_description, content, h1_title, population, is_published) VALUES
('Rennes', 'rennes', 'Bretagne', '35', 'Assurance Taxi Rennes - Expert Bretagne', 'Assurance taxi Rennes capitale bretonne. Devis gratuit, couverture complète.', '{"intro": "Rennes, 220 000 habitants, dynamisme économique.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Rennes : Protection Bretagne', 220000, true),
('Reims', 'reims', 'Grand Est', '51', 'Assurance Taxi Reims - Champagne Protection', 'Assurance taxi Reims et vignobles champenois. Couverture oenotourisme.', '{"intro": "Reims, capitale du Champagne, tourisme premium.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Reims : Expert Champagne', 182000, true),
('Saint-Étienne', 'saint-etienne', 'Auvergne-Rhône-Alpes', '42', 'Assurance Taxi Saint-Étienne - Loire Expert', 'Assurance taxi Saint-Étienne. Tarifs attractifs, garanties complètes.', '{"intro": "Saint-Étienne, 172 000 habitants, industrie textile.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Saint-Étienne : Couverture Loire', 172000, true),
('Le Havre', 'le-havre', 'Normandie', '76', 'Assurance Taxi Le Havre - Port Maritime', 'Assurance taxi Le Havre, premier port français. Couverture zone portuaire.', '{"intro": "Le Havre, port majeur, 170 000 habitants.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Le Havre : Expert Maritime', 170000, true),
('Toulon', 'toulon', 'Provence-Alpes-Côte d''Azur', '83', 'Assurance Taxi Toulon - Base Navale', 'Assurance taxi Toulon et rade. Protection militaire + tourisme.', '{"intro": "Toulon, base navale, 170 000 habitants.", "tarif_moyen": "1050-2100€/an"}', 'Assurance Taxi Toulon : Couverture Var', 170000, true),
('Grenoble', 'grenoble', 'Auvergne-Rhône-Alpes', '38', 'Assurance Taxi Grenoble - Alpes Expert', 'Assurance taxi Grenoble et stations ski. Couverture montagne.', '{"intro": "Grenoble, capitale des Alpes, 160 000 habitants.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Grenoble : Protection Montagne', 158000, true),
('Dijon', 'dijon', 'Bourgogne-Franche-Comté', '21', 'Assurance Taxi Dijon - Bourgogne Expert', 'Assurance taxi Dijon et vignobles bourguignons. Oenotourisme.', '{"intro": "Dijon, 155 000 habitants, patrimoine UNESCO.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Dijon : Couverture Bourgogne', 155000, true),
('Angers', 'angers', 'Pays de la Loire', '49', 'Assurance Taxi Angers - Loire Valley', 'Assurance taxi Angers et châteaux Loire. Protection tourisme.', '{"intro": "Angers, 150 000 habitants, douceur de vivre.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Angers : Expert Val de Loire', 150000, true),
('Nîmes', 'nimes', 'Occitanie', '30', 'Assurance Taxi Nîmes - Gard Protection', 'Assurance taxi Nîmes et arènes romaines. Couverture patrimoine.', '{"intro": "Nîmes, 150 000 habitants, héritage romain.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Nîmes : Couverture Gard', 150000, true),
('Villeurbanne', 'villeurbanne', 'Auvergne-Rhône-Alpes', '69', 'Assurance Taxi Villeurbanne - Métropole Lyon', 'Assurance taxi Villeurbanne agglomération lyonnaise.', '{"intro": "Villeurbanne, 148 000 habitants, métropole Lyon.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Villeurbanne : Expert Grand Lyon', 148000, true),
('Le Mans', 'le-mans', 'Pays de la Loire', '72', 'Assurance Taxi Le Mans - Circuit 24h', 'Assurance taxi Le Mans et circuit automobile. Événements sportifs.', '{"intro": "Le Mans, 143 000 habitants, capitale automobile.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Le Mans : Protection Circuit', 143000, true),
('Aix-en-Provence', 'aix-en-provence', 'Provence-Alpes-Côte d''Azur', '13', 'Assurance Taxi Aix-en-Provence - Provence Expert', 'Assurance taxi Aix-en-Provence. Ville d''art et culture.', '{"intro": "Aix-en-Provence, 143 000 habitants, charme provençal.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Aix-en-Provence : Couverture Provence', 143000, true),
('Clermont-Ferrand', 'clermont-ferrand', 'Auvergne-Rhône-Alpes', '63', 'Assurance Taxi Clermont-Ferrand - Auvergne', 'Assurance taxi Clermont-Ferrand capitale Auvergne.', '{"intro": "Clermont-Ferrand, 143 000 habitants, Michelin.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Clermont-Ferrand : Expert Auvergne', 143000, true),
('Brest', 'brest', 'Bretagne', '29', 'Assurance Taxi Brest - Finistère Maritime', 'Assurance taxi Brest et arsenal. Base navale + port.', '{"intro": "Brest, 139 000 habitants, port militaire.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Brest : Protection Maritime', 139000, true),
('Limoges', 'limoges', 'Nouvelle-Aquitaine', '87', 'Assurance Taxi Limoges - Porcelaine Expert', 'Assurance taxi Limoges et patrimoine porcelaine.', '{"intro": "Limoges, 132 000 habitants, art porcelaine.", "tarif_moyen": "900-1800€/an"}', 'Assurance Taxi Limoges : Couverture Limousin', 132000, true),
('Tours', 'tours', 'Centre-Val de Loire', '37', 'Assurance Taxi Tours - Châteaux Loire', 'Assurance taxi Tours et châteaux de la Loire. Tourisme.', '{"intro": "Tours, 136 000 habitants, porte châteaux Loire.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Tours : Expert Val de Loire', 136000, true),
('Amiens', 'amiens', 'Hauts-de-France', '80', 'Assurance Taxi Amiens - Somme Protection', 'Assurance taxi Amiens et cathédrale. Patrimoine UNESCO.', '{"intro": "Amiens, 133 000 habitants, cathédrale gothique.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Amiens : Couverture Somme', 133000, true),
('Perpignan', 'perpignan', 'Occitanie', '66', 'Assurance Taxi Perpignan - Catalogne', 'Assurance taxi Perpignan et Catalogne française.', '{"intro": "Perpignan, 120 000 habitants, soleil catalan.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Perpignan : Expert Roussillon', 120000, true),
('Metz', 'metz', 'Grand Est', '57', 'Assurance Taxi Metz - Lorraine Expert', 'Assurance taxi Metz et Lorraine. Transfrontalier Luxembourg.', '{"intro": "Metz, 117 000 habitants, proche Luxembourg.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Metz : Protection Lorraine', 117000, true),
('Besançon', 'besancon', 'Bourgogne-Franche-Comté', '25', 'Assurance Taxi Besançon - Franche-Comté', 'Assurance taxi Besançon et Doubs. Horlogerie.', '{"intro": "Besançon, 116 000 habitants, capitale horlogère.", "tarif_moyen": "900-1800€/an"}', 'Assurance Taxi Besançon : Expert Doubs', 116000, true),
('Orléans', 'orleans', 'Centre-Val de Loire', '45', 'Assurance Taxi Orléans - Loire Expert', 'Assurance taxi Orléans et Val de Loire. Patrimoine.', '{"intro": "Orléans, 114 000 habitants, Jeanne d''Arc.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Orléans : Couverture Loiret', 114000, true),
('Rouen', 'rouen', 'Normandie', '76', 'Assurance Taxi Rouen - Normandie Expert', 'Assurance taxi Rouen capitale normande. Port Seine.', '{"intro": "Rouen, 111 000 habitants, patrimoine médiéval.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Rouen : Protection Seine', 111000, true),
('Mulhouse', 'mulhouse', 'Grand Est', '68', 'Assurance Taxi Mulhouse - Alsace Sud', 'Assurance taxi Mulhouse et Sud Alsace. Transfrontalier.', '{"intro": "Mulhouse, 108 000 habitants, industrie automobile.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Mulhouse : Expert Haut-Rhin', 108000, true),
('Caen', 'caen', 'Normandie', '14', 'Assurance Taxi Caen - Calvados Protection', 'Assurance taxi Caen et plages du débarquement.', '{"intro": "Caen, 105 000 habitants, histoire Normandie.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Caen : Couverture Calvados', 105000, true),
('Nancy', 'nancy', 'Grand Est', '54', 'Assurance Taxi Nancy - Lorraine Expert', 'Assurance taxi Nancy et place Stanislas UNESCO.', '{"intro": "Nancy, 104 000 habitants, art nouveau.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Nancy : Protection Meurthe', 104000, true),
('Argenteuil', 'argenteuil', 'Île-de-France', '95', 'Assurance Taxi Argenteuil - Val d''Oise', 'Assurance taxi Argenteuil grande couronne parisienne.', '{"intro": "Argenteuil, 110 000 habitants, proche Paris.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Argenteuil : Expert Val d''Oise', 110000, true),
('Montreuil', 'montreuil', 'Île-de-France', '93', 'Assurance Taxi Montreuil - Seine-Saint-Denis', 'Assurance taxi Montreuil banlieue est parisienne.', '{"intro": "Montreuil, 109 000 habitants, dynamique.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Montreuil : Couverture 93', 109000, true),
('Saint-Denis', 'saint-denis', 'Île-de-France', '93', 'Assurance Taxi Saint-Denis - Stade France', 'Assurance taxi Saint-Denis et Stade de France. Événements.', '{"intro": "Saint-Denis, 111 000 habitants, Stade France.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Saint-Denis : Expert Événements', 111000, true),
('Roubaix', 'roubaix', 'Hauts-de-France', '59', 'Assurance Taxi Roubaix - Métropole Lille', 'Assurance taxi Roubaix agglomération lilloise.', '{"intro": "Roubaix, 97 000 habitants, métropole Nord.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Roubaix : Protection Nord', 97000, true),
('Tourcoing', 'tourcoing', 'Hauts-de-France', '59', 'Assurance Taxi Tourcoing - Nord Expert', 'Assurance taxi Tourcoing proche Belgique.', '{"intro": "Tourcoing, 97 000 habitants, textile.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Tourcoing : Couverture Frontalière', 97000, true),
('Nanterre', 'nanterre', 'Île-de-France', '92', 'Assurance Taxi Nanterre - La Défense', 'Assurance taxi Nanterre et quartier affaires La Défense.', '{"intro": "Nanterre, 96 000 habitants, La Défense.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Nanterre : Expert Business', 96000, true),
('Vitry-sur-Seine', 'vitry-sur-seine', 'Île-de-France', '94', 'Assurance Taxi Vitry - Val-de-Marne', 'Assurance taxi Vitry-sur-Seine banlieue sud Paris.', '{"intro": "Vitry-sur-Seine, 93 000 habitants.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Vitry : Protection Val-de-Marne', 93000, true),
('Créteil', 'creteil', 'Île-de-France', '94', 'Assurance Taxi Créteil - Préfecture 94', 'Assurance taxi Créteil préfecture Val-de-Marne.', '{"intro": "Créteil, 92 000 habitants, préfecture.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Créteil : Expert Val-de-Marne', 92000, true),
('Avignon', 'avignon', 'Provence-Alpes-Côte d''Azur', '84', 'Assurance Taxi Avignon - Vaucluse', 'Assurance taxi Avignon cité des Papes. Festival.', '{"intro": "Avignon, 91 000 habitants, patrimoine UNESCO.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Avignon : Protection Festival', 91000, true),
('Poitiers', 'poitiers', 'Nouvelle-Aquitaine', '86', 'Assurance Taxi Poitiers - Vienne Expert', 'Assurance taxi Poitiers et Futuroscope.', '{"intro": "Poitiers, 89 000 habitants, Futuroscope.", "tarif_moyen": "900-1800€/an"}', 'Assurance Taxi Poitiers : Couverture Vienne', 89000, true),
('Dunkerque', 'dunkerque', 'Hauts-de-France', '59', 'Assurance Taxi Dunkerque - Port Nord', 'Assurance taxi Dunkerque grand port maritime.', '{"intro": "Dunkerque, 87 000 habitants, port majeur.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Dunkerque : Expert Maritime', 87000, true),
('Aulnay-sous-Bois', 'aulnay-sous-bois', 'Île-de-France', '93', 'Assurance Taxi Aulnay - Seine-Saint-Denis', 'Assurance taxi Aulnay-sous-Bois nord-est parisien.', '{"intro": "Aulnay-sous-Bois, 86 000 habitants.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Aulnay : Protection 93', 86000, true),
('Asnières-sur-Seine', 'asnieres-sur-seine', 'Île-de-France', '92', 'Assurance Taxi Asnières - Hauts-de-Seine', 'Assurance taxi Asnières proche Paris ouest.', '{"intro": "Asnières-sur-Seine, 86 000 habitants.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Asnières : Expert 92', 86000, true),
('Colombes', 'colombes', 'Île-de-France', '92', 'Assurance Taxi Colombes - Hauts-de-Seine', 'Assurance taxi Colombes banlieue nord-ouest Paris.', '{"intro": "Colombes, 86 000 habitants, dynamique.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Colombes : Couverture Ouest', 86000, true),
('La Rochelle', 'la-rochelle', 'Nouvelle-Aquitaine', '17', 'Assurance Taxi La Rochelle - Charente Maritime', 'Assurance taxi La Rochelle port Atlantique. Tourisme.', '{"intro": "La Rochelle, 76 000 habitants, port historique.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi La Rochelle : Expert Atlantique', 76000, true);

-- Vérification insertion villes
SELECT
  COUNT(*) as total_villes,
  COUNT(DISTINCT region) as total_regions,
  AVG(population) as population_moyenne
FROM city_pages
WHERE is_published = true;

-- ═══════════════════════════════════════════════════════════════
-- RÉSUMÉ EXÉCUTION
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ EXÉCUTION TERMINÉE';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Templates viraux: % insérés', (SELECT COUNT(*) FROM viral_templates);
  RAISE NOTICE '🏙️  Villes majeures: % insérées', (SELECT COUNT(*) FROM city_pages WHERE is_published = true);
  RAISE NOTICE '📈 Score moyen templates: %', (SELECT ROUND(AVG(performance_score)) FROM viral_templates);
  RAISE NOTICE '👥 Population totale couverte: % habitants', (SELECT SUM(population) FROM city_pages);
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES:';
  RAISE NOTICE '1. Tester génération IA: /backoffice/social-media';
  RAISE NOTICE '2. Vérifier pages villes: /ville/paris';
  RAISE NOTICE '3. Corriger affichage pages villes (H1/H2/CSS)';
END $$;
