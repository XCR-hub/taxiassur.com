# FIX URGENT - URL Supabase Incorrecte - 14 Février 2026 16:15

## ⚠️ Problème Identifié

L'erreur "Erreur lors de la création du lead. Veuillez réessayer." était causée par une **URL Supabase obsolète** dans les fichiers de configuration.

### Fichiers Incorrects

1. **`public/env-config.js`** (ligne 3)
```javascript
// ❌ ANCIENNE URL (n'existe plus)
VITE_SUPABASE_URL: 'https://drohhxrkoequjphvabvq.supabase.co'
```

2. **`src/lib/supabase-instance.ts`** (ligne 15)
```typescript
// ❌ ANCIENNE URL (fallback)
const FALLBACK_URL = 'https://drohhxrkoequjphvabvq.supabase.co';
```

### URL Correcte

```
https://qiavtxpaznxpttkdaevy.supabase.co
```

---

## ✅ Corrections Appliquées

### 1. `public/env-config.js`
```javascript
// ✅ NOUVELLE URL (corrigée)
VITE_SUPABASE_URL: 'https://qiavtxpaznxpttkdaevy.supabase.co',
VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXZ0eHBhem54cHR0a2RhZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njg1ODUsImV4cCI6MjA4NjU0NDU4NX0.FvEbDxwQy8tsTgeGr4skoJh2KXWJldlSm1RIhoDPY5g',
```

### 2. `src/lib/supabase-instance.ts`
```typescript
// ✅ NOUVELLE URL (corrigée)
const FALLBACK_URL = 'https://qiavtxpaznxpttkdaevy.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXZ0eHBhem54cHR0a2RhZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njg1ODUsImV4cCI6MjA4NjU0NDU4NX0.FvEbDxwQy8tsTgeGr4skoJh2KXWJldlSm1RIhoDPY5g';
```

### 3. Build Complété
```bash
npm run build  # ✅ Terminé avec succès
```

---

## 🧪 Test du Fix

### Test 1 : Edge Function (Backend)
```bash
curl -X POST "https://qiavtxpaznxpttkdaevy.supabase.co/functions/v1/create-lead-direct" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "p_email": "test@example.com",
    "p_first_name": "Test",
    "p_last_name": "User",
    "p_phone": "0601020304",
    "p_city": "Paris",
    "p_source": "website",
    "p_metadata": {}
  }'
```

**Résultat attendu** :
```json
{
  "success": true,
  "lead_id": "uuid...",
  "access_token": "token...",
  "is_new": true
}
```
✅ **Statut** : FONCTIONNE

### Test 2 : Fonction SQL (Database)
```sql
SELECT * FROM upsert_lead(
  'Paris'::text,              -- p_city
  'test@example.com'::text,   -- p_email
  'Test'::text,                -- p_first_name
  'User'::text,                -- p_last_name
  '{}'::jsonb,                 -- p_metadata
  '0601020304'::text,          -- p_phone
  'website'::text              -- p_source
);
```

✅ **Statut** : FONCTIONNE

### Test 3 : Frontend (après fix)

1. Vider le cache navigateur : `Ctrl + Shift + R` (ou `Cmd + Shift + R` sur Mac)
2. Ouvrir la console : `F12`
3. Remplir le formulaire :
   - **Nom** : Tony CERDA
   - **Email** : tcerda@xcr.fr
   - **Téléphone** : 0180855781
   - **Ville** : Milly-la-Forêt
4. Cliquer : "OBTENIR MON DEVIS GRATUIT"

**Console attendue** :
```
🚀 Starting lead creation: {name: 'Tony CERDA', ...}
✅ Lead created/updated via PostgREST
✅ Existing lead updated: 1f22521f-194a-44e0-8f50-a3cd91afe3c3
```

Ou (si cache PostgREST) :
```
⚠️ PostgREST error (or cache issue), using Edge Function fallback...
✅ Lead created via Edge Function fallback
✅ Existing lead updated: 1f22521f-194a-44e0-8f50-a3cd91afe3c3
```

---

## 🚀 Déploiement

### En Local (test)
```bash
npm run dev
# Ouvrir http://localhost:5173 et tester le formulaire
```

### En Production
```bash
# 1. Build déjà fait ✅
npm run build

# 2. Upload le dossier /dist sur IONOS
# Via FTP ou File Manager IONOS

# 3. Vérifier que env-config.js est bien uploadé
# URL : https://taxiassur.com/env-config.js
# Doit contenir la BONNE URL
```

---

## 📝 Pourquoi Cette Erreur ?

### Chronologie

1. **Ancienne instance Supabase** : `drohhxrkoequjphvabvq.supabase.co`
   - Probablement utilisée pendant le développement initial
   - N'existe plus ou a été supprimée

2. **Nouvelle instance Supabase** : `qiavtxpaznxpttkdaevy.supabase.co`
   - Créée plus tard
   - Définie dans `.env` mais PAS mise à jour dans `env-config.js`

3. **Impact** :
   - Le fichier `.env` est utilisé en **développement** (Vite)
   - Le fichier `env-config.js` est utilisé en **production** (navigateur)
   - Les deux fichiers n'étaient **PAS synchronisés** ❌

### Leçon Apprise

**À faire** :
- ✅ Utiliser `.env` comme source de vérité
- ✅ Générer `env-config.js` automatiquement depuis `.env`
- ✅ Vérifier TOUS les fichiers de config après un changement d'URL

**À ne PAS faire** :
- ❌ Maintenir deux fichiers de config manuellement
- ❌ Hardcoder les URLs dans plusieurs endroits
- ❌ Utiliser des fallbacks obsolètes

---

## 🔧 Prévention Future

### Script de Génération Automatique

Créer un script `scripts/sync-env-config.js` :

```javascript
const fs = require('fs');
const dotenv = require('dotenv');

// Lire .env
const envConfig = dotenv.config().parsed;

// Générer env-config.js
const configContent = `// Configuration des variables d'environnement pour TaxiAssur
window.ENV_CONFIG = ${JSON.stringify(envConfig, null, 2)};

console.log('✅ Configuration chargée depuis env-config.js');
`;

// Écrire dans public/
fs.writeFileSync('public/env-config.js', configContent);
console.log('✅ env-config.js synchronisé depuis .env');
```

Ajouter au `package.json` :
```json
{
  "scripts": {
    "sync:env": "node scripts/sync-env-config.js",
    "prebuild": "npm run sync:env"
  }
}
```

---

## ✅ Checklist de Vérification

Avant chaque déploiement :

- [ ] `.env` contient la bonne URL Supabase
- [ ] `public/env-config.js` contient la MÊME URL
- [ ] `src/lib/supabase-instance.ts` fallback a la MÊME URL
- [ ] Build réussi (`npm run build`)
- [ ] `dist/env-config.js` contient la bonne URL
- [ ] Test formulaire en local (après `npm run dev`)
- [ ] Cache navigateur vidé (`Ctrl + Shift + R`)

---

## 📊 Statut Final

| Composant | Avant | Après | Statut |
|-----------|-------|-------|--------|
| `.env` | ✅ Bonne URL | ✅ Bonne URL | OK |
| `public/env-config.js` | ❌ Ancienne URL | ✅ Bonne URL | **CORRIGÉ** |
| `src/lib/supabase-instance.ts` | ❌ Ancienne URL | ✅ Bonne URL | **CORRIGÉ** |
| `dist/env-config.js` | ❌ Ancienne URL | ✅ Bonne URL | **CORRIGÉ** |
| Edge Function | ✅ Fonctionne | ✅ Fonctionne | OK |
| Fonction SQL | ✅ Fonctionne | ✅ Fonctionne | OK |
| Frontend | ❌ Erreur | 🔄 À tester | **À TESTER** |

---

## 🎯 Actions Immédiates

1. **Vider le cache navigateur** : `Ctrl + Shift + R`
2. **Recharger la page** : https://taxiassur.com
3. **Tester le formulaire** avec les données :
   - Nom : Tony CERDA
   - Email : tcerda@xcr.fr
   - Téléphone : 0180855781
   - Ville : Milly-la-Forêt

4. **Vérifier la console** (F12) :
   - Doit afficher : "✅ Lead created/updated"
   - Pas d'erreur rouge

5. **Si ça fonctionne** : Problème résolu ! ✅
6. **Si ça échoue encore** : Consulter `/DIAGNOSTIC_CREATION_LEADS_2026.md`

---

**Date de Fix** : 14 février 2026 - 16:15
**Responsable** : Assistant IA
**Version** : v1.0 - URL Supabase corrigée
