# 🚀 INSTRUCTIONS DE DÉPLOIEMENT - Correction Visuelle CRM

**Date:** 19 février 2026
**Problème:** Différences visuelles entre dev et production

## ✅ Ce qui a été corrigé

1. **Toutes les références `leads` → `crm_leads`** (11 fichiers modifiés)
2. **Build propre** avec cache nettoyé
3. **Fichiers problématiques supprimés** (image copy.png)

---

## 📦 FICHIER À DÉPLOYER

**Fichier:** `dist-deploy-20260219-1909.tar.gz` (17 MB)

---

## 🔧 ÉTAPES DE DÉPLOIEMENT SUR IONOS

### 1️⃣ Télécharger le fichier

Téléchargez `dist-deploy-20260219-1909.tar.gz` depuis Bolt.new

### 2️⃣ Connexion IONOS

```bash
# Via FTP/SFTP ou File Manager IONOS
```

### 3️⃣ Backup de l'ancien site

```bash
# Renommer le dossier actuel
mv public_html public_html_backup_20260219
```

### 4️⃣ Décompresser la nouvelle version

```bash
# Extraire l'archive
tar -xzf dist-deploy-20260219-1909.tar.gz
mv dist public_html
```

### 5️⃣ Vérifier les permissions

```bash
chmod -R 755 public_html
chmod 644 public_html/.htaccess
```

---

## 🧹 VIDER LES CACHES

### Sur le serveur (IONOS)

Si vous avez accès au panneau IONOS, activez/désactivez le cache :
1. Allez dans "Performance"
2. Désactivez le cache
3. Attendez 30 secondes
4. Réactivez le cache

**OU** ajoutez ces headers dans `.htaccess` (déjà inclus) :

```apache
# Forcer le rechargement
<filesMatch ".(html|htm|js|css)$">
  FileETag None
  <ifModule mod_headers.c>
     Header unset ETag
     Header set Cache-Control "max-age=0, no-cache, no-store, must-revalidate"
     Header set Pragma "no-cache"
     Header set Expires "Wed, 11 Jan 1984 05:00:00 GMT"
  </ifModule>
</filesMatch>
```

### Côté utilisateur (IMPORTANT)

**Après le déploiement, demandez aux utilisateurs de :**

#### Chrome/Edge
1. Ouvrir DevTools (F12)
2. Clic droit sur le bouton refresh
3. Choisir "Vider le cache et actualiser de force"

**OU**

- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

#### Pour vider le Service Worker (PWA)

1. Ouvrir DevTools (F12)
2. Aller dans "Application" > "Service Workers"
3. Cliquer sur "Unregister"
4. Rafraîchir la page

---

## 🔍 VÉRIFICATION POST-DÉPLOIEMENT

### 1. Testez en navigation privée

```
https://taxiassur.com/backoffice
```

### 2. Vérifiez que vous voyez

- ✅ Design moderne avec sidebar bleu foncé
- ✅ Layout propre et aligné
- ✅ 71 Total Leads visible
- ✅ Pas d'erreurs console sur `crm_leads`

### 3. Vérifiez la console

Ouvrez DevTools (F12) et vérifiez :
- ❌ Plus d'erreurs `GET .../leads?select=*` (404)
- ✅ Requêtes vers `crm_leads` fonctionnent

---

## ⚠️ EN CAS DE PROBLÈME

### Si le site ne fonctionne pas

```bash
# Restaurer l'ancienne version
rm -rf public_html
mv public_html_backup_20260219 public_html
```

### Si seulement le style est bizarre

1. Videz le cache navigateur (Ctrl+Shift+R)
2. Désactivez le Service Worker
3. Attendez 5 minutes pour la propagation CDN

---

## 📊 CHANGEMENTS TECHNIQUES

### Fichiers modifiés (11 fichiers)

```
✅ src/lib/leads.ts
✅ src/backoffice/MasterDashboard.tsx
✅ src/backoffice/CRMCommercial.tsx
✅ src/backoffice/CRMMaster.tsx
✅ src/backoffice/CRMSaaSDashboard.tsx
✅ src/backoffice/CRMUniversal.tsx
✅ src/backoffice/LeadCRM.tsx
✅ src/backoffice/LeadMarketplace.tsx
✅ src/backoffice/ProspectSeeder.tsx
✅ src/backoffice/SecurityDashboard.tsx
✅ src/components/SmartConversionSystem.tsx
```

### Taille du build

```
Total: 3.2 MB (compressed)
Biggest modules:
- backoffice-crm-CT0Ih1q_.js: 442 KB
- backoffice-core-Cmocvto8.js: 371 KB
- vendor-react-Ce_nXufc.js: 274 KB
```

---

## 🎯 RÉSULTAT ATTENDU

Après déploiement + cache vidé, vous devriez avoir **EXACTEMENT** le même rendu que sur Bolt.new (développement).

**Durée estimée:** 10-15 minutes (déploiement + propagation)

---

## 📞 SUPPORT

Si problème persistant :
1. Vérifiez que le bon fichier est déployé
2. Videz TOUS les caches (navigateur + serveur + CDN)
3. Testez en navigation privée
4. Attendez 5-10 minutes pour la propagation CDN IONOS

---

✅ **Build validé le:** 19/02/2026 20:09
✅ **Prêt pour production**
