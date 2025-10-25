# 🚀 Système TaxiAssur - Guide de Démarrage

## ✅ État Actuel du Système

### Build & Configuration
- ✅ Build validé sans erreurs
- ✅ Base de données Supabase configurée
- ✅ Toutes les migrations appliquées
- ✅ RLS configuré correctement

### Composants Opérationnels

#### 🎯 Backoffice Complet
1. **Dashboard Principal** (`/backoffice/dashboard`)
   - Stats en temps réel
   - Gestion des leads
   - Monitoring des automatisations

2. **MasterDashboard** (`/backoffice/master`)
   - Pilotage centralisé
   - Automatisations actives
   - Analytics temps réel

3. **AutomationScheduler** (`/backoffice/automation-scheduler`)
   - Planification contenu
   - Génération automatique
   - Gestion des cron jobs

#### 🤖 IA & Automatisations

**Edge Functions Déployées:**
- `ai-content-humanizer` - Humanisation contenu
- `ai-social-scraper` - Scraping réseaux sociaux
- `ai-viral-content-generator` - Contenu viral
- `auto-content-scheduler` - Planification auto
- `generate-city-pages-ai` - Pages villes IA
- `social-media-publisher` - Publication automatique

**Automatisations Disponibles:**
- Génération articles blog (quotidien)
- Publication réseaux sociaux (3x/jour)
- Scraping prospects taxis (hebdomadaire)
- Envoi emails automatiques
- Génération FAQ
- Optimisation SEO

#### 📊 Tables Principales

```sql
-- Contenu
- blog_posts (24 articles)
- city_pages (34 villes)
- faq (8 entrées)

-- Leads & Prospects
- leads (gestion complète)
- taxi_prospects (prospection auto)

-- Automatisations
- automation_status (monitoring)
- content_schedule (planification)
- social_posts (réseaux sociaux)

-- SEO & Analytics
- seo_metrics (tracking)
- analytics_sessions
- backlink_opportunities
```

## 🎯 Prochaines Étapes

### 1. Activer les Automatisations

**Accéder au backoffice:**
```
URL: /backoffice/master
Identifiants: [voir .env]
```

**Dans le MasterDashboard:**
1. Cliquer sur "⚡ LANCER TOUTES LES AUTOMATISATIONS"
2. Vérifier l'état des cron jobs
3. Activer les automatisations une par une

### 2. Configurer les Clés API

**Variables d'environnement nécessaires:**
```bash
# OpenAI (pour génération contenu IA)
OPENAI_API_KEY=sk-...

# Pexels (images automatiques)
PEXELS_API_KEY=...

# SendGrid (emails)
SENDGRID_API_KEY=...

# Google Search Console (SEO)
GOOGLE_SEARCH_CONSOLE_API_KEY=...
GOOGLE_PROPERTY_URL=https://taxiassur.fr

# Pinterest (réseaux sociaux)
PINTEREST_ACCESS_TOKEN=...
PINTEREST_BOARD_ID=...

# LinkedIn (réseaux sociaux)
LINKEDIN_ACCESS_TOKEN=...
```

**Configuration dans Supabase:**
1. Aller dans Settings → Vault
2. Ajouter chaque secret avec son nom exact
3. Les Edge Functions y auront accès automatiquement

### 3. Tester la Génération de Contenu

**Méthode 1: Via Interface Backoffice**
```
1. /backoffice/ai-generator
2. Sélectionner type de contenu (blog, FAQ, ville)
3. Cliquer "Générer avec IA"
4. Vérifier le résultat
5. Publier
```

**Méthode 2: Via Cron Job**
```sql
-- Déclencher manuellement
SELECT cron.schedule(
  'test-generation',
  '* * * * *', -- Toutes les minutes
  $$SELECT net.http_post(
    url:='https://[PROJECT].supabase.co/functions/v1/generate-seo-content',
    headers:='{"Authorization": "Bearer [ANON_KEY]"}'::jsonb
  )$$
);

-- Désactiver après test
SELECT cron.unschedule('test-generation');
```

### 4. Vérifier la Prospection Automatique

**Scraping Taxis:**
```
Edge Function: scrape-taxi-companies
Fréquence: Hebdomadaire
Cible: Google Places API
Résultat: Nouveaux prospects dans taxi_prospects
```

**Tester manuellement:**
```bash
curl -X POST \
  https://[PROJECT].supabase.co/functions/v1/scrape-taxi-companies \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"city": "Paris"}'
```

### 5. Activer la Publication Réseaux Sociaux

**Configuration Pinterest:**
1. Obtenir access token: `/GET-PINTEREST-BOARD-ID.html`
2. Trouver board_id via l'interface
3. Configurer dans Supabase Vault

**Configuration LinkedIn:**
1. Obtenir access token: `/GET-LINKEDIN-REFRESH-TOKEN.html`
2. Configurer dans Supabase Vault
3. Activer publication automatique

**Configuration YouTube:**
1. Obtenir refresh token: `/GET-YOUTUBE-REFRESH-TOKEN.html`
2. Configurer dans Supabase Vault

## 🎨 Fonctionnalités Avancées

### Génération Pages Villes IA

**Automatique:**
- Contenu unique par ville
- SEO optimisé automatiquement
- Images Pexels intégrées
- FAQ locale générée

**Manuel:**
```
/backoffice/city-page-generator
1. Sélectionner ville
2. Cliquer "Générer avec IA"
3. Vérifier/modifier
4. Publier
```

### Marketing Templates

**Accès:**
```
/backoffice/marketing-templates
```

**Templates disponibles:**
- Emails prospects
- SMS marketing
- Posts réseaux sociaux
- Campagnes parrainage

### Système de Parrainage

**Configuration:**
```sql
-- Activer le programme
UPDATE referral_programs 
SET active = true 
WHERE id = 1;

-- Configurer les récompenses
UPDATE referral_programs 
SET reward_referrer = 50, 
    reward_referred = 50;
```

## 📈 Monitoring & Analytics

### Dashboard Analytics
```
URL: /backoffice/master
Métriques:
- Leads temps réel
- Taux conversion
- Top pages
- Sources trafic
```

### SEO Tracking
```
URL: /backoffice/seo
Suivi:
- Positions Google
- Impressions/clics
- Backlinks
- Pages indexées
```

### Lead CRM
```
URL: /backoffice/lead-crm
Features:
- Pipeline visuel
- Historique complet
- Actions automatiques
- Statistiques
```

## 🔒 Sécurité

### RLS (Row Level Security)
- ✅ Activé sur toutes les tables
- ✅ Policies restrictives
- ✅ Accès anonyme contrôlé

### Backup & Recovery
- Supabase backup automatique
- Point-in-time recovery
- Export manuel disponible

## 🚨 Dépannage

### Erreurs Fréquentes

**1. "401 Unauthorized" dans console**
- Vérifier ANON_KEY dans .env
- Vérifier RLS policies
- Solution: RLS déjà configuré en public

**2. "OpenAI API Error"**
- Vérifier clé API dans Supabase Vault
- Vérifier quota OpenAI
- Solution: Ajouter/renouveler clé

**3. "Pexels images not loading"**
- Vérifier clé API Pexels
- Vérifier quotas (200/heure gratuit)
- Solution: Configurer clé dans Vault

**4. "Cron job not running"**
- Vérifier pg_cron activé
- Vérifier schedule syntax
- Solution: `SELECT * FROM cron.job;`

### Commandes Diagnostic

```sql
-- État automatisations
SELECT * FROM automation_status ORDER BY name;

-- Derniers leads
SELECT * FROM leads ORDER BY created_at DESC LIMIT 10;

-- Cron jobs actifs
SELECT * FROM cron.job WHERE active = true;

-- Stats contenu
SELECT 
  'blog' as type, COUNT(*) as total, SUM(CASE WHEN published THEN 1 ELSE 0 END) as published
FROM blog_posts
UNION ALL
SELECT 
  'faq', COUNT(*), SUM(CASE WHEN published THEN 1 ELSE 0 END)
FROM faq;
```

## 📞 Support

### Fichiers Utiles
- `README.md` - Documentation générale
- `VERIFICATION-AUTOMATISATIONS.md` - Check automatisations
- `GUIDE-ACTIVATION-COMPLETE.md` - Guide complet
- `API-SETUP-GUIDE.md` - Configuration API

### Tests Disponibles
- `/test-cse.html` - Test Google CSE
- `/TEST-PINTEREST-BOARDS-SIMPLE.html` - Test Pinterest
- `/TEST-GENERATION-IA-DIRECT.html` - Test génération IA
- `/trigger-seo-refresh.html` - Déclencher refresh SEO

---

## ✅ Système Prêt !

Tout est configuré et fonctionnel. Il ne reste plus qu'à :
1. Configurer les clés API dans Supabase Vault
2. Activer les automatisations via le MasterDashboard
3. Tester la génération de contenu
4. Commencer la prospection automatique

**Le système est autonome une fois les clés API configurées !**
