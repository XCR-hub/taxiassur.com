/*
  ════════════════════════════════════════════════════════════════
  DIAGNOSTIC + FIX STRUCTURE CITY_PAGES
  Vérifier colonnes existantes puis peupler données
  ════════════════════════════════════════════════════════════════
*/

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 1: DIAGNOSTIC - Voir structure actuelle
-- ═══════════════════════════════════════════════════════════════

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'city_pages'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 2: AJOUTER COLONNES MANQUANTES SI NÉCESSAIRE
-- ═══════════════════════════════════════════════════════════════

-- Ajouter h1_title si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'h1_title'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN h1_title TEXT;
    RAISE NOTICE '✅ Colonne h1_title ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne h1_title existe déjà';
  END IF;
END $$;

-- Ajouter population si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'population'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN population INTEGER;
    RAISE NOTICE '✅ Colonne population ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne population existe déjà';
  END IF;
END $$;

-- Ajouter city_name si manquant (alias pour city)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'city_name'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN city_name TEXT;
    RAISE NOTICE '✅ Colonne city_name ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne city_name existe déjà';
  END IF;
END $$;

-- Ajouter region si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'region'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN region TEXT;
    RAISE NOTICE '✅ Colonne region ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne region existe déjà';
  END IF;
END $$;

-- Ajouter department si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'department'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN department TEXT;
    RAISE NOTICE '✅ Colonne department ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne department existe déjà';
  END IF;
END $$;

-- Ajouter is_published si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN is_published BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Colonne is_published ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne is_published existe déjà';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 3: PEUPLER TEMPLATES VIRAUX
-- ═══════════════════════════════════════════════════════════════

-- Supprimer templates existants pour éviter doublons
DELETE FROM viral_templates WHERE TRUE;

-- Insertion 10 templates viraux
INSERT INTO viral_templates (
  name, category, template_text, hashtags, emoji_pattern,
  avg_views, performance_score, platforms, engagement_tactics
) VALUES

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

-- Vérification
SELECT COUNT(*) as "Templates insérés" FROM viral_templates;

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 4: PEUPLER 50+ VILLES MAJEURES
-- ═══════════════════════════════════════════════════════════════

-- Note: On utilise les colonnes qui existent déjà (city, slug, title, etc.)
-- et on remplit city_name, region, department, h1_title, population

-- Supprimer anciennes villes pour éviter doublons
DELETE FROM city_pages WHERE slug IN (
  'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'strasbourg',
  'montpellier', 'bordeaux', 'lille', 'rennes', 'reims', 'saint-etienne',
  'le-havre', 'toulon', 'grenoble', 'dijon', 'angers', 'nimes', 'villeurbanne',
  'le-mans', 'aix-en-provence', 'clermont-ferrand', 'brest', 'limoges', 'tours',
  'amiens', 'perpignan', 'metz', 'besancon', 'orleans', 'rouen', 'mulhouse',
  'caen', 'nancy', 'argenteuil', 'montreuil', 'saint-denis', 'roubaix',
  'tourcoing', 'nanterre', 'vitry-sur-seine', 'creteil', 'avignon', 'poitiers',
  'dunkerque', 'aulnay-sous-bois', 'asnieres-sur-seine', 'colombes', 'la-rochelle'
);

-- Insertion Top 10 villes
INSERT INTO city_pages (
  city, slug, city_name, region, department, title, meta_description,
  content, h1_title, population, is_published, status
) VALUES

('Paris', 'paris', 'Paris', 'Île-de-France', '75',
'Assurance Taxi Paris - Devis Immédiat & Tarifs 2025',
'Assurance taxi professionnelle à Paris. Devis gratuit en 2 min, couverture complète 24/7. +18 000 taxis parisiens nous font confiance.',
'{"intro": "Paris compte plus de 18 000 taxis actifs. Une assurance adaptée est essentielle.", "specificites": ["Circulation dense", "Zones aéroports", "Tarifs mairie réglementés"], "tarif_moyen": "1200-2400€/an"}',
'Assurance Taxi à Paris : Couverture Premium 24/7',
2200000, true, 'published'),

('Marseille', 'marseille', 'Marseille', 'Provence-Alpes-Côte d''Azur', '13',
'Assurance Taxi Marseille - Protection Complète 2025',
'Assurance taxi à Marseille adaptée au climat méditerranéen. Devis gratuit, garanties étendues.',
'{"intro": "Marseille et ses 870 000 habitants nécessitent une assurance robuste.", "specificites": ["Zone portuaire", "Climat sec", "Forte demande touristique"], "tarif_moyen": "1100-2200€/an"}',
'Assurance Taxi Marseille : Expert Local depuis 2005',
870000, true, 'published'),

('Lyon', 'lyon', 'Lyon', 'Auvergne-Rhône-Alpes', '69',
'Assurance Taxi Lyon - Devis en Ligne Immédiat',
'Assurance taxi professionnelle à Lyon. Couverture Part-Dieu, Perrache, aéroport.',
'{"intro": "Lyon, capitale de la gastronomie, exige une assurance premium.", "specificites": ["2 gares majeures", "Aéroport St-Exupéry", "Circulation collines"], "tarif_moyen": "1150-2300€/an"}',
'Assurance Taxi Lyon : Couverture Optimale Rhône-Alpes',
515000, true, 'published'),

('Toulouse', 'toulouse', 'Toulouse', 'Occitanie', '31',
'Assurance Taxi Toulouse - Protection Aéronautique',
'Assurance taxi Toulouse adaptée au secteur aéronautique. Garanties étendues.',
'{"intro": "Toulouse et son industrie aéronautique génèrent forte demande.", "specificites": ["Zone Airbus", "Université majeure", "Forte croissance"], "tarif_moyen": "1050-2100€/an"}',
'Assurance Taxi Toulouse : Expert Ville Rose',
470000, true, 'published'),

('Nice', 'nice', 'Nice', 'Provence-Alpes-Côte d''Azur', '06',
'Assurance Taxi Nice - Couverture Côte d''Azur',
'Assurance taxi Nice et Côte d''Azur. Protection tourisme haut de gamme.',
'{"intro": "Nice attire 5M+ touristes/an. Assurance premium requise.", "specificites": ["Tourisme luxe", "Aéroport international", "Événements prestige"], "tarif_moyen": "1200-2500€/an"}',
'Assurance Taxi Nice : Protection Premium Riviera',
340000, true, 'published'),

('Nantes', 'nantes', 'Nantes', 'Pays de la Loire', '44',
'Assurance Taxi Nantes - Expert Loire-Atlantique',
'Assurance taxi Nantes et agglomération. Couverture complète.',
'{"intro": "Nantes, 6ème ville de France, développe son réseau taxi.", "specificites": ["Zone portuaire", "Forte expansion", "Technopole"], "tarif_moyen": "1000-2000€/an"}',
'Assurance Taxi Nantes : Couverture Optimale Ouest',
310000, true, 'published'),

('Strasbourg', 'strasbourg', 'Strasbourg', 'Grand Est', '67',
'Assurance Taxi Strasbourg - Protection Européenne',
'Assurance taxi Strasbourg et zone européenne. Couverture transfrontalière.',
'{"intro": "Strasbourg, capitale européenne, assurance spécifique.", "specificites": ["Parlement européen", "Transfrontalier Allemagne", "Climat continental"], "tarif_moyen": "1100-2200€/an"}',
'Assurance Taxi Strasbourg : Expert Transfrontalier',
280000, true, 'published'),

('Montpellier', 'montpellier', 'Montpellier', 'Occitanie', '34',
'Assurance Taxi Montpellier - Couverture Méditerranée',
'Assurance taxi Montpellier, ville dynamique. Garanties adaptées.',
'{"intro": "Montpellier croît rapidement avec 290 000 habitants.", "specificites": ["Forte croissance", "Université majeure", "Proximité mer"], "tarif_moyen": "1050-2050€/an"}',
'Assurance Taxi Montpellier : Protection Sud Expert',
290000, true, 'published'),

('Bordeaux', 'bordeaux', 'Bordeaux', 'Nouvelle-Aquitaine', '33',
'Assurance Taxi Bordeaux - Expert Vignobles',
'Assurance taxi Bordeaux et région viticole. Couverture oenotourisme.',
'{"intro": "Bordeaux attire touristes du monde pour ses vins.", "specificites": ["Oenotourisme", "UNESCO patrimoine", "Forte affluence"], "tarif_moyen": "1100-2200€/an"}',
'Assurance Taxi Bordeaux : Couverture Aquitaine Premium',
250000, true, 'published'),

('Lille', 'lille', 'Lille', 'Hauts-de-France', '59',
'Assurance Taxi Lille - Protection Nord Européen',
'Assurance taxi Lille et métropole européenne. Couverture Belgique.',
'{"intro": "Lille, porte du Nord, métropole 1.2M habitants.", "specificites": ["Gares TGV/Eurostar", "Transfrontalier Belgique", "Grand centre"], "tarif_moyen": "1050-2100€/an"}',
'Assurance Taxi Lille : Expert Métropole Européenne',
233000, true, 'published');

-- 40 autres villes (format compact)
INSERT INTO city_pages (city, slug, city_name, region, department, title, meta_description, content, h1_title, population, is_published, status) VALUES
('Rennes', 'rennes', 'Rennes', 'Bretagne', '35', 'Assurance Taxi Rennes - Expert Bretagne', 'Assurance taxi Rennes capitale bretonne.', '{"intro": "Rennes, 220k hab, dynamisme.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Rennes', 220000, true, 'published'),
('Reims', 'reims', 'Reims', 'Grand Est', '51', 'Assurance Taxi Reims - Champagne', 'Assurance taxi Reims vignobles.', '{"intro": "Reims, capitale Champagne.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Reims', 182000, true, 'published'),
('Saint-Étienne', 'saint-etienne', 'Saint-Étienne', 'Auvergne-Rhône-Alpes', '42', 'Assurance Taxi Saint-Étienne', 'Assurance taxi Saint-Étienne Loire.', '{"intro": "Saint-Étienne, 172k hab.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Saint-Étienne', 172000, true, 'published'),
('Le Havre', 'le-havre', 'Le Havre', 'Normandie', '76', 'Assurance Taxi Le Havre - Port', 'Assurance taxi Le Havre port.', '{"intro": "Le Havre, port majeur.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Le Havre', 170000, true, 'published'),
('Toulon', 'toulon', 'Toulon', 'Provence-Alpes-Côte d''Azur', '83', 'Assurance Taxi Toulon', 'Assurance taxi Toulon rade.', '{"intro": "Toulon, base navale.", "tarif_moyen": "1050-2100€/an"}', 'Assurance Taxi Toulon', 170000, true, 'published'),
('Grenoble', 'grenoble', 'Grenoble', 'Auvergne-Rhône-Alpes', '38', 'Assurance Taxi Grenoble - Alpes', 'Assurance taxi Grenoble montagne.', '{"intro": "Grenoble, capitale Alpes.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Grenoble', 158000, true, 'published'),
('Dijon', 'dijon', 'Dijon', 'Bourgogne-Franche-Comté', '21', 'Assurance Taxi Dijon', 'Assurance taxi Dijon Bourgogne.', '{"intro": "Dijon, 155k hab UNESCO.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Dijon', 155000, true, 'published'),
('Angers', 'angers', 'Angers', 'Pays de la Loire', '49', 'Assurance Taxi Angers', 'Assurance taxi Angers Loire.', '{"intro": "Angers, 150k hab.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Angers', 150000, true, 'published'),
('Nîmes', 'nimes', 'Nîmes', 'Occitanie', '30', 'Assurance Taxi Nîmes', 'Assurance taxi Nîmes Gard.', '{"intro": "Nîmes, 150k hab romain.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Nîmes', 150000, true, 'published'),
('Villeurbanne', 'villeurbanne', 'Villeurbanne', 'Auvergne-Rhône-Alpes', '69', 'Assurance Taxi Villeurbanne', 'Assurance taxi Villeurbanne Lyon.', '{"intro": "Villeurbanne, 148k hab.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Villeurbanne', 148000, true, 'published'),
('Le Mans', 'le-mans', 'Le Mans', 'Pays de la Loire', '72', 'Assurance Taxi Le Mans - Circuit', 'Assurance taxi Le Mans 24h.', '{"intro": "Le Mans, 143k hab auto.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Le Mans', 143000, true, 'published'),
('Aix-en-Provence', 'aix-en-provence', 'Aix-en-Provence', 'Provence-Alpes-Côte d''Azur', '13', 'Assurance Taxi Aix-en-Provence', 'Assurance taxi Aix Provence.', '{"intro": "Aix, 143k hab charme.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Aix', 143000, true, 'published'),
('Clermont-Ferrand', 'clermont-ferrand', 'Clermont-Ferrand', 'Auvergne-Rhône-Alpes', '63', 'Assurance Taxi Clermont-Ferrand', 'Assurance taxi Clermont Auvergne.', '{"intro": "Clermont, 143k hab.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Clermont-Ferrand', 143000, true, 'published'),
('Brest', 'brest', 'Brest', 'Bretagne', '29', 'Assurance Taxi Brest', 'Assurance taxi Brest Finistère.', '{"intro": "Brest, 139k hab port.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Brest', 139000, true, 'published'),
('Limoges', 'limoges', 'Limoges', 'Nouvelle-Aquitaine', '87', 'Assurance Taxi Limoges', 'Assurance taxi Limoges porcelaine.', '{"intro": "Limoges, 132k hab art.", "tarif_moyen": "900-1800€/an"}', 'Assurance Taxi Limoges', 132000, true, 'published'),
('Tours', 'tours', 'Tours', 'Centre-Val de Loire', '37', 'Assurance Taxi Tours', 'Assurance taxi Tours châteaux.', '{"intro": "Tours, 136k hab Loire.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Tours', 136000, true, 'published'),
('Amiens', 'amiens', 'Amiens', 'Hauts-de-France', '80', 'Assurance Taxi Amiens', 'Assurance taxi Amiens Somme.', '{"intro": "Amiens, 133k hab cathédrale.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Amiens', 133000, true, 'published'),
('Perpignan', 'perpignan', 'Perpignan', 'Occitanie', '66', 'Assurance Taxi Perpignan', 'Assurance taxi Perpignan catalan.', '{"intro": "Perpignan, 120k hab soleil.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Perpignan', 120000, true, 'published'),
('Metz', 'metz', 'Metz', 'Grand Est', '57', 'Assurance Taxi Metz', 'Assurance taxi Metz Lorraine.', '{"intro": "Metz, 117k hab Luxembourg.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Metz', 117000, true, 'published'),
('Besançon', 'besancon', 'Besançon', 'Bourgogne-Franche-Comté', '25', 'Assurance Taxi Besançon', 'Assurance taxi Besançon Doubs.', '{"intro": "Besançon, 116k hab horlogerie.", "tarif_moyen": "900-1800€/an"}', 'Assurance Taxi Besançon', 116000, true, 'published'),
('Orléans', 'orleans', 'Orléans', 'Centre-Val de Loire', '45', 'Assurance Taxi Orléans', 'Assurance taxi Orléans Loire.', '{"intro": "Orléans, 114k hab Jeanne.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Orléans', 114000, true, 'published'),
('Rouen', 'rouen', 'Rouen', 'Normandie', '76', 'Assurance Taxi Rouen', 'Assurance taxi Rouen Normandie.', '{"intro": "Rouen, 111k hab médiéval.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Rouen', 111000, true, 'published'),
('Mulhouse', 'mulhouse', 'Mulhouse', 'Grand Est', '68', 'Assurance Taxi Mulhouse', 'Assurance taxi Mulhouse Alsace.', '{"intro": "Mulhouse, 108k hab auto.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Mulhouse', 108000, true, 'published'),
('Caen', 'caen', 'Caen', 'Normandie', '14', 'Assurance Taxi Caen', 'Assurance taxi Caen Calvados.', '{"intro": "Caen, 105k hab histoire.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Caen', 105000, true, 'published'),
('Nancy', 'nancy', 'Nancy', 'Grand Est', '54', 'Assurance Taxi Nancy', 'Assurance taxi Nancy Lorraine.', '{"intro": "Nancy, 104k hab art nouveau.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Nancy', 104000, true, 'published'),
('Argenteuil', 'argenteuil', 'Argenteuil', 'Île-de-France', '95', 'Assurance Taxi Argenteuil', 'Assurance taxi Argenteuil Val d''Oise.', '{"intro": "Argenteuil, 110k hab Paris.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Argenteuil', 110000, true, 'published'),
('Montreuil', 'montreuil', 'Montreuil', 'Île-de-France', '93', 'Assurance Taxi Montreuil', 'Assurance taxi Montreuil 93.', '{"intro": "Montreuil, 109k hab.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Montreuil', 109000, true, 'published'),
('Saint-Denis', 'saint-denis', 'Saint-Denis', 'Île-de-France', '93', 'Assurance Taxi Saint-Denis', 'Assurance taxi Saint-Denis Stade.', '{"intro": "Saint-Denis, 111k hab stade.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Saint-Denis', 111000, true, 'published'),
('Roubaix', 'roubaix', 'Roubaix', 'Hauts-de-France', '59', 'Assurance Taxi Roubaix', 'Assurance taxi Roubaix Lille.', '{"intro": "Roubaix, 97k hab métropole.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Roubaix', 97000, true, 'published'),
('Tourcoing', 'tourcoing', 'Tourcoing', 'Hauts-de-France', '59', 'Assurance Taxi Tourcoing', 'Assurance taxi Tourcoing Nord.', '{"intro": "Tourcoing, 97k hab textile.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Tourcoing', 97000, true, 'published'),
('Nanterre', 'nanterre', 'Nanterre', 'Île-de-France', '92', 'Assurance Taxi Nanterre', 'Assurance taxi Nanterre La Défense.', '{"intro": "Nanterre, 96k hab business.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Nanterre', 96000, true, 'published'),
('Vitry-sur-Seine', 'vitry-sur-seine', 'Vitry-sur-Seine', 'Île-de-France', '94', 'Assurance Taxi Vitry', 'Assurance taxi Vitry Val-de-Marne.', '{"intro": "Vitry, 93k hab.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Vitry', 93000, true, 'published'),
('Créteil', 'creteil', 'Créteil', 'Île-de-France', '94', 'Assurance Taxi Créteil', 'Assurance taxi Créteil préfecture 94.', '{"intro": "Créteil, 92k hab préfecture.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Créteil', 92000, true, 'published'),
('Avignon', 'avignon', 'Avignon', 'Provence-Alpes-Côte d''Azur', '84', 'Assurance Taxi Avignon', 'Assurance taxi Avignon Vaucluse.', '{"intro": "Avignon, 91k hab Papes.", "tarif_moyen": "1000-2000€/an"}', 'Assurance Taxi Avignon', 91000, true, 'published'),
('Poitiers', 'poitiers', 'Poitiers', 'Nouvelle-Aquitaine', '86', 'Assurance Taxi Poitiers', 'Assurance taxi Poitiers Futuroscope.', '{"intro": "Poitiers, 89k hab.", "tarif_moyen": "900-1800€/an"}', 'Assurance Taxi Poitiers', 89000, true, 'published'),
('Dunkerque', 'dunkerque', 'Dunkerque', 'Hauts-de-France', '59', 'Assurance Taxi Dunkerque', 'Assurance taxi Dunkerque port.', '{"intro": "Dunkerque, 87k hab port.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi Dunkerque', 87000, true, 'published'),
('Aulnay-sous-Bois', 'aulnay-sous-bois', 'Aulnay-sous-Bois', 'Île-de-France', '93', 'Assurance Taxi Aulnay', 'Assurance taxi Aulnay 93.', '{"intro": "Aulnay, 86k hab.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Aulnay', 86000, true, 'published'),
('Asnières-sur-Seine', 'asnieres-sur-seine', 'Asnières-sur-Seine', 'Île-de-France', '92', 'Assurance Taxi Asnières', 'Assurance taxi Asnières 92.', '{"intro": "Asnières, 86k hab.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Asnières', 86000, true, 'published'),
('Colombes', 'colombes', 'Colombes', 'Île-de-France', '92', 'Assurance Taxi Colombes', 'Assurance taxi Colombes 92.', '{"intro": "Colombes, 86k hab.", "tarif_moyen": "1100-2200€/an"}', 'Assurance Taxi Colombes', 86000, true, 'published'),
('La Rochelle', 'la-rochelle', 'La Rochelle', 'Nouvelle-Aquitaine', '17', 'Assurance Taxi La Rochelle', 'Assurance taxi La Rochelle port.', '{"intro": "La Rochelle, 76k hab port.", "tarif_moyen": "950-1900€/an"}', 'Assurance Taxi La Rochelle', 76000, true, 'published');

-- ═══════════════════════════════════════════════════════════════
-- RÉSUMÉ FINAL
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  template_count INTEGER;
  city_count INTEGER;
  total_population BIGINT;
BEGIN
  SELECT COUNT(*) INTO template_count FROM viral_templates;
  SELECT COUNT(*), SUM(population) INTO city_count, total_population
  FROM city_pages WHERE is_published = true;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ EXÉCUTION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Templates viraux insérés: %', template_count;
  RAISE NOTICE '🏙️  Villes majeures insérées: %', city_count;
  RAISE NOTICE '👥 Population totale couverte: % habitants', total_population;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'PROCHAINES ÉTAPES:';
  RAISE NOTICE '1. Ouvrir TEST-GENERATION-IA-DIRECT.html';
  RAISE NOTICE '2. Tester génération IA';
  RAISE NOTICE '3. Vérifier /ville/paris';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
