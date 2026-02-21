# 🚀 Guide de déploiement URGENT - Fix erreurs 5XX

## ⚡ Déploiement rapide (5 minutes)

### 1️⃣ Build local

```bash
npm run build
```

✅ Le script vérifie automatiquement que tous les fichiers sont présents (notamment `.htaccess`)

### 2️⃣ Upload sur IONOS

#### Option A : Via FileZilla (recommandé)

1. **Ouvrir FileZilla**
2. **Se connecter au serveur IONOS**
   - Hôte : `ftp.taxiassur.com` (ou l'adresse FTP IONOS)
   - Utilisateur : Votre login IONOS
   - Mot de passe : Votre mot de passe IONOS
   - Port : 21

3. **Aller dans le dossier racine web**
   - Généralement `/` ou `/html` ou `/public_html`

4. **Uploader le contenu de `dist/`**
   - ⚠️ **IMPORTANT** : Uploader le CONTENU de `dist/`, pas le dossier lui-même
   - Sélectionner TOUS les fichiers dans `dist/`
   - Clic droit → Upload
   - **Écraser les fichiers existants**

5. **Vérifier que `.htaccess` est bien uploadé**
   - Dans FileZilla : Menu → Serveur → Forcer l'affichage des fichiers cachés
   - Vérifier que `.htaccess` apparaît à la racine
   - Si absent : uploader manuellement `dist/.htaccess`

#### Option B : Via ligne de commande (lftp)

```bash
# Installer lftp si nécessaire
# macOS: brew install lftp
# Ubuntu: sudo apt-get install lftp

# Se connecter et uploader
lftp -u USERNAME,PASSWORD ftp.taxiassur.com
cd /
lcd dist/
mirror -R --delete --verbose --exclude-glob .git*
quit
```

### 3️⃣ Tester le déploiement

```bash
# Test automatique
node scripts/test-deployment.js https://taxiassur.com

# OU test manuel avec curl
curl -I https://taxiassur.com
curl -I https://taxiassur.com/blog
curl -I https://taxiassur.com/ville/paris
```

✅ Toutes les URLs doivent retourner **200 OK** ou **301/302** (redirect)
❌ Aucune ne doit retourner **502** ou **504**

---

## 🔍 Vérifications post-déploiement

### Checklist immédiate

- [ ] `.htaccess` présent à la racine du serveur
- [ ] `index.html` présent à la racine
- [ ] Dossier `assets/` présent avec JS et CSS
- [ ] `robots.txt` et `sitemap.xml` présents
- [ ] Page d'accueil accessible (https://taxiassur.com)
- [ ] Pages blog accessibles (/blog)
- [ ] Pages villes accessibles (/ville/paris)

### Test manuel rapide

Ouvrir dans le navigateur :
1. https://taxiassur.com
2. https://taxiassur.com/blog
3. https://taxiassur.com/faq
4. https://taxiassur.com/ville/paris

Toutes doivent s'afficher sans erreur 502/504.

---

## 🐛 Dépannage

### Problème : Pages retournent toujours 502/504

**Cause probable** : `.htaccess` absent ou mal configuré

**Solution** :
1. Vérifier que `.htaccess` est présent sur le serveur
2. Vérifier les permissions : `chmod 644 .htaccess`
3. Vérifier que `mod_rewrite` est activé sur Apache
4. Vider le cache du navigateur

### Problème : `.htaccess` non visible dans FTP

**Cause** : Fichiers cachés masqués

**Solution** :
- **FileZilla** : Serveur → Forcer l'affichage des fichiers cachés
- **Autre client FTP** : Activer "Afficher les fichiers cachés"
- **En dernier recours** : Renommer `.htaccess` en `htaccess.txt` localement, uploader, puis renommer sur le serveur

### Problème : Erreur 500 au lieu de 502/504

**Cause probable** : Erreur de syntaxe dans `.htaccess`

**Solution** :
1. Vérifier les logs Apache sur IONOS
2. Tester le `.htaccess` localement
3. Commenter progressivement les lignes jusqu'à trouver la ligne problématique

### Problème : Redirections infinies

**Cause probable** : Conflit entre règles de redirection

**Solution** :
1. Vérifier que les règles HTTPS et non-www ne créent pas de boucle
2. Tester avec `curl -L https://taxiassur.com` (suit les redirections)
3. Vérifier dans les DevTools (onglet Network)

---

## 📞 Support IONOS

Si le problème persiste après déploiement :

1. **Vérifier mod_rewrite** :
   ```
   Contacter le support IONOS pour vérifier que mod_rewrite est activé
   ```

2. **Consulter les logs Apache** :
   ```
   Les logs sont généralement dans le panneau IONOS
   Aller dans : Hébergement → Logs → Logs d'erreurs
   ```

3. **Tester la configuration Apache** :
   ```
   Demander au support IONOS de vérifier la config Apache
   ```

---

## 📊 Suivi Ahrefs

Après déploiement réussi :

1. **Attendre 24-48h** pour que les crawlers Ahrefs repassent
2. **Lancer un nouveau crawl** dans Site Audit
3. **Vérifier la disparition des erreurs 5XX**

Les **66 erreurs 5XX** devraient disparaître complètement.

---

## ✅ Résumé de la solution

Le problème était simple : **le fichier `.htaccess` n'était pas déployé**.

Sans `.htaccess`, Apache ne savait pas comment router les URLs React Router, causant les erreurs 502 Bad Gateway et 504 Gateway Timeout.

La solution : **toujours vérifier que `.htaccess` est présent après le build et bien uploadé sur le serveur**.

Le script `verify-build.js` fait maintenant cette vérification automatiquement à chaque build.

---

## 🎯 Pour les prochains déploiements

**Commande unique** pour build + vérification :

```bash
npm run build
```

Cette commande fait automatiquement :
1. ✓ Build Vite
2. ✓ Copie des fichiers API/content
3. ✓ Copie du .htaccess
4. ✓ Vérification de tous les fichiers critiques

Si la commande réussit, le build est **100% prêt pour le déploiement**.
