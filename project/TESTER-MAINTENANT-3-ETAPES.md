# ✅ TESTER LE SYSTÈME - 3 ÉTAPES (5 MINUTES)

## ÉTAPE 1: Vérifier Base de Données (2 min)

### 1.1 - Ouvrir SQL Editor
```
Dashboard Supabase > SQL Editor > New Query
```

### 1.2 - Copier/Coller cette requête:
```sql
-- Compter total villes
SELECT COUNT(*) as total_villes FROM city_pages;

-- Villes par région (top 5)
SELECT
  region,
  COUNT(*) as nb_villes
FROM city_pages
GROUP BY region
ORDER BY nb_villes DESC
LIMIT 5;

-- Exemples villes avec toutes les infos
SELECT
  city,
  dept,
  region,
  population,
  taxi_count,
  slug
FROM city_pages
WHERE dept IS NOT NULL
ORDER BY RANDOM()
LIMIT 10;
```

### 1.3 - Cliquer RUN

**ATTENDU:**
- Total villes: 250-550
- Top région: Île-de-France (40+)
- 10 villes avec dept, region, population

**SI TOTAL < 250:**
→ Exécuter migrations SQL:
- `20251023020000_add_200_french_cities.sql`
- `20251023040000_add_300_more_cities.sql`

---

## ÉTAPE 2: Tester Générateur IA (2 min)

### 2.1 - Ouvrir fichier test
```
Ouvrir: TEST-GENERATION-IA-MAINTENANT.html
Double-cliquer pour ouvrir dans navigateur
```

### 2.2 - Remplir formulaire
- Mot-clé: `assurance taxi`
- Ville: `Paris`
- Mode: `Unifié`

### 2.3 - Cliquer "Générer Contenu"

**ATTENDU (10-20 secondes):**
```
✅ Génération Réussie!
- Article blog: [titre généré]
- Page ville: [titre généré]
- FAQ: 5-10 questions
- Actualité: [titre généré]

Stats:
- Mots: 3000-5000
- Score SEO: 85-95
- Tokens: 4000-6000
```

**SI ERREUR:**

**Erreur: "Failed to fetch" ou CORS**
→ Edge function pas déployée
→ Solution: Dashboard Supabase > Edge Functions > generate-seo-content > Deploy

**Erreur: "Clé OpenAI non configurée"**
→ OPENAI_API_KEY manquante
→ Solution: Dashboard Supabase > Settings > Vault > New Secret
  - Name: `OPENAI_API_KEY`
  - Value: `sk-proj-VOTRE_CLE`

**Erreur: "Erreur API OpenAI"**
→ Clé invalide ou quota dépassé
→ Solution: Vérifier sur platform.openai.com

---

## ÉTAPE 3: Tester Dashboard SEO (1 min)

### 3.1 - Ouvrir dashboard
```
URL: https://taxiassur.com/backoffice/seo
```

### 3.2 - Vider cache navigateur
```
Ctrl + Shift + Delete
→ Cocher "Cached images and files"
→ Clear
→ F5 (refresh page)
```

### 3.3 - Tester sync GSC
```
Cliquer: "Sync Google Search Console"
```

**ATTENDU:**
- ✅ Pas d'erreur CORS
- ✅ Pas d'erreur 400
- ✅ Message "Synchronisation réussie"
- ✅ Stats mises à jour

**SI ERREUR 400:**
→ Migration RPC pas exécutée
→ Solution: Exécuter `20251023030000_fix_seo_rpc_functions.sql`

**SI ERREUR CORS:**
→ Edge function sync-google-search-console pas redéployée
→ Solution: Dashboard > Edge Functions > sync-google-search-console > Deploy

---

## ✅ CHECKLIST VALIDATION

### Base de Données
- [ ] Total villes ≥ 250
- [ ] Villes ont dept + region
- [ ] Populations et taxi_count remplis

### Générateur IA
- [ ] Test HTML fonctionne
- [ ] Génération réussie en < 30 sec
- [ ] 4 contenus générés (blog + ville + FAQ + news)
- [ ] Score SEO > 80

### Dashboard SEO
- [ ] Pas d'erreur console (F12)
- [ ] Sync GSC fonctionne
- [ ] Stats affichées

---

## 🔧 SI TOUT EST OK → GÉNÉRATION MASSIVE (10 min)

### Générer 20 articles test

```sql
-- Dashboard Supabase > SQL Editor

SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0MjAxNDQsImV4cCI6MjA0Mzk5NjE0NH0.pQLNJRv8r70s8DEuAyMBLmUg4Gvvs9uTJlMNAzV0f14',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'keyword', 'assurance taxi',
    'city', city,
    'mode', 'unified'
  )
)
FROM city_pages
WHERE dept IS NOT NULL
ORDER BY RANDOM()
LIMIT 20;
```

**Durée:** ~5 minutes (20 villes)

**Vérifier:**
```sql
SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '10 minutes';
-- Attendu: 20+
```

---

## 📊 RÉSULTATS ATTENDUS

### Après Tests (5 min)
- ✅ 250-550 villes en base
- ✅ Générateur IA fonctionnel
- ✅ Dashboard SEO sans erreur
- ✅ 0 erreur console

### Après Génération Massive (15 min)
- ✅ 20 articles blog générés
- ✅ 20 pages ville créées
- ✅ 100+ questions FAQ
- ✅ 20 actualités

### Après 30 jours (automatique)
- ✅ 150+ contenus générés
- ✅ 150+ pages indexées Google
- ✅ Positionnement page 2-3
- ✅ Trafic x2

---

## 🆘 AIDE RAPIDE

### Erreur: "city_pages table does not exist"
```sql
-- Créer table
CREATE TABLE IF NOT EXISTS city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  dept text,
  region text,
  population integer,
  taxi_count integer,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT NOW()
);
```

### Erreur: "blog_posts table does not exist"
```sql
-- Créer table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  meta_description text,
  keywords text[],
  featured_image text,
  reading_time integer,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW()
);
```

### Erreur: "get_seo_cron_stats does not exist"
→ Exécuter: `20251023030000_fix_seo_rpc_functions.sql`

---

**Temps total:** 5 minutes
**Résultat:** Système 100% fonctionnel, prêt pour production
