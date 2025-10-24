# 🔐 SÉCURISATION CLÉ API GOOGLE CSE - GUIDE COMPLET

## ⚠️ SITUATION ACTUELLE

Votre clé API Google Custom Search Engine a été exposée publiquement dans votre code et potentiellement sur GitHub :
- **Clé exposée** : `AIzaSyBMdJggXK49R_h8x__U6lIxiWEE8Gbjesk`
- **CX ID** : `73ba86b5aae9b4add`

## ✅ CE QUI A ÉTÉ FAIT AUTOMATIQUEMENT

1. ✅ **Variables d'environnement créées** dans `.env`
2. ✅ **Code mis à jour** pour utiliser les variables d'environnement
3. ✅ **Fichiers modifiés** :
   - `/src/lib/cse.ts` - Utilise maintenant `VITE_GOOGLE_CSE_API_KEY`
   - `/test-cse.html` - Utilise maintenant les variables d'environnement
   - `/.env.example` - Variables documentées

## 🚨 ACTIONS CRITIQUES À FAIRE IMMÉDIATEMENT

### ÉTAPE 1 : RÉVOQUER L'ANCIENNE CLÉ (OBLIGATOIRE)

Cette étape est **CRITIQUE** car votre clé a été exposée publiquement.

1. Allez sur : https://console.cloud.google.com/apis/credentials

2. Trouvez la clé API : `AIzaSyBMdJggXK49R_h8x__U6lIxiWEE8Gbjesk`

3. Cliquez sur l'icône **poubelle** 🗑️ pour **DELETE** (supprimer)

4. Confirmez la suppression

⚠️ **IMPORTANT** : Une fois cette clé supprimée, personne ne pourra plus l'utiliser (y compris les malveillants).

---

### ÉTAPE 2 : CRÉER UNE NOUVELLE CLÉ API

1. Sur la même page : https://console.cloud.google.com/apis/credentials

2. Cliquez sur **"+ CREATE CREDENTIALS"** → **"API Key"**

3. Une nouvelle clé sera générée (ex: `AIzaSy...`)

4. **IMPORTANT** : Cliquez immédiatement sur **"RESTRICT KEY"** (Restreindre la clé)

5. Configurez les restrictions :

   **a) Restrictions d'API :**
   - Choisir **"Restrict key"**
   - Cochez uniquement : **"Custom Search API"**
   - Décochez toutes les autres APIs

   **b) Restrictions d'application (optionnel mais recommandé) :**
   - Choisir **"HTTP referrers (web sites)"**
   - Ajouter vos domaines autorisés :
     ```
     https://www.taxiassur.com/*
     https://taxiassur.com/*
     http://localhost:5173/*
     ```

6. Cliquez sur **"SAVE"**

7. **COPIEZ VOTRE NOUVELLE CLÉ** (vous ne pourrez plus la voir après)

---

### ÉTAPE 3 : METTRE À JOUR LE FICHIER `.env`

1. Ouvrez le fichier `.env` à la racine de votre projet

2. Remplacez `YOUR_NEW_GOOGLE_CSE_KEY_HERE` par votre **nouvelle clé** :

```env
# Google Custom Search Engine API (pour Partner Finder)
VITE_GOOGLE_CSE_API_KEY=AIzaSy_VOTRE_NOUVELLE_CLE_ICI
VITE_GOOGLE_CSE_CX=73ba86b5aae9b4add
```

3. **Sauvegardez** le fichier

---

### ÉTAPE 4 : NETTOYER GITHUB (SI APPLICABLE)

Si votre code a été poussé sur GitHub avec la clé exposée, vous devez nettoyer l'historique.

#### Option A : Supprimer le fichier de l'historique (recommandé)

```bash
# Supprimer test-cse.html de l'historique Git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch test-cse.html" \
  --prune-empty --tag-name-filter cat -- --all

# Forcer le push
git push origin --force --all
```

#### Option B : Utiliser BFG Repo-Cleaner (plus rapide)

```bash
# Télécharger BFG : https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt your-repo.git

git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin --force --all
```

#### Option C : Nouveau commit (simple mais historique reste)

```bash
git add .
git commit -m "security: remove exposed Google CSE API key"
git push
```

⚠️ **Note** : Même si vous nettoyez GitHub, considérez la clé comme **compromise** et **révoquée** (d'où l'ÉTAPE 1).

---

### ÉTAPE 5 : VÉRIFIER QUE TOUT FONCTIONNE

1. **Redémarrez votre serveur de développement** :
   ```bash
   # Arrêter le serveur (Ctrl+C)
   # Puis redémarrer
   npm run dev
   ```

2. **Testez l'API CSE** :
   - Allez sur : http://localhost:5173/test-cse.html
   - Cliquez sur **"Tester l'API Google CSE"**
   - Vous devriez voir des résultats de recherche

3. **Testez le Partner Finder** :
   - Allez sur : http://localhost:5173 (backoffice)
   - Ouvrez **"Partner Finder"**
   - Lancez une recherche
   - Vérifiez que les résultats apparaissent

---

## 🔒 BONNES PRATIQUES DE SÉCURITÉ

### 1. Fichier `.gitignore`

Vérifiez que `.env` est bien dans `.gitignore` :

```
# .gitignore
.env
.env.local
.env.production
```

### 2. Ne JAMAIS commiter :
- ❌ Clés API
- ❌ Mots de passe
- ❌ Tokens
- ❌ Secrets

### 3. Fichier `.env.example`

✅ Utilisez `.env.example` (déjà créé) pour documenter les variables nécessaires :

```env
# .env.example
VITE_GOOGLE_CSE_API_KEY=
VITE_GOOGLE_CSE_CX=
```

### 4. Variables d'environnement par environnement

- **Development** : `.env.local` (ignoré par Git)
- **Production** : Variables dans votre plateforme de déploiement (Vercel, Netlify, etc.)

---

## 📊 VÉRIFICATION POST-SÉCURISATION

Checklist à cocher :

- [ ] Ancienne clé API révoquée sur Google Cloud Console
- [ ] Nouvelle clé API créée avec restrictions
- [ ] Nouvelle clé ajoutée dans `.env`
- [ ] Serveur dev redémarré
- [ ] Test CSE fonctionnel (http://localhost:5173/test-cse.html)
- [ ] Partner Finder fonctionnel
- [ ] `.env` bien dans `.gitignore`
- [ ] Historique Git nettoyé (si applicable)

---

## 🆘 EN CAS DE PROBLÈME

### Erreur : "API Key not valid"
- Vérifiez que vous avez copié la clé complète
- Vérifiez qu'il n'y a pas d'espaces avant/après
- Attendez 2-3 minutes (propagation Google)

### Erreur : "Access Not Configured"
- Activez l'API Custom Search : https://console.cloud.google.com/apis/library/customsearch.googleapis.com
- Cliquez sur **"ENABLE"**

### Erreur : "Referrer not allowed"
- Allez dans les restrictions de la clé
- Vérifiez que votre domaine/localhost est autorisé

### Variables d'environnement non chargées
- Redémarrez complètement le serveur dev
- Vérifiez que les variables commencent bien par `VITE_`

---

## 💰 COÛTS ET QUOTAS

**Google Custom Search API - Plan Gratuit :**
- 100 requêtes / jour : **GRATUIT**
- Au-delà : $5 / 1000 requêtes

**Surveillance du quota :**
- Le Partner Finder affiche le quota restant
- Un rate limiter automatique empêche de dépasser

---

## 📝 RÉSUMÉ DES CHANGEMENTS

### Fichiers modifiés :
1. ✅ `.env` - Nouvelles variables ajoutées
2. ✅ `.env.example` - Variables documentées
3. ✅ `src/lib/cse.ts` - Utilise variables d'environnement
4. ✅ `test-cse.html` - Utilise variables d'environnement

### Variables créées :
- `VITE_GOOGLE_CSE_API_KEY` - Votre clé API Google
- `VITE_GOOGLE_CSE_CX` - Votre Search Engine ID

### Sécurité améliorée :
- ✅ Plus de clés en dur dans le code
- ✅ Clés dans `.env` (ignoré par Git)
- ✅ Mode simulation si clés absentes
- ✅ Rate limiting automatique

---

## 🎯 PROCHAINES ÉTAPES

Une fois la sécurisation terminée :

1. **Tester intensivement** le Partner Finder
2. **Documenter** les prospects trouvés
3. **Activer** les campagnes d'outreach automatiques
4. **Monitorer** l'utilisation du quota

---

**Date de sécurisation** : 2025-10-06
**Clé compromise** : `AIzaSyBMdJggXK49R_h8x__U6lIxiWEE8Gbjesk` (À RÉVOQUER)
**Status** : ⚠️ ACTION REQUISE - Révoquer et recréer la clé
