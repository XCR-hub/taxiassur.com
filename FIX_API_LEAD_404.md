# CORRECTION API 404 - RÉSOLU ✅

## Problème
L'API `/api/lead.php` retournait une erreur 404 et du HTML au lieu de JSON.

## Cause Racine
Le fichier `.htaccess` principal redirigait TOUS les appels vers `index.html` (React Router SPA),
y compris les appels vers `/api/`, ce qui empêchait l'exécution des fichiers PHP.

## Corrections Appliquées

### 1. Exclusion des dossiers API dans `.htaccess`
**Fichier:** `public/.htaccess`

Ajout des exclusions suivantes avant la règle de redirection SPA:
```apache
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_URI} !^/webhooks/
RewriteCond %{REQUEST_URI} !\.php$
```

### 2. Configuration `.htaccess` pour le dossier API
**Fichier:** `public/api/.htaccess`

Déjà présent et correctement configuré:
- CORS headers activés
- Types MIME PHP configurés
- Protection des fichiers sensibles (config.php, load-env.php)

### 3. Automatisation de la copie
**Fichier:** `package.json`

Modification du script `copy:api` pour copier automatiquement le `.htaccess` principal:
```json
"copy:api": "... && cp public/.htaccess dist/.htaccess 2>/dev/null || true"
```

## Fichiers Modifiés
1. `/public/.htaccess` - Ajout exclusions API
2. `/package.json` - Script copy:api mis à jour

## Déploiement

### Étape 1: Build Local
```bash
npm run build
```

### Étape 2: Upload FTP vers IONOS
1. Connectez-vous à FileZilla
2. Uploadez TOUT le contenu du dossier `/dist/` vers la racine du site
3. Assurez-vous que ces dossiers sont présents:
   - `/api/` (avec tous les fichiers PHP + .htaccess)
   - `/webhooks/`
   - `/content/`
   - `/feeds/`
   - `.htaccess` (racine)

### Étape 3: Vérification
1. Testez l'API: `https://taxiassur.com/api/lead.php`
2. Vérifiez que le site fonctionne: `https://taxiassur.com`
3. Testez le formulaire de contact

## Tests à Effectuer Après Déploiement

### Test 1: API Lead
```bash
curl -X POST https://taxiassur.com/api/lead.php \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"0612345678","city":"Paris","status":"taxi"}'
```

**Résultat attendu:** JSON avec `{"ok": true}` ou `{"success": true}`

### Test 2: Site Web
Visitez: `https://taxiassur.com`
- Le site doit s'afficher normalement
- Les routes React doivent fonctionner (/contact, /blog, etc.)

### Test 3: Formulaire de Contact
1. Allez sur `https://taxiassur.com/contact`
2. Remplissez le formulaire
3. Soumettez
4. Vérifiez qu'aucune erreur 404 n'apparaît dans la console

## Vérifications de Sécurité

✅ Les fichiers sensibles sont protégés:
- `config.php` - Accès interdit
- `load-env.php` - Accès interdit
- `.env*` - Accès interdit

✅ CORS configuré correctement pour l'API

✅ Content-Type JSON forcé pour les fichiers PHP

## En Cas de Problème

### Problème: 404 persiste
**Solution:** Vérifiez que le `.htaccess` racine contient bien les exclusions:
```apache
RewriteCond %{REQUEST_URI} !^/api/
```

### Problème: 500 Internal Server Error
**Solution:** Vérifiez les permissions des fichiers PHP (644) et dossiers (755)
```bash
chmod 644 dist/api/*.php
chmod 755 dist/api/
```

### Problème: HTML retourné au lieu de JSON
**Solution:** Vérifiez que le `.htaccess` dans `/api/` est bien présent et contient:
```apache
AddHandler application/x-httpd-php .php
```

## Status
✅ Build réussi
✅ Fichiers copiés correctement
✅ Configurations Apache corrigées
⏳ En attente de déploiement IONOS

## Prochaine Étape
**DÉPLOYER** le contenu de `/dist/` vers IONOS via FTP.
