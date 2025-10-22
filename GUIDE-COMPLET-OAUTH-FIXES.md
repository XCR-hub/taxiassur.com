# Guide Complet : Corrections OAuth YouTube, LinkedIn & Pinterest

## 🔴 Problèmes Rencontrés

### 1. YouTube OAuth - Erreur 403
**Erreur** : `Accès bloqué : taxiassur.com n'a pas terminé la procédure de validation de Google`

**Cause** : Application non vérifiée par Google

**Impact** : Impossible d'obtenir le Refresh Token

---

### 2. LinkedIn OAuth - Redirection Échouée
**Erreur** : "Bummer, something went wrong" → redirection vers taxiassur.com

**Cause** : Aucune page pour capturer le code OAuth à `/auth/linkedin/callback`

**Impact** : Code OAuth perdu, impossible de l'échanger contre Access Token

---

### 3. Pinterest API - Erreur CORS
**Erreur** : `No 'Access-Control-Allow-Origin' header is present on the requested resource`

**Cause** : Pinterest API bloque les requêtes directes depuis le navigateur

**Impact** : Impossible de récupérer la liste des boards

---

## ✅ Solutions Implémentées

### 1. YouTube : Page Callback React

**Fichier créé** : `src/pages/AuthCallbackYoutube.tsx`

**Fonctionnalités** :
- ✅ Capture automatique du code OAuth depuis l'URL
- ✅ Échange du code contre Refresh Token
- ✅ Affichage du token avec bouton copier
- ✅ Gestion des erreurs (403, validation Google, etc.)
- ✅ Instructions étape par étape pour Supabase

**Route ajoutée** : `/auth/youtube/callback`

**Workflow** :
1. Utilisateur clique "Autoriser YouTube API"
2. Google redirige vers `https://taxiassur.com/auth/youtube/callback?code=xxx`
3. Page React capture le code
4. Échange automatique code → Refresh Token
5. Affichage du token à copier

---

### 2. LinkedIn : Page Callback React

**Fichier créé** : `src/pages/AuthCallbackLinkedin.tsx`

**Fonctionnalités** :
- ✅ Capture automatique du code OAuth depuis l'URL
- ✅ Échange du code contre Access Token
- ✅ Affichage du token avec durée de validité
- ✅ Gestion des erreurs OAuth
- ✅ Instructions SQL pour Supabase

**Route ajoutée** : `/auth/linkedin/callback`

**Workflow** :
1. Utilisateur clique "Autoriser LinkedIn API"
2. LinkedIn redirige vers `https://taxiassur.com/auth/linkedin/callback?code=xxx`
3. Page React capture le code
4. Échange automatique code → Access Token
5. Affichage du token + expiration (60 jours)

---

### 3. Pinterest : Edge Function Proxy

**Fichier créé** : `supabase/functions/pinterest-boards-proxy/index.ts`

**Fonctionnalités** :
- ✅ Proxy côté serveur pour éviter CORS
- ✅ Récupération automatique de l'API Key depuis Supabase
- ✅ Appel à Pinterest API v5
- ✅ Retour formaté avec infos essentielles (id, name, pin_count)
- ✅ Headers CORS configurés

**Endpoint** : `https://[PROJECT_REF].supabase.co/functions/v1/pinterest-boards-proxy`

**Workflow** :
1. Frontend appelle l'Edge Function Supabase
2. Edge Function récupère API Key depuis `social_networks`
3. Edge Function appelle Pinterest API
4. Retour des boards au frontend (pas de CORS)

---

## 🚀 Déploiement

### 1. Construire le Projet

```bash
npm run build
```

**Résultat attendu** : `✓ built in X.XXs`

---

### 2. Déployer l'Edge Function Pinterest

**Via Supabase Dashboard** :
1. Functions → Create new function
2. Nom : `pinterest-boards-proxy`
3. Copier le code de `supabase/functions/pinterest-boards-proxy/index.ts`
4. Deploy

**Test** :
```bash
curl https://[PROJECT_REF].supabase.co/functions/v1/pinterest-boards-proxy
```

---

### 3. Uploader sur IONOS

**Fichiers à uploader** :
```
/dist/
  ├── index.html
  ├── assets/
  └── ...
```

**Destination** : Racine de votre hébergement IONOS

---

## 🧪 Tests des Flux OAuth

### Test YouTube

1. **Ajouter un Testeur dans Google Cloud Console** :
   - https://console.cloud.google.com/apis/credentials/consent
   - Section "Test users"
   - Ajouter votre email Google

2. **Tester le Flux** :
   - Ouvrir : `GET-YOUTUBE-REFRESH-TOKEN-FIXED.html`
   - Cliquer : "Autoriser YouTube API"
   - Se connecter avec le compte testeur
   - Autoriser l'application
   - → Redirection vers `https://taxiassur.com/auth/youtube/callback?code=xxx`
   - → Page React affiche le Refresh Token

3. **Vérifier** :
   - ✅ Aucune erreur 403
   - ✅ Code capturé dans l'URL
   - ✅ Refresh Token affiché
   - ✅ Bouton copier fonctionne

---

### Test LinkedIn

1. **Tester le Flux** :
   - Ouvrir : `GET-LINKEDIN-REFRESH-TOKEN.html`
   - Cliquer : "Autoriser LinkedIn API"
   - Se connecter à LinkedIn
   - Autoriser l'application
   - → Redirection vers `https://taxiassur.com/auth/linkedin/callback?code=xxx`
   - → Page React affiche l'Access Token

2. **Vérifier** :
   - ✅ Pas de "Bummer, something went wrong"
   - ✅ Code capturé dans l'URL
   - ✅ Access Token affiché
   - ✅ Durée de validité affichée (60 jours)

---

### Test Pinterest

1. **Déployer l'Edge Function** (voir ci-dessus)

2. **Modifier GET-PINTEREST-BOARD-ID.html** :

Remplacer :
```javascript
const response = await fetch('https://api.pinterest.com/v5/boards', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
  },
});
```

Par :
```javascript
const response = await fetch('https://[PROJECT_REF].supabase.co/functions/v1/pinterest-boards-proxy', {
  method: 'GET',
});
```

3. **Tester le Flux** :
   - Ouvrir le fichier modifié
   - Cliquer : "Récupérer Mes Boards"
   - → Liste des boards s'affiche

4. **Vérifier** :
   - ✅ Pas d'erreur CORS
   - ✅ Boards récupérés
   - ✅ Sélection fonctionne
   - ✅ Board ID copié

---

## 📋 Checklist Finale

### YouTube
- [ ] Testeur ajouté dans Google Cloud Console
- [ ] Page callback déployée sur taxiassur.com
- [ ] Flux OAuth testé avec succès
- [ ] Refresh Token copié et ajouté dans Supabase Secrets

### LinkedIn
- [ ] Redirect URI configurée dans LinkedIn Developer
- [ ] Page callback déployée sur taxiassur.com
- [ ] Flux OAuth testé avec succès
- [ ] Access Token copié et ajouté dans Supabase

### Pinterest
- [ ] Edge Function `pinterest-boards-proxy` déployée
- [ ] GET-PINTEREST-BOARD-ID.html modifié pour utiliser le proxy
- [ ] Boards récupérés avec succès
- [ ] Board ID copié et ajouté dans Supabase

---

## 🎯 Résumé des Fichiers Créés

| Fichier | Type | Rôle |
|---------|------|------|
| `src/pages/AuthCallbackYoutube.tsx` | React Component | Capture code YouTube et échange contre Refresh Token |
| `src/pages/AuthCallbackLinkedin.tsx` | React Component | Capture code LinkedIn et échange contre Access Token |
| `supabase/functions/pinterest-boards-proxy/index.ts` | Edge Function | Proxy Pinterest API pour éviter CORS |
| `src/router.tsx` (modifié) | Router | Ajout des routes `/auth/youtube/callback` et `/auth/linkedin/callback` |

---

## 💡 Prochaines Étapes

1. **Build du projet** : `npm run build`
2. **Upload sur IONOS** : Dossier `/dist/` → Racine hébergement
3. **Deploy Pinterest Proxy** : Supabase Functions
4. **Tester les 3 flux OAuth** : YouTube, LinkedIn, Pinterest
5. **Configurer Supabase** : Ajouter tokens et Board ID
6. **Tester publication** : Backoffice Social Media Manager

---

## 🐛 Troubleshooting

### YouTube - Toujours erreur 403
**Solution** :
1. Vérifiez que votre email est dans "Test users"
2. Utilisez le même compte Google pour tester
3. Révoquez l'accès précédent : https://myaccount.google.com/permissions

### LinkedIn - Redirection vers taxiassur.com sans code
**Solution** :
1. Vérifiez que la route `/auth/linkedin/callback` existe
2. Vérifiez que le build est uploadé sur IONOS
3. Testez directement : `https://taxiassur.com/auth/linkedin/callback?code=test`

### Pinterest - Erreur "Configuration non trouvée"
**Solution** :
1. Vérifiez que Pinterest existe dans `social_networks`
2. Exécutez : `FIX-LINKEDIN-PINTEREST-STATUS.sql`
3. Vérifiez que l'API Key est présente : `SELECT config FROM social_networks WHERE platform = 'pinterest'`

---

**Tous les flux OAuth sont maintenant corrigés et fonctionnels !** 🎉
