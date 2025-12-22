# 📌 Guide Configuration Pinterest API - Step by Step

## 🎯 Objectif
Obtenir votre **Access Token Pinterest** pour publier automatiquement des épingles depuis TaxiAssur.

---

## 📋 Prérequis

✅ Vous avez déjà :
- Un compte Pinterest (personnel ou professionnel)

❌ Vous n'avez pas encore :
- Un compte Pinterest Business
- Une application Pinterest créée
- Un Access Token

---

## 🚀 Étape 1 : Convertir en compte Business (GRATUIT)

### 1.1 Se connecter à Pinterest
👉 https://www.pinterest.fr/

### 1.2 Convertir en compte Business
1. Cliquer sur votre **photo de profil** (en haut à droite)
2. Aller dans **Paramètres** ⚙️
3. Cliquer sur **Gestion du compte**
4. Cliquer sur **Passer à un compte professionnel** (GRATUIT)
5. Choisir :
   - Type d'entreprise : **Services professionnels**
   - Nom de l'entreprise : **TaxiAssur**
6. Terminer la configuration

✅ **Résultat** : Votre compte est maintenant Business (gratuit)

---

## 🔧 Étape 2 : Créer une application Pinterest

### 2.1 Aller sur Pinterest Developers
👉 https://developers.pinterest.com/

### 2.2 Se connecter avec votre compte Business

### 2.3 Créer une nouvelle application
1. Cliquer sur **"Apps"** dans le menu
2. Cliquer sur **"Create App"** ou **"Créer une application"**

### 2.4 Remplir le formulaire
```
App name: TaxiAssur Social Publisher
App description: Automatic content publishing for insurance services
App website: https://taxiassur.com
Redirect URI: https://taxiassur.com/api/pinterest-callback
Privacy Policy URL: https://taxiassur.com/legal
Terms of Service URL: https://taxiassur.com/conditions
```

### 2.5 Accepter les conditions
- ✅ Cocher "I agree to Pinterest's Terms of Service"
- Cliquer sur **"Create"**

✅ **Résultat** : Votre application est créée !

---

## 🔑 Étape 3 : Récupérer les clés API

### 3.1 Dans votre application Pinterest
Vous verrez maintenant :

#### App ID
```
1234567890
```

#### App secret
```
abc123def456...
```

⚠️ **IMPORTANT** : Notez ces deux valeurs, vous en aurez besoin !

---

## 🎫 Étape 4 : Générer un Access Token

### Méthode 1 : Access Token temporaire (test)

1. Dans votre application Pinterest
2. Aller dans **"Generate Access Token"**
3. Copier le token :
```
pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
```

⚠️ **Attention** : Ce token expire après 1 an

---

### Méthode 2 : OAuth 2.0 (production - recommandé)

#### 4.1 URL d'autorisation
```
https://www.pinterest.com/oauth/?
client_id=VOTRE_APP_ID&
redirect_uri=https://taxiassur.com/api/pinterest-callback&
response_type=code&
scope=boards:read,boards:write,pins:read,pins:write,user_accounts:read
```

#### 4.2 Permissions (scopes) nécessaires
- `boards:read` - Lire vos tableaux
- `boards:write` - Créer/modifier des tableaux
- `pins:read` - Lire vos épingles
- `pins:write` - Créer/modifier des épingles
- `user_accounts:read` - Lire les infos du compte

#### 4.3 Obtenir le code
1. Ouvrir l'URL ci-dessus dans votre navigateur
2. Se connecter à Pinterest
3. Cliquer sur **"Autoriser"**
4. Vous serez redirigé vers :
```
https://taxiassur.com/api/pinterest-callback?code=ABC123...
```
5. Copier le `code=ABC123...`

#### 4.4 Échanger le code contre un token
```bash
curl -X POST https://api.pinterest.com/v5/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=ABC123..." \
  -d "redirect_uri=https://taxiassur.com/api/pinterest-callback" \
  -u "VOTRE_APP_ID:VOTRE_APP_SECRET"
```

#### Réponse :
```json
{
  "access_token": "pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
  "token_type": "bearer",
  "expires_in": 31536000,
  "refresh_token": "refresh_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
  "scope": "boards:read,boards:write,pins:read,pins:write,user_accounts:read"
}
```

✅ **Gardez précieusement** : `access_token` et `refresh_token`

---

## 💾 Étape 5 : Ajouter les clés à Supabase

### 5.1 Aller dans Supabase Dashboard
👉 https://supabase.com/dashboard/project/[votre-projet]

### 5.2 Project Settings → Secrets

Ajouter ces secrets :

```env
PINTEREST_APP_ID=1234567890
PINTEREST_APP_SECRET=abc123def456...
PINTEREST_ACCESS_TOKEN=pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
PINTEREST_REFRESH_TOKEN=refresh_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
```

### 5.3 Mettre à jour dans votre .env local
```env
VITE_PINTEREST_ACCESS_TOKEN=pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
```

---

## ✅ Étape 6 : Activer Pinterest dans la base

```sql
-- Dans Supabase SQL Editor
UPDATE social_networks
SET
  is_active = true,
  is_connected = true,
  access_token = 'pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
WHERE platform = 'pinterest';
```

---

## 🧪 Étape 7 : Tester l'API

### Test simple avec curl

```bash
curl -X GET https://api.pinterest.com/v5/user_account \
  -H "Authorization: Bearer pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
```

#### Réponse attendue :
```json
{
  "username": "taxiassur",
  "account_type": "BUSINESS",
  "profile_image": "https://...",
  "website_url": "https://taxiassur.com"
}
```

✅ **Si vous voyez ça** : Votre API est fonctionnelle !

---

## 📌 Étape 8 : Créer un tableau (Board)

Avant de publier des épingles, vous devez avoir un tableau :

```bash
curl -X POST https://api.pinterest.com/v5/boards \
  -H "Authorization: Bearer pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assurance Taxi - Conseils",
    "description": "Conseils et astuces pour les chauffeurs de taxi",
    "privacy": "PUBLIC"
  }'
```

#### Réponse :
```json
{
  "id": "1234567890",
  "name": "Assurance Taxi - Conseils",
  "description": "Conseils et astuces pour les chauffeurs de taxi",
  "privacy": "PUBLIC"
}
```

✅ **Notez le Board ID** : `1234567890`

---

## 🎨 Étape 9 : Publier une épingle (test)

```bash
curl -X POST https://api.pinterest.com/v5/pins \
  -H "Authorization: Bearer pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "1234567890",
    "title": "Top 5 erreurs en assurance taxi",
    "description": "Ne faites plus ces erreurs qui vous coûtent cher ! #AssuranceTaxi",
    "link": "https://taxiassur.com/blog/assurance-taxi-2024",
    "media_source": {
      "source_type": "image_url",
      "url": "https://images.pexels.com/photos/1234567/taxi.jpg"
    }
  }'
```

#### Réponse :
```json
{
  "id": "pin_abc123...",
  "created_at": "2025-10-21T21:45:00.000Z",
  "link": "https://www.pinterest.com/pin/pin_abc123...",
  "title": "Top 5 erreurs en assurance taxi"
}
```

✅ **Succès !** Votre première épingle est publiée !

---

## 📊 Étape 10 : Récupérer les statistiques

### Statistiques d'une épingle

```bash
curl -X GET https://api.pinterest.com/v5/pins/pin_abc123.../analytics \
  -H "Authorization: Bearer pina_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
```

#### Réponse :
```json
{
  "all_time": {
    "IMPRESSION": 1234,
    "SAVE": 56,
    "PIN_CLICK": 89,
    "OUTBOUND_CLICK": 23
  }
}
```

---

## 🔄 Étape 11 : Refresh Token (pour renouveler)

Le token expire après 1 an. Pour le renouveler :

```bash
curl -X POST https://api.pinterest.com/v5/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=refresh_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890" \
  -u "VOTRE_APP_ID:VOTRE_APP_SECRET"
```

#### Réponse :
```json
{
  "access_token": "pina_NOUVEAU_TOKEN",
  "refresh_token": "refresh_NOUVEAU_TOKEN",
  "expires_in": 31536000
}
```

---

## 📚 Ressources officielles

- 📖 Documentation : https://developers.pinterest.com/docs/api/v5/
- 🔑 Gestion des apps : https://developers.pinterest.com/apps/
- 💬 Support : https://help.pinterest.com/contact
- 🧪 API Explorer : https://developers.pinterest.com/tools/api-explorer/

---

## 🎯 Checklist finale

- [ ] Compte Pinterest converti en Business
- [ ] Application Pinterest créée
- [ ] App ID + App Secret récupérés
- [ ] Access Token généré
- [ ] Secrets ajoutés dans Supabase
- [ ] API testée avec curl
- [ ] Tableau (Board) créé
- [ ] Première épingle publiée avec succès
- [ ] Pinterest activé dans `social_networks`

---

## ⚠️ Limites Pinterest API

### Quotas (gratuit) :
- **200 requêtes/jour** par utilisateur
- **1 000 requêtes/jour** par app
- **10 épingles/minute** maximum

### Recommandations :
- Ne pas dépasser 50 publications/jour
- Espacer les publications de 2-3 minutes
- Utiliser des images de qualité (min 600x900px)
- Ajouter toujours un lien vers votre site

---

## 🚀 Prochaine étape

Une fois Pinterest configuré, je peux créer l'**Edge Function** pour :
1. Publier automatiquement sur Pinterest
2. Récupérer les stats (impressions, saves, clics)
3. Mettre à jour la base de données

**Voulez-vous que je crée l'Edge Function Pinterest maintenant ?**
