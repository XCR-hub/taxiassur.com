# Configuration APIs - Backoffice TaxiAssur

**Date**: 2025-10-10
**Status**: Documentation complète des APIs requises

---

## 🎯 APIs Requises par Page

### 1. AIContentGenerator.tsx ⚠️ BLOQUÉ SANS API
**Route**: `/backoffice/ai-generator`
**APIs requises**:
- `OPENAI_API_KEY` (Edge Function secret)
  - Service: OpenAI
  - Utilisé pour: Génération automatique d'articles SEO
  - Où configurer: Supabase Dashboard → Settings → Edge Functions → Secrets
  - Format: `sk-proj-...`

**Message d'erreur si manquant**:
```
⚠️ OPENAI_API_KEY non configurée.
Ajoutez-la dans les secrets Supabase Edge Functions.
```

---

### 2. SeoTools.tsx
**Route**: `/backoffice/seo-tools`
**APIs requises**:
- `SERP_API_KEY` (Optionnel)
  - Service: SerpAPI / ValueSerp
  - Utilisé pour: Analyse positions Google
  - Où configurer: Edge Function secret
  - Fallback: Fonctionne avec limitation si absent

---

### 3. BacklinkAutomationDashboard.tsx
**Route**: `/backoffice/backlink-automation`
**APIs requises**:
- `SENDGRID_API_KEY` ou `SMTP` (Edge Function secret)
  - Service: SendGrid / Email
  - Utilisé pour: Envoi emails outreach automatiques
  - Sans: Affiche erreur lors de l'envoi

---

### 4. CampaignLauncher.tsx
**Route**: `/backoffice/campaign-launcher`
**APIs requises**:
- `SENDGRID_API_KEY` (Edge Function secret)
- `OPENAI_API_KEY` (pour templates email)
  - Services: SendGrid + OpenAI
  - Utilisé pour: Campagnes email automatisées
  - Sans: Campagnes ne peuvent pas être lancées

---

### 5. SocialMediaManager.tsx
**Route**: `/backoffice/social-media`
**APIs requises**:
- `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET`
- `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` (optionnel)
- `TWITTER_API_KEY` (optionnel)
  - Services: LinkedIn, Facebook, Twitter
  - Utilisé pour: Publication automatique
  - Sans: Publication manuelle uniquement

**Note**: Les erreurs `ERR_BLOCKED_BY_CLIENT` sont NORMALES (bloqueur pub)

---

### 6. TrendAnalyzer.tsx
**Route**: `/backoffice/trend-analyzer`
**APIs requises**:
- `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`
- `SERP_API_KEY` (optionnel)
  - Services: Google Custom Search, SerpAPI
  - Utilisé pour: Analyse tendances SEO
  - Sans: Fonctions limitées

---

## 📋 Pages Sans API (Fonctionnent Toujours)

✅ **Dashboard.tsx** - Tableau de bord principal (Supabase uniquement)
✅ **LeadManager.tsx** - Gestion leads (Supabase uniquement)
✅ **LeadCRM.tsx** - CRM leads (Supabase uniquement)
✅ **ContentManager.tsx** - Gestion contenu (Supabase uniquement)
✅ **PartnerManager.tsx** - Gestion partenaires (Supabase uniquement)
✅ **PopupManager.tsx** - Gestion popups (Supabase uniquement)
✅ **NewsManager.tsx** - Gestion actus (Supabase uniquement)
✅ **ConversionAnalytics.tsx** - Analytics conversion (Supabase uniquement)
✅ **ComplianceCenter.tsx** - Conformité RGPD (Supabase uniquement)
✅ **SecurityDashboard.tsx** - Sécurité (Supabase uniquement)
✅ **QRCodeGenerator.tsx** - Génération QR codes (Frontend uniquement)
✅ **MarketingTemplates.tsx** - Templates marketing (Supabase uniquement)
✅ **DirectoryAssistant.tsx** - Assistant annuaires (Supabase uniquement)
✅ **ProspectReview.tsx** - Revue prospects (Supabase uniquement)
✅ **LeadMarketplace.tsx** - Marketplace leads (Supabase uniquement)
✅ **PartnerPortal.tsx** - Portail partenaires (Supabase uniquement)
✅ **AutomationScheduler.tsx** - Planification (Supabase + pg_cron)

---

## 🔑 Liste Complète des Secrets à Configurer

### Secrets CRITIQUES (Bloquants)

1. **OPENAI_API_KEY** 🔴 OBLIGATOIRE
   ```
   Où: Supabase Dashboard → Settings → Edge Functions → Secrets
   Valeur: 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
   Fonctions bloquées sans: Générateur IA, Campagnes email
   ```

2. **SENDGRID_API_KEY** 🟡 IMPORTANT
   ```
   Où: Supabase Dashboard → Settings → Edge Functions → Secrets
   Valeur: SG.xxxx (à créer sur sendgrid.com)
   Fonctions bloquées sans: Envoi emails automatiques
   ```

### Secrets OPTIONNELS (Améliorent fonctionnalités)

3. **SERP_API_KEY** 🟢 Optionnel
   ```
   Service: SerpAPI ou ValueSerp
   Utilisé pour: Analyse SEO avancée
   Fallback: Fonctionne sans, mais limité
   ```

4. **GOOGLE_CSE_API_KEY** + **GOOGLE_CSE_CX** 🟢 Optionnel
   ```
   Service: Google Custom Search Engine
   Utilisé pour: Recherche partenaires, analyse trends
   Déjà configuré dans .env: ✅
   ```

5. **LINKEDIN_CLIENT_ID** + **LINKEDIN_CLIENT_SECRET** 🟢 Optionnel
   ```
   Service: LinkedIn API
   Utilisé pour: Publication automatique LinkedIn
   Déjà configuré dans .env: ✅
   Erreurs ERR_BLOCKED_BY_CLIENT sont normales (bloqueur pub)
   ```

---

## 🚀 Actions Immédiates Requises

### Priorité 1 (CRITIQUE)

```bash
# Dans Supabase Dashboard → Settings → Edge Functions → Secrets

1. Ajouter OPENAI_API_KEY
   Name: OPENAI_API_KEY
   Value: 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

2. Ajouter SENDGRID_API_KEY
   Name: SENDGRID_API_KEY
   Value: SG.xxxx (créer sur sendgrid.com)

3. Ajouter FROM_EMAIL
   Name: FROM_EMAIL
   Value: contact@taxiassur.com
```

### Priorité 2 (Recommandé)

```bash
4. Ajouter SERP_API_KEY (optionnel)
   Name: SERP_API_KEY
   Value: (clé ValueSerp ou SerpAPI)

5. Variables déjà dans .env (OK)
   VITE_GOOGLE_CSE_API_KEY ✅
   VITE_GOOGLE_CSE_CX ✅
   VITE_LINKEDIN_CLIENT_ID ✅
   VITE_LINKEDIN_CLIENT_SECRET ✅
```

---

## 🐛 Résolution Erreurs Console

### Erreur: "OpenAI API key not configured"
**Solution**: Ajouter `OPENAI_API_KEY` dans Supabase Edge Functions secrets

### Erreur: "net::ERR_BLOCKED_BY_CLIENT" (LinkedIn/Facebook)
**Status**: Normal - C'est le bloqueur de pub du navigateur
**Solution**: Aucune action requise, erreur côté client uniquement

### Erreur: 500 Internal Server Error (backoffice-xxx.js)
**Cause probable**: Edge Function appelée sans clé API configurée
**Solution**: Vérifier que OPENAI_API_KEY et SENDGRID_API_KEY sont configurés

### Erreur: Edge Function timeout
**Cause**: OpenAI prend du temps (30-60s pour génération)
**Solution**: Normal, attendre la réponse

---

## ✅ Vérification Configuration

### Test 1: Générateur IA
```bash
1. Aller sur /backoffice/ai-generator
2. Si message orange "Configuration requise" → Ajouter OPENAI_API_KEY
3. Si pas de message → OK, API configurée
```

### Test 2: Envoi Emails
```bash
1. Aller sur /backoffice/leads
2. Essayer d'envoyer un devis
3. Si erreur → Ajouter SENDGRID_API_KEY
4. Si succès → OK
```

### Test 3: Connexion Supabase
```bash
1. Aller sur /backoffice
2. Si tableau de bord charge → OK
3. Si erreur connexion → Vérifier .env (VITE_SUPABASE_URL/KEY)
```

---

## 📊 Matrice Fonctionnalités vs APIs

| Fonctionnalité | API Requise | Status | Bloquant? |
|----------------|-------------|--------|-----------|
| Gestion Leads | Supabase | ✅ OK | Non |
| Analytics | Supabase | ✅ OK | Non |
| Générateur IA | OpenAI | ⚠️ À configurer | Oui |
| Emails Auto | SendGrid | ⚠️ À configurer | Oui |
| Publication LinkedIn | LinkedIn API | ✅ OK (.env) | Non* |
| Analyse SEO | SERP API | 🟢 Optionnel | Non |
| Recherche Trends | Google CSE | ✅ OK (.env) | Non |

*Les erreurs ERR_BLOCKED_BY_CLIENT sont normales (bloqueur pub)

---

## 🎯 Résumé Actions

### Pour Production Complète (100%)

```bash
☐ 1. Ajouter OPENAI_API_KEY dans Supabase secrets
☐ 2. Ajouter SENDGRID_API_KEY dans Supabase secrets
☐ 3. Ajouter FROM_EMAIL dans Supabase secrets
```

### Pour Production Minimale (80%)

```bash
✅ 1. Supabase configuré (OK)
✅ 2. Google CSE configuré (OK dans .env)
✅ 3. LinkedIn configuré (OK dans .env)
☐ 4. OpenAI + SendGrid (2 secrets à ajouter)
```

**Temps estimé**: 10 minutes
**Impact**: Débloque générateur IA + emails automatiques

---

## 🔗 Liens Utiles

- **Supabase Dashboard**: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
- **Secrets Edge Functions**: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/functions
- **SendGrid Signup**: https://sendgrid.com/signup
- **OpenAI API Keys**: https://platform.openai.com/api-keys

---

**Dernière mise à jour**: 2025-10-10
**Version**: Production v1.0
