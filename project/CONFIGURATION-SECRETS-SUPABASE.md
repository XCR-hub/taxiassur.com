# 🔐 Configuration Secrets Supabase - Guide Complet

**Date** : 2025-10-09
**Projet** : TaxiAssur Production
**URL Supabase** : https://drohhxrkoequjphvabvq.supabase.co

---

## ✅ Ce Qui a Été Corrigé

### Ancienne Configuration (❌ FAUSSE)
```bash
VITE_SUPABASE_URL=https://viuuznfqkauatkjcegcj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...D0wo88ypG2OiZL3wCiUGgMyA3OaqzIjKU2Nbo-oxOjA
```

### Nouvelle Configuration (✅ CORRECTE)
```bash
VITE_SUPABASE_URL=https://drohhxrkoequjphvabvq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg
```

---

## 🎯 Où Mettre les Clés API ?

### 1. Pour le Site Web Frontend (.env)

**Fichier** : `/project/.env`

**Status** : ✅ **DÉJÀ MIS À JOUR**

```bash
# ========================================
# SUPABASE - PRODUCTION
# ========================================
VITE_SUPABASE_URL=https://drohhxrkoequjphvabvq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg

# ========================================
# APIs EXTERNES (Déjà configurées ✅)
# ========================================
VITE_OPENAI_API_KEY=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
VITE_SERP_API_KEY=420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202
VITE_MAKE_API_TOKEN=507a717b-3a95-483e-8fa0-215cff5c48f2
VITE_LINKEDIN_CLIENT_ID=78jlte9c2mbjw5
VITE_LINKEDIN_CLIENT_SECRET=WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==
```

**Action** : ✅ Rien à faire, déjà configuré !

---

### 2. Pour les Edge Functions (Secrets Supabase)

**Localisation** : Supabase Dashboard → Settings → Edge Functions

**2 Méthodes Possibles** :

#### Méthode A : Via le Dashboard (RECOMMANDÉ)

1. **Allez sur** : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/functions
2. **Section** : "Secrets" (en bas de la page)
3. **Cliquez** : "+ Add new secret"

#### Méthode B : Via Vault (ALPHA)

D'après votre screenshot, vous avez "Vault (ALPHA)" dans le menu.

1. **Cliquez** : Vault (ALPHA) → ↗️ (s'ouvre dans nouvel onglet)
2. **Ajoutez** les secrets un par un

---

## 🔑 Secrets à Ajouter (Edge Functions)

### Secrets REQUIS (🔴 Bloquant)

```bash
# 1. OpenAI (pour génération contenu)
OPENAI_API_KEY=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

# 2. SendGrid (pour emails automatiques)
SENDGRID_API_KEY=SG.XXXXX  # ⚠️ À CRÉER sur sendgrid.com
FROM_EMAIL=contact@taxiassur.com
```

### Secrets AUTOMATIQUES (✅ Déjà Configurés)

Ces secrets sont **automatiquement disponibles** dans toutes les Edge Functions :

```bash
# Supabase (auto-configuré)
SUPABASE_URL=https://drohhxrkoequjphvabvq.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg
SUPABASE_SERVICE_ROLE_KEY=(secret, déjà configuré automatiquement)
```

**Pas besoin de les ajouter manuellement !**

### Secrets OPTIONNELS (🟡 Améliore performance)

```bash
# LinkedIn (pour publication auto)
LINKEDIN_CLIENT_ID=78jlte9c2mbjw5
LINKEDIN_CLIENT_SECRET=WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==

# Google CSE (pour prospection partenaires)
GOOGLE_CSE_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
GOOGLE_CSE_CX=73ba86b5aae9b4add

# SERP API (pour analyse concurrence)
SERP_API_KEY=420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202

# Make.com (pour automation avancée)
MAKE_API_TOKEN=507a717b-3a95-483e-8fa0-215cff5c48f2
MAKE_SECRET=taxiassur_webhook_secret_2024
```

---

## 📋 Checklist d'Activation

### Phase 1 : Vérification (2 min)

```bash
✅ 1. .env mis à jour avec bonnes URLs Supabase
✅ 2. Build réussi avec nouvelles URLs
□ 3. Leads visibles dans Supabase (5 leads trouvés ✅)
```

### Phase 2 : Configuration Secrets (10 min)

```bash
□ 1. Ouvrir Supabase Dashboard
   URL : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq

□ 2. Aller dans Settings → Edge Functions

□ 3. Section "Secrets" → Ajouter :

   OPENAI_API_KEY=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

   SENDGRID_API_KEY=SG.XXXXX (à créer sur sendgrid.com)

   FROM_EMAIL=contact@taxiassur.com

□ 4. Sauvegarder chaque secret
```

### Phase 3 : Activation CRON (5 min)

```bash
□ 1. Ouvrir Supabase SQL Editor

□ 2. Exécuter :
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   CREATE EXTENSION IF NOT EXISTS pg_net;

□ 3. Vérifier :
   SELECT * FROM automation_schedule;

   Résultat attendu : 7 jobs listés
```

---

## 🎯 Navigation Exacte (Screenshots)

### Dans Votre Dashboard (Image 1)

```
Project Settings
├── General settings
│   └── Project name: taxiassur-production
│   └── Project ID: drohhxrkoequjphvabvq ✅
```

### Dans Settings (Image 2)

```
Settings (Menu gauche)
├── General
├── Compute and Disk
├── Infrastructure
├── Integrations
├── Log Drains
├── Data API
├── API Keys → NEW ← VOUS ÊTES ICI
│   ├── Create API keys
│   ├── Publishable key (anon) ✅
│   └── Secret keys
├── JWT Keys → NEW
├── Add Ons
└── Vault → ALPHA ← OPTION 2 POUR SECRETS
```

### Où Ajouter les Secrets ?

**Option 1 (Recommandé)** : Settings → **Edge Functions** (pas dans le screenshot mais existe)

**Option 2** : Settings → **Vault (ALPHA)** (visible dans votre screenshot)

**Option 3** : Via CLI (si installé) :
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## 🔍 Vérification : Leads Bien Présents

**Requête effectuée** :
```sql
SELECT * FROM leads ORDER BY created_at DESC LIMIT 5;
```

**Résultat** : ✅ **5 leads trouvés !**

| Nom | Email | Ville | Status | Lead Status |
|-----|-------|-------|--------|-------------|
| Jean Dupont | jean.dupont@email.com | Paris | Taxi | Nouveau |
| Marie Martin | marie.martin@email.com | Lyon | VTC | Contacté |
| Ahmed Benali | ahmed.benali@email.com | Marseille | Taxi | Devis envoyé |
| Sophie Dubois | sophie.dubois@email.com | Toulouse | Taxi | Client |
| Pierre Lefebvre | pierre.lefebvre@email.com | Nice | Taxi | Nouveau |

**Conclusion** : Les leads sont bien dans la base ! Il faut juste :
1. ✅ Mettre à jour l'URL Supabase (fait !)
2. ⏳ Ajouter secrets Edge Functions
3. ⏳ Activer pg_cron

---

## 🚀 Après Configuration Complète

### Ce Qui Va Se Passer Automatiquement

#### Tous les jours à 6h
- Génération de 5 articles SEO
- Publication automatique sur le site

#### Tous les jours à 9h
- Relance Jean Dupont (nouveau)
- Relance Pierre Lefebvre (nouveau)
- Emails personnalisés selon profil

#### Lundi et Jeudi à 10h
- Scan 50 partenaires potentiels
- Emails outreach automatiques

#### Tous les jours à 14h
- Envoi des emails en attente
- Tracking ouvertures/clics

---

## 📞 Besoin d'Aide ?

### SendGrid API Key (Requis)

1. **Créer compte** : https://sendgrid.com/signup
2. **Gratuit** : 100 emails/jour (suffisant pour démarrer)
3. **Obtenir clé** : Settings → API Keys → Create API Key
4. **Choisir** : "Full Access" ou "Restricted Access" (Mail Send)
5. **Copier** : La clé commence par `SG.`
6. **Ajouter** : Dans Supabase secrets

### Vérifier que Tout Fonctionne

```sql
-- 1. Vérifier extensions
SELECT name, installed_version
FROM pg_available_extensions
WHERE name IN ('pg_cron', 'pg_net')
ORDER BY name;

-- 2. Vérifier jobs CRON
SELECT job_name, enabled, cron_expression
FROM automation_schedule
ORDER BY job_name;

-- 3. Vérifier leads
SELECT COUNT(*) as total_leads,
       COUNT(*) FILTER (WHERE lead_status = 'nouveau') as nouveaux,
       COUNT(*) FILTER (WHERE lead_status = 'contacte') as contactes
FROM leads;
```

---

## 🎯 Résumé Ultra-Rapide

### Ce Qui a Été Fait ✅
1. URLs Supabase corrigées dans `.env`
2. Build réussi avec bonnes URLs
3. Leads vérifiés (5 présents dans base)

### Ce Qu'il Reste à Faire ⏳

**2 actions critiques (15 min)** :

1. **Ajouter secrets** :
   - Dashboard → Settings → Edge Functions → Secrets
   - `OPENAI_API_KEY` (déjà dans .env, copier dans secrets)
   - `SENDGRID_API_KEY` (créer sur sendgrid.com)
   - `FROM_EMAIL=contact@taxiassur.com`

2. **Activer pg_cron** :
   - Dashboard → SQL Editor
   - `CREATE EXTENSION IF NOT EXISTS pg_cron;`
   - `CREATE EXTENSION IF NOT EXISTS pg_net;`

**Après ça** : Système 100% autonome ! 🎉

---

## 📂 Fichiers Modifiés

- ✅ `.env` - URLs Supabase corrigées
- ✅ Build dist/ - Nouvelles URLs intégrées
- ⏳ Supabase Secrets - À configurer (2 clés)
- ⏳ pg_cron - À activer (1 commande SQL)

---

**Status Actuel** : 🟡 URLs corrigées, secrets à ajouter
**Status Après** : 🟢 100% Automatique
**Temps restant** : 15 minutes
