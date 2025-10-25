# ❓ QUEL FICHIER UPLOADER SUR IONOS ?

## 🚨 LE PROBLÈME

Le serveur a le MAUVAIS fichier qui commence par `#` au lieu de `//`

## ✅ COMMENT IDENTIFIER LE BON FICHIER

### Test simple : Ouvrir avec Notepad

**Ouvrir le fichier `env-config.js` avec Notepad**

#### ✅ BON FICHIER (commence par `//`) :
```javascript
// Configuration des variables d'environnement pour TaxiAssur
window.ENV_CONFIG = {
  VITE_SUPABASE_URL: 'https://viuuznfqkauatkjcegcj.supabase.co',
```

#### ❌ MAUVAIS FICHIER (commence par `#`) :
```
# Configuration TaxiAssur - Variables d'environnement
# Ce fichier est pour le développement local uniquement

VITE_SUPABASE_URL=https://viuuznfqkauatkjcegcj.supabase.co
```

---

## 📁 OÙ TROUVER LE BON FICHIER ?

### Option 1 : Dans le dossier `dist/` (RECOMMANDÉ)

```
VotreProjet/
  └─ dist/
      └─ env-config.js  ← CE FICHIER !
```

**Commande pour créer dist/ :**
```bash
npm run build
```

Puis uploader : `dist/env-config.js`

---

### Option 2 : Dans le dossier `public/`

```
VotreProjet/
  └─ public/
      └─ env-config.js  ← CE FICHIER AUSSI
```

**MAIS ATTENTION :** Vérifier avec Notepad qu'il commence bien par `//`

Si il commence par `#` → C'EST LE MAUVAIS !

---

## 🔍 VÉRIFICATION AVANT UPLOAD

**Avant d'uploader, TOUJOURS vérifier :**

1. Clic droit sur le fichier → Ouvrir avec → Notepad
2. Regarder la PREMIÈRE LIGNE
3. Si c'est `//` → ✅ GO !
4. Si c'est `#` → ❌ STOP ! Chercher l'autre

---

## 📤 PROCÉDURE D'UPLOAD SUR IONOS

### Étape 1 : Localiser le bon fichier

- Aller dans : `VotreProjet/dist/`
- Trouver : `env-config.js`
- Double-vérifier avec Notepad : première ligne = `//`

### Étape 2 : IONOS

1. https://www.ionos.fr → Login
2. Hosting → Gérer
3. Espace Web → Gestionnaire de fichiers
4. Aller à la racine `/`

### Étape 3 : Supprimer l'ancien

1. Chercher : `env-config.js`
2. Clic droit → Supprimer
3. Confirmer

### Étape 4 : Upload le nouveau

1. Bouton "Upload"
2. Sélectionner : `dist/env-config.js`
3. Upload

### Étape 5 : Vérifier sur le serveur

**Ouvrir dans le navigateur :**
```
https://taxiassur.com/env-config.js
```

**Première ligne DOIT être :**
```javascript
// Configuration des variables d'environnement pour TaxiAssur
```

**Si c'est :**
```
# Configuration TaxiAssur
```
→ ❌ MAUVAIS FICHIER UPLOADÉ ! Recommencer

---

## 🎯 CHECKLIST ANTI-ERREUR

- [ ] Fichier trouvé dans `dist/` (ou `public/`)
- [ ] Ouvert avec Notepad
- [ ] Première ligne vérifiée : `//` (pas `#`)
- [ ] Ancien fichier supprimé sur IONOS
- [ ] Nouveau fichier uploadé
- [ ] Vérification URL : https://taxiassur.com/env-config.js
- [ ] Première ligne sur le serveur = `//`
- [ ] Cache vidé (CTRL+SHIFT+DEL)
- [ ] Test en navigation privée (CTRL+SHIFT+N)

---

## 💡 ASTUCE : Reconnaître visuellement

**BON FICHIER :**
- Commence par `//`
- Contient `window.ENV_CONFIG = {`
- Valeurs entre guillemets simples `'...'`
- Virgules à la fin de chaque ligne

**MAUVAIS FICHIER :**
- Commence par `#`
- Pas de `window.ENV_CONFIG`
- Format : `NOM=valeur` (sans guillemets)
- Pas de virgules

---

## 🔄 SI VOUS AVEZ UPLOADÉ LE MAUVAIS

1. Supprimer sur IONOS
2. Retourner sur votre PC
3. Vérifier avec Notepad
4. Re-uploader le BON

---

## 📞 BESOIN D'AIDE ?

Si après vérification vous avez uploadé le BON fichier (première ligne = `//`) mais ça ne marche toujours pas :

**Envoyez-moi :**
1. Screenshot du fichier ouvert avec Notepad
2. Screenshot de https://taxiassur.com/env-config.js
3. team@taxiassur.com

---

**RÈGLE D'OR : Toujours vérifier avec Notepad avant d'uploader !**
