# 🧪 TEST RAPIDE LOCAL - 1 MINUTE

## 🚀 Démarrage

```bash
npm run dev
```

**Attendu:**
```
VITE ready in 500 ms
➜  Local:   http://localhost:5173/
```

---

## ✅ Test 1: Console au Démarrage

**URL:** `http://localhost:5173/backoffice`

**Console (F12) DOIT afficher:**
```
🚀 TaxiAssur starting...
🔧 Pre-initializing Supabase...
🆕 Creating Supabase instance (lazy)
✅ Supabase initialized
🔍 Checking auth session...
✅ Session retrieved: false
```

**Temps:** < 500ms

**❌ Si vous voyez:**
```
⚠️ AuthGuard timeout: chargement trop long
⚠️ Auth initialization timeout
```
→ **Videz cache:** `localStorage.clear(); location.reload();`

---

## ✅ Test 2: Login

**Action:** Se connecter

**Console DOIT afficher:**
```
🔐 Auth state changed: SIGNED_IN Session: true
📧 Loading admin user for email: master@taxiassur.com
👤 Admin user data: Found
✅ Admin authenticated: Master Admin
📝 Last login updated
```

**Temps:** < 500ms ⚡

**Résultat:**
- Dashboard affiché
- Badge utilisateur en bas à droite
- Pas de rechargement de page

---

## ✅ Test 3: Navigation

**Action:** Cliquer sur "MENU ADMIN" (logo)

**Résultat:**
- ✅ Reste sur dashboard
- ✅ Aucune erreur console

---

## ✅ Test 4: Refresh

**Action:** F5

**Console:**
```
🚀 TaxiAssur starting...
🔧 Pre-initializing Supabase...
✅ Supabase initialized
🔍 Checking auth session...
✅ Session retrieved: true
👤 User found, loading admin data...
✅ Admin authenticated: Master Admin
```

**Temps:** < 200ms ⚡

---

## 🎯 Résultat

**Si TOUS les tests passent:**
```bash
npm run build
```

**Puis déployez sur IONOS selon `FIX_AUTH_TIMEOUT_FINAL.md`**

---

**Si UN test échoue:**
1. Videz cache: `localStorage.clear(); location.reload();`
2. Vérifiez `.env` contient bonnes valeurs
3. Redémarrez `npm run dev`
4. Me communiquez l'erreur exacte
