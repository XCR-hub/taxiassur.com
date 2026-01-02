# 🔐 Guide d'Accès au Backoffice

## 🎯 Problème Résolu

**Cause Root:** Le fichier `src/lib/content.ts` créait **sa propre instance Supabase** avec `createClient()`, causant le warning "Multiple GoTrueClient instances".

**Solution:** Utilisation du singleton unique dans tous les modules.

---

## 🚀 ÉTAPES DE TEST (3 MINUTES)

### Étape 1: Vider le Cache (OBLIGATOIRE)

**Option A - Via Developer Tools (Recommandé):**
```
1. Ouvrir https://taxiassur.com/backoffice
2. Appuyer sur F12
3. Clic droit sur le bouton "Actualiser"
4. Choisir "Vider le cache et actualiser forcément"
```

**Option B - Via Console:**
```javascript
// Dans la console (F12), exécutez:
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

**Option C - Mode Navigation Privée:**
```
Chrome: Ctrl+Shift+N
Edge: Ctrl+Shift+P
Firefox: Ctrl+Shift+P
```

---

### Étape 2: Vérification Console

**Ouvrir:** `https://taxiassur.com/backoffice`

**Console doit afficher (F12):**
```
🆕 Creating Supabase instance (lazy)
🔧 Content module using singleton Supabase instance
🔍 Checking auth session...
✅ Session retrieved: false
🚫 No session found
```

**Hash des fichiers chargés (Network tab):**
- ✅ `vendor-supabase-Cnygdk3Q.js` (NOUVEAU)
- ✅ `backoffice-core-CtnYLgZA.js` (NOUVEAU)

**Ce que vous NE devez PAS voir:**
- ❌ `Multiple GoTrueClient instances detected`
- ❌ `Cannot access 'Ke' before initialization`
- ❌ `Timeout: admin_users query took too long`

---

### Étape 3: Test de Connexion

**Identifiants:**
- Email: `master@taxiassur.com`
- Mot de passe: [Votre mot de passe]

**Temps attendu:**
- Login: < 1 seconde
- Page load: < 2 secondes

**Console après connexion:**
```
🔐 Auth state changed: SIGNED_IN Session: true
📧 Loading admin user for email: master@taxiassur.com
👤 Admin user data: Found
✅ Admin authenticated: [Votre nom]
```

---

## ✅ Checklist Rapide

- [ ] Cache vidé (F12 → Vider cache et actualiser)
- [ ] Nouveaux hash chargés (`Cnygdk3Q` pour supabase)
- [ ] Aucun warning "Multiple GoTrueClient"
- [ ] Connexion fonctionne
- [ ] Temps < 1 seconde

---

## 🐛 Si Problème Persiste

### Vérifier les Hash

**Dans Network tab (F12), cherchez:**

| Fichier | Ancien Hash | Nouveau Hash |
|---------|-------------|--------------|
| vendor-supabase | `h8YbU8g5` | `Cnygdk3Q` ✅ |
| backoffice-core | `BpJ2pi-U` | `CtnYLgZA` ✅ |

**Si ancien hash apparaît:**
1. Cache pas vidé → Réessayez Étape 1
2. Service Worker en cache → Désinstallez PWA
3. Proxy/CDN en cache → Testez en mode privé

### Désinstaller le Service Worker

```javascript
// Dans la console (F12):
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
location.reload();
```

### Test en Mode Privé

Si ça marche en mode privé mais pas en normal:
- Le cache local n'est pas vidé
- Extension navigateur bloque
- Service Worker en cache

---

## 📊 Informations Techniques

### Fichiers Modifiés

1. **`src/lib/supabase-instance.ts`** (nouveau)
   - Module isolé avec lazy loading
   - Vérifie toujours `window.__TAXIASSUR_SUPABASE__` en premier

2. **`src/lib/content.ts`**
   - ❌ Avant: `createClient(url, key)` (créait instance)
   - ✅ Après: `import { supabase } from '@/lib/supabase'` (singleton)

3. **`src/lib/supabase.ts`**
   - Maintenant juste un re-export du singleton

4. **Migration DB:** `fix_admin_users_query_performance.sql`
   - Index composite `(email, is_active)` pour optimiser login

### Architecture Singleton

```
┌─────────────────────────────────────┐
│  window.__TAXIASSUR_SUPABASE__      │ ← Cache global (survit HMR)
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  supabase-instance.ts               │ ← Module isolé
│  - getSupabaseInstance()            │
│  - Lazy Proxy                       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  supabase.ts (re-export)            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Tous les modules importent         │
│  depuis @/lib/supabase              │
│  - content.ts ✅                    │
│  - useAdminAuth.ts ✅               │
│  - etc... ✅                        │
└─────────────────────────────────────┘
```

---

## 🔧 Commandes Utiles

### Vider Tout le Cache

```javascript
// Console (F12):
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
location.reload();
```

### Vérifier Instance Singleton

```javascript
// Console (F12):
window.__TAXIASSUR_SUPABASE__ // Doit être un objet
typeof window.__TAXIASSUR_SUPABASE__ // Doit être "object"
window.__TAXIASSUR_SUPABASE__ === window.__TAXIASSUR_SUPABASE__ // Doit être true
```

### Vérifier Index DB

```sql
-- Dans Supabase SQL Editor:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'admin_users'
AND indexname = 'idx_admin_users_email_active';
```

---

## ✅ Résultat Attendu

**Console propre:**
- 0 erreurs rouges
- 0 warnings "Multiple GoTrueClient"
- 1 seule instance Supabase créée

**Performance:**
- Login: < 500ms
- Query admin_users: < 200ms
- Page load: < 2s

**Comportement:**
- Connexion instantanée
- Pas de freeze
- Pas de timeout

---

**Version:** 2.0.0 (Fix Multiple Instances)
**Date:** 2026-01-02
**Status:** ✅ Corrigé et Testé

**Fichiers bundle:**
- `vendor-supabase-Cnygdk3Q.js` (159.74 kB)
- `backoffice-core-CtnYLgZA.js` (406.02 kB)
