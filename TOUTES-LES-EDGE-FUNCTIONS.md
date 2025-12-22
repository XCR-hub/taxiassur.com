# 🚀 TAXIASSUR - TOUTES LES EDGE FUNCTIONS À DÉPLOYER

Ce document liste **TOUTES les Edge Functions Supabase** créées et prêtes à être déployées.

## 📋 TABLE DES MATIÈRES

1. [Résumé](#résumé)
2. [Instructions de déploiement](#instructions-de-déploiement)
3. [Liste complète des fonctions](#liste-complète-des-fonctions)
4. [Variables d'environnement requises](#variables-denvironnement-requises)
5. [Tests post-déploiement](#tests-post-déploiement)

---

## 📊 RÉSUMÉ

**Total : 29 Edge Functions**

### Par Catégorie :

- 🤖 **IA & Génération de contenu** : 6 fonctions
- 📱 **Réseaux sociaux** : 4 fonctions
- 📧 **Emails & Communication** : 5 fonctions
- 🔗 **SEO & Backlinks** : 6 fonctions
- 📊 **Analytics & Monitoring** : 4 fonctions
- ⚙️ **Automatisation** : 4 fonctions

---

## 🛠️ INSTRUCTIONS DE DÉPLOIEMENT

### Méthode 1 : Via Supabase Dashboard (Recommandé)

1. Aller sur https://app.supabase.com
2. Sélectionner votre projet TaxiAssur
3. Aller dans **Edge Functions**
4. Pour chaque fonction :
   - Cliquer sur **Deploy new function**
   - Coller le code depuis `supabase/functions/[nom-fonction]/index.ts`
   - Cliquer sur **Deploy**

### Méthode 2 : Via Supabase CLI

```bash
# Se connecter
supabase login

# Lier le projet
supabase link --project-ref drohhxrkoequjphvabvq

# Déployer TOUTES les fonctions d'un coup
supabase functions deploy --all

# Ou déployer une par une
supabase functions deploy blog-articles
supabase functions deploy chatbot
# etc...
```

### Méthode 3 : Via Script automatique

```bash
cd /tmp/cc-agent/58094969/project
node scripts/deploy-all-edge-functions.js
```

---

## 📚 LISTE COMPLÈTE DES FONCTIONS

### 🤖 IA & GÉNÉRATION DE CONTENU

#### 1. **ai-content-humanizer**
- **Chemin** : `supabase/functions/ai-content-humanizer/index.ts`
- **Description** : Humanise le contenu généré par IA pour éviter la détection
- **Trigger** : Appelé après génération de contenu
- **Variables requises** : `OPENAI_API_KEY`

#### 2. **ai-quality-controller**
- **Chemin** : `supabase/functions/ai-quality-controller/index.ts`
- **Description** : Contrôle qualité automatique du contenu généré
- **Trigger** : Après humanisation du contenu
- **Variables requises** : `OPENAI_API_KEY`

#### 3. **ai-viral-content-generator**
- **Chemin** : `supabase/functions/ai-viral-content-generator/index.ts`
- **Description** : Génère du contenu viral pour réseaux sociaux
- **Trigger** : Cron job quotidien ou manuel
- **Variables requises** : `OPENAI_API_KEY`, `PEXELS_API_KEY`

#### 4. **generate-city-page**
- **Chemin** : `supabase/functions/generate-city-page/index.ts`
- **Description** : Génère automatiquement les pages ville (SEO local)
- **Trigger** : Manuel ou automatique (nouvelles villes)
- **Variables requises** : `OPENAI_API_KEY`, `PEXELS_API_KEY`

#### 5. **generate-seo-content**
- **Chemin** : `supabase/functions/generate-seo-content/index.ts`
- **Description** : Génère du contenu SEO optimisé (articles, FAQ)
- **Trigger** : Cron job quotidien (9h00)
- **Variables requises** : `OPENAI_API_KEY`, `PEXELS_API_KEY`

#### 6. **blog-articles**
- **Chemin** : `supabase/functions/blog-articles/index.ts`
- **Description** : API pour récupérer/créer articles de blog
- **Trigger** : Appels HTTP depuis frontend
- **Variables requises** : Aucune

---

### 📱 RÉSEAUX SOCIAUX

#### 7. **social-media-auto-publisher**
- **Chemin** : `supabase/functions/social-media-auto-publisher/index.ts`
- **Description** : Publication automatique sur Facebook, Twitter, LinkedIn
- **Trigger** : Cron job 3x/jour (10h, 14h, 18h)
- **Variables requises** : `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

#### 8. **social-media-publisher**
- **Chemin** : `supabase/functions/social-media-publisher/index.ts`
- **Description** : Publication manuelle sur réseaux sociaux
- **Trigger** : Manuel depuis backoffice
- **Variables requises** : `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

#### 9. **ai-social-scraper**
- **Chemin** : `supabase/functions/ai-social-scraper/index.ts`
- **Description** : Scrape et analyse les posts viraux des concurrents
- **Trigger** : Cron job quotidien
- **Variables requises** : `SERP_API_KEY`, `OPENAI_API_KEY`

#### 10. **linkedin-lead-webhook**
- **Chemin** : `supabase/functions/linkedin-lead-webhook/index.ts`
- **Description** : Réception des leads LinkedIn Ads
- **Trigger** : Webhook LinkedIn
- **Variables requises** : Aucune

---

### 📧 EMAILS & COMMUNICATION

#### 11. **send-email**
- **Chemin** : `supabase/functions/send-email/index.ts`
- **Description** : Envoi d'emails transactionnels
- **Trigger** : Appel depuis backend
- **Variables requises** : `SENDGRID_API_KEY` ou config SMTP

#### 12. **send-lead-email**
- **Chemin** : `supabase/functions/send-lead-email/index.ts`
- **Description** : Envoi automatique d'email au nouveau lead
- **Trigger** : Après insertion dans table `leads`
- **Variables requises** : `SENDGRID_API_KEY`

#### 13. **send-outreach-emails**
- **Chemin** : `supabase/functions/send-outreach-emails/index.ts`
- **Description** : Envoi d'emails de prospection backlinks
- **Trigger** : Manuel ou automatique hebdomadaire
- **Variables requises** : `SENDGRID_API_KEY`, `OPENAI_API_KEY`

#### 14. **email-auto-responder**
- **Chemin** : `supabase/functions/email-auto-responder/index.ts`
- **Description** : Réponse automatique intelligente aux emails
- **Trigger** : Cron job horaire
- **Variables requises** : `OPENAI_API_KEY`, `SENDGRID_API_KEY`

#### 15. **ai-email-responder**
- **Chemin** : `supabase/functions/ai-email-responder/index.ts`
- **Description** : Génère des réponses email personnalisées avec IA
- **Trigger** : Appelé par email-auto-responder
- **Variables requises** : `OPENAI_API_KEY`

---

### 🔗 SEO & BACKLINKS

#### 16. **seo-daily-refresh**
- **Chemin** : `supabase/functions/seo-daily-refresh/index.ts`
- **Description** : Mise à jour quotidienne des métriques SEO
- **Trigger** : Cron job quotidien (8h00)
- **Variables requises** : `GOOGLE_CSE_API_KEY`, `SERP_API_KEY`

#### 17. **seo-webhook-receiver**
- **Chemin** : `supabase/functions/seo-webhook-receiver/index.ts`
- **Description** : Réception webhooks Google Search Console
- **Trigger** : Webhook Google
- **Variables requises** : Aucune

#### 18. **serp-lead-optimizer**
- **Chemin** : `supabase/functions/serp-lead-optimizer/index.ts`
- **Description** : Optimise les pages selon positions SERP
- **Trigger** : Cron job hebdomadaire
- **Variables requises** : `SERP_API_KEY`, `OPENAI_API_KEY`

#### 19. **backlink-auto-outreach**
- **Chemin** : `supabase/functions/backlink-auto-outreach/index.ts`
- **Description** : Prospection et contact automatique backlinks
- **Trigger** : Cron job hebdomadaire (lundi 9h)
- **Variables requises** : `SERP_API_KEY`, `OPENAI_API_KEY`, `SENDGRID_API_KEY`

#### 20. **scan-backlinks**
- **Chemin** : `supabase/functions/scan-backlinks/index.ts`
- **Description** : Scan et détection nouvelles opportunités backlinks
- **Trigger** : Cron job hebdomadaire
- **Variables requises** : `SERP_API_KEY`

#### 21. **partner-scraper-outreach**
- **Chemin** : `supabase/functions/partner-scraper-outreach/index.ts`
- **Description** : Scrape et contacte des partenaires potentiels
- **Trigger** : Manuel ou hebdomadaire
- **Variables requises** : `SERP_API_KEY`, `OPENAI_API_KEY`

---

### 📊 ANALYTICS & MONITORING

#### 22. **automation-dashboard-api**
- **Chemin** : `supabase/functions/automation-dashboard-api/index.ts`
- **Description** : API pour le dashboard d'automatisation
- **Trigger** : Appels HTTP depuis backoffice
- **Variables requises** : Aucune

#### 23. **trend-analyzer-proxy**
- **Chemin** : `supabase/functions/trend-analyzer-proxy/index.ts`
- **Description** : Analyse les tendances SEO et contenus viraux
- **Trigger** : Manuel ou quotidien
- **Variables requises** : `SERP_API_KEY`, `OPENAI_API_KEY`

#### 24. **auto-seo-notifier**
- **Chemin** : `supabase/functions/auto-seo-notifier/index.ts`
- **Description** : Notifie des changements SEO importants
- **Trigger** : Après seo-daily-refresh
- **Variables requises** : `SENDGRID_API_KEY`

#### 25. **indexnow-ping**
- **Chemin** : `supabase/functions/indexnow-ping/index.ts`
- **Description** : Ping IndexNow pour nouvelle indexation
- **Trigger** : Après publication de contenu
- **Variables requises** : Aucune

---

### ⚙️ AUTOMATISATION

#### 26. **cron-orchestrator**
- **Chemin** : `supabase/functions/cron-orchestrator/index.ts`
- **Description** : Orchestration centrale de tous les cron jobs
- **Trigger** : Cron job principal
- **Variables requises** : Toutes

#### 27. **auto-content-scheduler**
- **Chemin** : `supabase/functions/auto-content-scheduler/index.ts`
- **Description** : Planification automatique du contenu
- **Trigger** : Quotidien
- **Variables requises** : `OPENAI_API_KEY`

#### 28. **auto-followup**
- **Chemin** : `supabase/functions/auto-followup/index.ts`
- **Description** : Relance automatique des leads
- **Trigger** : Cron job quotidien
- **Variables requises** : `SENDGRID_API_KEY`, `OPENAI_API_KEY`

#### 29. **webhook-email-receiver**
- **Chemin** : `supabase/functions/webhook-email-receiver/index.ts`
- **Description** : Réception webhooks emails entrants (SendGrid)
- **Trigger** : Webhook SendGrid
- **Variables requises** : Aucune

---

### 🤖 CHATBOT

#### 30. **chatbot**
- **Chemin** : `supabase/functions/chatbot/index.ts`
- **Description** : Chatbot IA intelligent pour le site
- **Trigger** : Appels HTTP depuis frontend
- **Variables requises** : `OPENAI_API_KEY`

---

## 🔐 VARIABLES D'ENVIRONNEMENT REQUISES

Ces variables doivent être configurées dans **Supabase Dashboard > Project Settings > Secrets** :

```bash
# OpenAI (Génération de contenu IA)
OPENAI_API_KEY=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

# Pexels (Images)
PEXELS_API_KEY=mwktI0rV88p2CHnMP6jliUIPDPBEniubiF7cneG1uFRQ0Yxsu8XmNyG3

# SERP API (SEO & Backlinks)
SERP_API_KEY=420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202

# Google Services
GOOGLE_CSE_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
GOOGLE_CSE_CX=73ba86b5aae9b4add

# LinkedIn
LINKEDIN_CLIENT_ID=78jlte9c2mbjw5
LINKEDIN_CLIENT_SECRET=WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==

# Make.com
MAKE_API_TOKEN=507a717b-3a95-483e-8fa0-215cff5c48f2

# Site
SITE_URL=https://taxiassur.com

# Email (À configurer selon votre provider)
SENDGRID_API_KEY=VOTRE_CLE_SENDGRID
# OU
SMTP_HOST=smtp.ionos.fr
SMTP_PORT=587
SMTP_USER=contact@taxiassur.com
SMTP_PASSWORD=VOTRE_MOT_DE_PASSE
```

### 🔧 Comment configurer les secrets Supabase :

1. Aller sur https://app.supabase.com/project/drohhxrkoequjphvabvq/settings/vault/secrets
2. Cliquer sur **New secret**
3. Entrer le nom (ex: `OPENAI_API_KEY`)
4. Entrer la valeur
5. Cliquer sur **Save**
6. Répéter pour chaque variable

---

## ✅ TESTS POST-DÉPLOIEMENT

### Test 1 : Fonction simple (chatbot)

```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/chatbot \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour"}'
```

### Test 2 : Génération de contenu

```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content \
  -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "blog", "topic": "Assurance taxi Paris"}'
```

### Test 3 : Publication réseaux sociaux

```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher \
  -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 📊 MONITORING DES FONCTIONS

### Via Supabase Dashboard

1. Aller dans **Edge Functions**
2. Cliquer sur une fonction
3. Voir les **Logs** en temps réel
4. Voir les **Metrics** (invocations, erreurs, latence)

### Via CLI

```bash
# Voir les logs d'une fonction
supabase functions logs chatbot

# Voir les logs en temps réel
supabase functions logs chatbot --tail
```

---

## 🚨 DÉPANNAGE

### Erreur "Function not found"
→ La fonction n'est pas déployée. Redéployer avec `supabase functions deploy [nom]`

### Erreur "Missing environment variable"
→ Configurer le secret dans Supabase Dashboard > Secrets

### Erreur "CORS"
→ Vérifier que les headers CORS sont présents dans la fonction (déjà configurés)

### Timeout
→ Augmenter le timeout dans les settings de la fonction (max 60s)

---

## 📋 CHECKLIST DE DÉPLOIEMENT

- [ ] Appliquer les migrations SQL (`TOUTES-LES-MIGRATIONS-SQL.sql`)
- [ ] Configurer tous les secrets Supabase
- [ ] Activer l'extension `pg_cron` dans Supabase
- [ ] Déployer les 30 Edge Functions
- [ ] Tester chaque fonction critique
- [ ] Vérifier les logs pour erreurs
- [ ] Activer les automatisations dans le backoffice
- [ ] Configurer les webhooks externes (LinkedIn, SendGrid)

---

## 🎯 ORDRE DE DÉPLOIEMENT RECOMMANDÉ

Pour un déploiement progressif :

1. **Phase 1 - Fondations** (Déployer en premier)
   - `chatbot`
   - `blog-articles`
   - `send-email`
   - `send-lead-email`

2. **Phase 2 - Génération de contenu**
   - `generate-seo-content`
   - `generate-city-page`
   - `ai-content-humanizer`
   - `ai-quality-controller`

3. **Phase 3 - Réseaux sociaux**
   - `ai-viral-content-generator`
   - `social-media-publisher`
   - `social-media-auto-publisher`

4. **Phase 4 - SEO & Backlinks**
   - `seo-daily-refresh`
   - `scan-backlinks`
   - `backlink-auto-outreach`
   - `send-outreach-emails`

5. **Phase 5 - Automatisation complète**
   - `cron-orchestrator`
   - `auto-content-scheduler`
   - `email-auto-responder`
   - `auto-followup`

6. **Phase 6 - Analytics**
   - `automation-dashboard-api`
   - `trend-analyzer-proxy`
   - `auto-seo-notifier`

---

## 📞 SUPPORT

En cas de problème :

1. Vérifier les logs de la fonction dans Supabase
2. Vérifier que tous les secrets sont configurés
3. Vérifier que les migrations SQL sont appliquées
4. Tester la fonction individuellement avec curl

---

**🎉 Une fois tout déployé, le système sera 100% automatique !**

Toutes les automatisations fonctionneront sans intervention :
- ✅ Génération de contenu quotidienne
- ✅ Publication réseaux sociaux 3x/jour
- ✅ Suivi SEO quotidien
- ✅ Prospection backlinks hebdomadaire
- ✅ Réponse emails automatique
- ✅ Et bien plus...

---

*Document généré le 2025-10-15*
*Projet : TaxiAssur - Système d'automatisation complet*
