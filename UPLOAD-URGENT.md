# 🚨 FIX ÉCRAN NOIR - 1 FICHIER À UPLOADER

## LE PROBLÈME

L'erreur "Unexpected identifier VITE_INDEXNOW_KEY" signifie que le fichier sur le serveur est au mauvais format.

## ✅ SOLUTION (90 SECONDES)

### 1. Trouver le BON fichier sur votre PC

**Chemin :**
```
VotreProjet/dist/env-config.js
```

**VÉRIFICATION : Ouvrir le fichier avec Notepad**

Les 3 premières lignes doivent être :
```javascript
// Configuration des variables d'environnement pour TaxiAssur
window.ENV_CONFIG = {
  VITE_SUPABASE_URL: 'https://viuuznfqkauatkjcegcj.supabase.co',
```

Si vous voyez ça → ✅ BON FICHIER
Si vous voyez `VITE_SUPABASE_URL=` → ❌ MAUVAIS (c'est le .env)

### 2. IONOS - Connexion

1. https://www.ionos.fr
2. Login
3. Hosting → Gérer
4. Espace Web → Gestionnaire de fichiers

### 3. Supprimer l'ancien

1. Chercher : `env-config.js` à la racine (/)
2. Clic droit → Supprimer
3. Confirmer

### 4. Upload le nouveau

1. Rester à la racine (/)
2. Bouton "Upload" ou "Télécharger"
3. Sélectionner : `dist/env-config.js`
4. Upload (2 secondes)

### 5. VÉRIFIER en ouvrant le fichier

**URL à ouvrir :**
```
https://taxiassur.com/env-config.js
```

**Première ligne DOIT être :**
```javascript
// Configuration des variables d'environnement pour TaxiAssur
```

**Si vous voyez :**
```
# Configuration TaxiAssur
```
→ ❌ RECOMMENCER, mauvais fichier uploadé

### 6. Vider cache et tester

```
1. CTRL + SHIFT + DEL → Tout effacer
2. Fermer TOUTES les fenêtres
3. CTRL + SHIFT + N (navigation privée)
4. https://taxiassur.com
5. F12 → Console doit dire :
   "✅ Configuration chargée depuis env-config.js"
```

---

## 🎯 CHECKLIST RAPIDE

- [ ] Fichier trouvé : `dist/env-config.js`
- [ ] Vérifié avec Notepad : commence par `window.ENV_CONFIG`
- [ ] Ancien fichier supprimé sur IONOS
- [ ] Nouveau fichier uploadé
- [ ] Vérifié sur https://taxiassur.com/env-config.js
- [ ] Cache vidé (CTRL+SHIFT+DEL)
- [ ] Fenêtres fermées
- [ ] Test en navigation privée
- [ ] Site fonctionne

---

## ❌ ERREURS FRÉQUENTES

**Erreur 1 :** Uploader le fichier depuis `/public` au lieu de `/dist`
→ `/dist/env-config.js` est le BON

**Erreur 2 :** Ne pas vider le cache
→ CTRL+SHIFT+DEL puis FERMER toutes les fenêtres

**Erreur 3 :** Tester sans navigation privée
→ CTRL+SHIFT+N obligatoire

---

## 📞 SI ÇA NE MARCHE PAS

Envoyer :
1. Screenshot de https://taxiassur.com/env-config.js
2. Screenshot console (F12) 
3. team@taxiassur.com

---

**DURÉE : 90 secondes | FIX IMMÉDIAT**
