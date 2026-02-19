# 🧹 GUIDE COMPLET - VIDER LES CACHES

## Pourquoi les visuels sont différents ?

Le site taxiassur.com affiche une **ancienne version** car :

1. ❌ **Cache navigateur** → Ancien CSS/JS stocké localement
2. ❌ **Service Worker PWA** → Sert l'ancienne version offline
3. ❌ **Cache CDN IONOS** → Serveur cache les fichiers
4. ❌ **Build non déployé** → Ancienne version sur le serveur

---

## 🎯 SOLUTION EN 3 ÉTAPES

### ÉTAPE 1 : Déployer la nouvelle version (Vous)

#### Option A : Via FTP/SFTP
1. Connectez-vous à IONOS via FileZilla/WinSCP
2. **Backup** : Renommez `public_html` → `public_html_backup`
3. **Upload** : Téléversez le dossier `dist` → Renommez en `public_html`

#### Option B : Via File Manager IONOS
1. Connexion → https://www.ionos.fr/hosting/login
2. Panneau → "Hébergement Web" → "File Manager"
3. **Backup** : Renommez `public_html` → `public_html_backup`
4. **Upload** : Uploadez l'archive `dist-deploy-20260219-1909.tar.gz`
5. **Extract** : Clic droit → Extract → Renommez `dist` en `public_html`

⏱️ **Temps:** 5-10 minutes

---

### ÉTAPE 2 : Forcer le rechargement côté serveur (IONOS)

#### Option A : Via Panneau IONOS (Recommandé)

1. Connectez-vous à IONOS
2. Allez dans **"Performance"** ou **"Paramètres"**
3. Trouvez **"Cache CDN"** ou **"Cache Page"**
4. Cliquez sur **"Vider le cache"** / **"Clear cache"**
5. Attendez 2-3 minutes

#### Option B : Via .htaccess (Temporaire)

Si vous ne trouvez pas l'option cache, utilisez le `.htaccess-NO-CACHE` :

```bash
# Dans le dossier public_html
mv .htaccess .htaccess-BACKUP
mv .htaccess-NO-CACHE .htaccess
```

**⚠️ IMPORTANT :** Après 2 heures, restaurez :

```bash
mv .htaccess .htaccess-TEMP
mv .htaccess-BACKUP .htaccess
```

⏱️ **Temps:** 2-3 minutes

---

### ÉTAPE 3 : Vider le cache utilisateur (Chaque utilisateur)

#### Méthode 1 : Hard Refresh (RAPIDE)

**Windows:**
- Chrome/Edge/Firefox: `Ctrl + Shift + R`
- Ou `Ctrl + F5`

**Mac:**
- Chrome/Edge/Firefox: `Cmd + Shift + R`
- Safari: `Cmd + Option + R`

#### Méthode 2 : Via DevTools (COMPLET)

1. Ouvrez la page https://taxiassur.com/backoffice
2. Appuyez sur `F12` (DevTools)
3. **Clic droit** sur le bouton refresh (🔄)
4. Sélectionnez **"Vider le cache et actualiser de force"**

#### Méthode 3 : Désactiver le Service Worker (PWA)

Si le problème persiste :

1. `F12` → Onglet **"Application"**
2. Menu gauche → **"Service Workers"**
3. Trouvez `taxiassur.com`
4. Cliquez **"Unregister"**
5. Fermez tous les onglets du site
6. Rouvrez https://taxiassur.com/backoffice

#### Méthode 4 : Navigation privée (TEST)

Pour tester immédiatement sans affecter votre cache :

- Windows: `Ctrl + Shift + N` (Chrome) ou `Ctrl + Shift + P` (Firefox)
- Mac: `Cmd + Shift + N`

Ouvrez https://taxiassur.com/backoffice

⏱️ **Temps:** 30 secondes par utilisateur

---

## 📊 VÉRIFICATION

### ✅ Checklist après déploiement

#### Sur le serveur
- [ ] Fichiers uploadés dans `public_html`
- [ ] `.htaccess` présent
- [ ] Permissions correctes (755 dossiers, 644 fichiers)

#### Cache vidé
- [ ] Cache CDN IONOS vidé
- [ ] Attendu 2-3 minutes après
- [ ] Testé en navigation privée

#### Visuel correct
- [ ] Design moderne avec sidebar bleu foncé
- [ ] Layout propre et aligné
- [ ] "71 Total Leads" visible
- [ ] Pas d'erreur console `leads` (404)

---

## 🔍 DIAGNOSTIC

### Test 1 : Vérifier la version déployée

Ouvrez https://taxiassur.com et regardez le code source (Ctrl+U) :

Cherchez cette ligne :
```html
<script type="module" crossorigin src="/assets/index-DgDVmbg9.js"></script>
```

**✅ Bon** : Le hash `DgDVmbg9` est présent
**❌ Mauvais** : Hash différent → Mauvaise version déployée

### Test 2 : Vérifier les erreurs console

1. Ouvrez https://taxiassur.com/backoffice
2. `F12` → Console
3. Cherchez les erreurs

**✅ Bon** : Requêtes vers `crm_leads`
**❌ Mauvais** : Erreurs 404 sur `leads` → Cache navigateur

### Test 3 : Vérifier le Service Worker

1. `F12` → Application → Service Workers
2. Regardez la date de "Registered"

**✅ Bon** : Date d'aujourd'hui
**❌ Mauvais** : Date ancienne → Service Worker pas mis à jour

---

## ⏰ DÉLAIS DE PROPAGATION

| Cache | Délai | Solution |
|-------|-------|----------|
| **Navigateur** | Instantané | Ctrl+Shift+R |
| **Service Worker** | 1-2 min | Unregister |
| **CDN IONOS** | 2-5 min | Vider cache panneau |
| **DNS** | 1-24h | Pas concerné ici |

---

## 🚨 PROBLÈMES FRÉQUENTS

### Problème 1 : Toujours l'ancien design après 10 minutes

**Cause :** Service Worker PWA bloqué

**Solution :**
```
F12 → Application → Service Workers → Unregister
Fermer TOUS les onglets taxiassur.com
Rouvrir en navigation privée
```

### Problème 2 : "Prêt pour Devis" avec texte barré orange

**Cause :** Ancien build déployé

**Solution :**
```bash
Vérifiez le hash du fichier index.html
Doit contenir : index-DgDVmbg9.js
Si différent → Redéployez le bon fichier
```

### Problème 3 : Erreurs 404 sur crm_leads dans la console

**Cause :** Nouvelle version pas déployée

**Solution :**
```
1. Vérifiez que le bon dossier dist est sur le serveur
2. Videz le cache IONOS
3. Hard refresh (Ctrl+Shift+R)
```

### Problème 4 : Certains utilisateurs voient l'ancienne version

**Cause :** Leur cache local pas vidé

**Solution :**
```
Envoyez ces instructions :
1. Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
2. Si ça ne marche pas : Navigation privée
3. Si ça ne marche toujours pas : Vider cache navigateur dans les paramètres
```

---

## 🎯 RÉSUMÉ RAPIDE

### Pour vous (Admin)

```bash
1. Upload dist → public_html (5 min)
2. Vider cache IONOS (2 min)
3. Test navigation privée (30 sec)
✅ Total : ~10 minutes
```

### Pour les utilisateurs

```
1. Ctrl+Shift+R ou Cmd+Shift+R
2. Si problème : F12 → Service Workers → Unregister
3. Si toujours problème : Navigation privée
✅ Total : 30 secondes
```

---

## 📞 SUPPORT

**Si problème après 30 minutes :**

1. ✅ Vérifiez que le bon fichier est déployé (hash `DgDVmbg9`)
2. ✅ Videz le cache IONOS dans le panneau
3. ✅ Testez en navigation privée sur un autre appareil/réseau
4. ✅ Attendez 5-10 minutes supplémentaires

**Dernière solution :**
- Ajoutez `?v=20260219` à l'URL : https://taxiassur.com/backoffice?v=20260219
- Cela force le rechargement même avec cache actif

---

✅ **Après ces étapes, vous aurez exactement le même rendu que Bolt.new**
