# 🔧 CORRECTION URGENTE - ÉCRAN NOIR

## 🚨 Problème Identifié

Le site affiche un écran noir car le fichier `/env-config.js` sur IONOS contient les **mauvaises clés Supabase**.

---

## ✅ SOLUTION IMMÉDIATE (5 MINUTES)

### Étape 1 : Télécharger le fichier corrigé

Le fichier corrigé se trouve ici :
```
/public/env-config.js
```

### Étape 2 : Se connecter à IONOS

1. Allez sur : https://www.ionos.fr/
2. Connectez-vous à votre compte
3. Allez dans "Hébergement" → "Espace Web & Domaine"
4. Cliquez sur votre domaine `taxiassur.com`

### Étape 3 : Ouvrir le FTP/FileManager

#### Option A : FileManager Web (plus simple)
1. Dans le panneau IONOS, cliquez sur "FileManager"
2. Attendez le chargement du gestionnaire de fichiers
3. Vous êtes à la racine du site

### Étape 4 : Uploader le fichier

1. **Localisez le fichier** `env-config.js` dans votre dossier `public/`
2. **Uploadez à la racine** du site IONOS
3. **Remplacez** l'ancien fichier

### Étape 5 : Vider le cache

1. **Dans votre navigateur** : `Ctrl + Shift + R` (ou `Cmd + Shift + R` sur Mac)

### Étape 6 : Tester

1. Allez sur : https://taxiassur.com
2. Le site doit maintenant s'afficher correctement

---

## ⚡ ACTION IMMÉDIATE

Uploadez le fichier `/public/env-config.js` sur IONOS maintenant !
