# 🔐 Guide Configuration CORS Supabase

## ⚡ Action Immédiate Requise

L'erreur **"Failed to fetch"** que vous voyez est causée par un problème de **CORS (Cross-Origin Resource Sharing)**. Votre site `taxiassur.com` n'est pas autorisé à se connecter à votre base Supabase.

## 🎯 Solution en 3 Minutes

### Étape 1: Accéder aux Paramètres Supabase

1. Allez sur **https://supabase.com/dashboard**
2. Connectez-vous avec votre compte
3. Sélectionnez votre projet: **drohhxrkoequjphvabvq**

### Étape 2: Configurer les URLs

#### A. Settings → API

1. Cliquez sur **Settings** (icône ⚙️ en bas à gauche)
2. Cliquez sur **API**
3. Scrollez jusqu'à **URL Configuration**

#### B. Ajouter les URLs Autorisées

Dans la section **Additional URLs** ou **Allowed Origins**, ajoutez:

```
https://taxiassur.com
```

Si vous avez un sous-domaine www, ajoutez aussi:
```
https://www.taxiassur.com
```

#### C. Sauvegarder

Cliquez sur **Save** en bas de la page

### Étape 3: Configurer Authentication

1. Toujours dans **Settings**, cliquez sur **Authentication**
2. Trouvez la section **Site URL**
3. Entrez: `https://taxiassur.com`
4. Dans **Redirect URLs**, ajoutez:
   ```
   https://taxiassur.com/**
   https://taxiassur.com/backoffice/**
   ```
5. Cliquez sur **Save**

## ✅ Vérification

### Test Immédiat (dans la console Supabase)

1. Allez dans **SQL Editor**
2. Exécutez cette requête:
```sql
SELECT * FROM admin_users WHERE email = 'master@taxiassur.com';
```

**Attendu**: Vous devriez voir votre utilisateur admin

### Test sur le Site

1. Allez sur: `https://taxiassur.com/test-auth-diagnostic.html`
2. Entrez:
   - Email: `master@taxiassur.com`
   - Password: `TaxiAssur2025!,&`
3. Cliquez sur **Tester la Connexion**

**Attendu**:
- ✅ "Connexion réussie"
- ✅ Affichage de l'User ID
- ✅ Profil Admin trouvé

## 🚨 Si ça ne fonctionne toujours pas

### 1. Vérifier les Variables d'Environnement

Ouvrez la console navigateur (F12) sur `taxiassur.com` et tapez:

```javascript
console.log(window.ENV_CONFIG.VITE_SUPABASE_URL);
console.log(window.ENV_CONFIG.VITE_SUPABASE_ANON_KEY);
```

**Attendu**:
```
https://drohhxrkoequjphvabvq.supabase.co
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Vider Tous les Caches

#### Navigateur
- Chrome/Edge: `Ctrl + Shift + Delete` → Cocher "Images et fichiers en cache"
- Firefox: `Ctrl + Shift + Delete` → Cocher "Cache"
- Safari: `Cmd + Option + E`

Puis **Ctrl+Shift+R** (Windows) ou **Cmd+Shift+R** (Mac) pour recharger

#### CDN IONOS
1. Connectez-vous à l'espace client IONOS
2. Hébergement → Gérer
3. Cherchez "Cache" ou "CDN"
4. Cliquez sur "Vider le cache"

### 3. Vérifier le Certificat SSL

Dans le navigateur, vérifiez que `taxiassur.com` a bien un cadenas vert 🔒

Si pas de HTTPS:
1. Espace client IONOS
2. SSL/TLS → Activer Let's Encrypt
3. Attendre 5-10 minutes

### 4. Tester avec cURL (avancé)

Dans votre terminal local:

```bash
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "master@taxiassur.com",
    "password": "TaxiAssur2025!,&"
  }'
```

**Attendu**: Réponse JSON avec `access_token` et `refresh_token`

## 📞 Checklist Diagnostic

- [ ] CORS configuré dans Supabase Settings → API
- [ ] Site URL configuré dans Supabase Settings → Authentication
- [ ] Redirect URLs ajoutées
- [ ] Cache navigateur vidé
- [ ] Cache CDN IONOS vidé
- [ ] HTTPS actif sur taxiassur.com
- [ ] Fichiers uploadés sur IONOS
- [ ] env-config.js présent dans /dist/

## 🎉 Tout Fonctionne?

Si vous voyez "✅ Connexion réussie" sur la page de test, félicitations! Vous pouvez maintenant:

1. Accéder au backoffice: `https://taxiassur.com/backoffice`
2. Gérer les leads via le CRM
3. Utiliser toutes les fonctionnalités IA

## 🆘 Besoin d'Aide?

Si après toutes ces étapes ça ne fonctionne toujours pas:

1. Envoyez une capture d'écran de la console navigateur (F12)
2. Envoyez une capture d'écran des paramètres CORS Supabase
3. Indiquez le message d'erreur exact

### Logs Utiles

Dans la console (F12):
```javascript
// Vérifier l'URL Supabase
console.log(window.ENV_CONFIG);

// Tester la connexion manuellement
const { createClient } = supabase;
const client = createClient(
  window.ENV_CONFIG.VITE_SUPABASE_URL,
  window.ENV_CONFIG.VITE_SUPABASE_ANON_KEY
);

// Test simple
client.from('admin_users').select('count').then(console.log);
```

---

**Important**: Une fois CORS configuré, les changements peuvent prendre **jusqu'à 5 minutes** pour se propager. Soyez patient!
