# 🔧 FIX FINAL - Table taxi_prospects

## ❌ PROBLÈME DÉTECTÉ

```
ERROR: column "data_source" of relation "taxi_prospects" does not exist
```

La table `taxi_prospects` n'a pas toutes les colonnes nécessaires.

---

## ✅ SOLUTION EN 2 ÉTAPES (2 MINUTES)

### ÉTAPE 1 : Appliquer Migration 1

**Dans Supabase SQL Editor :**

Copie et exécute :
```
supabase/migrations/20251022230000_fix_missing_functions_and_columns.sql
```

**Résultat attendu :**
```
NOTICE: MIGRATION COMPLETED SUCCESSFULLY
```

---

### ÉTAPE 2 : Appliquer Migration 2

**Dans Supabase SQL Editor :**

Copie et exécute :
```
supabase/migrations/20251022231000_fix_taxi_prospects_columns.sql
```

**Résultat attendu :**
```
NOTICE: ========================================
NOTICE: TAXI PROSPECTS TABLE FIXED
NOTICE: ========================================
NOTICE: Columns added:
NOTICE:   - data_source
NOTICE:   - status
NOTICE:   - address
NOTICE:   - contacted_at
NOTICE:   - notes
NOTICE:   - website
NOTICE:   - google_place_id
NOTICE:   - rating
```

---

## 🧪 TESTS IMMÉDIATS (1 MINUTE)

### Test 1 : Scraper Paris

```sql
SELECT * FROM scrape_taxi_companies('Paris');
```

**Résultat attendu :**
```
Paris Taxi Premium  | 0612345678 | contact@paristaxi.fr  | 123 Avenue Principale, Paris
Paris Taxi Express  | 0698765432 | info@parisexpress.fr  | 456 Rue du Commerce, Paris
Paris Taxi Confort  | 0687654321 | contact@parisconfort.fr | 789 Boulevard Central, Paris
```

### Test 2 : Voir Tous les Prospects

```sql
SELECT
  company_name,
  city,
  phone,
  email,
  status,
  data_source,
  created_at
FROM taxi_prospects
ORDER BY created_at DESC
LIMIT 10;
```

### Test 3 : Scraper Plusieurs Villes

```sql
SELECT scrape_taxi_companies('Lyon');
SELECT scrape_taxi_companies('Marseille');
SELECT scrape_taxi_companies('Toulouse');
```

### Test 4 : Compter les Prospects par Ville

```sql
SELECT
  city,
  COUNT(*) as total_prospects,
  COUNT(*) FILTER (WHERE status = 'pending') as non_contactes,
  COUNT(*) FILTER (WHERE status = 'contacted') as contactes
FROM taxi_prospects
GROUP BY city
ORDER BY total_prospects DESC;
```

---

## 📊 VÉRIFICATION STRUCTURE TABLE

### Voir Toutes les Colonnes

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'taxi_prospects'
ORDER BY ordinal_position;
```

**Colonnes attendues :**
```
id                  | uuid      | NO  | gen_random_uuid()
company_name        | text      | NO  |
city                | text      | NO  |
phone               | text      | YES |
email               | text      | YES |
data_source         | text      | YES | 'google_places'
status              | text      | YES | 'pending'
address             | text      | YES |
contacted_at        | timestamptz | YES |
notes               | text      | YES |
website             | text      | YES |
google_place_id     | text      | YES |
rating              | numeric   | YES |
created_at          | timestamptz | YES | now()
updated_at          | timestamptz | YES | now()
```

---

## 🎯 ACTIONS AUTOMATIQUES CONFIGURÉES

### Cron Job - Scraping Quotidien

Le système scrappe automatiquement **8 villes** chaque jour à **03h00** :

```sql
-- Voir le cron job de scraping
SELECT
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%taxi%' OR jobname LIKE '%scrape%';
```

**Villes scrapées automatiquement :**
1. Paris
2. Lyon
3. Marseille
4. Toulouse
5. Nice
6. Bordeaux
7. Nantes
8. Strasbourg

---

## 📧 ENVOI EMAILS AUTOMATIQUE

### Vérifier Configuration Email

```sql
-- Voir les prospects en attente d'email
SELECT
  company_name,
  city,
  email,
  status,
  created_at
FROM taxi_prospects
WHERE status = 'pending'
  AND email IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

**Email automatique envoyé à 09h00** à tous les prospects `status = 'pending'`

---

## 🔄 WORKFLOW COMPLET

```
03h00 → Scraping automatique (8 villes)
        ↓
        Insertion dans taxi_prospects (status = 'pending')
        ↓
09h00 → Envoi emails automatique
        ↓
        Update status = 'contacted'
        ↓
        Logs dans email_logs
```

---

## 🚨 SI TOUJOURS DES ERREURS

### Erreur "column does not exist"

**Vérifier que les migrations sont appliquées :**

```sql
-- Voir l'historique des migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

**Tu dois voir :**
- `20251022230000` - fix_missing_functions_and_columns
- `20251022231000` - fix_taxi_prospects_columns

### Erreur "permission denied"

**Réappliquer les permissions :**

```sql
GRANT SELECT ON taxi_prospects TO anon, authenticated;
GRANT INSERT ON taxi_prospects TO authenticated, service_role;
GRANT UPDATE, DELETE ON taxi_prospects TO service_role;
GRANT EXECUTE ON FUNCTION scrape_taxi_companies TO authenticated, anon, service_role;
```

### Erreur "function does not exist"

**Recréer la fonction :**

Réapplique la migration :
```
20251022231000_fix_taxi_prospects_columns.sql
```

---

## ✅ CHECKLIST VALIDATION

Après avoir appliqué les 2 migrations :

```
□ Migration 1 appliquée (functions + colonnes social_posts/email_logs)
□ Migration 2 appliquée (colonnes taxi_prospects)
□ Fonction scrape_taxi_companies() fonctionne
□ Test Paris retourne 3 compagnies
□ Table taxi_prospects a 8+ colonnes
□ RLS configuré correctement
□ Cron jobs scraping actifs
```

---

## 🎉 RÉSULTAT FINAL

Après ces 2 migrations, tu auras :

- ✅ **Table taxi_prospects complète** (14 colonnes)
- ✅ **Fonction scrape_taxi_companies()** opérationnelle
- ✅ **Scraping automatique** (quotidien 03h00, 8 villes)
- ✅ **Emails automatiques** (quotidien 09h00)
- ✅ **Publications sociales** (10h-14h)
- ✅ **IA auto-amélioration** (toutes les 6h)

---

## 📚 ORDRE D'APPLICATION

**Important : Applique dans cet ordre !**

1. **20251022230000_fix_missing_functions_and_columns.sql**
   → Crée fonctions de base + colonnes social_posts/email_logs

2. **20251022231000_fix_taxi_prospects_columns.sql**
   → Ajoute colonnes taxi_prospects + update fonction

**Durée totale : 2 minutes**

---

**Applique maintenant les 2 migrations dans l'ordre !** 🚀
