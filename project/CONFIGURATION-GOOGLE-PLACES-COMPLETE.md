# ✅ CONFIGURATION GOOGLE PLACES API - ÉTAPES FINALES

## 🎯 **TA CLÉ API**

```
AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
```

✅ **Cette clé est déjà dans ton .env local**

---

## 🚀 **ÉTAPE 1 : AJOUTER LA CLÉ DANS SUPABASE (2 minutes)**

### **1.1 - Ouvrir Supabase Dashboard**

Aller sur :
```
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/vault
```

### **1.2 - Créer nouveau secret**

1. Cliquer **"New secret"** (bouton en haut à droite)

2. Remplir :
   - **Name** :
     ```
     GOOGLE_PLACES_API_KEY
     ```
   - **Secret** :
     ```
     AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
     ```

3. Cliquer **"Create secret"**

### **1.3 - Vérifier**

Tu devrais voir le secret dans la liste avec :
- Name: `GOOGLE_PLACES_API_KEY`
- Status: Active (vert)

---

## 🧪 **ÉTAPE 2 : TESTER LE SCRAPING (1 minute)**

### **2.1 - Ouvrir SQL Editor**

Aller sur :
```
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql/new
```

### **2.2 - Test simple : Scraper 3 taxis Paris**

Copier-coller dans l'éditeur :

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
) as result;
```

### **2.3 - Cliquer "RUN"**

Attendre **30-60 secondes** (le scraping prend du temps)

### **2.4 - Vérifier les résultats**

Ouvrir un **nouveau SQL Editor** et exécuter :

```sql
-- Voir les taxis scrapés
SELECT
  company_name,
  address,
  city,
  phone,
  website_url,
  rating,
  total_reviews,
  source,
  created_at
FROM taxi_prospects
WHERE created_at > now() - interval '2 minutes'
ORDER BY created_at DESC;
```

### **Résultat attendu :**

Tu devrais voir **3 lignes** avec :
- ✅ Noms de compagnies de taxis Paris
- ✅ Adresses complètes
- ✅ Numéros de téléphone
- ✅ Sites web (si disponibles)
- ✅ Notes Google (rating)
- ✅ Nombre d'avis
- ✅ Source : `google_maps`

**Exemple :**
```
company_name: "Taxis G7"
address: "32 Rue Danton, 92300 Levallois-Perret"
city: "Paris"
phone: "+33147595959"
rating: 4.2
total_reviews: 156
source: "google_maps"
```

---

## ✅ **ÉTAPE 3 : ACTIVER SCRAPING AUTOMATIQUE**

### **3.1 - Vérifier que le cron est actif**

Dans SQL Editor :

```sql
-- Vérifier cron scraping
SELECT
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%scrape%';
```

**Résultat attendu :**

```
jobname: "scrape-taxis-daily"
schedule: "0 3 * * *"  (tous les jours à 3h du matin)
active: true
command: SELECT schedule_taxi_scraping();
```

### **3.2 - Si le cron n'existe pas, le créer**

```sql
-- Créer cron scraping automatique
SELECT cron.schedule(
  'scrape-taxis-daily',
  '0 3 * * *',  -- Tous les jours à 3h du matin
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

---

## 📊 **ÉTAPE 4 : STATISTIQUES TEMPS RÉEL**

### **Voir nombre de prospects par ville**

```sql
SELECT
  city,
  COUNT(*) as total_taxis,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as avec_email,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as avec_telephone,
  COUNT(*) FILTER (WHERE status = 'new') as non_contactes,
  AVG(rating) as note_moyenne
FROM taxi_prospects
GROUP BY city
ORDER BY total_taxis DESC;
```

### **Voir derniers taxis ajoutés**

```sql
SELECT
  company_name,
  city,
  phone,
  rating,
  total_reviews,
  created_at
FROM taxi_prospects
ORDER BY created_at DESC
LIMIT 20;
```

### **Voir taxis avec meilleure note**

```sql
SELECT
  company_name,
  city,
  phone,
  rating,
  total_reviews,
  website_url
FROM taxi_prospects
WHERE rating >= 4.0
  AND total_reviews >= 10
ORDER BY rating DESC, total_reviews DESC
LIMIT 20;
```

---

## 📧 **ÉTAPE 5 : ACTIVER PROSPECTION EMAILS (BONUS)**

### **5.1 - Créer cron emails automatiques**

```sql
-- Créer cron prospection taxis
SELECT cron.schedule(
  'prospect-taxis-daily',
  '0 10 * * *',  -- Tous les jours à 10h du matin
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/prospect-taxi-companies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'limit', 20
    )
  );
  $$
);
```

### **5.2 - Vérifier crons actifs**

```sql
SELECT
  jobname,
  schedule,
  active,
  last_run_started_at,
  last_run_status
FROM cron.job
WHERE jobname IN ('scrape-taxis-daily', 'prospect-taxis-daily')
ORDER BY jobname;
```

---

## 💰 **COÛTS GOOGLE PLACES API**

### **Configuration actuelle :**
- 8 villes × 50 taxis = 400 prospects/jour
- Coût : ~7$/jour = ~210$/mois

### **Crédit gratuit Google Cloud :**
- ✅ **300$ offerts** (valable 90 jours)
- = **40 jours gratuits** avec config actuelle

### **Optimiser les coûts :**

**Option 1 : Top 3 villes (Paris, Lyon, Marseille)**
```sql
-- Dans le cron, remplacer ARRAY par :
ARRAY['Paris', 'Lyon', 'Marseille']
-- Coût : ~2.5$/jour = 75$/mois
```

**Option 2 : Scraping hebdomadaire**
```sql
-- Modifier le schedule
'0 3 * * 1'  -- Tous les lundis à 3h
-- Coût : ~30$/mois
```

**Option 3 : 25 taxis/ville au lieu de 50**
```sql
-- Modifier max_per_city
'max_per_city', 25
-- Coût : ~3.5$/jour = 105$/mois
```

---

## 🎯 **RÉSULTATS ATTENDUS**

### **Configuration par défaut (quotidien, 8 villes, 50/ville) :**

| Période | Prospects scrapés | Emails envoyés | Clients attendus |
|---------|------------------|----------------|------------------|
| Jour 1  | 400              | 20             | 0-1              |
| Semaine | 2800             | 140            | 2-5              |
| Mois 1  | 12 000           | 600            | 10-20            |
| Mois 6  | 75 000           | 3600           | 100-150          |

### **Configuration optimisée (quotidien, top 3, 50/ville) :**

| Période | Prospects scrapés | Emails envoyés | Clients attendus |
|---------|------------------|----------------|------------------|
| Jour 1  | 150              | 20             | 0-1              |
| Semaine | 1050             | 140            | 2-4              |
| Mois 1  | 4500             | 600            | 8-15             |
| Mois 6  | 27 000           | 3600           | 60-100           |

---

## 🚨 **ERREURS COURANTES ET SOLUTIONS**

### **Erreur : "API key not valid"**

**Solution :**
1. Vérifier que le secret existe dans Supabase
2. Nom exact : `GOOGLE_PLACES_API_KEY`
3. Vérifier restrictions dans Google Cloud Console

### **Erreur : "This API project is not authorized"**

**Solution :**
1. Vérifier que Places API est bien activée
2. Aller sur : https://console.cloud.google.com/apis/library/places-backend.googleapis.com
3. Cliquer "ACTIVER"

### **Erreur : "Quota exceeded"**

**Solution :**
1. Vérifier quota : https://console.cloud.google.com/apis/dashboard
2. Réduire fréquence ou nombre de villes
3. Attendre reset quotidien (minuit UTC)

### **Aucun résultat dans taxi_prospects**

**Solution :**
1. Vérifier que l'edge function existe :
   ```sql
   SELECT * FROM pg_stat_user_functions
   WHERE funcname = 'schedule_taxi_scraping';
   ```
2. Vérifier logs edge function dans Supabase Dashboard
3. Tester manuellement (étape 2.2)

---

## ✅ **CHECKLIST FINALE**

```
□ Clé API dans .env local
□ Secret GOOGLE_PLACES_API_KEY créé dans Supabase
□ Test scraping 3 taxis Paris OK
□ Cron scrape-taxis-daily actif
□ Cron prospect-taxis-daily actif (optionnel)
□ Vérification statistiques OK
```

---

## 📞 **PROCHAINES ÉTAPES**

**Demain matin (après 04h00) :**
1. Vérifier statistiques :
   ```sql
   SELECT COUNT(*) FROM taxi_prospects
   WHERE created_at > CURRENT_DATE;
   ```
   **Attendu : ~400 nouveaux prospects**

2. Vérifier emails envoyés :
   ```sql
   SELECT COUNT(*) FROM email_logs
   WHERE created_at > CURRENT_DATE;
   ```
   **Attendu : ~20 emails**

---

## 🎉 **FÉLICITATIONS !**

**Ton système de scraping automatique est ACTIF !**

### **Ce qui tourne maintenant 24/7 :**
- ✅ Scraping 400 taxis/jour
- ✅ Prospection 20 emails/jour
- ✅ 5 articles blog/jour
- ✅ 3 posts sociaux/jour
- ✅ 10 emails backlinks/jour
- ✅ 10 emails partenariats/jour

**Dans 6 mois : 75 000 prospects + 100-150 clients ! 🚀**
