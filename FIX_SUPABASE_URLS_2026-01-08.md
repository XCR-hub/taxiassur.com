# Fix Supabase URLs - 2026-01-08

## 🎯 Problème Identifié

L'erreur "Failed to fetch" était causée par l'utilisation d'une **ancienne URL Supabase** hardcodée dans les fichiers HTML de test.

### Ancienne URL (obsolète)
```
https://xxunrkyfavznfoxfqgci.supabase.co
```

### Nouvelle URL (correcte)
```
https://drohhxrkoequjphvabvq.supabase.co
```

## ✅ Corrections Appliquées

### Fichiers Corrigés

Les fichiers suivants ont été mis à jour pour utiliser la bonne URL Supabase:

1. **public/test-auth-diagnostic.html** - Maintenant charge `env-config.js` dynamiquement
2. **public/reset-admin-password.html** - URL corrigée
3. **public/test-admin-login.html** - URL corrigée
4. **public/test-crm-leads.html** - URL corrigée
5. **public/test-email-ionos.html** - URL corrigée
6. **public/test-hunter-scan.html** - URL corrigée
7. **public/test-login-direct.html** - URL corrigée

### Script de Correction

Un script `fix-supabase-urls.sh` a été créé pour automatiser les corrections futures.

## 🚀 Déploiement

### 1. Build Réalisé
```bash
npm run build
```

**Résultat**: 3.5 MB, 84 fichiers générés

### 2. Fichier Prêt à Uploader
```
dist-ready-to-upload.zip (758 KB)
```

### 3. Instructions d'Upload

#### Via FTP/SFTP (Recommandé)
1. Connectez-vous à IONOS via FileZilla
2. Accédez au dossier racine du site
3. Supprimez l'ancien contenu (sauvegardez d'abord)
4. Uploadez tout le contenu du dossier `dist/`
5. Videz le cache CDN si activé

#### Via Gestionnaire Web IONOS
1. Connectez-vous à l'espace client IONOS
2. Gestionnaire de fichiers → Supprimer ancien contenu
3. Uploader le nouveau contenu

## ⚙️ Configuration Supabase Requise

### CORS (Critical!)

Pour que taxiassur.com puisse se connecter à Supabase, il faut ajouter le domaine dans les paramètres CORS:

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet: `drohhxrkoequjphvabvq`
3. **Settings** → **API** → **URL Configuration**
4. Ajoutez dans **Site URL**: `https://taxiassur.com`
5. Ajoutez dans **Redirect URLs**:
   - `https://taxiassur.com`
   - `https://taxiassur.com/backoffice`
   - `https://taxiassur.com/admin`

### Configuration Auth

Dans **Authentication** → **URL Configuration**:
- **Site URL**: `https://taxiassur.com`
- **Redirect URLs**: Ajoutez toutes les URLs ci-dessus

## 🧪 Tests Après Déploiement

### 1. Test Basique
```
https://taxiassur.com/test-auth-diagnostic.html
```

**Attendu**:
- ✅ URL Supabase affichée: `https://drohhxrkoequjphvabvq.supabase.co`
- ✅ Client Supabase initialisé
- ✅ Connexion réussie avec `master@taxiassur.com`

### 2. Test Login Admin
```
https://taxiassur.com/backoffice
```

**Credentials**:
- Email: `master@taxiassur.com`
- Password: `TaxiAssur2025!,&`

### 3. Test Formulaire Lead
```
https://taxiassur.com
```

**Action**: Remplir le formulaire et vérifier que le lead arrive dans le CRM

## 🔍 Diagnostic des Erreurs

### Si "Failed to fetch" persiste:

1. **Vérifier CORS dans Supabase** (voir section ci-dessus)
2. **Vider le cache**:
   - Navigateur: Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
   - CDN IONOS: Via l'espace client
3. **Vérifier les variables d'environnement** sur `/env-config.js`:
   ```javascript
   window.ENV_CONFIG.VITE_SUPABASE_URL
   window.ENV_CONFIG.VITE_SUPABASE_ANON_KEY
   ```

### Si "Network Error":
- Vérifier que le domaine est bien pointé vers IONOS
- Vérifier les DNS
- Vérifier le certificat SSL

## 📝 Notes Importantes

1. **Toujours utiliser `env-config.js`** au lieu de hardcoder les URLs
2. **Ne jamais commiter les clés API** dans le code
3. **Vérifier CORS** avant chaque nouveau domaine
4. **Tester localement** avant de déployer en production

## ✅ Checklist Finale

- [x] URLs Supabase corrigées dans tous les fichiers HTML
- [x] Build réussi (3.5 MB, 84 fichiers)
- [x] ZIP créé pour upload (758 KB)
- [ ] Upload sur IONOS
- [ ] Configuration CORS Supabase
- [ ] Test connexion admin
- [ ] Test formulaire lead
- [ ] Vidage cache CDN

## 🆘 Support

En cas de problème, vérifier dans cet ordre:

1. Console navigateur (F12) → Erreurs réseau
2. Supabase Dashboard → Logs
3. Variables env-config.js
4. Configuration CORS Supabase
5. Certificat SSL du domaine
