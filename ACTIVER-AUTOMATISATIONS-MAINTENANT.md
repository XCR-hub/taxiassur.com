# 🚨 ACTIVER LES AUTOMATISATIONS MAINTENANT

## ❌ Problème Constaté

**Aucun nouvel article créé aujourd'hui (15 octobre)**
- Les articles affichés datent du 13-14 octobre
- Les automatisations ne fonctionnent PAS

**Cause** : Les CRON jobs ne sont PAS activés dans Supabase

---

## ✅ SOLUTION EN 3 ÉTAPES (10 SECONDES)

### ÉTAPE 1 : Ouvre Supabase SQL Editor

1. Va sur : https://supabase.com/dashboard
2. Sélectionne ton projet TaxiAssur
3. Menu gauche : **"SQL Editor"**
4. Clique sur **"+ New Query"**

### ÉTAPE 2 : Colle ce code et exécute

**Copie-colle ce code SQL et clique "RUN" :**

```sql
-- 1. Activer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Donner les permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 3. Créer les 7 automatisations principales

-- A) Génération de contenu quotidienne (6h du matin)
SELECT cron.schedule(
  'daily_content_generation',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU1MjI4OCwiZXhwIjoyMDQ2MTI4Mjg4fQ.mVCEZCZJ-zrqLFSO9DG6Y8kx4_0VQQxLJH8XNwPPNpQ"}'::jsonb,
    body := '{"action": "generate_daily_content"}'::jsonb
  );
  $$
);

-- B) Relance leads automatique (9h du matin)
SELECT cron.schedule(
  'daily_lead_followup',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-followup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU1MjI4OCwiZXhwIjoyMDQ2MTI4Mjg4fQ.mVCEZCZJ-zrqLFSO9DG6Y8kx4_0VQQxLJH8XNwPPNpQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- C) Traitement emails (toutes les heures)
SELECT cron.schedule(
  'hourly_process_emails',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/email-auto-responder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU1MjI4OCwiZXhwIjoyMDQ2MTI4Mjg4fQ.mVCEZCZJ-zrqLFSO9DG6Y8kx4_0VQQxLJH8XNwPPNpQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- D) Publications réseaux sociaux (14h)
SELECT cron.schedule(
  'daily_social_media',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU1MjI4OCwiZXhwIjoyMDQ2MTI4Mjg4fQ.mVCEZCZJ-zrqLFSO9DG6Y8kx4_0VQQxLJH8XNwPPNpQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- E) Prospection partenaires (Lundi et Jeudi 10h)
SELECT cron.schedule(
  'twice_weekly_partner_outreach',
  '0 10 * * 1,4',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/partner-scraper-outreach',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU1MjI4OCwiZXhwIjoyMDQ2MTI4Mjg4fQ.mVCEZCZJ-zrqLFSO9DG6Y8kx4_0VQQxLJH8XNwPPNpQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- F) Scan backlinks (tous les jours 23h)
SELECT cron.schedule(
  'daily_backlink_scan',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU1MjI4OCwiZXhwIjoyMDQ2MTI4Mjg4fQ.mVCEZCZJ-zrqLFSO9DG6Y8kx4_0VQQxLJH8XNwPPNpQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- G) Rapport hebdomadaire (Dimanche 12h)
SELECT cron.schedule(
  'weekly_performance_report',
  '0 12 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/cron-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU1MjI4OCwiZXhwIjoyMDQ2MTI4Mjg4fQ.mVCEZCZJ-zrqLFSO9DG6Y8kx4_0VQQxLJH8XNwPPNpQ"}'::jsonb,
    body := '{"action": "weekly_report"}'::jsonb
  );
  $$
);

-- 4. Vérifier que tout est activé
SELECT
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobname;
```

### ÉTAPE 3 : Vérifie que c'est activé

Tu devrais voir **7 jobs avec "active = true"** :
- ✅ daily_backlink_scan
- ✅ daily_content_generation
- ✅ daily_lead_followup
- ✅ daily_social_media
- ✅ hourly_process_emails
- ✅ twice_weekly_partner_outreach
- ✅ weekly_performance_report

---

## 🔥 TEST IMMÉDIAT (Sans Attendre Demain 6h)

Pour tester MAINTENANT sans attendre :

```sql
-- Lance manuellement la génération de contenu
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU1MjI4OCwiZXhwIjoyMDQ2MTI4Mjg4fQ.mVCEZCZJ-zrqLFSO9DG6Y8kx4_0VQQxLJH8XNwPPNpQ"}'::jsonb,
  body := '{"action": "generate_daily_content", "count": 3}'::jsonb
);
```

**Dans 2-3 minutes** :
- Rafraîchis https://taxiassur.fr/blog
- Tu devrais voir **3 nouveaux articles datés d'aujourd'hui** !

---

## 📊 CE QUI VA SE PASSER MAINTENANT

### Tous les jours à 6h :
- 5 nouveaux articles blog générés automatiquement
- Topics basés sur les tendances du moment
- SEO optimisé + images Pexels

### Tous les jours à 9h :
- Relance automatique des leads non contactés
- Email personnalisé selon le statut

### Toutes les heures :
- Traitement des emails reçus
- Réponses automatiques IA

### Tous les jours à 14h :
- Publication automatique sur réseaux sociaux
- Contenu adapté par plateforme

### Lundi et Jeudi à 10h :
- Prospection de 10 nouveaux partenaires
- Email d'outreach personnalisé

### Tous les jours à 23h :
- Scan des backlinks concurrents
- Détection nouvelles opportunités

### Dimanche à 12h :
- Rapport hebdomadaire complet
- Suggestions d'amélioration IA

---

## ✅ CHECKLIST FINALE

- [ ] Extension pg_cron activée
- [ ] 7 CRON jobs créés
- [ ] Tous les jobs "active = true"
- [ ] Test manuel réussi
- [ ] Nouveaux articles visibles sur /blog
- [ ] Nouvelles FAQ visibles sur /faq
- [ ] Logs sans erreur

**UNE FOIS FAIT** :
- Le système tourne 100% en autonomie
- Contenu frais tous les jours
- Leads traités automatiquement
- Réseaux sociaux actifs
- Backlinks en croissance

---

## 🚀 TEMPS ESTIMÉ : 10 SECONDES

1. Copie le code SQL (3 secondes)
2. Colle dans Supabase SQL Editor (2 secondes)
3. Clique "RUN" (1 seconde)
4. Vérifie les 7 jobs créés (4 secondes)

**TOTAL : 10 secondes pour activer tout le système !** ⚡
