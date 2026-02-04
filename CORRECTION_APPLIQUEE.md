# Correction appliquée - Accès Espace Prospect

## Problème résolu

1. **Erreur de récursion infinie RLS** : Corrigée dans la base de données
2. **Fichiers JS avec anciens hash** : Nouveau build créé avec .htaccess optimisé
3. **Cache du navigateur** : Configuration mise à jour pour éviter ce problème à l'avenir

## Corrections en base de données

- Suppression des politiques RLS récursives sur `admin_users`
- Création de la fonction helper `is_admin()` avec SECURITY DEFINER
- Mise à jour de toutes les politiques pour utiliser `is_admin()`
- Les fonctions RPC `get_lead_by_token`, `get_prospect_documents_by_token` et `upload_prospect_document_by_token` fonctionnent correctement

## Modifications fichiers

### 1. .htaccess mis à jour
Ajout de règles pour ne pas cacher `index.html` :
```apache
<FilesMatch "index\.html$">
    ExpiresDefault "access plus 0 seconds"
    Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
    Header set Pragma "no-cache"
</FilesMatch>
```

### 2. Build complet effectué
Tous les fichiers sont à jour avec les nouveaux hash :
- ✅ `page-espaceprospect-ElvxzADo.js` (nouveau)
- ✅ Service Worker mis à jour
- ✅ index.html avec références correctes

## ÉTAPES DE DÉPLOIEMENT IMMÉDIAT

### Option 1 : Upload manuel via FTP (recommandé)
1. Téléchargez l'archive : `/tmp/cc-agent/61788020/project/dist-deploy-latest.tar.gz` (12MB)
2. Connectez-vous à votre hébergement IONOS via FTP
3. **IMPORTANT** : Supprimez TOUT le contenu du répertoire web actuel
4. Uploadez TOUT le contenu du dossier `dist/` vers votre serveur
5. Vérifiez que le fichier `.htaccess` est bien présent à la racine

### Option 2 : Si vous avez accès SSH
```bash
# Sur votre serveur IONOS
cd /chemin/vers/votre/site
rm -rf * .*
# Puis uploadez dist-deploy-latest.tar.gz et :
tar -xzf dist-deploy-latest.tar.gz
```

## Vérification post-déploiement

1. **Clear cache complet** :
   - Chrome : Ctrl+Shift+Delete → Cocher "Images et fichiers en cache"
   - Firefox : Ctrl+Shift+Delete → Cocher "Cache"
   - Safari : Commande+Option+E

2. **Test de l'URL** :
   ```
   https://taxiassur.com/espace-prospect/9ea9aa10237ca1f0db56449a566b82253d1fc406ab16304e8e1c79a737228732
   ```

3. **Vérification dans DevTools** :
   - F12 → Network → Vérifier que `page-espaceprospect-ElvxzADo.js` se charge (200 OK)
   - Console → Aucune erreur de chargement

## En cas de problème persistant

Si après le déploiement et le clear cache l'erreur persiste :

1. Ouvrez le site en **mode navigation privée**
2. Si ça fonctionne en privé = problème de cache local
3. Si ça ne fonctionne pas = vérifier que tous les fichiers sont bien uploadés

## Fichiers critiques à vérifier sur le serveur

```
/
├── index.html (doit contenir les nouveaux hash)
├── .htaccess (avec les nouvelles règles de cache)
├── sw.js (Service Worker)
└── assets/
    ├── page-espaceprospect-ElvxzADo.js ← DOIT EXISTER
    ├── index-q12AIFlN.js
    ├── vendor-react-DS37DYWq.js
    └── vendor-supabase-CkV9a3tp.js
```

## Support

Si le problème persiste après déploiement :
- Vérifiez les logs Apache sur IONOS
- Testez l'URL directe du fichier JS : `https://taxiassur.com/assets/page-espaceprospect-ElvxzADo.js`
- Contactez le support IONOS si le fichier n'est pas accessible

---

**Archive de déploiement prête** : `dist-deploy-latest.tar.gz` (12 MB)
