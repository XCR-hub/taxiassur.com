# 🚨 UPLOAD 1 FICHIER - FIX ÉCRAN NOIR IMMÉDIAT

## LE PROBLÈME

Le fichier `env-config.js` sur votre serveur IONOS est au MAUVAIS FORMAT.

**Format actuel sur le serveur (INCORRECT) :**
```
# Configuration TaxiAssur
VITE_SUPABASE_URL=https://...
```

**Format requis (CORRECT) :**
```javascript
// Configuration des variables d'environnement
window.ENV_CONFIG = {
  VITE_SUPABASE_URL: 'https://...',
};
```

---

## ✅ SOLUTION RAPIDE (2 MINUTES)

### Étape 1 : Localiser le BON fichier sur votre PC

```
📁 Projet TaxiAssur
  └─ 📁 dist
      └─ 📄 env-config.js  ← CE FICHIER (pas celui dans /public !)
```

### Étape 2 : IONOS - Gestionnaire de fichiers

1. https://www.ionos.fr → Connexion
2. Hosting → Gérer → Espace Web → Gestionnaire de fichiers
3. Aller à la racine (/)

### Étape 3 : Supprimer l'ancien fichier

1. Trouver : `env-config.js` à la racine
2. Clic droit → Supprimer
3. Confirmer

### Étape 4 : Upload le NOUVEAU

1. Rester à la racine (/)
2. Upload → Sélectionner : `dist/env-config.js` depuis votre PC
3. Attendre fin upload (2 secondes)

### Étape 5 : VÉRIFIER LE FORMAT

Ouvrir : https://taxiassur.com/env-config.js

**Vous DEVEZ voir :**
```javascript
// Configuration des variables d'environnement
window.ENV_CONFIG = {
```

**Si vous voyez encore :**
```
# Configuration TaxiAssur
VITE_SUPABASE_URL=
```
→ ❌ MAUVAIS FICHIER ! Recommencer Étape 1

### Étape 6 : Vider cache + Tester

1. `CTRL + SHIFT + DEL` → Tout effacer
2. FERMER toutes les fenêtres
3. Navigation privée : `CTRL + SHIFT + N`
4. Aller sur : https://taxiassur.com
5. F12 → Console doit afficher : "Configuration chargée"

---

## ✅ LE FICHIER CORRECT EST ICI :

**Sur votre PC :**
```
dist/env-config.js
```

**PAS celui-ci (format incorrect) :**
```
public/env-config.js  ❌
.env                  ❌
```

---

## 📞 SI PROBLÈME PERSISTE

Envoyez-moi :
1. Screenshot de https://taxiassur.com/env-config.js
2. Screenshot console (F12)
3. team@taxiassur.com

---

**TEMPS : 2 MINUTES | RÉSULTAT : SITE FONCTIONNEL**
