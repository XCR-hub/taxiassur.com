# 🚀 DÉPLOIEMENT URGENT SUR IONOS

## ⚠️ PROBLÈME ACTUEL

**Votre serveur IONOS contient les ANCIENS fichiers:**
- `vendor-supabase-h8YbU8g5.js` (ANCIEN - avec bug multiple instances)
- `backoffice-core-BpJ2pi-U.js` (ANCIEN - avec bug)

**Les NOUVEAUX fichiers (corrigés) sont dans `/dist`:**
- `vendor-supabase-Cnygdk3Q.js` ✅ (Fix multiple instances)
- `backoffice-core-CtnYLgZA.js` ✅ (Fix timeout)
- `index-B8w1-JBh.js` ✅

---

## 📦 ÉTAPES DE DÉPLOIEMENT (5 MINUTES)

### Étape 1: Supprimer les Anciens Fichiers JS (CRITIQUE!)

**Via FTP/SFTP IONOS:**

```
1. Se connecter à IONOS FTP
2. Naviguer vers: /public_html/assets/
3. SUPPRIMER tous les fichiers .js qui commencent par:
   - vendor-supabase-h8YbU8g5.js ❌ SUPPRIMER
   - backoffice-core-BpJ2pi-U.js ❌ SUPPRIMER
   - index-UscTyJrB.js ❌ SUPPRIMER
```

**Ou via SSH (si disponible):**
```bash
cd /public_html/assets/
rm -f vendor-supabase-h8YbU8g5.js
rm -f backoffice-core-BpJ2pi-U.js
rm -f index-UscTyJrB.js
```

---

### Étape 2: Uploader les Nouveaux Fichiers

**Uploader TOUT le contenu de `/dist`:**

```
Dossier Local: /tmp/cc-agent/61788020/project/dist/
Destination:   /public_html/

Fichiers à uploader:
✅ dist/assets/vendor-supabase-Cnygdk3Q.js
✅ dist/assets/backoffice-core-CtnYLgZA.js
✅ dist/assets/index-B8w1-JBh.js
✅ dist/index.html (IMPORTANT - contient les nouveaux hash)
✅ Tous les autres fichiers dans /dist/
```

**Via FTP/FileZilla:**
1. Sélectionner TOUT le contenu de `/dist/`
2. Uploader vers `/public_html/`
3. Écraser les fichiers existants

---

### Étape 3: Vérifier le Déploiement

**Ouvrir:** `https://taxiassur.com/backoffice`

**Network Tab (F12) doit montrer:**
- ✅ `vendor-supabase-Cnygdk3Q.js` (NOUVEAU)
- ✅ `backoffice-core-CtnYLgZA.js` (NOUVEAU)
- ❌ PAS de `h8YbU8g5` ou `BpJ2pi-U`

**Console doit afficher:**
```
🆕 Creating Supabase instance (lazy)
🔧 Content module using singleton Supabase instance
```

**Console NE doit PAS afficher:**
```
❌ Multiple GoTrueClient instances detected
```

---

## 🔧 CONFIGURATION HTACCESS (Éviter Cache Futur)

**Fichier: `/public_html/.htaccess`**

Ajouter ces lignes pour forcer le cache-busting:

```apache
# Cache-busting pour assets avec hash
<FilesMatch "\.(js|css)$">
    # Si le fichier a un hash dans le nom (ex: vendor-abc123.js)
    # Le navigateur peut le cacher longtemps
    <IfModule mod_headers.c>
        Header set Cache-Control "public, max-age=31536000, immutable"
    </IfModule>
</FilesMatch>

# HTML ne doit JAMAIS être caché
<FilesMatch "\.html$">
    <IfModule mod_headers.c>
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </IfModule>
</FilesMatch>
```

---

## ✅ CHECKLIST DÉPLOIEMENT

- [ ] Anciens fichiers JS supprimés sur IONOS
- [ ] Nouveau dossier `/dist` uploadé complètement
- [ ] `index.html` écrasé (contient nouveaux hash)
- [ ] Cache navigateur vidé (Ctrl+Shift+Delete)
- [ ] Page rechargée avec F5
- [ ] Network tab montre nouveaux hash
- [ ] Console ne montre PLUS "Multiple GoTrueClient"
- [ ] Connexion backoffice fonctionne

---

## 🐛 SI PROBLÈME PERSISTE APRÈS UPLOAD

### Option A: Service Worker en Cache

**Dans la console (F12):**
```javascript
// Désinstaller le Service Worker
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});

// Vider TOUT le cache
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});

location.reload();
```

### Option B: Vérifier l'Upload

**Via FTP, vérifier que ces fichiers existent sur IONOS:**
```
/public_html/assets/vendor-supabase-Cnygdk3Q.js ✅
/public_html/assets/backoffice-core-CtnYLgZA.js ✅
/public_html/index.html (Date: aujourd'hui) ✅
```

**Et que ces fichiers N'existent PLUS:**
```
/public_html/assets/vendor-supabase-h8YbU8g5.js ❌ DOIT ÊTRE SUPPRIMÉ
/public_html/assets/backoffice-core-BpJ2pi-U.js ❌ DOIT ÊTRE SUPPRIMÉ
```

### Option C: CDN/Proxy Cache

Si IONOS utilise un CDN:
1. Aller dans le panel IONOS
2. Chercher "Performance" ou "CDN"
3. Cliquer sur "Vider le cache" / "Purge cache"

---

## 📊 VÉRIFICATION FINALE

**Test 1 - Network Tab:**
```
Ouvrir https://taxiassur.com/backoffice
F12 → Network
Ctrl+F5 (rechargement forcé)

Rechercher: vendor-supabase
✅ Doit montrer: Cnygdk3Q.js
❌ NE DOIT PAS montrer: h8YbU8g5.js
```

**Test 2 - Console:**
```
✅ "Creating Supabase instance (lazy)"
✅ "Content module using singleton"
❌ PAS de "Multiple GoTrueClient"
```

**Test 3 - Connexion:**
```
Se connecter: master@taxiassur.com
✅ Login en < 1 seconde
❌ PAS de timeout
```

---

## 🔑 ACCÈS IONOS

**Via FileZilla/FTP:**
```
Serveur: ftp.taxiassur.com (ou l'adresse FTP IONOS)
Utilisateur: [Votre username IONOS]
Mot de passe: [Votre password IONOS]
Port: 21 (FTP) ou 22 (SFTP)
```

**Via Panel Web IONOS:**
```
1. Se connecter sur ionos.fr
2. Hosting → File Manager
3. Naviguer vers /public_html/
4. Upload les fichiers depuis /dist/
```

---

## ⚠️ IMPORTANT

**Le problème n'est PAS dans le code - le code est corrigé!**

Le problème est que:
1. Les nouveaux fichiers sont sur votre PC local
2. Les anciens fichiers sont sur le serveur IONOS
3. Le navigateur charge depuis IONOS (donc anciens fichiers)

**Solution:** Uploader les nouveaux fichiers sur IONOS.

---

## 📞 SUPPORT

Si vous ne pouvez pas accéder au FTP IONOS:
1. Contacter le support IONOS
2. Demander accès FTP/SFTP
3. Ou utiliser le File Manager du panel IONOS

---

**Build Local:** ✅ Prêt dans `/dist/`
**Hash Corrects:** ✅ `Cnygdk3Q`, `CtnYLgZA`
**Reste à faire:** 🔴 Upload sur IONOS

**Date:** 2026-01-02
**Status:** 🟡 En attente déploiement
