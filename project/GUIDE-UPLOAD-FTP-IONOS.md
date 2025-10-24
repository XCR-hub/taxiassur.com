# 🚨 GUIDE UPLOAD FTP IONOS - URGENT

## ⚠️ SITUATION ACTUELLE

**Votre site affiche "Internal Server Error" car l'ancien `index.html` est toujours sur le serveur IONOS.**

Les erreurs dans la console :
```
❌ index.css → 404 (n'existe plus)
❌ index.js  → 404 (n'existe plus)
❌ MIME type 'text/html' au lieu de 'text/css'
❌ Erreur 500
```

**Cause :** L'ancien build référence `index.css` et `index.js`, mais le nouveau build génère `index-C5dJXCO4.js` et `index-xp3--mS4.css`.

---

## ✅ CE N'EST PAS UN PROBLÈME CLOUDFLARE OU GOOGLE

- **Cloudflare** = Cache seulement. Il sert ce qui existe sur IONOS.
- **Google** = Aucun lien avec ces erreurs 404.
- **IONOS** = Votre serveur d'hébergement. **C'est là que vous devez agir.**

**Purger Cloudflare ne suffit PAS si les fichiers n'existent pas sur IONOS !**

---

## 🎯 SOLUTION : UPLOAD FTP OBLIGATOIRE

### **MÉTHODE 1 : FTP via Panel IONOS (Plus simple)**

1. **Connexion au panel IONOS**
   - Allez sur https://login.ionos.fr/
   - Connectez-vous avec vos identifiants

2. **Accès FTP Web**
   - Menu gauche → **Hébergement**
   - Cliquez sur **Gérer** pour taxiassur.com
   - Cherchez **"Gestionnaire de fichiers"** ou **"FTP Web"**
   - Cliquez pour ouvrir l'interface FTP web

3. **Suppression des anciens fichiers**

   Dans le gestionnaire de fichiers, **SUPPRIMEZ** :
   - ❌ `index.html`
   - ❌ Dossier `/assets/` (TOUT)
   - ❌ `.htaccess`

   **⚠️ NE SUPPRIMEZ PAS :**
   - ✅ `/api/`
   - ✅ `/content/`
   - ✅ `/webhooks/`
   - ✅ `robots.txt`
   - ✅ `sitemap.xml`

4. **Upload des nouveaux fichiers**

   Cliquez sur **"Upload"** ou **"Téléverser"**

   Sélectionnez depuis votre PC, dossier `/dist/` :
   - ✅ `index.html` (6.6 KB)
   - ✅ `.htaccess` (7.3 KB) ← **Fichier caché !**
   - ✅ Dossier `/assets/` (TOUT)

   **Pour voir .htaccess :**
   - Cherchez option "Afficher fichiers cachés" dans le gestionnaire

5. **Vérification**

   Dans le gestionnaire, vous devez voir :
   - ✅ `index.html` (6.6 KB)
   - ✅ `.htaccess` (7.3 KB)
   - ✅ `/assets/index-C5dJXCO4.js` (23 KB)
   - ✅ `/assets/index-xp3--mS4.css` (98 KB)

---

### **MÉTHODE 2 : FTP via FileZilla (Plus rapide)**

1. **Télécharger FileZilla**
   - https://filezilla-project.org/
   - Installez-le sur votre PC

2. **Connexion FTP**

   Ouvrez FileZilla et entrez :
   ```
   Hôte     : taxiassur.com
   Port     : 21
   Protocole: FTP
   User     : [votre username IONOS]
   Pass     : [votre mot de passe IONOS]
   ```

   Cliquez **"Connexion rapide"**

3. **Configuration pour voir .htaccess**

   Menu **Serveur** → **Forcer l'affichage des fichiers cachés**

4. **Interface FileZilla**

   ```
   ┌─────────────────┬─────────────────┐
   │  LOCAL (Gauche) │ SERVEUR (Droite)│
   │                 │                 │
   │  Votre PC       │  IONOS          │
   │  /dist/         │  /              │
   └─────────────────┴─────────────────┘
   ```

5. **Suppression sur le serveur (Panneau DROIT)**

   Sélectionnez et **Supprimer** :
   - ❌ `index.html`
   - ❌ `/assets/` (tout)
   - ❌ `.htaccess`

6. **Upload depuis votre PC (Panneau GAUCHE)**

   - Naviguez vers le dossier `/dist/` sur votre PC
   - Sélectionnez **TOUT** (Ctrl+A)
   - Clic droit → **Upload**
   - Attendez la fin de l'upload (barre en bas)

7. **Vérification**

   Sur le serveur (panneau droit), vérifiez :
   - ✅ `index.html` (6.6 KB)
   - ✅ `.htaccess` (7.3 KB)
   - ✅ `/assets/index-C5dJXCO4.js`
   - ✅ `/assets/index-xp3--mS4.css`

---

## 🔍 OÙ TROUVER VOS IDENTIFIANTS FTP IONOS

Si vous ne connaissez pas vos identifiants FTP :

1. **Via Panel IONOS**
   - https://login.ionos.fr/
   - Hébergement → Gérer
   - Section **"Accès FTP"**
   - Vous verrez le **username**
   - Réinitialisez le mot de passe si besoin

2. **Email de confirmation IONOS**
   - Cherchez l'email reçu lors de la souscription
   - Sujet : "Votre hébergement IONOS"
   - Contient les infos FTP

---

## ✅ TEST APRÈS UPLOAD

1. **Attendez 2-3 minutes** après l'upload

2. **Videz le cache navigateur**
   - Windows : `Ctrl+Shift+R`
   - Mac : `Cmd+Shift+R`

3. **Ou testez en navigation privée**
   - Windows : `Ctrl+Shift+N`
   - Mac : `Cmd+Shift+N`

4. **Allez sur** https://www.taxiassur.com/

5. **Vérifiez la console** (F12)
   - ✅ Attendu : 0 erreurs
   - ✅ Pas de 404
   - ✅ Pas de MIME errors

6. **Vérifiez le code source**
   - Clic droit → Afficher code source
   - Cherchez : `index-C5dJXCO4.js`
   - ✅ Si trouvé → Upload réussi !
   - ❌ Si `index.js` → Repurgez Cloudflare

---

## 📋 CHECKLIST COMPLÈTE

### Avant upload
- [ ] Cache Cloudflare purgé
- [ ] Connexion FTP établie (Panel ou FileZilla)
- [ ] Localisé dossier /dist/ sur mon PC

### Suppression serveur
- [ ] index.html supprimé
- [ ] /assets/ supprimé
- [ ] .htaccess supprimé
- [ ] Autres fichiers (/api/, /content/) conservés

### Upload
- [ ] index.html (6.6 KB) uploadé
- [ ] .htaccess (7.3 KB) uploadé
- [ ] /assets/ (TOUT) uploadé
- [ ] Upload 100% terminé

### Vérification FTP
- [ ] /assets/index-C5dJXCO4.js présent (23 KB)
- [ ] /assets/index-xp3--mS4.css présent (98 KB)
- [ ] .htaccess présent (7.3 KB)

### Test final
- [ ] Attendu 2-3 minutes
- [ ] Cache navigateur vidé
- [ ] Site testé : https://www.taxiassur.com/
- [ ] Console (F12) : 0 erreurs
- [ ] Formulaires visibles et stylisés

---

## 🚀 SCRIPT DE DÉPLOIEMENT AUTOMATIQUE (FUTUR)

Pour automatiser à l'avenir, j'ai créé un script qui :
1. Build le projet
2. Purge Cloudflare automatiquement via API
3. Vous rappelle l'upload FTP

**Pour l'activer :**

1. **Créez un API Token Cloudflare**
   - https://dash.cloudflare.com/profile/api-tokens
   - Cliquez **"Create Token"**
   - Template : **"Edit zone DNS"** ou créez un custom
   - Permissions : `Zone > Cache Purge > Purge`
   - Copiez le token

2. **Ajoutez le token dans `.env.cloudflare`**
   ```
   CLOUDFLARE_ZONE_ID=6db20e6211bb587c873310cba0578f24
   CLOUDFLARE_ACCOUNT_ID=fcca12a7ddf64e6dc782494bdb487b8e
   CLOUDFLARE_API_TOKEN=votre_token_ici
   ```

3. **Utilisez le script**
   ```bash
   npm run auto-deploy
   ```

---

## 🆘 TROUBLESHOOTING

### Problème : "Je ne trouve pas le gestionnaire FTP IONOS"

**Solution :**
- Connectez-vous à https://login.ionos.fr/
- Menu gauche → **"Hébergement"** ou **"Hosting"**
- Sélectionnez taxiassur.com
- Bouton **"Gérer"**
- Cherchez **"Gestionnaire de fichiers"**, **"FTP Web"** ou **"File Manager"**

### Problème : ".htaccess invisible dans FileZilla"

**Solution :**
- Menu **Serveur** → **Forcer l'affichage des fichiers cachés**
- Vérifiez que le fichier existe dans /dist/ sur votre PC

### Problème : "Connexion FTP refusée"

**Solution :**
- Vérifiez username et password
- Réinitialisez le mot de passe FTP depuis le panel IONOS
- Essayez `ftp.taxiassur.com` au lieu de `taxiassur.com`
- Contactez support IONOS : 0970 808 911

### Problème : "Toujours erreurs 404 après upload"

**Solution :**
1. Repurgez cache Cloudflare
2. Vérifiez via FTP que les NOUVEAUX fichiers sont là
3. Attendez 5 minutes (propagation DNS/CDN)
4. Testez en navigation privée
5. Videz cache navigateur plusieurs fois

### Problème : "Upload très lent"

**Solution :**
- Utilisez FileZilla plutôt que FTP Web
- Connexion internet stable requise
- L'upload de 40+ fichiers peut prendre 5-10 minutes

---

## 📞 SUPPORT

**IONOS :**
- Tel : 0970 808 911 (France)
- Chat : https://www.ionos.fr/assistance/chat
- Email : Via panel client

**Cloudflare :**
- Dashboard → Icône chat (coin bas-droit)
- Community : https://community.cloudflare.com/

---

## 📊 INFORMATIONS TECHNIQUES

**Ancien build :**
- index.html → index.css, index.js

**Nouveau build :**
- index.html → index-C5dJXCO4.js, index-xp3--mS4.css

**Vite génère des noms avec hash** pour le cache busting. C'est normal et voulu.

**Taille totale du build :**
- ~1.2 MB (non compressé)
- ~300 KB (compressé avec gzip)

---

Date : 6 octobre 2025
Version : 1.0.1
Build prêt dans : `/dist/`

**🎯 ACTION IMMÉDIATE : UPLOAD FTP MAINTENANT !**
