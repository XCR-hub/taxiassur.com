# ✅ VÉRIFICATION COMPLÈTE DU SYSTÈME - GUIDE DIAGNOSTIC

**Dashboard actif :** ✅ Santé système 96%
**Déploiements visibles :** ✅ 3 déploiements détectés (2 GitHub + 1 FTP)
**Mode AUTO :** ✅ Actif

---

## 🔍 ÉTAPE 1 : VÉRIFIER CRON JOBS (30 sec)

### Dans Supabase SQL Editor

```sql
-- Voir tous les cron jobs actifs
SELECT
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE active = true
ORDER BY jobname;
```

**Résultat attendu :** Au moins 10-15 cron jobs avec `active = true`

**Cron jobs critiques à vérifier :**
- `ai_analyze_pages_cron` (toutes les 6h)
- `ai_validate_ab_tests_cron` (quotidien 03h00)
- `ai_auto_deploy_cron` (quotidien 04h00)
- `scrape_taxi_companies_daily` (quotidien 03h00)
- `auto_send_outreach_emails` (quotidien 09h00)
- `social_media_auto_publisher` (quotidien 10h00)
- `linkedin_auto_publisher` (quotidien 14h00)
- `pinterest_auto_publisher` (quotidien 11h00)

---

## 📊 ÉTAPE 2 : VÉRIFIER SCRAPING TAXIS (1 min)

### Voir si des compagnies de taxis ont été scrapées

```sql
-- Compagnies de taxis trouvées
SELECT
  company_name,
  city,
  phone,
  email,
  data_source,
  created_at
FROM taxi_prospects
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat attendu :** Des lignes avec compagnies de taxis (si le cron a déjà tourné)

**Si vide :** Le premier scraping aura lieu à 03h00 demain matin

### Déclencher un scraping manuel maintenant (optionnel)

```sql
-- Forcer un scraping immédiat pour Paris
SELECT scrape_taxi_companies('Paris');
```

---

## 📧 ÉTAPE 3 : VÉRIFIER ENVOI EMAILS (1 min)

### Voir les emails envoyés

```sql
-- Historique des emails
SELECT
  email_type,
  recipient_email,
  subject,
  status,
  sent_at,
  error_message
FROM email_logs
ORDER BY sent_at DESC
LIMIT 10;
```

**Résultat attendu :**
- `status = 'sent'` : Email envoyé avec succès
- `status = 'failed'` : Erreur (voir `error_message`)

### Si aucun email

```sql
-- Compter emails en attente d'envoi
SELECT COUNT(*) FROM partner_prospects WHERE status = 'pending';
```

**Si > 0 :** Des prospects attendent, l'email sera envoyé à 09h00 demain

### Tester envoi email maintenant (optionnel)

```sql
-- Envoyer un email de test
INSERT INTO email_logs (email_type, recipient_email, subject, status)
VALUES ('test', 'ton-email@exemple.com', 'Test système TaxiAssur', 'pending');
```

---

## 📱 ÉTAPE 4 : VÉRIFIER PUBLICATIONS RÉSEAUX SOCIAUX (1 min)

### Voir les publications programmées/publiées

```sql
-- Publications réseaux sociaux
SELECT
  platform,
  content_type,
  title,
  status,
  scheduled_for,
  published_at,
  created_at
FROM social_posts
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat attendu :**
- `status = 'published'` : Publication effectuée
- `status = 'scheduled'` : Programmé pour plus tard
- `status = 'draft'` : En attente génération contenu

### Voir les plateformes actives

```sql
-- Configuration réseaux sociaux
SELECT
  platform,
  is_active,
  access_token IS NOT NULL as token_configured,
  last_post_at
FROM social_networks
WHERE is_active = true;
```

**Résultat attendu :**
- LinkedIn, Pinterest, YouTube avec `is_active = true`
- `token_configured = true` si credentials configurés

---

## 🤖 ÉTAPE 5 : VÉRIFIER IA AUTO-AMÉLIORATION (1 min)

### Voir les améliorations générées par l'IA

```sql
-- Améliorations de pages
SELECT
  page_url,
  page_type,
  improvement_type,
  status,
  improvement_percentage,
  created_at
FROM ai_page_improvements
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat attendu :**
- 5 exemples créés lors de la migration
- Nouvelles lignes apparaîtront après la première analyse (6h)

### Voir les tests A/B actifs

```sql
-- Tests A/B en cours
SELECT
  test_name,
  page_url,
  status,
  start_date,
  duration_days,
  confidence_level
FROM ai_ab_tests
WHERE status IN ('running', 'completed')
ORDER BY start_date DESC
LIMIT 5;
```

### Voir les déploiements

```sql
-- Déploiements automatiques (tu en as déjà 3!)
SELECT
  deployment_type,
  target,
  status,
  triggered_by,
  deployed_at,
  error_message
FROM ai_deployments
ORDER BY deployed_at DESC
LIMIT 10;
```

---

## 📈 ÉTAPE 6 : VÉRIFIER DONNÉES SEO (1 min)

### Voir les métriques SEO synchronisées

```sql
-- Données Google Search Console
SELECT
  page_url,
  impressions,
  clicks,
  ctr,
  position,
  date
FROM seo_metrics
ORDER BY date DESC, impressions DESC
LIMIT 10;
```

**Si vide :** La synchronisation Google Search Console n'a pas encore tourné

### Voir les pages indexées

```sql
-- Pages de villes créées
SELECT
  city_name,
  region,
  slug,
  published,
  created_at
FROM city_pages
WHERE published = true
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 ÉTAPE 7 : DÉCLENCHER ACTIONS MANUELLES (TEST)

### Forcer génération contenu blog maintenant

```sql
-- Générer un article de blog via IA
SELECT generate_blog_post_ai(
  'Comment économiser sur son assurance taxi en 2025',
  'blog',
  ARRAY['assurance taxi', 'économie', 'conseils']
);
```

### Forcer publication LinkedIn maintenant

```sql
-- Publier sur LinkedIn
SELECT publish_to_social_media(
  'linkedin',
  'Découvrez nos nouvelles offres assurance taxi 2025 ! 🚕',
  'https://taxiassur.com/assurance-taxi'
);
```

### Forcer scraping taxis Paris maintenant

```sql
-- Scraper compagnies de taxis à Paris
SELECT scrape_taxi_companies('Paris');
```

---

## ✅ ÉTAPE 8 : VÉRIFICATION SANTÉ GLOBALE

### Dashboard unique - Tout en un

```sql
-- Vue complète de la santé système
SELECT
  'Cron Jobs' as category,
  COUNT(*) as total,
  SUM(CASE WHEN active THEN 1 ELSE 0 END) as active_count
FROM cron.job
UNION ALL
SELECT
  'Taxi Prospects',
  COUNT(*),
  COUNT(*) FILTER (WHERE contacted_at IS NULL)
FROM taxi_prospects
UNION ALL
SELECT
  'Social Posts',
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'published')
FROM social_posts
UNION ALL
SELECT
  'Email Logs',
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'sent')
FROM email_logs
UNION ALL
SELECT
  'AI Improvements',
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'deployed')
FROM ai_page_improvements
UNION ALL
SELECT
  'Deployments',
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'success')
FROM ai_deployments;
```

**Résultat attendu :**
```
Cron Jobs        | 15-20 total | 15-20 actifs
Taxi Prospects   | 0-50        | 0-50 non contactés
Social Posts     | 0-10        | 0-5 publiés
Email Logs       | 0-20        | 0-15 envoyés
AI Improvements  | 5           | 2 déployés
Deployments      | 3-5         | 3-5 success
```

---

## 🚨 DIAGNOSTICS ERREURS

### Si cron jobs pas actifs

```sql
-- Réactiver tous les cron jobs
UPDATE cron.job SET active = true WHERE active = false;
```

### Si emails pas envoyés

**Vérifier SendGrid configuré :**
```sql
SELECT * FROM vault.secrets WHERE name = 'SENDGRID_API_KEY';
```

**Si vide :** Configure SENDGRID_API_KEY dans Supabase Vault

### Si publications réseaux sociaux échouent

**Vérifier tokens OAuth :**
```sql
SELECT
  platform,
  access_token IS NOT NULL as has_token,
  token_expires_at
FROM social_networks;
```

**Si `has_token = false` :** Reconnecter les comptes sociaux via backoffice

---

## 📊 MONITORING EN TEMPS RÉEL

### Logs des Edge Functions

1. Va dans Supabase Dashboard
2. Menu **Edge Functions**
3. Clique sur chaque fonction pour voir les logs

**Fonctions critiques :**
- `ai-auto-improver` : Logs génération améliorations
- `github-auto-deploy` : Logs push GitHub
- `ftp-auto-deploy` : Logs upload IONOS
- `scrape-taxi-companies` : Logs scraping
- `send-outreach-emails` : Logs envoi emails

---

## ⏰ CALENDRIER DES AUTOMATISATIONS

**03h00 - Scraping & Validation**
- Scraping compagnies taxis (8 villes)
- Validation tests A/B

**04h00 - Déploiement**
- Déploiement automatique si améliorations validées

**09h00 - Emails**
- Envoi emails prospection partenaires

**10h00 - Réseaux Sociaux**
- Publication automatique contenu

**11h00 - Pinterest**
- Publication pins automatiques

**14h00 - LinkedIn**
- Publication posts professionnels

**Toutes les 6h**
- Analyse pages et génération améliorations IA

**Toutes les heures**
- Monitoring et auto-correction

**Toutes les 30min**
- Collecte métriques performance

---

## 🎯 ACTIONS IMMÉDIATES RECOMMANDÉES

### 1. Tester scraping maintenant (optionnel)

```sql
SELECT scrape_taxi_companies('Paris');
SELECT scrape_taxi_companies('Lyon');
SELECT scrape_taxi_companies('Marseille');
```

### 2. Voir résultats scraping

```sql
SELECT * FROM taxi_prospects ORDER BY created_at DESC LIMIT 20;
```

### 3. Forcer publication test LinkedIn

```sql
INSERT INTO social_posts (platform, content_type, title, content, status)
VALUES (
  'linkedin',
  'announcement',
  'Test publication automatique',
  'Notre système IA est maintenant actif ! 🚀',
  'scheduled'
);
```

---

## ✅ CHECKLIST FINALE

```
□ Cron jobs actifs (15+)
□ Scraping configuré (8 villes)
□ Emails envoyés ou programmés
□ Publications sociales créées
□ IA améliorations générées (5 exemples)
□ Déploiements effectués (3 visibles)
□ Edge Functions actives (toutes)
□ Secrets configurés (8 dans Vault)
□ Dashboard accessible (/backoffice/master-ai)
□ Santé système > 90%
```

---

## 🎉 TON SYSTÈME EST OPÉRATIONNEL !

**Ce que tu vois déjà :**
- ✅ 3 déploiements effectués (2 GitHub + 1 FTP)
- ✅ Dashboard IA actif (96% santé)
- ✅ Mode AUTO activé
- ✅ Scraping programmé

**Prochaines 24h :**
- Scraping automatique à 03h00
- Emails envoyés à 09h00
- Publications sociales à 10h00-14h00

**Surveillance :**
- Consulte `/backoffice/master-ai` quotidiennement
- Vérifie les logs SQL ci-dessus
- Surveille emails envoyés et publications

---

**Ton IA travaille maintenant 24/7 ! 🚀**
