# 🚨 DÉPLOIEMENT URGENT - Correction Erreur API

## ⚠️ Situation Actuelle

Le site https://taxiassur.com/ utilise **l'ancienne version** du code:
- **Fichier actuel (production):** `page-home-CZXEEmtx.js` ❌
- **Nouveau fichier (corrigé):** `page-home-CxMLbZ87.js` ✅

**L'erreur persiste en production car le nouveau build n'a pas encore été déployé.**

---

## 📦 Étape 1: Préparer les Fichiers

Le dossier `dist/` contient la version corrigée :

```bash
# Vérification locale
ls -la dist/assets/ | grep page-home
# Doit afficher: page-home-CxMLbZ87.js (73.76 kB)
```

**Fichiers critiques mis à jour:**
- ✅ `dist/assets/page-home-CxMLbZ87.js` - Code corrigé
- ✅ `dist/assets/index-BQwQpjR8.js` - Nouveau manifest
- ✅ `dist/api/.htaccess` - Headers optimisés
- ✅ `dist/api/lead.php` - API inchangée
- ✅ `dist/sw.js` - Service Worker mis à jour

---

## 🚀 Étape 2: Uploader sur IONOS

### Option A: FTP/SFTP (Recommandé)

1. **Connexion FTP:**
   ```
   Serveur: ftp.taxiassur.com (ou votre serveur IONOS)
   Utilisateur: [votre_user]
   Port: 21 (FTP) ou 22 (SFTP)
   ```

2. **Sauvegarde (IMPORTANT):**
   ```bash
   # Sur le serveur, renommer l'ancien dossier
   mv httpdocs/assets httpdocs/assets.backup-2026-01-02
   ```

3. **Upload complet:**
   ```
   Uploader TOUT le contenu de dist/ vers httpdocs/

   Structure finale sur le serveur:
   httpdocs/
   ├── index.html (✅ MAJ)
   ├── assets/ (✅ TOUT remplacer)
   │   ├── page-home-CxMLbZ87.js (✅ NOUVEAU)
   │   ├── index-BQwQpjR8.js (✅ NOUVEAU)
   │   └── ...
   ├── api/ (✅ MAJ)
   │   ├── .htaccess (✅ MAJ)
   │   └── lead.php
   ├── sw.js (✅ MAJ)
   └── workbox-*.js (✅ MAJ)
   ```

4. **Vérification permissions:**
   ```bash
   # Sur le serveur via SSH
   chmod 755 httpdocs/api/
   chmod 644 httpdocs/api/*.php
   chmod 644 httpdocs/api/.htaccess
   ```

### Option B: FileZilla (Interface Graphique)

1. Ouvrir FileZilla
2. Se connecter au serveur IONOS
3. **Local (gauche):** Naviguer vers `dist/`
4. **Distant (droite):** Naviguer vers `httpdocs/`
5. Sélectionner TOUT dans `dist/` (Ctrl+A)
6. Clic droit → Upload
7. Confirmer "Écraser les fichiers existants"

### Option C: Panel IONOS Web (Lent)

1. Se connecter sur https://www.ionos.fr/
2. Aller dans "Hébergement Web"
3. Ouvrir "Gestionnaire de fichiers"
4. Uploader `dist/` → `httpdocs/`
5. Remplacer tous les fichiers existants

---

## 🧹 Étape 3: Vider les Caches

### A. Cache Navigateur (CRITIQUE)

**Sur Chrome/Edge:**
```
1. Ouvrir DevTools (F12)
2. Clic droit sur le bouton Actualiser
3. Choisir "Vider le cache et actualiser de force"
```

**Raccourci clavier:**
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### B. Service Worker (PWA)

1. **Ouvrir:** https://taxiassur.com/
2. **DevTools (F12)** → Onglet "Application"
3. **Menu gauche:** Service Workers
4. **Actions:**
   - Cliquer sur "Unregister" (désinscrire)
   - Cocher "Update on reload"
   - Actualiser la page (F5)

### C. Cache Serveur IONOS (Si activé)

**Via Panel IONOS:**
```
1. Hébergement → Paramètres
2. Cache HTTP
3. Bouton "Vider le cache"
```

**Via .htaccess (automatique):**
```apache
# Déjà dans dist/.htaccess
Header set Cache-Control "no-cache, must-revalidate"
```

---

## ✅ Étape 4: Tester la Correction

### Test 1: Vérifier la Version

1. Ouvrir https://taxiassur.com/
2. Ouvrir Console (F12)
3. Aller dans l'onglet "Sources" ou "Network"
4. Chercher `page-home-`
5. **Vérifier:** Doit être `page-home-CxMLbZ87.js` ✅

**Ligne de commande:**
```bash
curl -sI https://taxiassur.com/ | grep -i "cache\|etag"
```

### Test 2: Soumettre le Formulaire

1. **Remplir le formulaire:**
   - Nom: Test Déploiement
   - Email: test@test.com
   - Téléphone: 0612345678
   - Ville: Paris
   - Statut: Taxi

2. **Soumettre et observer la Console (F12):**

   **❌ ANCIENNE VERSION (erreur):**
   ```
   Erreur: Error: Le serveur a retourné une réponse non-JSON
   at page-home-CZXEEmtx.js:1:12497
   ```

   **✅ NOUVELLE VERSION (succès ou erreur claire):**
   ```
   // Succès: Redirection vers /merci
   // OU erreur avec message clair:
   "Service non disponible (404). Veuillez contacter le support."
   "Erreur serveur. Veuillez réessayer dans quelques instants."
   ```

3. **Vérifier dans les logs:**

   **Console Browser (nouveau comportement):**
   - Succès = pas de log (silencieux)
   - Erreur = log détaillé avec status, URL, body

   **Logs serveur (PHP):**
   ```bash
   # Sur le serveur
   tail -f httpdocs/logs/email-*.log
   ```

### Test 3: Vérifier l'API Directement

```bash
# Test direct de l'API
curl -X POST https://taxiassur.com/api/lead.php \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API",
    "email": "test@test.com",
    "phone": "0612345678",
    "city": "Paris",
    "status": "taxi"
  }' -v 2>&1 | grep -E "HTTP|Content-Type|success"

# Doit retourner:
# < HTTP/1.1 200 OK
# < Content-Type: application/json; charset=UTF-8
# {"success":true,"ok":true,...}
```

---

## 🔍 Dépannage

### Problème 1: L'erreur persiste après déploiement

**Causes possibles:**
1. Cache navigateur non vidé
2. Service Worker (PWA) toujours actif
3. CDN/Proxy cache l'ancienne version
4. Upload incomplet

**Solutions:**
```bash
# 1. Mode navigation privée
Ctrl+Shift+N (Chrome) / Ctrl+Shift+P (Firefox)
Tester sur https://taxiassur.com/

# 2. Vérifier les fichiers sur le serveur
ssh user@server
ls -l httpdocs/assets/page-home-*.js
# Doit montrer: page-home-CxMLbZ87.js (date récente)

# 3. Forcer le rechargement des assets
# Ajouter ?v=2 dans l'URL de test
https://taxiassur.com/?v=2

# 4. Vérifier .htaccess
cat httpdocs/api/.htaccess | grep "Content-Type"
# Doit contenir: Header set Content-Type ... env=!REDIRECT_STATUS
```

### Problème 2: 404 sur lead.php

**Vérification:**
```bash
# Sur le serveur
ls -la httpdocs/api/lead.php
# Doit exister et avoir les droits 644

# Test direct
curl -I https://taxiassur.com/api/lead.php
# Doit retourner: 200 OK (ou 405 Method Not Allowed pour GET)
```

**Solution:**
```bash
# Re-upload lead.php
scp dist/api/lead.php user@server:httpdocs/api/
chmod 644 httpdocs/api/lead.php
```

### Problème 3: 500 Internal Server Error

**Causes:**
1. Erreur PHP dans lead.php
2. .htaccess invalide
3. Permissions incorrectes

**Vérification:**
```bash
# 1. Logs PHP
tail -50 /var/log/apache2/error.log
# OU sur IONOS:
tail -50 httpdocs/logs/error.log

# 2. Tester .htaccess
mv httpdocs/api/.htaccess httpdocs/api/.htaccess.backup
# Retester → Si ça marche, le .htaccess est en cause

# 3. Permissions
find httpdocs/api -type f -exec chmod 644 {} \;
find httpdocs/api -type d -exec chmod 755 {} \;
```

### Problème 4: Headers CORS bloqués

**Symptôme dans Console:**
```
Access to fetch at 'https://taxiassur.com/api/lead.php'
from origin 'https://taxiassur.com' has been blocked by CORS policy
```

**Solution:**
```bash
# Vérifier que .htaccess contient:
cat httpdocs/api/.htaccess | grep -A3 "mod_headers"

# Doit avoir:
# Header always set Access-Control-Allow-Origin "*"
# Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
```

---

## 📊 Monitoring Post-Déploiement

### 1. Console Logs (Temps Réel)

**Ouvrir sur plusieurs onglets:**
```
1. https://taxiassur.com/ (F12 ouvert)
2. Soumettre un formulaire test toutes les 5 minutes
3. Observer les erreurs dans la console
```

### 2. Logs Serveur (SSH)

```bash
# Logs emails
tail -f httpdocs/logs/email-$(date +%Y-%m-%d).log

# Logs Apache
tail -f /var/log/apache2/access.log | grep "lead.php"

# Logs erreurs
tail -f /var/log/apache2/error.log
```

### 3. Métriques de Succès

**Dans les 30 premières minutes:**
- ✅ Aucune erreur "réponse non-JSON" dans la console
- ✅ Formulaires soumis avec succès (redirection /merci)
- ✅ Emails reçus sur commercial@xcr.fr
- ✅ Leads insérés dans Supabase (table `leads`)

**Vérifier Supabase:**
```sql
-- Voir les derniers leads
SELECT
  id, name, city, status, created_at
FROM leads
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📝 Checklist de Déploiement

- [ ] **Sauvegarde** de l'ancienne version
- [ ] **Upload** de dist/ vers httpdocs/
- [ ] **Permissions** correctes (755 folders, 644 files)
- [ ] **Vider cache** navigateur (Ctrl+Shift+R)
- [ ] **Désinscrire** Service Worker
- [ ] **Test formulaire** en mode normal
- [ ] **Test formulaire** en navigation privée
- [ ] **Vérifier** fichier = `page-home-CxMLbZ87.js`
- [ ] **Vérifier** aucune erreur console
- [ ] **Vérifier** redirection vers /merci
- [ ] **Vérifier** email reçu
- [ ] **Vérifier** lead dans Supabase
- [ ] **Monitor** logs pendant 30min

---

## 🆘 Support d'Urgence

### Si ça ne fonctionne toujours pas après 3 essais:

1. **Rollback immédiat:**
   ```bash
   ssh user@server
   cd httpdocs
   rm -rf assets/
   mv assets.backup-2026-01-02 assets
   ```

2. **Test l'API isolément:**
   ```bash
   # Créer test-api.html sur le serveur:
   cat > httpdocs/test-api.html << 'EOF'
   <!DOCTYPE html>
   <html><body>
   <script>
   fetch('/api/lead.php', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       name: 'Test', email: 'test@test.com',
       phone: '0612345678', city: 'Paris', status: 'taxi'
     })
   })
   .then(r => r.text())
   .then(t => {
     console.log('Response:', t);
     document.body.innerHTML = '<pre>' + t + '</pre>';
   })
   .catch(e => console.error('Error:', e));
   </script>
   </body></html>
   EOF
   ```

   **Ouvrir:** https://taxiassur.com/test-api.html
   **Observer:** La réponse complète de l'API

3. **Contacter support IONOS:**
   - Vérifier que PHP fonctionne
   - Vérifier que mod_headers est activé
   - Vérifier les logs serveur

---

## ⏱️ Timeline Estimée

| Étape | Durée | Critique |
|-------|-------|----------|
| Upload FTP | 2-5 min | ⚠️ Oui |
| Vider caches | 1 min | ⚠️ Oui |
| Test formulaire | 1 min | ⚠️ Oui |
| Vérifier logs | 5 min | ✅ Non |
| Monitoring | 30 min | ✅ Non |
| **TOTAL** | **10-45 min** | - |

---

## ✅ Confirmation du Succès

Le déploiement est réussi quand:

1. ✅ `page-home-CxMLbZ87.js` est chargé (Network tab)
2. ✅ Aucune erreur "réponse non-JSON" dans la console
3. ✅ Formulaire soumis → Redirection `/merci`
4. ✅ Email reçu sur commercial@xcr.fr
5. ✅ Lead visible dans Supabase

**Screenshot de validation:**
```
Console DevTools (F12):
└── Network
    └── page-home-CxMLbZ87.js (Status: 200) ✅
└── Console
    └── (aucune erreur API) ✅
```

---

## 📞 Contact

**Questions pendant le déploiement?**
- Garder la console ouverte (F12)
- Noter l'erreur exacte
- Vérifier les logs serveur
- Prendre un screenshot

Le nouveau système affiche maintenant des messages d'erreur clairs au lieu du cryptique "réponse non-JSON".
