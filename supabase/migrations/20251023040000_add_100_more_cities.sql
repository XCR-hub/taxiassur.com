/*
  # Ajout 100+ Villes Supplémentaires - Phase 2

  ## Objectif
  Compléter la couverture avec 100+ villes moyennes stratégiques
  Atteindre 350+ villes totales

  ## Données
  - Toutes régions françaises
  - Focus: villes 10k-50k habitants
  - Calcul taxi_count: pop/800 ± 15%
*/

INSERT INTO city_pages (city, title, slug, dept, region, population, taxi_count, status, published, created_at) VALUES

-- GRAND EST (+20)
('Schiltigheim', 'Assurance Taxi à Schiltigheim (67)', 'assurance-taxi-schiltigheim', '67', 'Grand Est', 33099, 41, 'published', true, NOW()),
('Illkirch-Graffenstaden', 'Assurance Taxi à Illkirch-Graffenstaden (67)', 'assurance-taxi-illkirch-graffenstaden', '67', 'Grand Est', 27011, 34, 'published', true, NOW()),
('Saint-Louis', 'Assurance Taxi à Saint-Louis (68)', 'assurance-taxi-saint-louis', '68', 'Grand Est', 22380, 28, 'published', true, NOW()),
('Wittenheim', 'Assurance Taxi à Wittenheim (68)', 'assurance-taxi-wittenheim', '68', 'Grand Est', 15193, 19, 'published', true, NOW()),
('Riedisheim', 'Assurance Taxi à Riedisheim (68)', 'assurance-taxi-riedisheim', '68', 'Grand Est', 12355, 15, 'published', true, NOW()),
('Kingersheim', 'Assurance Taxi à Kingersheim (68)', 'assurance-taxi-kingersheim', '68', 'Grand Est', 13093, 16, 'published', true, NOW()),
('Lunéville', 'Assurance Taxi à Lunéville (54)', 'assurance-taxi-luneville', '54', 'Grand Est', 19740, 25, 'published', true, NOW()),
('Vandoeuvre-lès-Nancy', 'Assurance Taxi à Vandoeuvre-lès-Nancy (54)', 'assurance-taxi-vandoeuvre-les-nancy', '54', 'Grand Est', 29206, 36, 'published', true, NOW()),
('Toul', 'Assurance Taxi à Toul (54)', 'assurance-taxi-toul', '54', 'Grand Est', 15977, 20, 'published', true, NOW()),
('Pont-à-Mousson', 'Assurance Taxi à Pont-à-Mousson (54)', 'assurance-taxi-pont-a-mousson', '54', 'Grand Est', 14677, 18, 'published', true, NOW()),
('Forbach', 'Assurance Taxi à Forbach (57)', 'assurance-taxi-forbach', '57', 'Grand Est', 21442, 27, 'published', true, NOW()),
('Sarreguemines', 'Assurance Taxi à Sarreguemines (57)', 'assurance-taxi-sarreguemines', '57', 'Grand Est', 21572, 27, 'published', true, NOW()),
('Saint-Avold', 'Assurance Taxi à Saint-Avold (57)', 'assurance-taxi-saint-avold', '57', 'Grand Est', 16116, 20, 'published', true, NOW()),
('Haguenau', 'Assurance Taxi à Haguenau (67)', 'assurance-taxi-haguenau', '67', 'Grand Est', 35562, 44, 'published', true, NOW()),
('Sélestat', 'Assurance Taxi à Sélestat (67)', 'assurance-taxi-selestat', '67', 'Grand Est', 19242, 24, 'published', true, NOW()),
('Bischheim', 'Assurance Taxi à Bischheim (67)', 'assurance-taxi-bischheim', '67', 'Grand Est', 17397, 22, 'published', true, NOW()),
('Lingolsheim', 'Assurance Taxi à Lingolsheim (67)', 'assurance-taxi-lingolsheim', '67', 'Grand Est', 18690, 23, 'published', true, NOW()),
('Ostwald', 'Assurance Taxi à Ostwald (67)', 'assurance-taxi-ostwald', '67', 'Grand Est', 12531, 16, 'published', true, NOW()),
('Romilly-sur-Seine', 'Assurance Taxi à Romilly-sur-Seine (10)', 'assurance-taxi-romilly-sur-seine', '10', 'Grand Est', 13927, 17, 'published', true, NOW()),
('La Chapelle-Saint-Luc', 'Assurance Taxi à La Chapelle-Saint-Luc (10)', 'assurance-taxi-la-chapelle-saint-luc', '10', 'Grand Est', 12772, 16, 'published', true, NOW()),

-- PAYS DE LA LOIRE (+17)
('Carquefou', 'Assurance Taxi à Carquefou (44)', 'assurance-taxi-carquefou', '44', 'Pays de la Loire', 19949, 25, 'published', true, NOW()),
('Couëron', 'Assurance Taxi à Couëron (44)', 'assurance-taxi-coueron', '44', 'Pays de la Loire', 22029, 28, 'published', true, NOW()),
('Bouguenais', 'Assurance Taxi à Bouguenais (44)', 'assurance-taxi-bouguenais', '44', 'Pays de la Loire', 19965, 25, 'published', true, NOW()),
('La Baule-Escoublac', 'Assurance Taxi à La Baule-Escoublac (44)', 'assurance-taxi-la-baule-escoublac', '44', 'Pays de la Loire', 16513, 21, 'published', true, NOW()),
('Pornic', 'Assurance Taxi à Pornic (44)', 'assurance-taxi-pornic', '44', 'Pays de la Loire', 15085, 19, 'published', true, NOW()),
('Ancenis', 'Assurance Taxi à Ancenis (44)', 'assurance-taxi-ancenis', '44', 'Pays de la Loire', 7789, 10, 'published', true, NOW()),
('Trélazé', 'Assurance Taxi à Trélazé (49)', 'assurance-taxi-trelaze', '49', 'Pays de la Loire', 14602, 18, 'published', true, NOW()),
('Avrillé', 'Assurance Taxi à Avrillé (49)', 'assurance-taxi-avrille', '49', 'Pays de la Loire', 14998, 19, 'published', true, NOW()),
('Les Ponts-de-Cé', 'Assurance Taxi aux Ponts-de-Cé (49)', 'assurance-taxi-les-ponts-de-ce', '49', 'Pays de la Loire', 12716, 16, 'published', true, NOW()),
('Allonnes', 'Assurance Taxi à Allonnes (72)', 'assurance-taxi-allonnes', '72', 'Pays de la Loire', 11036, 14, 'published', true, NOW()),
('Coulaines', 'Assurance Taxi à Coulaines (72)', 'assurance-taxi-coulaines', '72', 'Pays de la Loire', 7909, 10, 'published', true, NOW()),
('Château-Gontier', 'Assurance Taxi à Château-Gontier (53)', 'assurance-taxi-chateau-gontier', '53', 'Pays de la Loire', 11610, 15, 'published', true, NOW()),
('Mayenne', 'Assurance Taxi à Mayenne (53)', 'assurance-taxi-mayenne', '53', 'Pays de la Loire', 13549, 17, 'published', true, NOW()),
('Luçon', 'Assurance Taxi à Luçon (85)', 'assurance-taxi-lucon', '85', 'Pays de la Loire', 9679, 12, 'published', true, NOW()),
('Fontenay-le-Comte', 'Assurance Taxi à Fontenay-le-Comte (85)', 'assurance-taxi-fontenay-le-comte', '85', 'Pays de la Loire', 13861, 17, 'published', true, NOW()),
('Challans', 'Assurance Taxi à Challans (85)', 'assurance-taxi-challans', '85', 'Pays de la Loire', 21558, 27, 'published', true, NOW()),
('Saumur', 'Assurance Taxi à Saumur (49)', 'assurance-taxi-saumur', '49', 'Pays de la Loire', 26950, 33, 'published', true, NOW()),

-- BRETAGNE (+16)
('Lanester', 'Assurance Taxi à Lanester (56)', 'assurance-taxi-lanester', '56', 'Bretagne', 22598, 28, 'published', true, NOW()),
('Ploemeur', 'Assurance Taxi à Ploemeur (56)', 'assurance-taxi-ploemeur', '56', 'Bretagne', 17984, 22, 'published', true, NOW()),
('Hennebont', 'Assurance Taxi à Hennebont (56)', 'assurance-taxi-hennebont', '56', 'Bretagne', 15837, 20, 'published', true, NOW()),
('Auray', 'Assurance Taxi à Auray (56)', 'assurance-taxi-auray', '56', 'Bretagne', 13924, 17, 'published', true, NOW()),
('Loudéac', 'Assurance Taxi à Loudéac (22)', 'assurance-taxi-loudeac', '22', 'Bretagne', 9623, 12, 'published', true, NOW()),
('Dinan', 'Assurance Taxi à Dinan (22)', 'assurance-taxi-dinan', '22', 'Bretagne', 10907, 14, 'published', true, NOW()),
('Guingamp', 'Assurance Taxi à Guingamp (22)', 'assurance-taxi-guingamp', '22', 'Bretagne', 7115, 9, 'published', true, NOW()),
('Plérin', 'Assurance Taxi à Plérin (22)', 'assurance-taxi-plerin', '22', 'Bretagne', 14148, 18, 'published', true, NOW()),
('Landerneau', 'Assurance Taxi à Landerneau (29)', 'assurance-taxi-landerneau', '29', 'Bretagne', 15866, 20, 'published', true, NOW()),
('Guipavas', 'Assurance Taxi à Guipavas (29)', 'assurance-taxi-guipavas', '29', 'Bretagne', 15214, 19, 'published', true, NOW()),
('Douarnenez', 'Assurance Taxi à Douarnenez (29)', 'assurance-taxi-douarnenez', '29', 'Bretagne', 14520, 18, 'published', true, NOW()),
('Plouzané', 'Assurance Taxi à Plouzané (29)', 'assurance-taxi-plouzane', '29', 'Bretagne', 13314, 17, 'published', true, NOW()),
('Vitré', 'Assurance Taxi à Vitré (35)', 'assurance-taxi-vitre', '35', 'Bretagne', 18605, 23, 'published', true, NOW()),
('Cesson-Sévigné', 'Assurance Taxi à Cesson-Sévigné (35)', 'assurance-taxi-cesson-sevigne', '35', 'Bretagne', 17890, 22, 'published', true, NOW()),
('Bruz', 'Assurance Taxi à Bruz (35)', 'assurance-taxi-bruz', '35', 'Bretagne', 18763, 23, 'published', true, NOW()),
('Pacé', 'Assurance Taxi à Pacé (35)', 'assurance-taxi-pace', '35', 'Bretagne', 12137, 15, 'published', true, NOW()),

-- NORMANDIE (+20)
('Sotteville-lès-Rouen', 'Assurance Taxi à Sotteville-lès-Rouen (76)', 'assurance-taxi-sotteville-les-rouen', '76', 'Normandie', 28837, 36, 'published', true, NOW()),
('Saint-Étienne-du-Rouvray', 'Assurance Taxi à Saint-Étienne-du-Rouvray (76)', 'assurance-taxi-saint-etienne-du-rouvray', '76', 'Normandie', 28019, 35, 'published', true, NOW()),
('Mont-Saint-Aignan', 'Assurance Taxi à Mont-Saint-Aignan (76)', 'assurance-taxi-mont-saint-aignan', '76', 'Normandie', 19130, 24, 'published', true, NOW()),
('Barentin', 'Assurance Taxi à Barentin (76)', 'assurance-taxi-barentin', '76', 'Normandie', 12254, 15, 'published', true, NOW()),
('Elbeuf', 'Assurance Taxi à Elbeuf (76)', 'assurance-taxi-elbeuf', '76', 'Normandie', 16676, 21, 'published', true, NOW()),
('Hérouville-Saint-Clair', 'Assurance Taxi à Hérouville-Saint-Clair (14)', 'assurance-taxi-herouville-saint-clair', '14', 'Normandie', 21012, 26, 'published', true, NOW()),
('Ifs', 'Assurance Taxi à Ifs (14)', 'assurance-taxi-ifs', '14', 'Normandie', 11740, 15, 'published', true, NOW()),
('Mondeville', 'Assurance Taxi à Mondeville (14)', 'assurance-taxi-mondeville', '14', 'Normandie', 9239, 12, 'published', true, NOW()),
('Vire', 'Assurance Taxi à Vire (14)', 'assurance-taxi-vire', '14', 'Normandie', 11503, 14, 'published', true, NOW()),
('Vernon', 'Assurance Taxi à Vernon (27)', 'assurance-taxi-vernon', '27', 'Normandie', 23667, 29, 'published', true, NOW()),
('Louviers', 'Assurance Taxi à Louviers (27)', 'assurance-taxi-louviers', '27', 'Normandie', 18014, 23, 'published', true, NOW()),
('Val-de-Reuil', 'Assurance Taxi à Val-de-Reuil (27)', 'assurance-taxi-val-de-reuil', '27', 'Normandie', 13645, 17, 'published', true, NOW()),
('Gisors', 'Assurance Taxi à Gisors (27)', 'assurance-taxi-gisors', '27', 'Normandie', 11643, 15, 'published', true, NOW()),
('Argentan', 'Assurance Taxi à Argentan (61)', 'assurance-taxi-argentan', '61', 'Normandie', 13852, 17, 'published', true, NOW()),
('L''Aigle', 'Assurance Taxi à L''Aigle (61)', 'assurance-taxi-l-aigle', '61', 'Normandie', 7765, 10, 'published', true, NOW()),
('Équeurdreville-Hainneville', 'Assurance Taxi à Équeurdreville-Hainneville (50)', 'assurance-taxi-equeurdreville-hainneville', '50', 'Normandie', 16375, 20, 'published', true, NOW()),
('Tourlaville', 'Assurance Taxi à Tourlaville (50)', 'assurance-taxi-tourlaville', '50', 'Normandie', 16107, 20, 'published', true, NOW()),
('Saint-Lô', 'Assurance Taxi à Saint-Lô (50)', 'assurance-taxi-saint-lo', '50', 'Normandie', 18931, 24, 'published', true, NOW()),
('Avranches', 'Assurance Taxi à Avranches (50)', 'assurance-taxi-avranches', '50', 'Normandie', 7988, 10, 'published', true, NOW()),
('Coutances', 'Assurance Taxi à Coutances (50)', 'assurance-taxi-coutances', '50', 'Normandie', 8806, 11, 'published', true, NOW()),

-- BOURGOGNE-FRANCHE-COMTÉ (+15)
('Le Creusot', 'Assurance Taxi au Creusot (71)', 'assurance-taxi-le-creusot', '71', 'Bourgogne-Franche-Comté', 21083, 26, 'published', true, NOW()),
('Montceau-les-Mines', 'Assurance Taxi à Montceau-les-Mines (71)', 'assurance-taxi-montceau-les-mines', '71', 'Bourgogne-Franche-Comté', 17991, 22, 'published', true, NOW()),
('Talant', 'Assurance Taxi à Talant (21)', 'assurance-taxi-talant', '21', 'Bourgogne-Franche-Comté', 11389, 14, 'published', true, NOW()),
('Chenôve', 'Assurance Taxi à Chenôve (21)', 'assurance-taxi-chenove', '21', 'Bourgogne-Franche-Comté', 13672, 17, 'published', true, NOW()),
('Chevigny-Saint-Sauveur', 'Assurance Taxi à Chevigny-Saint-Sauveur (21)', 'assurance-taxi-chevigny-saint-sauveur', '21', 'Bourgogne-Franche-Comté', 11105, 14, 'published', true, NOW()),
('Cosne-Cours-sur-Loire', 'Assurance Taxi à Cosne-Cours-sur-Loire (58)', 'assurance-taxi-cosne-cours-sur-loire', '58', 'Bourgogne-Franche-Comté', 10453, 13, 'published', true, NOW()),
('Sens', 'Assurance Taxi à Sens (89)', 'assurance-taxi-sens', '89', 'Bourgogne-Franche-Comté', 25355, 31, 'published', true, NOW()),
('Joigny', 'Assurance Taxi à Joigny (89)', 'assurance-taxi-joigny', '89', 'Bourgogne-Franche-Comté', 9794, 12, 'published', true, NOW()),
('Avallon', 'Assurance Taxi à Avallon (89)', 'assurance-taxi-avallon', '89', 'Bourgogne-Franche-Comté', 6768, 8, 'published', true, NOW()),
('Belfort', 'Assurance Taxi à Belfort (90)', 'assurance-taxi-belfort', '90', 'Bourgogne-Franche-Comté', 46443, 57, 'published', true, NOW()),
('Pontarlier', 'Assurance Taxi à Pontarlier (25)', 'assurance-taxi-pontarlier', '25', 'Bourgogne-Franche-Comté', 17356, 22, 'published', true, NOW()),
('Valentigney', 'Assurance Taxi à Valentigney (25)', 'assurance-taxi-valentigney', '25', 'Bourgogne-Franche-Comté', 11083, 14, 'published', true, NOW()),
('Audincourt', 'Assurance Taxi à Audincourt (25)', 'assurance-taxi-audincourt', '25', 'Bourgogne-Franche-Comté', 13902, 17, 'published', true, NOW()),
('Montbéliard', 'Assurance Taxi à Montbéliard (25)', 'assurance-taxi-montbeliard', '25', 'Bourgogne-Franche-Comté', 25521, 31, 'published', true, NOW()),
('Lons-le-Saunier', 'Assurance Taxi à Lons-le-Saunier (39)', 'assurance-taxi-lons-le-saunier', '39', 'Bourgogne-Franche-Comté', 17122, 21, 'published', true, NOW()),

-- CENTRE-VAL DE LOIRE (+12)
('Olivet', 'Assurance Taxi à Olivet (45)', 'assurance-taxi-olivet', '45', 'Centre-Val de Loire', 21613, 27, 'published', true, NOW()),
('Fleury-les-Aubrais', 'Assurance Taxi à Fleury-les-Aubrais (45)', 'assurance-taxi-fleury-les-aubrais', '45', 'Centre-Val de Loire', 20638, 26, 'published', true, NOW()),
('Saint-Jean-de-Braye', 'Assurance Taxi à Saint-Jean-de-Braye (45)', 'assurance-taxi-saint-jean-de-braye', '45', 'Centre-Val de Loire', 20612, 26, 'published', true, NOW()),
('Saint-Jean-de-la-Ruelle', 'Assurance Taxi à Saint-Jean-de-la-Ruelle (45)', 'assurance-taxi-saint-jean-de-la-ruelle', '45', 'Centre-Val de Loire', 16669, 21, 'published', true, NOW()),
('Saran', 'Assurance Taxi à Saran (45)', 'assurance-taxi-saran', '45', 'Centre-Val de Loire', 16293, 20, 'published', true, NOW()),
('Saint-Cyr-sur-Loire', 'Assurance Taxi à Saint-Cyr-sur-Loire (37)', 'assurance-taxi-saint-cyr-sur-loire', '37', 'Centre-Val de Loire', 16421, 21, 'published', true, NOW()),
('Saint-Pierre-des-Corps', 'Assurance Taxi à Saint-Pierre-des-Corps (37)', 'assurance-taxi-saint-pierre-des-corps', '37', 'Centre-Val de Loire', 15720, 20, 'published', true, NOW()),
('Chambray-lès-Tours', 'Assurance Taxi à Chambray-lès-Tours (37)', 'assurance-taxi-chambray-les-tours', '37', 'Centre-Val de Loire', 11433, 14, 'published', true, NOW()),
('Saint-Avertin', 'Assurance Taxi à Saint-Avertin (37)', 'assurance-taxi-saint-avertin', '37', 'Centre-Val de Loire', 14417, 18, 'published', true, NOW()),
('Lucé', 'Assurance Taxi à Lucé (28)', 'assurance-taxi-luce', '28', 'Centre-Val de Loire', 15382, 19, 'published', true, NOW()),
('Issoudun', 'Assurance Taxi à Issoudun (36)', 'assurance-taxi-issoudun', '36', 'Centre-Val de Loire', 12073, 15, 'published', true, NOW()),
('Vierzon', 'Assurance Taxi à Vierzon (18)', 'assurance-taxi-vierzon', '18', 'Centre-Val de Loire', 25725, 32, 'published', true, NOW())

ON CONFLICT (slug) DO NOTHING;

-- Stats finales
DO $$
DECLARE
  v_total integer;
  v_nouvelles integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM city_pages;
  SELECT COUNT(*) INTO v_nouvelles FROM city_pages WHERE created_at::date = CURRENT_DATE;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Migration 2/2 terminée';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 Total villes en base: %', v_total;
  RAISE NOTICE '🆕 Ajoutées aujourd''hui: %', v_nouvelles;
  RAISE NOTICE '🎯 Objectif 350+: %', CASE WHEN v_total >= 350 THEN '✅ ATTEINT' ELSE '⏳ ' || v_total || '/350' END;
END $$;
