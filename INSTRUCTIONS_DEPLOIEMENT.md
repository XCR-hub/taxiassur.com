# Instructions de déploiement - Correction Espace Prospect

## Problème identifié et résolu
L'erreur 404 était causée par une **route manquante** dans le routeur React. L'URL `/espace-prospect/[TOKEN]` n'était pas définie.

### Corrections appliquées
1. Ajout de la route `/espace-prospect/:token` dans le routeur
2. Mise à jour du .htaccess pour éviter le cache de index.html
3. Nouveau build complet effectué

## ÉTAPES DE DÉPLOIEMENT (OBLIGATOIRES)

### 1. Télécharger l'archive
L'archive est prête : `/tmp/cc-agent/61788020/project/dist-deploy-latest.tar.gz` (12 MB)

### 2. Se connecter à IONOS
- Allez sur https://www.ionos.fr
- Connectez-vous à votre espace client
- Accédez à "Hébergement Web"

### 3. Supprimer l'ancien contenu
**IMPORTANT** : Vous devez supprimer TOUT le contenu actuel du site :
- Connectez-vous via FTP (FileZilla ou autre client FTP)
- Sélectionnez TOUS les fichiers et dossiers
- Supprimez tout (sauf le dossier `/logs` si présent)

### 4. Uploader le nouveau contenu
- Extraire l'archive `dist-deploy-latest.tar.gz` sur votre ordinateur
- Uploader **TOUT** le contenu extrait vers la racine de votre site
- Vérifier que ces fichiers sont présents :
  - `/index.html` ✅
  - `/.htaccess` ✅
  - `/assets/` (dossier complet) ✅
  - `/api/` ✅
  - `/sw.js` ✅

### 5. Vider le cache
Après le déploiement :
1. **Sur votre ordinateur** :
   - Chrome : Ctrl+Shift+Delete → Cocher "Images et fichiers en cache"
   - Firefox : Ctrl+Shift+Delete → Cocher "Cache"

2. **Test en mode navigation privée** :
   - Ouvrir une fenêtre de navigation privée
   - Tester l'URL de l'espace prospect

### 6. Tester l'accès
URL à tester :
```
https://taxiassur.com/espace-prospect/8b2400138bbaf4b784429f7fabf3406cde268fcdabbb7dc54c3e816ebaff4f2
```

## Vérification que tout fonctionne

1. ✅ La page se charge sans erreur 404
2. ✅ Les informations du prospect s'affichent
3. ✅ Le formulaire d'upload de documents est visible
4. ✅ Aucune erreur dans la console du navigateur (F12)

## En cas de problème

### Erreur 404 persiste
- Vérifiez que le fichier `.htaccess` est bien uploadé
- Vérifiez les permissions du fichier .htaccess (644)
- Contactez le support IONOS pour vérifier la configuration Apache

### Erreur "Failed to fetch"
- Vérifiez que l'URL Supabase est correcte dans .env
- Testez l'accès à Supabase depuis le backoffice admin

### Page blanche
- Ouvrez la console du navigateur (F12)
- Regardez les erreurs de chargement
- Vérifiez que tous les fichiers JS sont bien uploadés dans `/assets/`

---

**Date de build** : 2026-02-04 14:03
**Archive** : dist-deploy-latest.tar.gz (12 MB)
