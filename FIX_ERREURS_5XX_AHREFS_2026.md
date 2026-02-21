# FIX Erreurs 5XX Ahrefs - 21 février 2026

## 🐛 Problème identifié

Ahrefs a détecté **66 erreurs 5XX** (502 Bad Gateway et 504 Gateway Timeout) sur taxiassur.com :

### Types d'erreurs
- **502 Bad Gateway** : 60+ pages (blog, villes, pages principales)
- **504 Gateway Timeout** : 6 pages (flotte-vehicules, reviews, etc.)

### Pages affectées
- Pages blog : `/blog/*`
- Pages villes : `/ville/*` et `/assurance-taxi-[ville]`
- Pages principales : `/faq`, `/blog`, `/villes`, `/plan-du-site`, etc.
- Espace backoffice : `/backoffice`

## ✅ Cause racine identifiée

Le fichier `.htaccess` n'était **PAS présent** dans le dossier `dist/` après le build.

**Conséquence** : Apache ne savait pas comment router les URLs React Router vers `index.html`, causant les erreurs 502/504.

## 🔧 Corrections appliquées

### 1. Copie manuelle du .htaccess
```bash
cp public/.htaccess dist/.htaccess
```

### 2. Vérification du script de build
Le script `copy:api` dans `package.json` était correct mais utilisait `|| true` qui masquait les erreurs silencieusement.

```json
"copy:api": "mkdir -p dist/api dist/content dist/feeds dist/webhooks &&
  cp -r public/api/. dist/api/ 2>/dev/null || true &&
  cp -r public/content/. dist/content/ 2>/dev/null || true &&
  cp -r public/feeds/. dist/feeds/ 2>/dev/null || true &&
  cp -r public/webhooks/. dist/webhooks/ 2>/dev/null || true &&
  cp public/.htaccess dist/.htaccess 2>/dev/null || true"
```

### 3. Contenu du .htaccess (fonctionnel)

Le fichier `.htaccess` configure :

#### ✅ Redirections SEO critiques
- Force HTTPS (301)
- Force non-www vers www (301)
- Supprime trailing slashes (301)

#### ✅ Routage React SPA
```apache
# Redirection pour React Router (SPA)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L,QSA]
```

#### ✅ Pages d'erreur personnalisées
```apache
ErrorDocument 404 /index.html
ErrorDocument 500 /index.html
ErrorDocument 502 /index.html
ErrorDocument 503 /index.html
ErrorDocument 504 /index.html
```

#### ✅ Security Headers
- CSP, X-Frame-Options, HSTS, etc.

#### ✅ Cache et compression
- Expires headers optimisés
- GZIP compression

## 📋 Checklist de déploiement

Avant chaque déploiement sur IONOS :

### 1. Build local
```bash
npm run build
```

### 2. Vérifier les fichiers critiques
```bash
# Vérifier .htaccess
test -f dist/.htaccess && echo "✓ .htaccess OK" || echo "✗ .htaccess MANQUANT"

# Vérifier index.html
test -f dist/index.html && echo "✓ index.html OK" || echo "✗ index.html MANQUANT"

# Vérifier assets
test -d dist/assets && echo "✓ assets/ OK" || echo "✗ assets/ MANQUANT"
```

### 3. Vérifier le contenu du .htaccess
```bash
# Doit contenir la règle de routage React
grep -q "RewriteRule.*index.html" dist/.htaccess && echo "✓ Routing OK" || echo "✗ Routing MANQUANT"
```

### 4. Upload sur IONOS
- Uploader **tout le contenu** du dossier `dist/` vers la racine web
- **IMPORTANT** : S'assurer que `.htaccess` est bien uploadé (fichiers cachés)
- Vérifier les permissions : `.htaccess` doit être lisible (644)

### 5. Test post-déploiement
```bash
# Tester quelques URLs
curl -I https://taxiassur.com/blog
curl -I https://taxiassur.com/ville/paris
curl -I https://taxiassur.com/faq
```

Toutes doivent retourner **200 OK**, pas 502/504.

## 🚀 Déploiement immédiat

### Sur IONOS
1. Connectez-vous au FTP IONOS
2. Allez dans le dossier racine web (généralement `/`)
3. Uploadez **tout le contenu** de `dist/` (pas le dossier dist lui-même)
4. **VÉRIFIEZ** que `.htaccess` est bien présent à la racine

### Commandes FTP
```bash
# Avec lftp
lftp -u USERNAME,PASSWORD ftp.taxiassur.com
lcd /tmp/cc-agent/61788020/project/dist
cd /
mirror -R --delete --verbose
```

## 📊 Résultats attendus

Une fois déployé correctement :
- ✅ **0 erreurs 5XX** dans Ahrefs (au lieu de 66)
- ✅ Toutes les pages accessibles (200 OK)
- ✅ React Router fonctionne correctement
- ✅ SEO canonique respecté (redirections 301)
- ✅ Cache et compression optimaux

## 🔍 Vérification Ahrefs

Après déploiement, lancez un nouveau crawl Ahrefs :
1. Site Audit → New crawl
2. Attendre 24-48h pour le nouveau rapport
3. Vérifier que les erreurs 5XX ont disparu

## 📝 Notes importantes

1. **Fichiers cachés** : Le `.htaccess` commence par un point, il peut être caché dans certains clients FTP
2. **Permissions** : `.htaccess` doit avoir les permissions 644
3. **Module Apache** : `mod_rewrite` doit être activé sur le serveur IONOS
4. **Cache navigateur** : Vider le cache après déploiement pour tester

## ⚠️ Prévention future

Pour éviter ce problème à l'avenir :

1. **Toujours vérifier** la présence du .htaccess après build
2. **Script de vérification** automatique avant déploiement
3. **Tests automatisés** des URLs principales après déploiement
4. **Monitoring** : Configurer une alerte si erreurs 5XX détectées

## 📞 Support

En cas de problème persistant après déploiement :
1. Vérifier les logs Apache sur IONOS
2. Tester en local avec `npm run preview`
3. Vérifier la configuration Apache (mod_rewrite activé)
4. Contacter le support IONOS si nécessaire
