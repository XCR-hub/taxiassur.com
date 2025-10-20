/*
  # Insérer 34 Villes avec Structure Correcte
  
  Structure: city, title, slug, content, meta_description, keywords, status, dept, region, population, taxi_count
*/

INSERT INTO city_pages (city, title, slug, content, meta_description, keywords, status, dept, region, population, taxi_count)
VALUES
  ('Paris', 'Assurance Taxi Paris Expert | TaxiAssur', 'paris', 'Assurance taxi Paris 75. 958 taxis assurés. RC Pro complète.', 'Assurance taxi Paris. 958 taxis. RC Pro 75.', ARRAY['assurance taxi Paris','RC Pro 75'], 'published', '75', 'Île-de-France', 2102650, 958),
  ('Lyon', 'Assurance Taxi Lyon Expert | TaxiAssur', 'lyon', 'Assurance taxi Lyon 69. 624 taxis assurés. RC Pro complète.', 'Assurance taxi Lyon. 624 taxis. RC Pro 69.', ARRAY['assurance taxi Lyon','RC Pro 69'], 'published', '69', 'Auvergne-Rhône-Alpes', 513000, 624),
  ('Marseille', 'Assurance Taxi Marseille Expert | TaxiAssur', 'marseille', 'Assurance taxi Marseille 13. 534 taxis assurés. RC Pro complète.', 'Assurance taxi Marseille. 534 taxis. RC Pro 13.', ARRAY['assurance taxi Marseille','RC Pro 13'], 'published', '13', 'Provence-Alpes-Côte d''Azur', 861000, 534),
  ('Toulouse', 'Assurance Taxi Toulouse Expert | TaxiAssur', 'toulouse', 'Assurance taxi Toulouse 31. 487 taxis assurés. RC Pro complète.', 'Assurance taxi Toulouse. 487 taxis. RC Pro 31.', ARRAY['assurance taxi Toulouse','RC Pro 31'], 'published', '31', 'Occitanie', 471000, 487),
  ('Nice', 'Assurance Taxi Nice Expert | TaxiAssur', 'nice', 'Assurance taxi Nice 06. 412 taxis assurés. RC Pro complète.', 'Assurance taxi Nice. 412 taxis. RC Pro 06.', ARRAY['assurance taxi Nice','RC Pro 06'], 'published', '06', 'Provence-Alpes-Côte d''Azur', 342000, 412),
  ('Nantes', 'Assurance Taxi Nantes Expert | TaxiAssur', 'nantes', 'Assurance taxi Nantes 44. 398 taxis assurés. RC Pro complète.', 'Assurance taxi Nantes. 398 taxis. RC Pro 44.', ARRAY['assurance taxi Nantes','RC Pro 44'], 'published', '44', 'Pays de la Loire', 303000, 398),
  ('Bordeaux', 'Assurance Taxi Bordeaux Expert | TaxiAssur', 'bordeaux', 'Assurance taxi Bordeaux 33. 456 taxis assurés. RC Pro complète.', 'Assurance taxi Bordeaux. 456 taxis. RC Pro 33.', ARRAY['assurance taxi Bordeaux','RC Pro 33'], 'published', '33', 'Nouvelle-Aquitaine', 246000, 456),
  ('Lille', 'Assurance Taxi Lille Expert | TaxiAssur', 'lille', 'Assurance taxi Lille 59. 423 taxis assurés. RC Pro complète.', 'Assurance taxi Lille. 423 taxis. RC Pro 59.', ARRAY['assurance taxi Lille','RC Pro 59'], 'published', '59', 'Hauts-de-France', 232000, 423),
  ('Strasbourg', 'Assurance Taxi Strasbourg Expert | TaxiAssur', 'strasbourg', 'Assurance taxi Strasbourg 67. 367 taxis assurés. RC Pro complète.', 'Assurance taxi Strasbourg. 367 taxis. RC Pro 67.', ARRAY['assurance taxi Strasbourg','RC Pro 67'], 'published', '67', 'Grand Est', 277000, 367),
  ('Montpellier', 'Assurance Taxi Montpellier Expert | TaxiAssur', 'montpellier', 'Assurance taxi Montpellier 34. 356 taxis assurés. RC Pro complète.', 'Assurance taxi Montpellier. 356 taxis. RC Pro 34.', ARRAY['assurance taxi Montpellier','RC Pro 34'], 'published', '34', 'Occitanie', 277000, 356),
  ('Rennes', 'Assurance Taxi Rennes Expert | TaxiAssur', 'rennes', 'Assurance taxi Rennes 35. 298 taxis assurés. RC Pro complète.', 'Assurance taxi Rennes. 298 taxis. RC Pro 35.', ARRAY['assurance taxi Rennes','RC Pro 35'], 'published', '35', 'Bretagne', 216000, 298),
  ('Grenoble', 'Assurance Taxi Grenoble Expert | TaxiAssur', 'grenoble', 'Assurance taxi Grenoble 38. 243 taxis assurés. RC Pro complète.', 'Assurance taxi Grenoble. 243 taxis. RC Pro 38.', ARRAY['assurance taxi Grenoble','RC Pro 38'], 'published', '38', 'Auvergne-Rhône-Alpes', 160000, 243),
  ('Toulon', 'Assurance Taxi Toulon Expert | TaxiAssur', 'toulon', 'Assurance taxi Toulon 83. 234 taxis assurés. RC Pro complète.', 'Assurance taxi Toulon. 234 taxis. RC Pro 83.', ARRAY['assurance taxi Toulon','RC Pro 83'], 'published', '83', 'Provence-Alpes-Côte d''Azur', 171000, 234),
  ('Reims', 'Assurance Taxi Reims Expert | TaxiAssur', 'reims', 'Assurance taxi Reims 51. 234 taxis assurés. RC Pro complète.', 'Assurance taxi Reims. 234 taxis. RC Pro 51.', ARRAY['assurance taxi Reims','RC Pro 51'], 'published', '51', 'Grand Est', 182000, 234),
  ('Aix-en-Provence', 'Assurance Taxi Aix-en-Provence Expert | TaxiAssur', 'aix-en-provence', 'Assurance taxi Aix 13. 223 taxis assurés. RC Pro complète.', 'Assurance taxi Aix. 223 taxis. RC Pro 13.', ARRAY['assurance taxi Aix','RC Pro 13'], 'published', '13', 'Provence-Alpes-Côte d''Azur', 143000, 223),
  ('Saint-Étienne', 'Assurance Taxi Saint-Étienne Expert | TaxiAssur', 'saint-etienne', 'Assurance taxi Saint-Étienne 42. 212 taxis assurés. RC Pro complète.', 'Assurance taxi Saint-Étienne. 212 taxis. RC Pro 42.', ARRAY['assurance taxi Saint-Étienne','RC Pro 42'], 'published', '42', 'Auvergne-Rhône-Alpes', 171000, 212),
  ('Le Havre', 'Assurance Taxi Le Havre Expert | TaxiAssur', 'le-havre', 'Assurance taxi Le Havre 76. 198 taxis assurés. RC Pro complète.', 'Assurance taxi Le Havre. 198 taxis. RC Pro 76.', ARRAY['assurance taxi Le Havre','RC Pro 76'], 'published', '76', 'Normandie', 170000, 198),
  ('Metz', 'Assurance Taxi Metz Expert | TaxiAssur', 'metz', 'Assurance taxi Metz 57. 198 taxis assurés. RC Pro complète.', 'Assurance taxi Metz. 198 taxis. RC Pro 57.', ARRAY['assurance taxi Metz','RC Pro 57'], 'published', '57', 'Grand Est', 118000, 198),
  ('Nîmes', 'Assurance Taxi Nîmes Expert | TaxiAssur', 'nimes', 'Assurance taxi Nîmes 30. 198 taxis assurés. RC Pro complète.', 'Assurance taxi Nîmes. 198 taxis. RC Pro 30.', ARRAY['assurance taxi Nîmes','RC Pro 30'], 'published', '30', 'Occitanie', 150000, 198),
  ('Tours', 'Assurance Taxi Tours Expert | TaxiAssur', 'tours', 'Assurance taxi Tours 37. 198 taxis assurés. RC Pro complète.', 'Assurance taxi Tours. 198 taxis. RC Pro 37.', ARRAY['assurance taxi Tours','RC Pro 37'], 'published', '37', 'Centre-Val de Loire', 134000, 198),
  ('Dijon', 'Assurance Taxi Dijon Expert | TaxiAssur', 'dijon', 'Assurance taxi Dijon 21. 189 taxis assurés. RC Pro complète.', 'Assurance taxi Dijon. 189 taxis. RC Pro 21.', ARRAY['assurance taxi Dijon','RC Pro 21'], 'published', '21', 'Bourgogne-Franche-Comté', 155000, 189),
  ('Angers', 'Assurance Taxi Angers Expert | TaxiAssur', 'angers', 'Assurance taxi Angers 49. 189 taxis assurés. RC Pro complète.', 'Assurance taxi Angers. 189 taxis. RC Pro 49.', ARRAY['assurance taxi Angers','RC Pro 49'], 'published', '49', 'Pays de la Loire', 151000, 189),
  ('Villeurbanne', 'Assurance Taxi Villeurbanne Expert | TaxiAssur', 'villeurbanne', 'Assurance taxi Villeurbanne 69. 187 taxis assurés. RC Pro complète.', 'Assurance taxi Villeurbanne. 187 taxis. RC Pro 69.', ARRAY['assurance taxi Villeurbanne','RC Pro 69'], 'published', '69', 'Auvergne-Rhône-Alpes', 147000, 187),
  ('Brest', 'Assurance Taxi Brest Expert | TaxiAssur', 'brest', 'Assurance taxi Brest 29. 187 taxis assurés. RC Pro complète.', 'Assurance taxi Brest. 187 taxis. RC Pro 29.', ARRAY['assurance taxi Brest','RC Pro 29'], 'published', '29', 'Bretagne', 140000, 187),
  ('Clermont-Ferrand', 'Assurance Taxi Clermont-Ferrand Expert | TaxiAssur', 'clermont-ferrand', 'Assurance taxi Clermont 63. 178 taxis assurés. RC Pro complète.', 'Assurance taxi Clermont. 178 taxis. RC Pro 63.', ARRAY['assurance taxi Clermont','RC Pro 63'], 'published', '63', 'Auvergne-Rhône-Alpes', 143000, 178),
  ('Amiens', 'Assurance Taxi Amiens Expert | TaxiAssur', 'amiens', 'Assurance taxi Amiens 80. 176 taxis assurés. RC Pro complète.', 'Assurance taxi Amiens. 176 taxis. RC Pro 80.', ARRAY['assurance taxi Amiens','RC Pro 80'], 'published', '80', 'Hauts-de-France', 134000, 176),
  ('Orléans', 'Assurance Taxi Orléans Expert | TaxiAssur', 'orleans', 'Assurance taxi Orléans 45. 167 taxis assurés. RC Pro complète.', 'Assurance taxi Orléans. 167 taxis. RC Pro 45.', ARRAY['assurance taxi Orléans','RC Pro 45'], 'published', '45', 'Centre-Val de Loire', 114000, 167),
  ('Perpignan', 'Assurance Taxi Perpignan Expert | TaxiAssur', 'perpignan', 'Assurance taxi Perpignan 66. 167 taxis assurés. RC Pro complète.', 'Assurance taxi Perpignan. 167 taxis. RC Pro 66.', ARRAY['assurance taxi Perpignan','RC Pro 66'], 'published', '66', 'Occitanie', 121000, 167),
  ('Le Mans', 'Assurance Taxi Le Mans Expert | TaxiAssur', 'le-mans', 'Assurance taxi Le Mans 72. 156 taxis assurés. RC Pro complète.', 'Assurance taxi Le Mans. 156 taxis. RC Pro 72.', ARRAY['assurance taxi Le Mans','RC Pro 72'], 'published', '72', 'Pays de la Loire', 144000, 156),
  ('Besançon', 'Assurance Taxi Besançon Expert | TaxiAssur', 'besancon', 'Assurance taxi Besançon 25. 145 taxis assurés. RC Pro complète.', 'Assurance taxi Besançon. 145 taxis. RC Pro 25.', ARRAY['assurance taxi Besançon','RC Pro 25'], 'published', '25', 'Bourgogne-Franche-Comté', 116000, 145),
  ('Limoges', 'Assurance Taxi Limoges Expert | TaxiAssur', 'limoges', 'Assurance taxi Limoges 87. 134 taxis assurés. RC Pro complète.', 'Assurance taxi Limoges. 134 taxis. RC Pro 87.', ARRAY['assurance taxi Limoges','RC Pro 87'], 'published', '87', 'Nouvelle-Aquitaine', 133000, 134),
  ('Boulogne-Billancourt', 'Assurance Taxi Boulogne Expert | TaxiAssur', 'boulogne-billancourt', 'Assurance taxi Boulogne 92. 87 taxis assurés. RC Pro complète.', 'Assurance taxi Boulogne. 87 taxis. RC Pro 92.', ARRAY['assurance taxi Boulogne','RC Pro 92'], 'published', '92', 'Île-de-France', 120000, 87)
ON CONFLICT (city) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  meta_description = EXCLUDED.meta_description,
  keywords = EXCLUDED.keywords,
  dept = EXCLUDED.dept,
  region = EXCLUDED.region,
  population = EXCLUDED.population,
  taxi_count = EXCLUDED.taxi_count,
  status = EXCLUDED.status,
  updated_at = now();

SELECT city, dept, region, taxi_count FROM city_pages ORDER BY taxi_count DESC LIMIT 10;
SELECT region, COUNT(*) as villes, SUM(taxi_count) as total_taxis FROM city_pages WHERE status = 'published' GROUP BY region ORDER BY total_taxis DESC;
