# Instructions de déploiement sur IONOS

## Date: 17 janvier 2026 - 01h00
## Modifications: Correction UTF-8 des emails + Timeline des échanges

---

## Fichiers modifiés
- `backoffice-crm-B7D6hcTe.js` (483KB) - Contient toutes les corrections UTF-8 et la Timeline
- Tous les fichiers du dossier `/dist` (3.7MB)

---

## Étapes de déploiement

### 1. Connexion IONOS
- Connectez-vous à votre compte IONOS
- Accédez au gestionnaire de fichiers ou utilisez un client FTP (FileZilla recommandé)

### 2. Upload des fichiers
**Option A: Via le panneau IONOS**
1. Accédez à "Sites Web & Domaines" > "Gestionnaire de fichiers"
2. Naviguez vers le dossier racine de taxiassur.com
3. Supprimez TOUS les anciens fichiers (sauf .htaccess si présent)
4. Uploadez TOUT le contenu du dossier `/dist` local

**Option B: Via FTP (FileZilla)**
1. Connectez-vous avec vos identifiants FTP IONOS
2. Dans le panneau local, naviguez vers: `/tmp/cc-agent/61788020/project/dist`
3. Dans le panneau distant, naviguez vers la racine de votre site
4. Sélectionnez TOUS les fichiers du dossier dist local
5. Glissez-déposez vers le serveur distant
6. Confirmez l'écrasement de tous les fichiers existants

### 3. Vérification du déploiement
Après l'upload, vérifiez que ces fichiers sont présents sur le serveur:
```
/index.html
/assets/backoffice-crm-B7D6hcTe.js
/assets/index-C7OfbIoc.js
/api/
/content/
/feeds/
```

### 4. Nettoyage du cache
**Sur votre navigateur:**
1. Ouvrez la page taxiassur.com/backoffice
2. Appuyez sur `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
3. Ou: DevTools (F12) > Network > Cochez "Disable cache"
4. Rechargez la page

**Vérification que c'est la bonne version:**
- Ouvrez la console (F12)
- Vous devriez voir des logs comme: `[CommunicationTimeline] Loading timeline for lead: ...`
- Dans l'onglet Network, vérifiez que `backoffice-crm-B7D6hcTe.js` est bien chargé

### 5. Test des modifications
1. Ouvrez un lead dans le CRM
2. Allez dans l'onglet "Historique" - Les emails doivent maintenant afficher des caractères français corrects
3. Vérifiez la section "Timeline des échanges" - Elle doit afficher le nombre d'interactions au lieu de "0"

---

## Corrections appliquées

### Correction UTF-8
- Ã© → é
- Ã  → à
- Jâai → J'ai
- câest → c'est
- Et plus de 20 autres patterns

### Timeline des échanges
- Chargement automatique des emails depuis `email_messages`
- Affichage des pièces jointes
- Filtres par type (Email, SMS, WhatsApp, Appels)
- Logs de débogage pour diagnostiquer les problèmes

---

## En cas de problème

Si après upload les modifications ne sont pas visibles:

1. **Vérifiez les logs navigateur (F12 > Console)**
   - Cherchez des erreurs 404
   - Vérifiez que `backoffice-crm-B7D6hcTe.js` se charge

2. **Vérifiez les fichiers sur le serveur**
   - Confirmez que la date de modification est récente
   - Vérifiez la taille du fichier (doit être ~483KB)

3. **Cache serveur IONOS**
   - IONOS peut avoir un cache CDN
   - Allez dans le panneau IONOS > "Performance" > "Vider le cache"

4. **Service Worker**
   - Ouvrez DevTools > Application > Service Workers
   - Cliquez sur "Unregister"
   - Rechargez la page

---

## Commandes utiles

Si vous devez refaire un build local:
```bash
npm run build
```

Si vous utilisez le déploiement automatique:
```bash
npm run auto-deploy
```

---

## Support

Si les problèmes persistent après avoir suivi ces étapes, fournissez:
1. Une capture d'écran de la console (F12)
2. Une capture d'écran de l'onglet Network montrant les fichiers chargés
3. La sortie de la commande dans le panneau IONOS
