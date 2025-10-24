# 🕐 GUIDE COMPLET - CONFIGURATION CRON JOBS SUPABASE

## ✅ ACTIVATION EN 10 MINUTES

---

## MÉTHODE 1 : Via Supabase Dashboard (RECOMMANDÉ - Plus Simple)

### Étape 1 : Activer l'Extension pg_cron

```
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet TaxiAssur
3. Menu gauche → Database → Extensions
4. Chercher "pg_cron" dans la liste
5. Cliquer sur le toggle pour activer
6. Attendre 10 secondes → Status "Active" (vert)
```

**OU via SQL Editor :**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

### Étape 2 : Récupérer Vos Identifiants

**2.1 - Project URL**
```
1. Menu gauche → Project Settings → API
2. Copier "Project URL"
   Exemple : https://abcdefghijklmnop.supabase.co
3. Extraire le REF (partie avant .supabase.co)
   REF = abcdefghijklmnop
```

**2.2 - Service Role Key**
```
1. Toujours dans Project Settings → API
2. Section "Project API keys"
3. Copier "service_role" (secret) key
   ⚠️ ATTENTION : Ne jamais exposer publiquement cette clé !
   
Exemple : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk1MDAwMDAwLCJleHAiOjE4NTI3NjY0MDB9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### Étape 3 : Créer les Cron Jobs

#### Cron Job 1 : Scraping Social (Toutes les 6h)

**Dans SQL Editor, copier/coller :**

```sql
SELECT cron.schedule(
  'ai-social-scraper-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE_REF_PROJET.supabase.co/functions/v1/ai-social-scraper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);
```

**⚠️ REMPLACER :**
- `VOTRE_REF_PROJET` par votre ref (ex: `abcdefghijklmnop`)
- `VOTRE_SERVICE_ROLE_KEY` par votre service_role key complète

**Exemple concret :**
```sql
SELECT cron.schedule(
  'ai-social-scraper-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://abcdefghijklmnop.supabase.co/functions/v1/ai-social-scraper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk1MDAwMDAwLCJleHAiOjE4NTI3NjY0MDB9.XXXX'
    )
  ) AS request_id;
  $$
);
```

**Cliquer "Run"** → Devrait retourner : `Rows: 1` ou `Success`

---

#### Cron Job 2 : Email Auto-Responder (Toutes les 30 min)

```sql
SELECT cron.schedule(
  'ai-email-responder-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE_REF_PROJET.supabase.co/functions/v1/ai-email-responder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object(
      'action', 'process_pending'
    )
  ) AS request_id;
  $$
);
```

---

#### Cron Job 3 : Calcul Stats Ambassadeurs (Quotidien à minuit)

```sql
SELECT cron.schedule(
  'calculate-ambassador-rankings-daily',
  '0 0 * * *',
  $$
  SELECT calculate_monthly_rankings();
  $$
);
```

---

#### Cron Job 4 : Monitoring Engagement (Toutes les heures)

```sql
SELECT cron.schedule(
  'engagement-monitoring-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE_REF_PROJET.supabase.co/functions/v1/ai-engagement-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);
```

---

### Étape 4 : Vérifier les Cron Jobs

```sql
-- Voir tous les crons actifs
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
ORDER BY jobid;
```

**Devrait retourner :**
```
jobid | jobname                              | schedule     | active | database
------|--------------------------------------|--------------|--------|----------
1     | ai-social-scraper-6h                 | 0 */6 * * *  | true   | postgres
2     | ai-email-responder-30min             | */30 * * * * | true   | postgres
3     | calculate-ambassador-rankings-daily  | 0 0 * * *    | true   | postgres
4     | engagement-monitoring-hourly         | 0 * * * *    | true   | postgres
```

---

### Étape 5 : Tester un Cron Manuellement

**Forcer exécution immédiate (sans attendre schedule) :**

```sql
-- Tester scraping social
SELECT net.http_post(
  url := 'https://VOTRE_REF_PROJET.supabase.co/functions/v1/ai-social-scraper',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY'
  )
);
```

**Vérifier résultat :**

```sql
-- Voir posts scrapés
SELECT COUNT(*), platform 
FROM social_posts_scraped 
WHERE scraped_at > NOW() - INTERVAL '10 minutes'
GROUP BY platform;
```

---

## MÉTHODE 2 : Via SQL Direct (Alternative)

Si vous préférez tout configurer d'un coup, voici le script complet :

```sql
-- 1. Activer extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Définir vos variables (REMPLACER ICI)
DO $$
DECLARE
  project_url TEXT := 'https://VOTRE_REF_PROJET.supabase.co';
  service_key TEXT := 'VOTRE_SERVICE_ROLE_KEY';
BEGIN

  -- 3. Créer tous les cron jobs
  
  -- Scraping social (6h)
  PERFORM cron.schedule(
    'ai-social-scraper-6h',
    '0 */6 * * *',
    format(
      'SELECT net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s''))',
      project_url || '/functions/v1/ai-social-scraper',
      service_key
    )
  );

  -- Email responder (30min)
  PERFORM cron.schedule(
    'ai-email-responder-30min',
    '*/30 * * * *',
    format(
      'SELECT net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s''))',
      project_url || '/functions/v1/ai-email-responder',
      service_key
    )
  );

  -- Rankings (quotidien)
  PERFORM cron.schedule(
    'calculate-ambassador-rankings-daily',
    '0 0 * * *',
    'SELECT calculate_monthly_rankings()'
  );

  -- Monitoring (hourly)
  PERFORM cron.schedule(
    'engagement-monitoring-hourly',
    '0 * * * *',
    format(
      'SELECT net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s''))',
      project_url || '/functions/v1/ai-engagement-monitor',
      service_key
    )
  );

END $$;
```

---

## 📅 COMPRENDRE LA SYNTAXE CRON

```
Format : * * * * *
         │ │ │ │ │
         │ │ │ │ └─── Jour semaine (0-6, 0=Dimanche)
         │ │ │ └───── Mois (1-12)
         │ │ └─────── Jour du mois (1-31)
         │ └───────── Heure (0-23)
         └─────────── Minute (0-59)
```

**Exemples pratiques :**

```
'0 */6 * * *'     → Toutes les 6 heures (00:00, 06:00, 12:00, 18:00)
'*/30 * * * *'    → Toutes les 30 minutes
'0 * * * *'       → Toutes les heures à :00
'0 0 * * *'       → Tous les jours à minuit
'0 9 * * 1'       → Tous les lundis à 9h
'0 0 1 * *'       → 1er de chaque mois à minuit
'*/15 9-17 * * 1-5' → Toutes les 15min, de 9h à 17h, lundi-vendredi
```

---

## 🔧 GESTION DES CRONS

### Voir Historique Exécutions

```sql
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### Voir Dernière Exécution Par Job

```sql
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  MAX(r.start_time) as last_run,
  MAX(r.status) as last_status
FROM cron.job j
LEFT JOIN cron.job_run_details r ON j.jobid = r.jobid
GROUP BY j.jobid, j.jobname, j.schedule, j.active
ORDER BY last_run DESC;
```

### Désactiver un Cron (sans le supprimer)

```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'ai-social-scraper-6h';
```

### Réactiver un Cron

```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'ai-social-scraper-6h';
```

### Supprimer un Cron

```sql
SELECT cron.unschedule('ai-social-scraper-6h');
```

### Modifier Schedule d'un Cron

```sql
-- Supprimer ancien
SELECT cron.unschedule('ai-social-scraper-6h');

-- Recréer avec nouveau schedule (ex: toutes les 4h)
SELECT cron.schedule(
  'ai-social-scraper-4h',
  '0 */4 * * *',
  $$ ... $$
);
```

---

## 🐛 TROUBLESHOOTING

### Problème 1 : Cron ne s'exécute pas

**Vérifier si actif :**
```sql
SELECT * FROM cron.job WHERE jobname = 'ai-social-scraper-6h';
```

Si `active = false` :
```sql
UPDATE cron.job SET active = true WHERE jobname = 'ai-social-scraper-6h';
```

---

### Problème 2 : Erreur "extension pg_cron does not exist"

```sql
-- Dans SQL Editor :
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ou via Dashboard :
Database → Extensions → Activer "pg_cron"
```

---

### Problème 3 : Cron s'exécute mais erreur

**Voir erreurs :**
```sql
SELECT 
  jobname,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 10;
```

**Causes fréquentes :**
- ❌ URL Edge Function incorrecte
- ❌ Service Role Key invalide
- ❌ Edge Function non déployée
- ❌ Timeout (fonction trop lente)

---

### Problème 4 : Edge Function timeout

**Augmenter timeout (max 55s) :**

Dans votre Edge Function :
```typescript
Deno.serve({
  timeout: 55000, // 55 secondes max
}, async (req: Request) => {
  // ...
});
```

---

### Problème 5 : Trop d'exécutions (spam)

**Vérifier schedule :**
```sql
SELECT jobname, schedule FROM cron.job;
```

Si schedule trop fréquent, modifier :
```sql
SELECT cron.unschedule('nom-du-job');
-- Recréer avec schedule moins fréquent
```

---

## 📊 MONITORING PRODUCTION

### Dashboard SQL Custom

```sql
-- Stats Crons (à exécuter quotidiennement)
WITH cron_stats AS (
  SELECT 
    j.jobname,
    COUNT(r.runid) as total_runs,
    COUNT(*) FILTER (WHERE r.status = 'succeeded') as success_count,
    COUNT(*) FILTER (WHERE r.status = 'failed') as failed_count,
    AVG(EXTRACT(EPOCH FROM (r.end_time - r.start_time))) as avg_duration_seconds
  FROM cron.job j
  LEFT JOIN cron.job_run_details r ON j.jobid = r.jobid
  WHERE r.start_time > NOW() - INTERVAL '24 hours'
  GROUP BY j.jobid, j.jobname
)
SELECT 
  jobname,
  total_runs,
  success_count,
  failed_count,
  ROUND((success_count::decimal / NULLIF(total_runs, 0) * 100), 2) as success_rate_percent,
  ROUND(avg_duration_seconds::numeric, 2) as avg_duration_sec
FROM cron_stats
ORDER BY failed_count DESC, jobname;
```

---

## 🎯 CONFIGURATION RECOMMANDÉE

### Mode Test (Semaine 1)

```sql
-- Scraping peu fréquent pour tester
'0 */12 * * *'  -- Toutes les 12h

-- Email responder manuel (pas de cron)
-- Monitoring désactivé
```

### Mode Production (Après tests)

```sql
-- Scraping optimisé
'0 */6 * * *'   -- Toutes les 6h (4x/jour)

-- Email responder actif
'*/30 * * * *'  -- Toutes les 30min

-- Rankings quotidien
'0 1 * * *'     -- 1h du matin (éviter minuit = trafic élevé)

-- Monitoring hourly
'0 * * * *'     -- Toutes les heures
```

### Mode Scale (3+ mois)

```sql
-- Scraping intensif
'0 */4 * * *'   -- Toutes les 4h (6x/jour)

-- Email instant
'*/10 * * * *'  -- Toutes les 10min

-- Monitoring fréquent
'*/15 * * * *'  -- Toutes les 15min
```

---

## ✅ CHECKLIST FINALE

```
□ Extension pg_cron activée
□ Project REF récupéré
□ Service Role Key récupérée
□ Cron scraping créé (6h)
□ Cron email créé (30min)
□ Cron rankings créé (daily)
□ Cron monitoring créé (hourly)
□ Test manuel exécuté
□ Historique vérifié
□ Aucune erreur dans logs
□ Posts scrapés confirmés (table)
□ Stats mises à jour confirmées
```

---

## 🚀 RÉSULTAT ATTENDU

**Après 24h :**
```
✅ 4 exécutions scraping (toutes les 6h)
✅ 48 exécutions email responder (toutes les 30min)
✅ 1 exécution rankings (minuit)
✅ 24 exécutions monitoring (hourly)
✅ 50+ posts scrapés total
✅ 15+ réponses générées
✅ 0 erreurs
```

**Vérification SQL :**
```sql
-- Posts scrapés dernières 24h
SELECT COUNT(*) FROM social_posts_scraped 
WHERE scraped_at > NOW() - INTERVAL '24 hours';
-- Devrait retourner : 40-60

-- Réponses générées dernières 24h
SELECT COUNT(*) FROM ai_responses_generated 
WHERE generated_at > NOW() - INTERVAL '24 hours';
-- Devrait retourner : 10-20
```

---

**Vos Crons sont maintenant configurés ! Le système tourne en automatique 24/7.** ⏰🤖

Besoin d'aide ? Voir section Troubleshooting ci-dessus.
