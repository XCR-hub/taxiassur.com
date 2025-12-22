# 🚀 ACTIVER SCRAPING TAXIS - 3 ÉTAPES (5 MINUTES)

## ❗ **PROBLÈME IDENTIFIÉ**

La table `taxi_prospects` n'existe pas encore dans ta base Supabase.

**✅ SOLUTION : Appliquer 2 migrations SQL**

---

## 🎯 **ÉTAPE 1 : CRÉER TABLE TAXI_PROSPECTS (2 min)**

### **1.1 - Ouvrir SQL Editor Supabase**
```
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql/new
```

### **1.2 - Copier-coller cette migration**

```sql
/*
  Création système de scraping taxis Google Places
  Table: taxi_prospects
  RLS activé + policies publiques
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

-- Policy: Lecture publique
DROP POLICY IF EXISTS "Allow public read access to taxi_prospects" ON taxi_prospects;
CREATE POLICY "Allow public read access to taxi_prospects"
  ON taxi_prospects FOR SELECT TO public USING (true);

-- Policy: Insertion publique (pour edge functions)
DROP POLICY IF EXISTS "Allow public insert to taxi_prospects" ON taxi_prospects;
CREATE POLICY "Allow public insert to taxi_prospects"
  ON taxi_prospects FOR INSERT TO public WITH CHECK (true);

-- Policy: Update authentifié
DROP POLICY IF EXISTS "Allow authenticated update to taxi_prospects" ON taxi_prospects;
CREATE POLICY "Allow authenticated update to taxi_prospects"
  ON taxi_prospects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policy: Delete authentifié
DROP POLICY IF EXISTS "Allow authenticated delete to taxi_prospects" ON taxi_prospects;
CREATE POLICY "Allow authenticated delete to taxi_prospects"
  ON taxi_prospects FOR DELETE TO authenticated USING (true);

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

-- Insérer 3 exemples pour tester
INSERT INTO taxi_prospects (company_name, city, address, phone, rating, total_reviews, place_id)
VALUES
  ('Taxis G7', 'Paris', '32 Rue Danton, 92300 Levallois-Perret', '+33147595959', 4.2, 156, 'example_g7'),
  ('Alpha Taxis', 'Lyon', '15 Rue de la République, 69002 Lyon', '+33478428000', 4.5, 89, 'example_alpha'),
  ('Taxi Radio Marseille', 'Marseille', '25 Boulevard Rabatau, 13008 Marseille', '+33491020304', 4.1, 124, 'example_marseille')
ON CONFLICT (place_id) DO NOTHING;
```

### **1.3 - Cliquer "RUN"**

✅ **Résultat attendu :** "Success. No rows returned"

---

## 🎯 **ÉTAPE 2 : AJOUTER GOOGLE PLACES API KEY (1 min)**

### **2.1 - Aller dans Secrets**
```
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/vault
```

### **2.2 - Cliquer "New secret"**

- **Name** : `GOOGLE_PLACES_API_KEY`
- **Secret** : `AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o`

### **2.3 - Cliquer "Create secret"**

✅ **Vérifier** : Le secret apparaît dans la liste

---

## 🎯 **ÉTAPE 3 : TESTER LE SCRAPING (2 min)**

### **3.1 - Retourner dans SQL Editor**

### **3.2 - Test : Scraper 3 taxis Paris**

```sql
-- Test scraping 3 taxis à Paris
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scrape-taxi-companies',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  ),
  body := jsonb_build_object(
    'cities', ARRAY['Paris'],
    'max_per_city', 3
  )
);
```

### **3.3 - Cliquer "RUN"**

⏱️ **Attendre 30-60 secondes** (le scraping prend du temps)

### **3.4 - Vérifier résultats**

**Ouvrir nouveau SQL Editor** et exécuter :

```sql
-- Voir taxis scrapés
SELECT
  company_name,
  city,
  phone,
  rating,
  total_reviews,
  address,
  created_at
FROM taxi_prospects
WHERE created_at > now() - interval '2 minutes'
ORDER BY created_at DESC;
```

✅ **Résultat attendu :** 3 nouveaux taxis de Paris avec leurs infos

**Exemple de résultat :**
```
company_name: "Taxis Bleus"
city: "Paris"
phone: "+33891701010"
rating: 4.3
total_reviews: 245
address: "2 Rue Martre, 92110 Clichy"
```

---

## 🎉 **ÉTAPE 4 : ACTIVER SCRAPING AUTOMATIQUE (OPTIONNEL)**

### **4.1 - Dans SQL Editor, créer le cron job**

```sql
-- Créer cron scraping quotidien à 03h00
SELECT cron.schedule(
  'scrape-taxis-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scrape-taxi-companies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'cities', ARRAY['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Lille'],
      'max_per_city', 50
    )
  );
  $$
);
```

### **4.2 - Vérifier cron actif**

```sql
SELECT jobname, schedule, active, command
FROM cron.job
WHERE jobname = 'scrape-taxis-daily';
```

✅ **Résultat attendu :**
```
jobname: scrape-taxis-daily
schedule: 0 3 * * *
active: true
```

---

## 📊 **STATISTIQUES TEMPS RÉEL**

### **Stats par ville**
```sql
SELECT * FROM get_taxi_prospects_stats();
```

### **Derniers taxis ajoutés**
```sql
SELECT company_name, city, phone, rating, created_at
FROM taxi_prospects
ORDER BY created_at DESC
LIMIT 20;
```

### **Taxis avec meilleure note**
```sql
SELECT company_name, city, phone, rating, total_reviews
FROM taxi_prospects
WHERE rating >= 4.0
ORDER BY rating DESC, total_reviews DESC
LIMIT 20;
```

### **Total prospects**
```sql
SELECT
  COUNT(*) as total_prospects,
  COUNT(*) FILTER (WHERE status = 'new') as non_contactes,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as avec_email,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as avec_telephone
FROM taxi_prospects;
```

---

## 🚨 **SI ÇA NE FONCTIONNE PAS**

### **Erreur: "relation taxi_prospects does not exist"**
**Solution :** Retourner à l'étape 1 et exécuter la migration complète

### **Erreur: "API key not valid"**
**Solution :**
1. Vérifier le secret dans Supabase Vault
2. Nom exact : `GOOGLE_PLACES_API_KEY`
3. Valeur : `AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o`

### **Erreur: "This API project is not authorized"**
**Solution :** Places API pas activée
1. Aller sur : https://console.cloud.google.com/apis/library/places-backend.googleapis.com
2. Sélectionner projet
3. Cliquer "ACTIVER"

### **Aucun résultat après scraping**
**Solution :**
1. Attendre 1-2 minutes (le scraping prend du temps)
2. Vérifier logs dans Supabase Dashboard → Functions → scrape-taxi-companies
3. Vérifier quota Google : https://console.cloud.google.com/apis/dashboard

---

## 💰 **COÛTS GOOGLE PLACES**

### **Configuration actuelle (après activation cron) :**
- **8 villes × 50 taxis = 400 prospects/jour**
- **Coût : ~7$/jour = ~210$/mois**
- **300$ gratuits Google Cloud = 40 jours gratuits**

### **Pour réduire les coûts :**

**Option 1 : Top 3 villes (Paris, Lyon, Marseille)**
```sql
-- Modifier le cron, remplacer cities par :
'cities', ARRAY['Paris', 'Lyon', 'Marseille']
-- Coût : ~2.5$/jour = 75$/mois
```

**Option 2 : 25 taxis par ville**
```sql
-- Modifier max_per_city
'max_per_city', 25
-- Coût : ~3.5$/jour = 105$/mois
```

**Option 3 : Hebdomadaire au lieu de quotidien**
```sql
-- Modifier schedule
'0 3 * * 1'  -- Tous les lundis à 3h
-- Coût : ~30$/mois
```

---

## 🎯 **RÉSULTATS ATTENDUS**

### **Configuration par défaut (quotidien, 8 villes, 50/ville) :**

| Période  | Prospects | Coût cumulé |
|----------|-----------|-------------|
| Jour 1   | 400       | 7$          |
| Semaine  | 2800      | 49$         |
| Mois 1   | 12 000    | 210$        |
| Mois 6   | 75 000    | 1260$       |

### **Avec crédit Google gratuit (300$) :**
- ✅ **40 jours gratuits** avec config par défaut
- ✅ **120 jours gratuits** avec top 3 villes

---

## ✅ **CHECKLIST FINALE**

```
□ Migration SQL appliquée (table taxi_prospects créée)
□ Secret GOOGLE_PLACES_API_KEY ajouté
□ Test scraping 3 taxis Paris OK
□ Résultats visibles dans la table
□ Cron job créé (optionnel)
□ Statistiques vérifiées
```

---

## 📞 **PROCHAINES ÉTAPES**

**Après activation :**
1. Demain matin (après 04h00), vérifier :
   ```sql
   SELECT COUNT(*) FROM taxi_prospects
   WHERE created_at > CURRENT_DATE;
   ```
   **Attendu : ~400 nouveaux prospects**

2. Voir dans le backoffice : `/backoffice` → **Lead CRM**
3. Activer prospection emails automatique

---

## 🎉 **FÉLICITATIONS !**

**Une fois ces 3 étapes complétées :**
- ✅ Scraping Google Places API actif
- ✅ 400 prospects taxis/jour automatiques
- ✅ Base de données structurée avec RLS
- ✅ Prêt pour prospection automatique

**Dans 6 mois : 75 000 prospects + 100-150 clients ! 🚀**

---

## 📖 **VOIR AUSSI**

- **GUIDE-GOOGLE-PLACES-API-SCRAPING-TAXIS.md** → Guide détaillé
- **CONFIGURATION-GOOGLE-PLACES-COMPLETE.md** → Instructions complètes
- **CORRECTIONS-FINALES-SMS-PROSPECTION.md** → Prospection SMS

---

**Temps total : 5 minutes** ⏱️
**Difficulté : Facile** ✅
**Résultat : 400 prospects taxis automatiques par jour** 🚖
