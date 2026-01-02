# 🧪 TEST LOCAL - Avant Déploiement IONOS

## 🎯 Objectif

Tester les corrections en local avant de déployer sur IONOS.

---

## ⚡ Test Rapide (2 minutes)

### 1. Démarrer le serveur local

```bash
npm run dev
```

**Résultat attendu:**
```
  VITE ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### 2. Ouvrir le backoffice

**URL:** `http://localhost:5173/backoffice`

**Ouvrir console (F12)**

### 3. Console au chargement initial

**DOIT afficher:**
```
🔍 Checking auth session...
✅ Session retrieved: false
🚫 No session found
```

**NE DOIT PAS afficher:**
```
❌ Multiple GoTrueClient instances  ← Si présent = PROBLÈME
❌ Timeout: admin_users query      ← Si présent = PROBLÈME
```

### 4. Se connecter

**Identifiants:**
- Email: `master@taxiassur.com`
- Mot de passe: [votre mot de passe]

**Console pendant login:**
```
🔐 Auth state changed: SIGNED_IN Session: true
📧 Loading admin user for email: master@taxiassur.com
👤 Admin user data: Found
✅ Admin authenticated: Master Admin
📝 Last login updated
```

**Temps attendu:** < 500ms ⚡

**Résultat visuel:**
- ✅ Dashboard s'affiche immédiatement
- ✅ Pas de rechargement de page
- ✅ Transition fluide
- ✅ Badge utilisateur en bas à droite

### 5. Cliquer sur "MENU ADMIN" (logo en haut)

**Résultat attendu:**
- ✅ Reste sur la page dashboard
- ✅ Pas de retour au login
- ✅ Aucune erreur console

### 6. Refresh page (F5)

**Console:**
```
🔍 Checking auth session...
✅ Session retrieved: true
👤 User found, loading admin data...
📧 Loading admin user for email: master@taxiassur.com
👤 Admin user data: Found
✅ Admin authenticated: Master Admin
```

**Temps:** < 200ms ⚡

**Résultat:**
- ✅ Dashboard affiché sans login
- ✅ Session restaurée

---

## ✅ Résultat Global

Si TOUS les tests passent:
- ✅ **DÉPLOYER SUR IONOS**
- 🎉 Tout fonctionne parfaitement

Si UN test échoue:
- ❌ **NE PAS DÉPLOYER**
- 🔍 Vérifier les erreurs console
- 📝 Me communiquer les erreurs exactes

---

## 🚀 Déploiement IONOS

Une fois tests passés:

```bash
# Build production
npm run build

# Vérifier hash
ls -lh dist/assets/index-*.js
# Doit montrer: index-C02oHFFN.js
```

**Puis suivre:** `FIX_AUTH_FLOW_COMPLETE.md` → Section "DÉPLOIEMENT SUR IONOS"

---

## 🐛 Si Problème Local

### Erreur "Multiple GoTrueClient"

**Cause:** Cache navigateur avec ancien code

**Solution:**
```javascript
// Console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Erreur "Timeout admin_users"

**Cause:** Connexion Supabase lente ou .env incorrect

**Vérifications:**
```bash
# Vérifier .env
cat .env

# Doit contenir:
VITE_SUPABASE_URL=https://[votre-projet].supabase.co
VITE_SUPABASE_ANON_KEY=[votre-clé]
```

**Test connexion Supabase:**
```javascript
// Console (F12)
const { data } = await supabase.from('admin_users').select('*').limit(1);
console.log('Test Supabase:', data);
// Doit retourner des données
```

### Dashboard ne s'affiche pas

**Cause:** Admin user pas trouvé

**Vérification DB:**
```sql
-- Via Supabase Studio
SELECT * FROM admin_users
WHERE email = 'master@taxiassur.com'
  AND is_active = true;

-- Doit retourner 1 ligne
```

**Si aucune ligne:**
```sql
-- Créer admin user
INSERT INTO admin_users (email, full_name, role, is_active)
VALUES ('master@taxiassur.com', 'Master Admin', 'master', true);
```

**Puis créer user auth:**
```javascript
// Console Supabase Studio → SQL Editor
-- Ou via backoffice → User Management
```

---

## 📊 Performance Attendue

**Métrique** | **Temps**
---|---
Chargement initial | < 1s
Login | < 500ms
Refresh session | < 200ms
Navigation | 0ms (instantané)

---

**Si tous les tests passent → GO POUR DÉPLOIEMENT! 🚀**
