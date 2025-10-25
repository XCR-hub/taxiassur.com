# 🚀 GUIDE FINAL - CONFIGURATION COMPLÈTE DES API

**Date:** 2025-10-07
**Projet:** TaxiAssur.com
**Supabase:** drohhxrkoequjphvabvq

---

## 📊 ÉTAT ACTUEL DES CONFIGURATIONS

| API | Statut | Clé actuelle | Action requise |
|-----|--------|-------------|----------------|
| ✅ Supabase | **CONFIGURÉ** | drohhxrkoequjphvabvq | Aucune |
| ⚠️ OpenAI | **PARTIEL** | sk-proj-J0uySi9NCMgku1ps... | Compléter la clé |
| ⚠️ SendGrid | **À FAIRE** | em5892.taxiassur.com vérifié | Obtenir la clé API |
| ⚠️ Google CSE | **RÉVOQUÉ** | Ancienne clé invalide | Créer nouvelle clé |
| ⚠️ Google Analytics | **À FAIRE** | - | Créer compte GA4 |
| ⚠️ Google Tag Manager | **À FAIRE** | - | Créer conteneur |
| ⚪ Meta Pixel | **OPTIONNEL** | - | Plus tard |
| ⚪ Cloudflare | **OPTIONNEL** | Zone: 6db20e6211bb587c873310cba0578f24 | Plus tard |

---

## 🔴 ACTIONS CRITIQUES (À FAIRE MAINTENANT)

### 1️⃣ COMPLÉTER LA CLÉ OPENAI

**Statut actuel:** Clé partielle trouvée: `sk-proj-J0uySi9NCMgku1ps...`

**Ce qu'il faut faire:**

1. **Retrouvez la clé complète** sur votre compte OpenAI:
   - Allez sur: https://platform.openai.com/api-keys
   - Cherchez la clé "TaxiAssur Production"
   - Si elle n'existe plus, créez-en une nouvelle

2. **Mettez à jour `.env`** (ligne 20):
   ```env
   OPENAI_API_KEY=sk-proj-VOTRE_CLE_COMPLETE_ICI
   ```

3. **CRITIQUE: Configurez Supabase Secrets**:
   ```
   https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/functions

   → Cliquez sur "Secrets"
   → + New secret
   → Name: OPENAI_API_KEY
   → Value: sk-proj-VOTRE_CLE_COMPLETE_ICI
   → Save
   ```

4. **Vérifiez le crédit**:
   - Allez dans: Settings → Billing
   - Assurez-vous d'avoir au moins 10€ de crédit
   - Configurez une limite: 50€/mois max

**Fonctionnalités activées:**
- ✅ Chatbot intelligent sur le site
- ✅ Génération automatique de contenu SEO
- ✅ Réponses emails automatiques
- ✅ Qualification des leads

---

### 2️⃣ OBTENIR LA CLÉ SENDGRID

**Statut actuel:** Domaine vérifié `em5892.taxiassur.com` mais pas de clé API

**Ce qu'il faut faire:**

1. **Connectez-vous à SendGrid**:
   - Allez sur: https://app.sendgrid.com/
   - Utilisez le compte avec `em5892.taxiassur.com` vérifié

2. **Créez ou récupérez la clé API**:
   - Settings → API Keys
   - Si "TaxiAssur Production" existe, copiez-la
   - Sinon, créez: + Create API Key
     - Name: `TaxiAssur Production`
     - Permissions: `Full Access`
     - Copiez la clé (commence par `SG.`)

3. **Mettez à jour `.env`** (ligne 27):
   ```env
   SENDGRID_API_KEY=SG.VOTRE_CLE_ICI
   ```

4. **CRITIQUE: Configurez Supabase Secrets**:
   ```
   https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/functions

   → Cliquez sur "Secrets"
   → + New secret
   → Name: SENDGRID_API_KEY
   → Value: SG.VOTRE_CLE_ICI
   → Save
   ```

5. **Ajoutez aussi FROM_EMAIL**:
   ```
   → + New secret
   → Name: FROM_EMAIL
   → Value: noreply@taxiassur.com
   → Save
   ```

**Fonctionnalités activées:**
- ✅ Emails de confirmation clients
- ✅ Notifications commerciales
- ✅ Campagnes d'outreach automatiques
- ✅ Relances automatiques de leads

---

## 🟡 ACTIONS IMPORTANTES (RECOMMANDÉ)

### 3️⃣ CRÉER NOUVELLE CLÉ GOOGLE CSE

**Problème:** Ancienne clé `AIzaSyBMdJggXK49R_h8x__U6lIxiWEE8Gbjesk` révoquée pour sécurité

**Ce qu'il faut faire:**

1. **Allez sur Google Cloud Console**:
   - URL: https://console.cloud.google.com/apis/credentials
   - Projet: Créez "TaxiAssur" si besoin

2. **Activez l'API**:
   - Menu: APIs & Services → Library
   - Cherchez: "Custom Search API"
   - Cliquez: Enable

3. **Créez une clé API**:
   - APIs & Services → Credentials
   - + Create Credentials → API Key
   - Copiez la clé (commence par `AIza...`)

4. **IMPORTANT: Restreignez la clé**:
   - Cliquez sur la clé créée
   - Application restrictions:
     - Type: HTTP referrers
     - Ajoutez: `taxiassur.com/*` et `*.taxiassur.com/*`
   - API restrictions:
     - Restrict key
     - Sélectionnez: Custom Search API
   - Save

5. **Mettez à jour les fichiers**:

   **`.env`** (ligne 35):
   ```env
   VITE_GOOGLE_CSE_API_KEY=AIzaVOTRE_NOUVELLE_CLE
   ```

   **`public/env-config.js`** (ligne 17):
   ```javascript
   VITE_GOOGLE_CSE_API_KEY: 'AIzaVOTRE_NOUVELLE_CLE',
   ```

**Fonctionnalités activées:**
- ✅ Partner Finder (recherche automatique partenaires)
- ✅ Backlink Prospector
- ✅ Veille concurrentielle

**Quota:** 100 recherches/jour gratuit

---

### 4️⃣ CONFIGURER GOOGLE ANALYTICS 4

**Ce qu'il faut faire:**

1. **Créez un compte GA4**:
   - Allez sur: https://analytics.google.com/
   - Créez un compte: "TaxiAssur"

2. **Créez une propriété**:
   - Nom: "TaxiAssur.com"
   - Fuseau horaire: Europe/Paris
   - Devise: EUR (€)

3. **Créez un flux de données web**:
   - URL du site web: `https://www.taxiassur.com`
   - Nom du flux: "Site principal"
   - Copiez le **Measurement ID** (commence par `G-`)

4. **Mettez à jour les fichiers**:

   **`.env`** (ligne 43):
   ```env
   VITE_GTAG_ID=G-VOTRE_ID_ICI
   ```

   **`public/env-config.js`** (ligne 25):
   ```javascript
   VITE_GTAG_ID: 'G-VOTRE_ID_ICI',
   ```

5. **Ajoutez dans `index.html`** (dans `<head>`):
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-VOTRE_ID_ICI"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-VOTRE_ID_ICI');
   </script>
   ```

**Fonctionnalités:**
- ✅ Tracking visiteurs
- ✅ Analyse du trafic
- ✅ Conversions et objectifs
- ✅ Rapports e-commerce

**Prix:** GRATUIT

---

### 5️⃣ CONFIGURER GOOGLE TAG MANAGER

**Ce qu'il faut faire:**

1. **Créez un compte GTM**:
   - Allez sur: https://tagmanager.google.com/
   - Créez un compte: "TaxiAssur"

2. **Créez un conteneur**:
   - Nom du conteneur: "taxiassur.com"
   - Type de plateforme: Web
   - Copiez le **Container ID** (commence par `GTM-`)

3. **Mettez à jour les fichiers**:

   **`.env`** (ligne 50):
   ```env
   VITE_GTM_ID=GTM-VOTRE_ID_ICI
   ```

   **`public/env-config.js`** (ligne 32):
   ```javascript
   VITE_GTM_ID: 'GTM-VOTRE_ID_ICI',
   ```

4. **Ajoutez dans `index.html`**:

   **Dans `<head>`** (juste après l'ouverture):
   ```html
   <!-- Google Tag Manager -->
   <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
   new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
   j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
   'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
   })(window,document,'script','dataLayer','GTM-VOTRE_ID_ICI');</script>
   <!-- End Google Tag Manager -->
   ```

   **Dans `<body>`** (juste après l'ouverture):
   ```html
   <!-- Google Tag Manager (noscript) -->
   <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-VOTRE_ID_ICI"
   height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
   <!-- End Google Tag Manager (noscript) -->
   ```

**Fonctionnalités:**
- ✅ Gestion centralisée des tags
- ✅ Installation pixels publicitaires
- ✅ Tracking événements personnalisés
- ✅ Tests A/B

**Prix:** GRATUIT

---

## ⚪ ACTIONS OPTIONNELLES (PLUS TARD)

### 6️⃣ META PIXEL (Facebook Ads)

Uniquement si vous prévoyez de faire de la publicité Facebook/Instagram.

**Configuration rapide:**
1. Allez sur: https://business.facebook.com/
2. Gestionnaire d'événements → Connecter des sources → Web → Meta Pixel
3. Copiez le Pixel ID (nombre de 15 chiffres)
4. Mettez à jour `.env` et `env-config.js`

---

### 7️⃣ CLOUDFLARE API TOKEN

Uniquement si vous voulez auto-deploy avec cache CDN.

**Configuration rapide:**
1. Allez sur: https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Edit zone DNS
3. Zone: taxiassur.com
4. Copiez le token
5. Mettez à jour `.env` ligne 76

---

## 🚀 APRÈS CONFIGURATION

### Étape 1: Vérifiez les Supabase Secrets

Allez sur: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/functions

**Secrets requis:**
- ✅ `OPENAI_API_KEY` → `sk-proj-...`
- ✅ `SENDGRID_API_KEY` → `SG.`
- ✅ `FROM_EMAIL` → `noreply@taxiassur.com`

### Étape 2: Build du projet

```bash
npm run build
```

### Étape 3: Fichiers à uploader sur IONOS

**CRITIQUES:**
```
/public/api/lead.php → /api/lead.php
/public/env-config.js → /env-config.js
```

**FRONTEND (optionnel):**
```
/dist/* → / (racine)
```

### Étape 4: Test complet

1. **Testez le formulaire de lead**:
   - Remplissez le formulaire
   - Vérifiez dans Supabase: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/editor
   - Table: `leads`

2. **Testez le chatbot** (si OpenAI configuré):
   - Ouvrez le chat sur le site
   - Posez une question
   - Vérifiez la réponse

3. **Testez Google Analytics** (si configuré):
   - Ouvrez le site
   - Allez dans GA4 → Rapports → Temps réel
   - Vérifiez votre visite

---

## 📋 CHECKLIST FINALE

Cochez au fur et à mesure:

### Critiques (À faire maintenant):
- [ ] Clé OpenAI complétée dans `.env`
- [ ] Clé OpenAI ajoutée dans Supabase Secrets
- [ ] Clé SendGrid obtenue et dans `.env`
- [ ] Clé SendGrid ajoutée dans Supabase Secrets
- [ ] FROM_EMAIL ajouté dans Supabase Secrets

### Importants (Recommandé):
- [ ] Nouvelle clé Google CSE créée
- [ ] Google CSE restreinte au domaine
- [ ] Google Analytics 4 configuré
- [ ] Google Tag Manager configuré
- [ ] Codes GA4/GTM ajoutés dans index.html

### Optionnels (Plus tard):
- [ ] Meta Pixel configuré
- [ ] Cloudflare Token créé

### Déploiement:
- [ ] `npm run build` exécuté
- [ ] `lead.php` uploadé sur IONOS
- [ ] `env-config.js` uploadé sur IONOS
- [ ] `/dist/*` uploadé sur IONOS
- [ ] Formulaire testé → lead dans Supabase
- [ ] Chatbot testé (si OpenAI OK)
- [ ] Google Analytics vérifié (si GA4 OK)

---

## 💰 COÛT TOTAL

| Service | Prix/mois |
|---------|-----------|
| Supabase | Gratuit (500 MB) |
| **OpenAI** | **5-10€** |
| SendGrid | Gratuit (100 emails/jour) |
| Google CSE | Gratuit (100 recherches/jour) |
| Google Analytics 4 | Gratuit |
| Google Tag Manager | Gratuit |
| Meta Pixel | Gratuit |
| Cloudflare | Gratuit |
| **TOTAL** | **~10€/mois** |

---

## ❓ AIDE & SUPPORT

**Documentation:**
- OpenAI: https://platform.openai.com/docs
- SendGrid: https://docs.sendgrid.com/
- Google CSE: https://developers.google.com/custom-search/
- Supabase: https://supabase.com/docs
- GA4: https://support.google.com/analytics/

**Dashboards:**
- Supabase: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
- OpenAI: https://platform.openai.com/
- SendGrid: https://app.sendgrid.com/
- Google Cloud: https://console.cloud.google.com/
- Google Analytics: https://analytics.google.com/

---

## 🎯 PROCHAINE ÉTAPE

**Envoyez-moi ces 2 clés critiques:**

1. 🔴 **OPENAI_API_KEY** complète (sk-proj-...)
2. 🔴 **SENDGRID_API_KEY** complète (SG....)

Je configurerai tout et lancerai le build final ! 🚀
