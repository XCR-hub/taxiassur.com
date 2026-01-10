# 🌐 GUIDE COMPLET - Connexion aux Réseaux Sociaux

## 📋 Vue d'ensemble

J'ai créé un système complet pour connecter votre application à tous les principaux réseaux sociaux via OAuth 2.0.

### ✅ Ce qui a été implémenté

1. **Composant réutilisable** `SocialOAuthButton` - Gère l'authentification OAuth pour tous les réseaux
2. **Page de gestion** `/backoffice/social-connections` - Interface centralisée pour connecter tous les réseaux
3. **Pages de callback** - Gèrent le retour OAuth pour chaque réseau
4. **Configuration .env** - Variables d'environnement pour toutes les clés API

### 🎯 Réseaux sociaux supportés

| Réseau | Status | Configuration |
|--------|---------|--------------|
| LinkedIn | ✅ Implémenté | Client ID + Secret requis |
| YouTube | ✅ Implémenté | Google OAuth requis |
| Twitter/X | ✅ Nouveau | Client ID + Secret requis |
| Pinterest | ✅ Nouveau | App ID + Secret requis |
| Facebook | ⏳ En attente | App ID + Secret requis |
| Instagram | ⏳ En attente | Via Facebook Business |

---

## 🚀 ACCÈS RAPIDE

### Interface de gestion

Allez sur : **https://www.taxiassur.com/backoffice/social-connections**

Cette page vous permet de :
- ✅ Voir le status de connexion de chaque réseau
- ✅ Connecter/reconnecter les comptes
- ✅ Vérifier l'expiration des tokens
- ✅ Consulter les guides de configuration

---

## 📝 CONFIGURATION ÉTAPE PAR ÉTAPE

### 1️⃣ LinkedIn

#### A. Créer l'application

1. Allez sur https://www.linkedin.com/developers/apps
2. Cliquez sur "Create app"
3. Remplissez :
   - **App name** : TaxiAssur Social Manager
   - **LinkedIn Page** : Votre page entreprise
   - **Privacy policy URL** : https://www.taxiassur.com/politique-de-confidentialite
   - **App logo** : Logo de votre entreprise

#### B. Configuration OAuth

1. Dans "Auth" tab :
   - **Redirect URLs** : `https://www.taxiassur.com/auth/callback/linkedin`
2. Dans "Products" tab :
   - Demander l'accès à : **Sign In with LinkedIn** et **Share on LinkedIn**
3. Notez les credentials :
   - **Client ID**
   - **Client Secret**

#### C. Variables d'environnement

Ajoutez dans `.env` ou `env-config.js` :

```javascript
VITE_LINKEDIN_CLIENT_ID: 'votre_client_id',
VITE_LINKEDIN_CLIENT_SECRET: 'votre_client_secret',
VITE_LINKEDIN_REDIRECT_URI: 'https://www.taxiassur.com/auth/callback/linkedin'
```

---

### 2️⃣ YouTube (Google)

#### A. Créer le projet Google Cloud

1. Allez sur https://console.cloud.google.com/
2. Créez un nouveau projet : **TaxiAssur YouTube Integration**
3. Activez l'API :
   - Dans "APIs & Services" → "Library"
   - Recherchez "YouTube Data API v3"
   - Cliquez sur "Enable"

#### B. Configuration OAuth

1. Dans "APIs & Services" → "Credentials" :
   - Cliquez sur "Create Credentials" → "OAuth 2.0 Client ID"
   - Type : **Web application**
   - Name : **TaxiAssur YouTube**
2. Authorized redirect URIs :
   - `https://www.taxiassur.com/auth/callback/youtube`
3. Notez les credentials :
   - **Client ID**
   - **Client Secret**

#### C. Configuration de l'écran de consentement

1. Dans "OAuth consent screen" :
   - User Type : **External**
   - App name : **TaxiAssur**
   - User support email : **team@taxiassur.com**
   - Developer contact : **team@taxiassur.com**
2. Scopes : Ajoutez `.../auth/youtube.upload` et `.../auth/youtube.readonly`

#### D. Variables d'environnement

```javascript
VITE_GOOGLE_CLIENT_ID: 'votre_client_id',
VITE_GOOGLE_CLIENT_SECRET: 'votre_client_secret',
VITE_GOOGLE_REDIRECT_URI: 'https://www.taxiassur.com/auth/callback/youtube'
```

---

### 3️⃣ Twitter / X

#### A. Créer l'application

1. Allez sur https://developer.twitter.com/en/portal/dashboard
2. Cliquez sur "+ Create Project" :
   - **Project name** : TaxiAssur Social
   - **Use case** : Professional use
   - **Description** : Gestion des publications sociales
3. Créez une app dans le projet :
   - **App name** : TaxiAssur Publisher

#### B. Configuration OAuth 2.0

1. Dans "User authentication settings" :
   - **Type of App** : Web App
   - **App info** :
     - Callback URI : `https://www.taxiassur.com/auth/callback/twitter`
     - Website URL : `https://www.taxiassur.com`
2. Permissions :
   - ✅ Read
   - ✅ Write
3. Notez les credentials :
   - **Client ID**
   - **Client Secret**

#### C. Variables d'environnement

```javascript
VITE_TWITTER_CLIENT_ID: 'votre_client_id',
VITE_TWITTER_CLIENT_SECRET: 'votre_client_secret',
VITE_TWITTER_REDIRECT_URI: 'https://www.taxiassur.com/auth/callback/twitter'
```

---

### 4️⃣ Pinterest

#### A. Créer l'application

1. Allez sur https://developers.pinterest.com/apps/
2. Cliquez sur "Create app" :
   - **App name** : TaxiAssur Pinterest Manager
   - **Description** : Gestion automatisée des épingles Pinterest
   - **Privacy policy** : https://www.taxiassur.com/politique-de-confidentialite
   - **Terms of service** : https://www.taxiassur.com/conditions-generales

#### B. Configuration OAuth

1. Dans "OAuth" tab :
   - **Redirect URI** : `https://www.taxiassur.com/auth/callback/pinterest`
2. Scopes requis :
   - ✅ `boards:read`
   - ✅ `pins:read`
   - ✅ `pins:write`
   - ✅ `user_accounts:read`
3. Notez les credentials :
   - **App ID**
   - **App Secret**

#### C. Variables d'environnement

```javascript
VITE_PINTEREST_APP_ID: 'votre_app_id',
VITE_PINTEREST_APP_SECRET: 'votre_app_secret',
VITE_PINTEREST_REDIRECT_URI: 'https://www.taxiassur.com/auth/callback/pinterest'
```

---

### 5️⃣ Facebook

#### A. Créer l'application

1. Allez sur https://developers.facebook.com/apps
2. Cliquez sur "Create App" :
   - **Use case** : Business
   - **App name** : TaxiAssur Social Manager
3. Ajoutez les produits :
   - **Facebook Login**
   - **Facebook Pages API**

#### B. Configuration OAuth

1. Dans "Facebook Login" → "Settings" :
   - **Valid OAuth Redirect URIs** :
     - `https://www.taxiassur.com/auth/callback/facebook`
2. Dans "Settings" → "Basic" :
   - **App Domains** : `taxiassur.com`
   - **Privacy Policy URL** : https://www.taxiassur.com/politique-de-confidentialite
3. Notez les credentials :
   - **App ID**
   - **App Secret**

#### C. Demande de permissions

Pour publier sur une page Facebook, demandez :
- `pages_manage_posts`
- `pages_read_engagement`
- `publish_video`

#### D. Variables d'environnement

```javascript
VITE_FACEBOOK_APP_ID: 'votre_app_id',
VITE_FACEBOOK_APP_SECRET: 'votre_app_secret',
VITE_FACEBOOK_REDIRECT_URI: 'https://www.taxiassur.com/auth/callback/facebook'
```

---

## 🔧 CONFIGURATION SUPABASE

### Edge Functions requises

Pour chaque réseau, vous devez créer une edge function pour gérer l'échange du code OAuth contre un access token :

1. `twitter-oauth-exchange`
2. `pinterest-oauth-exchange`
3. `facebook-oauth-exchange`

### Template d'edge function

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    const clientId = Deno.env.get('TWITTER_CLIENT_ID');
    const clientSecret = Deno.env.get('TWITTER_CLIENT_SECRET');
    const redirectUri = 'https://www.taxiassur.com/auth/callback/twitter';

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: 'challenge'
      })
    });

    const tokens = await tokenResponse.json();

    return new Response(
      JSON.stringify(tokens),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

---

## ✅ CHECKLIST DE VÉRIFICATION

Avant de tester les connexions :

### Configuration générale
- [ ] Toutes les variables d'environnement sont dans `.env` ou `env-config.js`
- [ ] Les redirect URIs correspondent exactement dans chaque app
- [ ] Les domaines sont autorisés (pas de localhost en production)
- [ ] Les secrets sont sécurisés (pas dans le code source)

### Pour chaque réseau
- [ ] Application créée sur la plateforme
- [ ] OAuth configuré avec le bon redirect URI
- [ ] Permissions/scopes demandés
- [ ] Client ID et Secret sauvegardés
- [ ] Variables d'environnement ajoutées
- [ ] Edge function créée (si nécessaire)

---

## 🧪 TEST DES CONNEXIONS

### Étape 1 : Accéder à la page
```
https://www.taxiassur.com/backoffice/social-connections
```

### Étape 2 : Pour chaque réseau

1. **Vérifiez** que le bouton "Connecter" apparaît
2. **Cliquez** sur le bouton
3. **Autorisez** l'accès sur la plateforme
4. **Vérifiez** le retour sur la page de callback
5. **Confirmez** l'affichage "Connecté" ✅

### Étape 3 : Vérifier dans Supabase

```sql
SELECT
  platform,
  is_connected,
  account_name,
  token_expires_at
FROM social_networks
WHERE is_connected = true;
```

---

## 🐛 DÉPANNAGE

### Problème : "Configuration manquante"

**Cause** : Les variables d'environnement OAuth ne sont pas définies

**Solution** :
1. Vérifiez que les variables sont dans `.env` ou `env-config.js`
2. Redémarrez le serveur de développement
3. Vérifiez les noms des variables (respecter exactement)

### Problème : "redirect_uri_mismatch"

**Cause** : L'URI de redirection ne correspond pas

**Solution** :
1. Vérifiez l'URI exact dans la console développeur du réseau
2. Pas de slash final : ❌ `/callback/linkedin/` ✅ `/callback/linkedin`
3. HTTPS obligatoire en production
4. Domaine exact : `www.taxiassur.com` vs `taxiassur.com`

### Problème : "Invalid client credentials"

**Cause** : Client ID ou Secret incorrect

**Solution** :
1. Vérifiez les credentials dans la console développeur
2. Regénérez si nécessaire
3. Aucun espace avant/après dans le fichier .env
4. Utilisez les bonnes variables (CLIENT_ID vs APP_ID selon le réseau)

### Problème : "Insufficient permissions"

**Cause** : Scopes OAuth manquants

**Solution** :
1. Vérifiez les permissions dans la console développeur
2. Demandez l'accès aux scopes nécessaires
3. Certains réseaux nécessitent une révision manuelle
4. Attendez l'approbation avant de tester

---

## 📊 MONITORING

### Dashboard analytics

Une fois connecté, vous pouvez suivre :
- ✅ Status de connexion (connecté/déconnecté)
- ✅ Expiration des tokens (jours restants)
- ✅ Dernière publication
- ✅ Taux d'engagement
- ✅ Erreurs de publication

### Notifications

Le système vous alertera :
- ⚠️ 7 jours avant expiration d'un token
- ❌ En cas d'échec de publication
- ✅ Après une publication réussie

---

## 🎯 PROCHAINES ÉTAPES

Une fois tous les réseaux connectés :

1. **Testez les publications** depuis le dashboard
2. **Configurez l'auto-publication** pour chaque réseau
3. **Créez des templates** de publication
4. **Planifiez** vos publications
5. **Analysez** les performances

---

## 📚 RESSOURCES

### Documentation officielle

- LinkedIn : https://learn.microsoft.com/en-us/linkedin/marketing/
- YouTube : https://developers.google.com/youtube/v3
- Twitter : https://developer.twitter.com/en/docs
- Pinterest : https://developers.pinterest.com/docs
- Facebook : https://developers.facebook.com/docs

### Support

Pour toute question :
- 📧 Email : team@taxiassur.com
- 💬 Dashboard → Section "Aide"

---

**Date** : 10 janvier 2026
**Status** : ✅ Infrastructure complète déployée
**Action requise** : Configurer les applications OAuth sur chaque plateforme
