/*
  # Création système de scraping taxis Google Places

  1. Tables créées
    - `taxi_prospects` : Stockage des prospects taxis scrapés
      - `id` (uuid, primary key)
      - `company_name` (text) : Nom de la compagnie
      - `address` (text) : Adresse complète
      - `city` (text) : Ville
      - `phone` (text) : Numéro de téléphone
      - `email` (text) : Email (si disponible)
      - `website_url` (text) : Site web
      - `rating` (decimal) : Note Google
      - `total_reviews` (integer) : Nombre d'avis
      - `place_id` (text, unique) : ID Google Place
      - `source` (text) : Source du scraping
      - `status` (text) : Statut (new, contacted, interested, converted, rejected)
      - `notes` (text) : Notes internes
      - `last_contact_date` (timestamp) : Date dernier contact
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS on `taxi_prospects` table
    - Policies pour lecture publique et écriture authentifiée
*/

-- Créer table taxi_prospects
CREATE TABLE IF NOT EXISTS taxi_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  address text,
  city text NOT NULL,
  phone text,
  email text,
  website_url text,
  rating decimal(2,1),
  total_reviews integer DEFAULT 0,
  place_id text UNIQUE,
  source text DEFAULT 'google_maps',
  status text DEFAULT 'new',
  notes text,
  last_contact_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_city ON taxi_prospects(city);
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_status ON taxi_prospects(status);
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_created_at ON taxi_prospects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_place_id ON taxi_prospects(place_id);

-- Enable RLS
ALTER TABLE taxi_prospects ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture publique (pour backoffice)
DROP POLICY IF EXISTS "Allow public read access to taxi_prospects" ON taxi_prospects;
CREATE POLICY "Allow public read access to taxi_prospects"
  ON taxi_prospects
  FOR SELECT
  TO public
  USING (true);

-- Policy: Insertion publique (pour edge functions)
DROP POLICY IF EXISTS "Allow public insert to taxi_prospects" ON taxi_prospects;
CREATE POLICY "Allow public insert to taxi_prospects"
  ON taxi_prospects
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Update authentifié
DROP POLICY IF EXISTS "Allow authenticated update to taxi_prospects" ON taxi_prospects;
CREATE POLICY "Allow authenticated update to taxi_prospects"
  ON taxi_prospects
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Delete authentifié
DROP POLICY IF EXISTS "Allow authenticated delete to taxi_prospects" ON taxi_prospects;
CREATE POLICY "Allow authenticated delete to taxi_prospects"
  ON taxi_prospects
  FOR DELETE
  TO authenticated
  USING (true);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_taxi_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS taxi_prospects_updated_at ON taxi_prospects;
CREATE TRIGGER taxi_prospects_updated_at
  BEFORE UPDATE ON taxi_prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_taxi_prospects_updated_at();

-- Fonction RPC pour obtenir stats par ville
CREATE OR REPLACE FUNCTION get_taxi_prospects_stats()
RETURNS TABLE (
  city text,
  total_count bigint,
  with_email bigint,
  with_phone bigint,
  not_contacted bigint,
  avg_rating decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.city,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE tp.email IS NOT NULL) as with_email,
    COUNT(*) FILTER (WHERE tp.phone IS NOT NULL) as with_phone,
    COUNT(*) FILTER (WHERE tp.status = 'new') as not_contacted,
    AVG(tp.rating) as avg_rating
  FROM taxi_prospects tp
  GROUP BY tp.city
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction RPC pour marquer comme contacté
CREATE OR REPLACE FUNCTION mark_taxi_prospect_contacted(prospect_id uuid, contact_notes text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE taxi_prospects
  SET
    status = 'contacted',
    last_contact_date = now(),
    notes = COALESCE(contact_notes, notes),
    updated_at = now()
  WHERE id = prospect_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction RPC pour obtenir prospects à contacter
CREATE OR REPLACE FUNCTION get_prospects_to_contact(limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  company_name text,
  city text,
  phone text,
  email text,
  website_url text,
  rating decimal,
  total_reviews integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.id,
    tp.company_name,
    tp.city,
    tp.phone,
    tp.email,
    tp.website_url,
    tp.rating,
    tp.total_reviews
  FROM taxi_prospects tp
  WHERE tp.status = 'new'
    AND (tp.email IS NOT NULL OR tp.phone IS NOT NULL)
  ORDER BY tp.rating DESC NULLS LAST, tp.total_reviews DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insérer quelques exemples pour tester (optionnel)
INSERT INTO taxi_prospects (company_name, city, address, phone, rating, total_reviews, place_id)
VALUES
  ('Taxis G7', 'Paris', '32 Rue Danton, 92300 Levallois-Perret', '+33147595959', 4.2, 156, 'example_place_id_1'),
  ('Alpha Taxis', 'Lyon', '15 Rue de la République, 69002 Lyon', '+33478428000', 4.5, 89, 'example_place_id_2'),
  ('Taxi Radio Marseille', 'Marseille', '25 Boulevard Rabatau, 13008 Marseille', '+33491020304', 4.1, 124, 'example_place_id_3')
ON CONFLICT (place_id) DO NOTHING;

-- Commentaire final
COMMENT ON TABLE taxi_prospects IS 'Table des prospects taxis scrapés via Google Places API';
COMMENT ON COLUMN taxi_prospects.place_id IS 'ID unique Google Place pour éviter les doublons';
COMMENT ON COLUMN taxi_prospects.status IS 'Statut: new, contacted, interested, converted, rejected';
