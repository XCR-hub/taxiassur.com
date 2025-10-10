# 🔍 Guide de Vérification des Automatisations TaxiAssur

## 🎯 Objectif

Ce guide vous permet de **vérifier que toutes les automatisations sont correctes et sans erreurs**.

---

## 📋 Méthode 1 : Script de Vérification Automatique (RECOMMANDÉ)

### ▶️ Lancer le script

```bash
node scripts/verify-automations.js
```

### 📊 Le script vérifie automatiquement :

✅ **Variables d'environnement** (.env)
✅ **Connexion Supabase**
✅ **Tables de base de données**
✅ **Intégrité des données**
✅ **Politiques RLS (sécurité)**
✅ **Edge Functions déployées**
✅ **CRON jobs configurés**
✅ **Secrets Supabase**
✅ **Performance du système**

### 🎨 Résultat attendu :

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RAPPORT FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total de tests:        45
✅ Tests réussis:      42
⚠️  Avertissements:     3
❌ Tests échoués:      0
Taux de réussite:      93.3%

🎉 PARFAIT ! Tous les systèmes sont opérationnels !
```

---

## 🔧 Méthode 2 : Vérification Manuelle dans Supabase Dashboard

### 1️⃣ Vérifier les Tables

👉 URL: `https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/editor`

**Tables requises:**
- ✅ `leads` (leads clients)
- ✅ `backlink_opportunities` (opportunités SEO)
- ✅ `partner_prospects` (prospects partenaires)
- ✅ `automation_logs` (logs d'automatisation)
- ✅ `seo_content` (contenu SEO)
- ✅ `blog_posts` (articles blog)
- ✅ `faq_entries` (FAQ)
- ✅ `city_pages` (pages villes)
- ✅ `referral_codes` (codes parrainage)
- ✅ `referral_rewards` (récompenses)
- ✅ `ai_training_data` (données IA)
- ✅ `ai_performance_metrics` (métriques IA)
- ✅ `content_schedule` (planning contenu)
- ✅ `social_media_posts` (posts réseaux sociaux)

### 2️⃣ Vérifier les Edge Functions Déployées

👉 URL: `https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/functions`

**Edge Functions requises (18 au total):**

| Fonction | Description | Statut |
|----------|-------------|--------|
| `chatbot` | Chatbot IA intelligent | 🟢 |
| `send-email` | Envoi d'emails | 🟢 |
| `scan-backlinks` | Scan opportunités backlinks | 🟢 |
| `backlink-auto-outreach` | Prospection backlinks auto | 🟢 |
| `partner-scraper-outreach` | Scraping partenaires | 🟢 |
| `generate-seo-content` | Génération contenu SEO | 🟢 |
| `social-media-publisher` | Publication réseaux sociaux | 🟢 |
| `trend-analyzer-proxy` | Analyse tendances | 🟢 |
| `email-auto-responder` | Réponse emails auto | 🟢 |
| `ai-email-responder` | Réponse emails IA | 🟢 |
| `ai-social-scraper` | Scraping réseaux sociaux IA | 🟢 |
| `auto-followup` | Relance automatique leads | 🟢 |
| `auto-seo-notifier` | Notifications SEO | 🟢 |
| `serp-lead-optimizer` | Optimisation SERP leads | 🟢 |
| `cron-orchestrator` | Orchestrateur CRON | 🟢 |
| `automation-dashboard-api` | API Dashboard | 🟢 |
| `linkedin-lead-webhook` | Webhook LinkedIn | 🟢 |
| `webhook-email-receiver` | Récepteur webhooks email | 🟢 |

**Comment vérifier:**
1. Allez dans l'onglet "Edge Functions"
2. Vérifiez que toutes les fonctions apparaissent
3. Vérifiez la date de déploiement (récente)
4. Testez 1-2 fonctions avec "Invoke function"

### 3️⃣ Vérifier les CRON Jobs

👉 URL: `https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/database/cron-jobs`

**CRON Jobs requis (8 automatisations):**

| Job | Schedule | Description | Activé |
|-----|----------|-------------|--------|
| `scan_backlinks_daily` | `0 2 * * *` | Scan backlinks à 2h du matin | ☑️ |
| `auto_outreach_backlinks` | `0 10 * * *` | Prospection backlinks à 10h | ☑️ |
| `partner_scraper_weekly` | `0 9 * * 1` | Scraping partenaires le lundi 9h | ☑️ |
| `generate_seo_weekly` | `0 8 * * 1` | Génération SEO le lundi 8h | ☑️ |
| `social_media_daily` | `0 14 * * *` | Posts sociaux à 14h | ☑️ |
| `trend_analyzer_daily` | `0 6 * * *` | Analyse tendances à 6h | ☑️ |
| `auto_followup_leads` | `0 11 * * *` | Relance leads à 11h | ☑️ |
| `seo_notifier_weekly` | `0 9 * * 1` | Notifications SEO le lundi 9h | ☑️ |

**Comment vérifier:**
1. Allez dans "Database" > "Cron Jobs"
2. Vérifiez que tous les jobs apparaissent
3. Vérifiez que la colonne "Active" est cochée (✓)
4. Vérifiez la dernière exécution et le statut

### 4️⃣ Vérifier les Secrets (Variables Sensibles)

👉 URL: `https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/settings/vault`

**Secrets requis:**

| Secret | Description | Requis |
|--------|-------------|--------|
| `OPENAI_API_KEY` | Clé OpenAI pour IA | ⚠️ Critique |
| `SENDGRID_API_KEY` | Clé SendGrid pour emails | ⚠️ Critique |
| `GOOGLE_API_KEY` | Clé Google (Maps, CSE) | ⚡ Important |
| `LINKEDIN_ACCESS_TOKEN` | Token LinkedIn | ⚡ Important |
| `PAGESPEED_API_KEY` | Clé PageSpeed Insights | ✅ Optionnel |

**Comment vérifier:**
1. Allez dans "Settings" > "Vault"
2. Vérifiez que les secrets critiques (⚠️) sont présents
3. Ne partagez JAMAIS ces secrets !

### 5️⃣ Vérifier les Politiques RLS (Sécurité)

👉 URL: `https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/auth/policies`

**Pour chaque table sensible:**
- ✅ RLS activé (Row Level Security)
- ✅ Politique SELECT (lecture)
- ✅ Politique INSERT (création)
- ✅ Politique UPDATE (modification)
- ✅ Politique DELETE (suppression)

**Comment vérifier:**
1. Allez dans "Authentication" > "Policies"
2. Pour chaque table, vérifiez qu'il y a au moins 1 politique
3. La colonne "RLS Enabled" doit être ✓

### 6️⃣ Vérifier les Logs d'Automatisation

👉 URL: `https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/editor`

**SQL à exécuter:**
```sql
-- Voir les 20 dernières automatisations
SELECT
  automation_type,
  status,
  details,
  created_at
FROM automation_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Résultat attendu:**
- Plusieurs entrées récentes
- Statut = `success` majoritairement
- Aucune erreur critique répétée

---

## 🚨 Que Faire en Cas d'Erreur ?

### ❌ Erreur : "Variable d'environnement manquante"

**Solution:**
1. Ouvrez le fichier `.env` à la racine du projet
2. Ajoutez la variable manquante
3. Relancez le script de vérification

**Exemple:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ❌ Erreur : "Table introuvable"

**Solution:**
1. Allez dans Supabase Dashboard > SQL Editor
2. Exécutez les migrations manquantes:
```bash
ls supabase/migrations/*.sql
```
3. Appliquez les migrations via le Dashboard

### ❌ Erreur : "Edge Function non déployée"

**Solution:**
Déployez la fonction manquante:
```bash
# Voir le guide DEPLOY-EDGE-FUNCTION-GUIDE.md
```

### ❌ Erreur : "CRON job non actif"

**Solution:**
1. Allez dans Supabase Dashboard > Database > Cron Jobs
2. Créez le CRON job manquant
3. Activez-le en cochant "Active"

### ❌ Erreur : "Secret manquant"

**Solution:**
1. Allez dans Supabase Dashboard > Settings > Vault
2. Cliquez sur "New Secret"
3. Ajoutez le secret manquant

---

## 📊 Tableau de Bord des Automatisations

### Dashboard en Temps Réel

👉 **Accès:** `https://votresite.com/backoffice`

**Métriques affichées:**
- 🔵 **Leads aujourd'hui** (temps réel)
- 📊 **Leads cette semaine**
- 📈 **Leads ce mois-ci**
- 💰 **CA réalisé**
- 🔗 **Opportunités backlinks**
- 🤝 **Partenaires actifs**
- 📄 **Contenu SEO généré**
- 📱 **Posts réseaux sociaux**

---

## ✅ Checklist de Vérification Rapide

Utilisez cette checklist pour un diagnostic rapide :

```
☐ Variables .env configurées
☐ Connexion Supabase OK
☐ 14 tables présentes
☐ 18 Edge Functions déployées
☐ 8 CRON jobs actifs
☐ 4 secrets configurés (minimum)
☐ RLS activé sur toutes les tables
☐ Logs d'automatisation récents
☐ Performance < 1 seconde
☐ Aucune erreur critique
```

**Si tous les ☐ sont cochés ✅ → Système 100% opérationnel !**

---

## 🆘 Support & Dépannage

### Option 1: Script de Diagnostic Détaillé

```bash
node scripts/verify-automations.js > diagnostic.txt
```

Envoyez le fichier `diagnostic.txt` pour analyse.

### Option 2: Vérification Manuelle

1. Suivez les 6 étapes de la "Méthode 2" ci-dessus
2. Notez chaque erreur rencontrée
3. Référez-vous à la section "Que Faire en Cas d'Erreur"

### Option 3: Logs Supabase

👉 URL: `https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/logs/edge-functions`

- Consultez les logs des Edge Functions
- Cherchez les erreurs (icônes rouges)
- Vérifiez les timestamps

---

## 🎯 Maintenance Recommandée

### Quotidienne (automatique via CRON)
- ✅ Scan backlinks
- ✅ Publication réseaux sociaux
- ✅ Relance leads
- ✅ Analyse tendances

### Hebdomadaire (automatique)
- ✅ Génération contenu SEO
- ✅ Scraping partenaires
- ✅ Notifications SEO
- ✅ Rapports performance

### Mensuelle (manuelle)
- 🔍 Vérifier les logs d'automatisation
- 🔍 Analyser les métriques
- 🔍 Optimiser les campagnes
- 🔍 Mettre à jour les secrets si nécessaire

---

## 📞 Contact

Pour toute question sur les automatisations:
- 📧 Email: contact@taxiassur.com
- 📱 Support: Backoffice > Aide

---

**Dernière mise à jour:** 2025-10-10
**Version:** 1.0.0
