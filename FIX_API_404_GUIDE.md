# 🚀 CORRECTION API 404 - Guide Rapide

## ✅ Diagnostic

**Bon signe:** Le nouveau code fonctionne (`page-home-CxMLbZ87.js` est chargé)

**Problème:** L'API `/api/lead.php` retourne une **erreur 404**

---

## 🎯 Solution en 3 Étapes

### Étape 1: Upload FTP des Fichiers

**Connexion FTP IONOS:**
```
Hôte: ftp.taxiassur.com
Port: 21
User: [votre_user]
Pass: [votre_mdp]
```

**Upload via FileZilla:**
1. Connexion au serveur
2. Local (gauche): Ouvrir `dist/`
3. Serveur (droite): Ouvrir `httpdocs/`
4. Sélectionner TOUT dans `dist/` (Ctrl+A)
5. Clic droit → Upload
6. Confirmer "Écraser existants"

**IMPORTANT:** Vérifier que ces fichiers sont bien uploadés:
- `httpdocs/api/lead.php` (18 KB)
- `httpdocs/api/.htaccess` (1.1 KB) ← Fichier caché, activer "Afficher fichiers cachés"

---

### Étape 2: Vérifier .htaccess

Le fichier `.htaccess` est **caché** par défaut dans FileZilla.

**Activer l'affichage:**
- Menu "Serveur" → "Forcer affichage fichiers cachés"
- OU Menu "Affichage" → "Afficher fichiers cachés"

**Vérifier présence:**
```
httpdocs/api/.htaccess ← Doit être visible maintenant
```

---

### Étape 3: Tester l'API

**Test Console (F12):**
```javascript
fetch('/api/lead.php', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    name: 'Test',
    email: 'test@test.com',
    phone: '0612345678',
    city: 'Paris',
    status: 'taxi'
  })
})
.then(r => r.json())
.then(d => console.log('✅ API OK:', d))
.catch(e => console.error('❌ Erreur:', e));
```

**Résultat attendu:**
```json
{
  "success": true,
  "ok": true,
  "message": "Demande traitée avec succès"
}
```

---

## 🧹 Vider les Caches

**Navigateur:**
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Service Worker:**
1. F12 → Application → Service Workers
2. Cliquer "Unregister"
3. Actualiser (F5)

---

## 🔧 Dépannage Rapide

### API toujours en 404

**Vérifier via FTP:**
```
httpdocs/api/lead.php ← Existe? (18 KB)
httpdocs/api/.htaccess ← Existe? (1.1 KB)
```

**Test direct:**
```
Ouvrir: https://taxiassur.com/api/lead.php
Attendu: {"success":false,"error":"Méthode non autorisée"}
Si page HTML → Fichier pas trouvé
```

### 500 Internal Error

**Cause:** `.htaccess` incompatible

**Solution rapide:**
Via FTP, créer `.htaccess` minimal dans `httpdocs/api/`:
```apache
Header always set Access-Control-Allow-Origin "*"
AddHandler application/x-httpd-php .php
```

---

## ✅ Checklist

- [ ] Upload `dist/` vers `httpdocs/`
- [ ] `api/lead.php` présent (18 KB)
- [ ] `api/.htaccess` présent (1.1 KB)
- [ ] Test console → `{"success": true}`
- [ ] Formulaire → Redirection `/merci`
- [ ] Cache vidé (Ctrl+Shift+R)

---

## 📊 Temps Estimé

**Total: 5-10 minutes**
- Upload FTP: 2-5 min
- Vérifications: 2 min
- Tests: 1 min
- Cache: 1 min
