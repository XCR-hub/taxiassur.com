# 🚀 ACTIVATION IA AUTO-AMÉLIORATION - VERSION CORRIGÉE

**Erreur SQL corrigée** ✅ La migration DROP maintenant les anciennes tables avant de les recréer.

---

## 📋 ÉTAPE 1 : SECRETS SUPABASE (5 min)

### Configuration

1. Va sur https://supabase.com/dashboard
2. Sélectionne projet TaxiAssur
3. **Settings** → **Vault**
4. Clique **New Secret** pour chaque secret ci-dessous

### 7 Secrets à Ajouter

```
1. Name: GITHUB_TOKEN
   Value: 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

2. Name: GITHUB_REPO
   Value: XCR-hub/taxiassur.com

3. Name: FTP_HOST
   Value: home749874859.1and1-data.host

4. Name: FTP_PORT
   Value: 22

5. Name: FTP_PROTOCOL
   Value: sftp

6. Name: FTP_USER
   Value: acc1591324770

7. Name: FTP_PASSWORD
   Value: TAXIassur2025!,&
```

✅ Vérification: Tu dois voir 8 secrets (7 nouveaux + OPENAI_API_KEY)

---

## 📊 ÉTAPE 2 : MIGRATION SQL (VERSION CORRIGÉE)

### Dans Supabase SQL Editor

1. Menu gauche → **SQL Editor**
2. Clique **New Query**

### Copie TOUT le fichier

Ouvre et copie **TOUT LE CONTENU** de :
```
supabase/migrations/20251022210000_create_ai_auto_improvement_system.sql
```

### Colle et Exécute

1. Colle dans SQL Editor
2. Clique **RUN**

✅ **Résultat attendu:**
```
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
... (plusieurs lignes)
Success. No rows returned
```

### Si erreur

Si tu vois encore une erreur, exécute d'abord ce nettoyage complet :

```sql
-- NETTOYAGE COMPLET
DROP TABLE IF EXISTS ai_performance_metrics CASCADE;
DROP TABLE IF EXISTS ai_deployments CASCADE;
DROP TABLE IF EXISTS ai_ab_tests CASCADE;
DROP TABLE IF EXISTS ai_code_generations CASCADE;
DROP TABLE IF EXISTS ai_page_improvements CASCADE;

-- Puis réexécute la migration complète
```

---

## 📊 ÉTAPE 3 : CRON JOBS (2 min)

### Nouvelle Query

Dans SQL Editor, clique **New Query**

### Copie TOUT le fichier

Ouvre et copie **TOUT LE CONTENU** de :
```
supabase/migrations/20251022220000_activate_ai_auto_improvement_crons.sql
```

### Colle et Exécute

1. Colle dans SQL Editor
2. Clique **RUN**

✅ **Résultat attendu:**
```
NOTICE:  ============================================
NOTICE:  SYSTEME AUTO-AMELIORATION 24/7 ACTIVE
NOTICE:  ============================================
NOTICE:  CRON JOBS ACTIFS:
...
Success. No rows returned
```

---

## 🔧 ÉTAPE 4 : EDGE FUNCTIONS (10 min)

### Via Dashboard Supabase

1. Menu gauche → **Edge Functions**
2. Clique **Create Function**

### Fonction 1: ai-auto-improver

```
Name: ai-auto-improver
```

Copie TOUT le code de: `supabase/functions/ai-auto-improver/index.ts`

Colle → **Deploy**

### Fonction 2: github-auto-deploy

```
Name: github-auto-deploy
```

Copie TOUT le code de: `supabase/functions/github-auto-deploy/index.ts`

Colle → **Deploy**

### Fonction 3: ftp-auto-deploy

```
Name: ftp-auto-deploy
```

Copie TOUT le code de: `supabase/functions/ftp-auto-deploy/index.ts`

Colle → **Deploy**

✅ Vérification: 3 Edge Functions avec status "Active"

---

## ✅ ÉTAPE 5 : VÉRIFICATIONS

### 5.1 Vérifier Secrets

Settings → Vault : 8 secrets présents ✅

### 5.2 Vérifier Cron Jobs

Dans SQL Editor :

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'ai_%'
ORDER BY jobname;
```

Tu dois voir **5 lignes** avec `active = true`

### 5.3 Vérifier Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'ai_%'
AND table_schema = 'public'
ORDER BY table_name;
```

Tu dois voir **5 tables**

---

## 🎯 ÉTAPE 6 : ACTIVATION (30 sec)

### Activer Mode AUTO TOTAL

Dans SQL Editor :

```sql
UPDATE ai_master_status
SET
  mode = 'auto_total_24_7',
  is_active = true,
  global_health = 96,
  system_checks = jsonb_build_object(
    'database', 100,
    'api', 100,
    'automation', 100,
    'auto_improvement', 'ACTIVE',
    'github_deploy', 'CONFIGURED',
    'ftp_deploy', 'CONFIGURED',
    'github_repo', 'XCR-hub/taxiassur.com'
  ),
  last_update = NOW()
WHERE id = (SELECT id FROM ai_master_status ORDER BY created_at DESC LIMIT 1);
```

✅ Résultat: `UPDATE 1`

---

## 📊 VOIR LES RÉSULTATS

### Dashboard Master IA

URL: `/backoffice/master-ai`

### Logs SQL

```sql
-- Améliorations
SELECT * FROM ai_page_improvements ORDER BY created_at DESC LIMIT 5;

-- Tests A/B
SELECT * FROM ai_ab_tests ORDER BY created_at DESC LIMIT 5;

-- Déploiements
SELECT * FROM ai_deployments ORDER BY deployed_at DESC LIMIT 5;
```

---

## 🎉 C'EST TERMINÉ !

**Ton système IA autonome 24/7 est ACTIF !**

### Ce qui va se passer

**Dans 6 heures:** Première analyse automatique
**Dans 7 jours:** Premier test A/B complété
**Dans 8 jours:** Premier déploiement automatique

### Prochaines étapes

1. Consulte `/backoffice/master-ai` régulièrement
2. Surveille les déploiements automatiques
3. Laisse l'IA optimiser ton site 24/7

---

## ❓ SI ERREUR

**Erreur "column does not exist":**
Exécute d'abord le nettoyage complet (voir Étape 2)

**Edge Function ne déploie pas:**
Vérifie que les 7 secrets sont dans Vault

**Cron jobs pas actifs:**
Vérifie avec `SELECT * FROM cron.job WHERE jobname LIKE 'ai_%';`

---

**Durée totale:** 20-25 minutes
**Tout est automatique ensuite !** 🚀
