# FIX CACHE ET MODULE DYNAMIQUE - 14 Février 2026

## 🔴 Erreur Actuelle

```
Failed to fetch dynamically imported module:
https://taxiassur.com/assets/backoffice-crm-DE8U3E2j.js
```

## 🎯 Cause

Le navigateur a en cache l'**ancien site** qui référence des fichiers qui n'existent plus après le nouveau build.

## ✅ Solution Immédiate

### Vider le Cache Navigateur

**Chrome / Edge / Brave** :
1. `Ctrl + Shift + Delete` (Windows) ou `Cmd + Shift + Delete` (Mac)
2. Cocher : **"Images et fichiers en cache"**
3. Période : **"Depuis toujours"**
4. Cliquer : **"Effacer les données"**
5. `Ctrl + Shift + R` pour recharger

**Firefox** :
1. `Ctrl + Shift + Delete`
2. Cocher : **"Cache"**
3. Période : **"Tout"**
4. **"Effacer maintenant"**
5. `Ctrl + Shift + R`

### Désactiver le Service Worker

1. Ouvrir DevTools : `F12`
2. Onglet **"Application"** (Chrome) ou **"Stockage"** (Firefox)
3. Section **"Service Workers"**
4. Cliquer : **"Unregister"** (Désinscrire)
5. Cliquer : **"Clear storage"**
6. Recharger : `Ctrl + Shift + R`

---

## 🚀 Déploiement du Nouveau Build

Le nouveau build (avec triple fallback) est prêt dans `/dist`.

### Upload via IONOS File Manager

1. https://www.ionos.fr/ → **Hébergement** → **Espace Web**
2. **File Manager**
3. **SUPPRIMER** tous les anciens fichiers :
   - `assets/` (tout le dossier)
   - `index.html`
   - `env-config.js`
   - `sw.js`, `workbox-*.js`
4. **UPLOADER** tout le contenu de `/dist`

---

## 🧪 Vérification

Après déploiement :

1. **Vérifier env-config.js** : https://taxiassur.com/env-config.js
   - Doit contenir : `https://qiavtxpaznxpttkdaevy.supabase.co`
   - PAS : `drohhxrkoequjphvabvq` (ancienne)

2. **Tester le formulaire** :
   - Vider cache : `Ctrl + Shift + R`
   - Remplir et soumettre
   - Console doit afficher : `Lead created via RPC` (ou Edge Function, ou direct fetch)
   - Redirection vers `/merci?token=...`

---

## 📋 Checklist

- [ ] Build réussi (`npm run build`)
- [ ] Upload `/dist` complet vers IONOS
- [ ] Vérifier `env-config.js` en production
- [ ] Vider cache navigateur
- [ ] Désinscrire Service Worker
- [ ] Tester formulaire

---

**Statut** : ✅ Build prêt, en attente de déploiement
**Date** : 14 février 2026 - 16:45
