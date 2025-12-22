# 🔧 VARIABLES DE CONFIGURATION - TAXIASSUR

Ce fichier centralise **TOUTES** les variables nécessaires au bon fonctionnement du site TaxiAssur.
**À compléter avec vos vraies valeurs de production.**

---

## 📧 EMAIL & NOTIFICATIONS

```bash
# Email réception leads
LEAD_NOTIFICATION_EMAIL="leads@taxiassur.com"

# Email support client
SUPPORT_EMAIL="support@taxiassur.com"

# Email commercial
COMMERCIAL_EMAIL="commercial@taxiassur.com"

# Email urgences (attestations immédiates)
URGENCE_EMAIL="urgence@taxiassur.com"
```

---

## 📞 TÉLÉPHONE

```bash
# Numéro principal (affiché sur site)
PHONE_MAIN="01 XX XX XX XX"

# Numéro urgence 24/7
PHONE_URGENCE="06 XX XX XX XX"

# Numéro service client
PHONE_SUPPORT="01 XX XX XX XX"
```

---

## 🌐 SUPABASE

```env
# URL projet Supabase
VITE_SUPABASE_URL="https://votre-projet.supabase.co"

# Clé anonyme (publique)
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Clé service (privée - JAMAIS exposer côté client)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Où les mettre ?**
- Créer fichier `.env` à la racine projet
- Copier les variables ci-dessus
- **NE JAMAIS commit le .env dans git** (déjà dans .gitignore)

---

## 💳 STRIPE (pour paiements futurs)

```bash
# Clé publique Stripe
VITE_STRIPE_PUBLIC_KEY="pk_live_XXXXX"

# Clé secrète Stripe (privée)
STRIPE_SECRET_KEY="sk_live_XXXXX"

# Webhook secret
STRIPE_WEBHOOK_SECRET="whsec_XXXXX"
```

---

## 🔑 API EXTERNES

### Google reCAPTCHA (anti-spam formulaires)
```bash
VITE_RECAPTCHA_SITE_KEY="6LeXXXXXXXXXXXXXXXXXXXXXX"
RECAPTCHA_SECRET_KEY="6LeXXXXXXXXXXXXXXXXXXXXXX"
```

### Google Maps (optionnel - si localisation taxis)
```bash
VITE_GOOGLE_MAPS_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXX"
```

### SendGrid / Mailgun (envoi emails transactionnels)
```bash
# Option 1: SendGrid
SENDGRID_API_KEY="SG.XXXXXXXXXXXXXXXXXX"

# Option 2: Mailgun
MAILGUN_API_KEY="key-XXXXXXXXXXXXXXXXXX"
MAILGUN_DOMAIN="mg.taxiassur.com"
```

---

## 📊 ANALYTICS

### Google Analytics 4
```bash
VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### Google Tag Manager (optionnel)
```bash
VITE_GTM_ID="GTM-XXXXXXX"
```

### Facebook Pixel (remarketing)
```bash
VITE_FB_PIXEL_ID="123456789012345"
```

---

## 🎯 MARKETING

### Hotjar (heatmaps comportement utilisateurs)
```bash
VITE_HOTJAR_ID="1234567"
VITE_HOTJAR_SV="6"
```

### Crisp Chat (live chat - optionnel)
```bash
VITE_CRISP_WEBSITE_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## 🔐 SÉCURITÉ

### JWT Secret (authentification backoffice)
```bash
JWT_SECRET="votre-secret-super-securise-32-caracteres-min"
```

### Hash Salt (sécurité mots de passe)
```bash
PASSWORD_SALT_ROUNDS="12"
```

---

## 🌍 DOMAINE & URL

```bash
# URL production
VITE_SITE_URL="https://www.taxiassur.com"

# URL staging (test)
VITE_STAGING_URL="https://staging.taxiassur.com"

# URL développement local
VITE_DEV_URL="http://localhost:5173"
```

---

## 📱 RÉSEAUX SOCIAUX

```bash
# Facebook
FACEBOOK_PAGE_URL="https://facebook.com/taxiassur"

# LinkedIn
LINKEDIN_PAGE_URL="https://linkedin.com/company/taxiassur"

# Twitter/X
TWITTER_HANDLE="@taxiassur"
```

---

## 🚀 MAKE.COM / ZAPIER (Automation)

### Make.com Webhooks
```bash
# Webhook nouveau lead
MAKE_WEBHOOK_NEW_LEAD="https://hook.eu1.make.com/XXXXXXXXXXXXXX"

# Webhook backlink trouvé
MAKE_WEBHOOK_BACKLINK="https://hook.eu1.make.com/XXXXXXXXXXXXXX"

# Webhook email follow-up
MAKE_WEBHOOK_FOLLOWUP="https://hook.eu1.make.com/XXXXXXXXXXXXXX"
```

---

## 🎨 TARIFS DE BASE (pour calculateur)

```javascript
// À intégrer dans /src/config/pricing.ts

export const BASE_PRICING = {
  // Prix de base assurance taxi
  basePriceTaxi: 1430, // €/an

  // Multiplicateurs villes
  cityMultipliers: {
    paris: 1.45,
    lyon: 1.18,
    marseille: 1.22,
    toulouse: 1.08,
    nice: 1.27,
    bordeaux: 1.11,
    autres: 1.0
  },

  // Multiplicateurs véhicules
  vehicleMultipliers: {
    berline: 1.0,
    break: 1.05,
    van: 1.25,
    electrique: 0.95, // -5%
    moto: 0.91
  },

  // Réduction TaxiAssur
  taxiassurDiscount: 0.65, // -35% soit prix final = prix_marché × 0.65
};
```

---

## 📄 INFORMATIONS LÉGALES

```bash
# Numéro SIRET
COMPANY_SIRET="123 456 789 00012"

# Raison sociale
COMPANY_NAME="TaxiAssur SAS"

# Adresse siège social
COMPANY_ADDRESS="123 Avenue de la République, 75011 Paris"

# Capital social
COMPANY_CAPITAL="50000 EUR"

# Numéro ORIAS (courtage assurance)
ORIAS_NUMBER="12345678"

# RCS
RCS="Paris B 123 456 789"
```

---

## 🛠️ INSTRUCTIONS D'UTILISATION

### 1. Créer fichier `.env`

```bash
cp .env.example .env
```

### 2. Remplir variables

Ouvrir `.env` et remplacer les valeurs `XXXXX` par vos vraies clés.

### 3. Redémarrer serveur développement

```bash
npm run dev
```

### 4. Vérifier variables chargées

Dans votre code React :
```typescript
console.log(import.meta.env.VITE_SUPABASE_URL); // doit afficher l'URL
```

---

## 🚨 SÉCURITÉ IMPORTANTE

### ✅ Variables préfixées `VITE_`
→ **Exposées côté client** (navigateur)
→ OK pour : URL publiques, clés publiques APIs

### ❌ Variables SANS préfixe `VITE_`
→ **Privées côté serveur uniquement**
→ NE JAMAIS utiliser dans composants React
→ Utiliser dans Edge Functions Supabase uniquement

**Exemple :**
```typescript
// ✅ OK dans composant React
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// ❌ ERREUR - ne fonctionnera pas (et tant mieux pour sécurité)
const secretKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY; // undefined
```

---

## 📋 CHECKLIST AVANT DÉPLOIEMENT

- [ ] Toutes variables `.env` remplies
- [ ] Variables Supabase configurées (Edge Functions)
- [ ] Clés Stripe en mode LIVE (pas TEST)
- [ ] Google Analytics actif
- [ ] Emails notif leads testés
- [ ] Formulaires anti-spam (reCAPTCHA)
- [ ] Webhooks Make.com/Zapier connectés
- [ ] Numéros téléphone corrects
- [ ] SIRET et infos légales à jour

---

## 🆘 SUPPORT

En cas de problème avec variables :

1. Vérifier `.env` existe et contient variables
2. Vérifier préfixe `VITE_` pour variables côté client
3. Redémarrer serveur développement après changement `.env`
4. Vérifier `.env` pas commit dans git (doit être dans `.gitignore`)

---

**📌 Ce fichier est le centre de contrôle du site. Gardez-le à jour !**
