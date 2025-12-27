/*
  # Créer une table de référence des villes françaises
  
  1. Nouvelle table
    - `french_cities` : référence des villes avec département, région, population
  
  2. Colonnes
    - `id` : UUID, clé primaire
    - `name` : nom de la ville (unique)
    - `dept_code` : code du département (ex: "77")
    - `dept_name` : nom du département (ex: "Seine-et-Marne")
    - `region` : nom de la région
    - `population` : population estimée
    - `latitude` : latitude (optionnel)
    - `longitude` : longitude (optionnel)
    - `created_at` : date de création
    
  3. Sécurité
    - RLS activé
    - Politique de lecture publique (données de référence)
    - Modification réservée aux authentifiés
    
  4. Index
    - Index sur `name` pour recherche rapide
    - Index sur `dept_code` pour groupement
*/

-- Créer la table
CREATE TABLE IF NOT EXISTS french_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  dept_code text NOT NULL,
  dept_name text NOT NULL,
  region text NOT NULL,
  population integer DEFAULT 0,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE french_cities ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique (données de référence)
CREATE POLICY "Anyone can read cities"
  ON french_cities
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Politique d'écriture pour authentifiés
CREATE POLICY "Authenticated users can modify cities"
  ON french_cities
  FOR ALL
  TO authenticated
  USING (true);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_french_cities_name ON french_cities(name);
CREATE INDEX IF NOT EXISTS idx_french_cities_dept_code ON french_cities(dept_code);
CREATE INDEX IF NOT EXISTS idx_french_cities_region ON french_cities(region);

-- Insérer les villes principales d'Île-de-France et quelques autres
INSERT INTO french_cities (name, dept_code, dept_name, region, population) VALUES
  -- Seine-et-Marne (77)
  ('Montévrain', '77', 'Seine-et-Marne', 'Île-de-France', 19000),
  ('Meaux', '77', 'Seine-et-Marne', 'Île-de-France', 55000),
  ('Melun', '77', 'Seine-et-Marne', 'Île-de-France', 40000),
  ('Chelles', '77', 'Seine-et-Marne', 'Île-de-France', 54000),
  ('Pontault-Combault', '77', 'Seine-et-Marne', 'Île-de-France', 37000),
  
  -- Paris (75)
  ('Paris', '75', 'Paris', 'Île-de-France', 2165423),
  
  -- Hauts-de-Seine (92)
  ('Boulogne-Billancourt', '92', 'Hauts-de-Seine', 'Île-de-France', 120000),
  ('Nanterre', '92', 'Hauts-de-Seine', 'Île-de-France', 96000),
  ('Courbevoie', '92', 'Hauts-de-Seine', 'Île-de-France', 85000),
  
  -- Seine-Saint-Denis (93)
  ('Saint-Denis', '93', 'Seine-Saint-Denis', 'Île-de-France', 111000),
  ('Montreuil', '93', 'Seine-Saint-Denis', 'Île-de-France', 109000),
  ('Aubervilliers', '93', 'Seine-Saint-Denis', 'Île-de-France', 88000),
  
  -- Val-de-Marne (94)
  ('Créteil', '94', 'Val-de-Marne', 'Île-de-France', 92000),
  ('Vitry-sur-Seine', '94', 'Val-de-Marne', 'Île-de-France', 93000),
  ('Champigny-sur-Marne', '94', 'Val-de-Marne', 'Île-de-France', 76000),
  
  -- Val-d''Oise (95)
  ('Argenteuil', '95', 'Val-d''Oise', 'Île-de-France', 110000),
  ('Cergy', '95', 'Val-d''Oise', 'Île-de-France', 65000),
  ('Sarcelles', '95', 'Val-d''Oise', 'Île-de-France', 58000),
  
  -- Essonne (91)
  ('Évry-Courcouronnes', '91', 'Essonne', 'Île-de-France', 70000),
  ('Corbeil-Essonnes', '91', 'Essonne', 'Île-de-France', 50000),
  ('Massy', '91', 'Essonne', 'Île-de-France', 48000),
  
  -- Yvelines (78)
  ('Versailles', '78', 'Yvelines', 'Île-de-France', 85000),
  ('Sartrouville', '78', 'Yvelines', 'Île-de-France', 52000),
  ('Saint-Germain-en-Laye', '78', 'Yvelines', 'Île-de-France', 44000),
  
  -- Grandes villes de France
  ('Lyon', '69', 'Rhône', 'Auvergne-Rhône-Alpes', 516092),
  ('Marseille', '13', 'Bouches-du-Rhône', 'Provence-Alpes-Côte d''Azur', 869815),
  ('Toulouse', '31', 'Haute-Garonne', 'Occitanie', 471941),
  ('Nice', '06', 'Alpes-Maritimes', 'Provence-Alpes-Côte d''Azur', 340017),
  ('Nantes', '44', 'Loire-Atlantique', 'Pays de la Loire', 303382),
  ('Strasbourg', '67', 'Bas-Rhin', 'Grand Est', 280966),
  ('Montpellier', '34', 'Hérault', 'Occitanie', 285121),
  ('Bordeaux', '33', 'Gironde', 'Nouvelle-Aquitaine', 252040),
  ('Lille', '59', 'Nord', 'Hauts-de-France', 232741),
  ('Rennes', '35', 'Ille-et-Vilaine', 'Bretagne', 216268),
  ('Reims', '51', 'Marne', 'Grand Est', 182592),
  ('Le Havre', '76', 'Seine-Maritime', 'Normandie', 170352),
  ('Saint-Étienne', '42', 'Loire', 'Auvergne-Rhône-Alpes', 172565),
  ('Toulon', '83', 'Var', 'Provence-Alpes-Côte d''Azur', 171953),
  ('Grenoble', '38', 'Isère', 'Auvergne-Rhône-Alpes', 158454),
  ('Dijon', '21', 'Côte-d''Or', 'Bourgogne-Franche-Comté', 155090),
  ('Angers', '49', 'Maine-et-Loire', 'Pays de la Loire', 151520),
  ('Nîmes', '30', 'Gard', 'Occitanie', 151001),
  ('Villeurbanne', '69', 'Rhône', 'Auvergne-Rhône-Alpes', 149019),
  ('Le Mans', '72', 'Sarthe', 'Pays de la Loire', 143813),
  ('Aix-en-Provence', '13', 'Bouches-du-Rhône', 'Provence-Alpes-Côte d''Azur', 145133),
  ('Clermont-Ferrand', '63', 'Puy-de-Dôme', 'Auvergne-Rhône-Alpes', 143886),
  ('Brest', '29', 'Finistère', 'Bretagne', 139163),
  ('Tours', '37', 'Indre-et-Loire', 'Centre-Val de Loire', 136463),
  ('Limoges', '87', 'Haute-Vienne', 'Nouvelle-Aquitaine', 132175),
  ('Amiens', '80', 'Somme', 'Hauts-de-France', 133625),
  ('Perpignan', '66', 'Pyrénées-Orientales', 'Occitanie', 121934),
  ('Metz', '57', 'Moselle', 'Grand Est', 116429),
  ('Besançon', '25', 'Doubs', 'Bourgogne-Franche-Comté', 116914),
  ('Orléans', '45', 'Loiret', 'Centre-Val de Loire', 114644)
ON CONFLICT (name) DO NOTHING;

-- Créer une fonction helper pour lookup rapide
CREATE OR REPLACE FUNCTION get_city_info(city_name text)
RETURNS TABLE (
  dept_code text,
  dept_name text,
  region text,
  population integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT fc.dept_code, fc.dept_name, fc.region, fc.population
  FROM french_cities fc
  WHERE LOWER(fc.name) = LOWER(city_name)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
