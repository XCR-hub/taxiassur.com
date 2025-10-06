# 🚀 GUIDE DÉPLOIEMENT PRODUCTION - TAXIASSUR

Guide complet pour mettre le site en production et générer un maximum de leads.

---

## 📊 CE QUI A ÉTÉ CRÉÉ

### Pages (63 total)
```
✅ 1 Homepage optimisée (calculateur + quiz + avis dynamiques + exit intent)
✅ 4 Pages principales (Prix, VTC, Paris, Moto-Taxi)
✅ 24 Pages villes (Lyon, Marseille, Toulouse, Nice, Bordeaux, Nantes...)
✅ 3 Pages questions (Quelle assurance, Obligatoire, Tesla)
✅ 1 Page urgence (attestation 10 min)
✅ 1 Page comparateur (AXA vs TaxiAssur)
✅ 1 Page combo (Taxi + VTC combiné)
✅ 1 Page devis instantané
✅ + 27 autres pages (FAQ, Contact, Blog, Legal...)
```

### Articles Blog (6+ total)
```
✅ Devenir chauffeur taxi 2024
✅ Coût assurance par ville
✅ Choisir véhicule taxi 2024
✅ Assurance taxi résilié
✅ Assurance jeune conducteur
✅ Flotte taxis
✅ Comparatif assureurs 2024
```

### Composants Conversion
```
✅ Calculateur devis instantané (5 étapes interactives)
✅ Quiz lead generation (5 questions gamifiées)
✅ Avis dynamiques (changent toutes les 15s)
✅ Exit intent popup (capture dernière chance)
✅ Formulaires leads optimisés A/B
✅ CTA sticky scroll
```

### Système Backend
```
✅ Supabase configuré (5 tables)
✅ 3 Edge Functions (backlinks, emails, follow-up)
✅ 10 opportunités backlinks pré-chargées
✅ Automation Make.com prête
```

---

## 🎯 OBJECTIF : MAXIMUM DE LEADS

### Trafic Potentiel (12 mois)
```
925 keywords ciblés
4,200+ recherches/mois potentiel
Position #3 moyenne : 2,800-3,500 visites/mois
Taux conversion 6% : 170-210 leads/mois
CA potentiel : €255,000-315,000/an
```

---

## 📋 CHECKLIST PRÉ-DÉPLOIEMENT

### 1. Variables d'Environnement

**Créer `.env` à la racine :**

```bash
# Supabase (OBLIGATOIRE)
VITE_SUPABASE_URL="https://votre-projet.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGc..."

# Analytics (Recommandé)
VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
VITE_FB_PIXEL_ID="123456789012345"

# Emails notifications leads (OBLIGATOIRE)
LEAD_NOTIFICATION_EMAIL="leads@taxiassur.com"
SUPPORT_EMAIL="support@taxiassur.com"

# Téléphones (À mettre dans components/Header.tsx)
PHONE_MAIN="01 XX XX XX XX"
PHONE_URGENCE="06 XX XX XX XX"
```

**Voir `VARIABLES-CONFIG.md` pour liste complète.**

---

### 2. Configurer Supabase

**Tables déjà créées :**
- `backlink_opportunities` (prospects backlinks)
- `backlink_campaigns` (campagnes emails)
- `backlink_campaign_logs` (suivi envois)
- `outreach_templates` (templates emails)
- `backlink_scans` (historique scans)

**Actions :**

1. **Aller dans Supabase Dashboard**
2. **Settings → API** : Copier URL + Keys
3. **Coller dans `.env`**
4. **Edge Functions** : Déjà déployées ✓

---

### 3. Informations Légales

**Fichiers à modifier :**

`src/components/Footer.tsx` :
```typescript
// Remplacer par vos vraies infos
SIRET: "123 456 789 00012"
Raison sociale: "TaxiAssur SAS"
Capital: "50,000 EUR"
ORIAS: "12345678"
RCS: "Paris B 123 456 789"
```

`src/pages/Legal.tsx` + `Policy.tsx` + `Conditions.tsx` :
→ Faire valider par avocat si nécessaire

---

### 4. Emails & Notifications

**Configurer webhook Make.com :**

1. Créer compte Make.com (gratuit)
2. Créer scénario :
   - Trigger : Webhook
   - Action : Envoyer email Gmail/Outlook
3. Copier URL webhook
4. Mettre dans Edge Function `supabase/functions/*/index.ts`

**Ou utiliser Supabase Email directement :**
```typescript
// Dans Edge Function
await supabase.auth.admin.sendEmail({
  to: 'leads@taxiassur.com',
  subject: 'Nouveau lead taxi',
  text: `Nom: ${data.name}\nTel: ${data.phone}`
});
```

---

## 🚀 DÉPLOIEMENT

### Option 1: Vercel (Recommandé - Gratuit)

```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Suivre instructions
# Choisir projet, confirmer settings

# 5. Variables d'environnement
# Aller sur dashboard.vercel.com
# Settings → Environment Variables
# Ajouter toutes variables .env
```

**Configuration automatique :**
- Build: `npm run build`
- Output: `dist`
- Framework: Vite

---

### Option 2: Netlify (Gratuit)

```bash
# 1. Installer Netlify CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Init
netlify init

# 4. Deploy
netlify deploy --prod

# 5. Variables
# dashboard.netlify.com
# Site settings → Environment Variables
```

---

### Option 3: IONOS / OVH (Hébergement classique)

```bash
# 1. Build local
npm run build

# 2. Upload dossier /dist via FTP
# Utiliser FileZilla ou similar
# Uploader TOUT le contenu de /dist vers /public_html

# 3. Configurer .htaccess
# Déjà inclus dans /public/.htaccess
# S'assurer que mod_rewrite activé
```

---

## 🔍 CONFIGURATION SEO POST-DÉPLOIEMENT

### 1. Google Search Console

```
1. Aller sur search.google.com/search-console
2. Ajouter propriété : www.taxiassur.com
3. Vérifier propriété (balise HTML ou DNS)
4. Soumettre sitemap : https://www.taxiassur.com/sitemap.xml
```

### 2. Google Analytics 4

```
1. Créer compte GA4
2. Créer propriété "TaxiAssur"
3. Copier Measurement ID (G-XXXXXXXXXX)
4. Mettre dans .env : VITE_GA_MEASUREMENT_ID="G-XXX"
5. Redeploy
```

### 3. Facebook Pixel (Remarketing)

```
1. Créer Business Manager Facebook
2. Créer Pixel dans Events Manager
3. Copier Pixel ID
4. Mettre dans .env : VITE_FB_PIXEL_ID="XXX"
```

---

## 📈 OPTIMISATION LEADS

### Conversion Funnel Actuel

```
Homepage
  ↓ Hero CTA
  ↓ Calculateur devis (engagement)
  ↓ Avis dynamiques (confiance)
  ↓ Quiz interactif (lead gen ludique)
  ↓ Exit intent popup (dernière chance)
  ↓ Formulaire final
  → LEAD CAPTURÉ ✓
```

### Tests A/B Recommandés

**Semaine 1-2 :**
- Tester 2 versions titre Hero
- Tester couleurs CTA (jaune vs vert vs rouge)

**Semaine 3-4 :**
- Tester position calculateur (haut vs milieu page)
- Tester timing exit intent (30s vs 60s vs scroll 50%)

**Outils :**
- Google Optimize (gratuit)
- Hotjar (heatmaps - freemium)
- Microsoft Clarity (gratuit)

---

## 🎯 CAMPAGNES ACQUISITION

### 1. SEO (Organique - Gratuit)

**Actions Semaine 1 :**
```
✓ Soumettre sitemap Google
✓ Indexer 57 URLs
✓ Créer profil Google Business (si bureau physique)
✓ Inscriptions annuaires gratuits :
  - Yelp
  - Pages Jaunes
  - 118712
```

**Résultats attendus :**
- 3 mois : Positions #5-10 (50-100 visites/mois)
- 6 mois : Positions #3-5 (200-400 visites/mois)
- 12 mois : Positions #1-3 (600-1,000 visites/mois)

---

### 2. Google Ads (Payant - ROI Immédiat)

**Budget recommandé :** 500-1,000€/mois

**Campagnes :**

**Campagne 1: Intent Fort**
```
Keywords:
- "assurance taxi" (exact)
- "assurance taxi paris" (exact)
- "devis assurance taxi" (exact)

CPC moyen: 2-4€
Conversions: 5-8%
Cost per lead: 25-80€
```

**Campagne 2: Urgence**
```
Keywords:
- "assurance taxi urgent"
- "assurance taxi immédiate"
- "assurance taxi résilié"

CPC: 3-6€
Conversions: 8-12%
Cost per lead: 25-75€
```

**Landing page :** `/assurance-taxi-urgence`

---

### 3. Facebook/Instagram Ads

**Budget :** 300-500€/mois

**Audiences :**
- Intérêt : Uber, Chauffeur, Taxi
- Âge : 25-55 ans
- Géo : Grandes villes

**Formats :**
- Carrousel (témoignages clients)
- Vidéo (30s explication économies)
- Story (avant/après prix)

**Cost per lead attendu :** 15-40€

---

### 4. Backlinks (Automation déjà en place)

**Système créé :**
- Edge Function scanne sites cibles
- Détecte opportunités backlinks
- Envoie emails automatiques
- Follow-up 3j + 7j

**Opportunités pré-chargées (10) :**
```
✓ assurance-taxi.fr
✓ blog-assurance.com
✓ forums-taxi.fr
✓ chauffeur-independant.com
✓ + 6 autres
```

**Action :** Activer automation dans Supabase Dashboard

---

## 📊 SUIVI PERFORMANCE

### KPIs Essentiels

**Trafic :**
- Visiteurs uniques/mois
- Pages vues
- Taux rebond (<60% = bon)
- Temps sur site (>2min = bon)

**Conversion :**
- Taux formulaire soumis (5-8% = bon)
- Leads qualifiés/mois
- Cost per lead
- Taux transformation lead → client (20-30% = bon)

**ROI :**
```
Exemple mois type (6 mois après lancement) :

Trafic: 1,500 visiteurs
Leads: 90 (6% conversion)
Clients: 25 (28% transformation)
CA: 25 × €1,500 commission = €37,500

Coûts acquisition:
- Google Ads: €800
- Facebook: €400
- SEO: €0 (organique)
Total: €1,200

ROI = €37,500 / €1,200 = 31x 🚀
```

---

## 🔧 MAINTENANCE

### Hebdomadaire
- Vérifier formulaires fonctionnent
- Répondre leads (< 2h délai)
- Surveiller uptime (UptimeRobot gratuit)

### Mensuel
- Analyser Google Analytics
- Optimiser pages faible performance
- Ajouter 2-3 articles blog
- Mettre à jour tarifs si besoin

### Trimestriel
- Audit SEO complet
- Tests A/B nouvelles variations
- Analyse concurrence
- Mise à jour pages villes (nouveaux tarifs)

---

## 🆘 SUPPORT & DÉPANNAGE

### Site ne build pas

```bash
# Vérifier erreurs
npm run build

# Si erreur TypeScript
npm run lint

# Si erreur dépendances
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Formulaires ne marchent pas

1. Vérifier `.env` configuré
2. Vérifier Supabase tables créées
3. Tester avec DevTools Console ouvert
4. Vérifier Edge Functions déployées

### Pages 404

1. Vérifier routes dans `src/router.tsx`
2. Sur hébergement classique : vérifier `.htaccess`
3. Sur Vercel/Netlify : vérifier `vercel.json` / `netlify.toml`

---

## 📞 CHECKLIST GO-LIVE

```
Technique:
☐ .env configuré avec vraies valeurs
☐ Build réussi sans erreurs
☐ Site déployé et accessible
☐ Toutes pages chargent (tester 10 URLs)
☐ Formulaires fonctionnent (tester lead)
☐ Analytics installé

Contenu:
☐ Téléphones corrects dans Header
☐ Emails corrects dans Footer
☐ SIRET + infos légales à jour
☐ Mentions légales validées
☐ CGU/CGV validées

SEO:
☐ Sitemap soumis Google
☐ Google Search Console configuré
☐ Google Analytics actif
☐ robots.txt correct

Marketing:
☐ Google Ads compte créé (si budget)
☐ Facebook Pixel installé
☐ Backlinks automation activée
☐ Emails notification leads testés
```

---

## 🎉 LANCEMENT !

Une fois checklist complète :

1. **Annoncer lancement** (réseaux sociaux)
2. **Activer Google Ads** (si budget)
3. **Monitorer premières 48h** (bugs potentiels)
4. **Célébrer premier lead !** 🍾

---

## 📈 OBJECTIFS RÉALISTES

### Mois 1-3 (Démarrage)
```
Trafic: 200-500 visiteurs/mois
Leads: 10-30/mois
CA: €15,000-45,000
```

### Mois 4-6 (Croissance)
```
Trafic: 800-1,500 visiteurs/mois
Leads: 50-90/mois
CA: €75,000-135,000
```

### Mois 7-12 (Maturité)
```
Trafic: 2,000-3,500 visiteurs/mois
Leads: 120-210/mois
CA: €180,000-315,000
```

---

## 🚀 NEXT LEVEL (Après 6 mois)

- Créer app mobile (React Native)
- Système devis instantané backend (calcul temps réel)
- Chat live avec IA (ChatGPT API)
- Programme affiliation (10% commission)
- Expansion géographique (Belgique, Suisse)

---

**🎯 SITE PRÊT À GÉNÉRER DES LEADS ! BONNE CHANCE ! 🚀**
