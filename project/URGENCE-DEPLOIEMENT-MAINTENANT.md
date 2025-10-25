# 🚨 URGENCE : Déploiement Immédiat

## Situation

**ÉCRAN NOIR EN PRODUCTION** sur https://taxiassur.com

**Cause :** Le serveur IONOS utilise l'ancienne version du code avec le bug de mapping Supabase.

**Solution :** Uploader la nouvelle version (déjà compilée) qui utilise les villes statiques en mode sécurisé.

---

## 🔥 ACTION IMMÉDIATE (2 minutes)

### Étape 1 : Build Déjà Fait ✅

```bash
✓ built in 13.06s
```

Le dossier `/dist` contient la version SAFE MODE avec :
- Villes statiques activées (pas de Supabase pour les villes)
- Mapping corrigé pour plus tard
- Fallback automatique vers `ping.ts`

### Étape 2 : Uploader sur IONOS

**Méthode 1 : FTP (Recommandé)**

1. Ouvrir FileZilla
2. Se connecter au serveur IONOS
3. **Uploader UNIQUEMENT ces fichiers du dossier `/dist` :**
   - `dist/assets/*` (tous les fichiers)
   - `dist/index.html`

**NE PAS UPLOADER :**
- Fichiers `.md`
- Dossier `/src`
- `node_modules`
- Fichiers SQL

**Méthode 2 : Via IONOS Panel**

1. Aller sur https://www.ionos.fr/hosting
2. Accéder au gestionnaire de fichiers
3. Uploader le contenu de `/dist`

---

## ✅ Vérification Après Upload

1. Aller sur https://taxiassur.com
2. Vérifier que le site s'affiche ✅
3. Console navigateur : Chercher `📍 Using static city pages`
4. Tester `/villes` → Doit afficher 33 villes statiques

---

## 🎯 Plan de Migration Supabase (Plus tard)

Une fois le site stable avec les villes statiques :

### Étape 1 : Exécuter les SQL Supabase

```sql
-- 1. Ajouter colonnes manquantes
FIX-CITY-PAGES-ADD-REGION.sql

-- 2. Insérer 34 villes
INSERT-34-VILLES.sql
```

### Étape 2 : Réactiver Supabase

Dans `src/lib/content.ts`, changer :
```typescript
const USE_STATIC_CITIES = true;   // ❌ MODE SAFE
```

En :
```typescript
const USE_STATIC_CITIES = false;  // ✅ MODE SUPABASE
```

### Étape 3 : Rebuild et Upload

```bash
npm run build
# Upload dist/ sur IONOS
```

---

## 📊 Comparaison Versions

### Version ACTUELLE (Production IONOS) ❌
```
- Bug mapping colonnes Supabase
- Erreur : item.name = undefined
- Résultat : ÉCRAN NOIR
```

### Version SAFE MODE (À uploader) ✅
```
- Villes statiques uniquement
- Pas de Supabase pour les villes
- 33 villes de ping.ts
- Résultat : SITE FONCTIONNE
```

### Version FINALE (Après SQL) 🚀
```
- Supabase activé
- 34 villes en base
- Colonnes dept, region, taxi_count
- Groupement par région
- Résultat : SITE OPTIMAL
```

---

## 🔍 Logs Console à Attendre

**Après upload SAFE MODE :**
```
📍 Using static city pages (safe mode)
✅ 33 villes chargées depuis ping.ts
```

**Après migration Supabase :**
```
✅ Loaded 34 city pages from Supabase
```

---

## ⚡ Résumé Ultra-Court

```bash
1. Dossier /dist déjà prêt ✅
2. Uploader dist/ sur IONOS via FTP
3. Site fonctionnera avec 33 villes statiques
4. Plus tard : SQL + réactiver Supabase
```

**Temps total : 2 minutes** ⏱️

---

## 📁 Fichiers Importants

- **`dist/`** → À uploader MAINTENANT
- **`FIX-CITY-PAGES-ADD-REGION.sql`** → À exécuter plus tard
- **`INSERT-34-VILLES.sql`** → À exécuter plus tard
- **`src/lib/content.ts`** → Changer `USE_STATIC_CITIES = false` plus tard

---

## 🆘 Support

Si l'upload ne fonctionne pas :
1. Vérifier les credentials FTP IONOS
2. Vérifier que le dossier cible est `/`
3. S'assurer que les fichiers sont écrasés

**Le site DOIT être fonctionnel après l'upload du dossier `/dist` !** ✅
