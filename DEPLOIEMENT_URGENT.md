# DEPLOIEMENT URGENT - Correction Espace Prospect

## Problème identifié
Le serveur cherche un ancien fichier JS (`page-espaceprospect-BC3mofnw.js`) qui n'existe plus. Le nouveau build a généré `page-espaceprospect-ElvxzADo.js`.

## Solution : Déploiement complet du dossier /dist

### Étape 1 : Upload sur IONOS
1. Connectez-vous à votre hébergement IONOS
2. Supprimez **COMPLÈTEMENT** le contenu actuel du répertoire web (public_html ou www)
3. Uploadez **TOUT** le contenu du dossier `/dist` vers le serveur

### Étape 2 : Vérification
Après upload, vérifiez que ces fichiers existent sur le serveur :
- `/assets/page-espaceprospect-ElvxzADo.js` ✅
- `/index.html` (doit contenir la référence à ElvxzADo.js)
- `/sw.js` (Service Worker mis à jour)

### Étape 3 : Clear cache
Après le déploiement :
1. Videz le cache du navigateur (Ctrl+Shift+Delete)
2. Rechargez la page avec Ctrl+F5 (force refresh)
3. Si le problème persiste, ouvrez le site en mode navigation privée

## Fichiers critiques à vérifier

```
dist/
├── index.html (fichier principal avec nouvelles références)
├── sw.js (Service Worker)
├── workbox-4b126c97.js
└── assets/
    ├── page-espaceprospect-ElvxzADo.js ← NOUVEAU
    ├── index-q12AIFlN.js
    ├── vendor-react-DS37DYWq.js
    ├── vendor-supabase-CkV9a3tp.js
    └── ... (tous les autres assets)
```

## Commande rapide pour créer l'archive
```bash
cd /tmp/cc-agent/61788020/project
tar -czf taxiassur-deploy-$(date +%Y%m%d-%H%M).tar.gz -C dist .
```

## Note importante
Le problème vient du fait que :
1. Les hashes de fichiers changent à chaque build pour le cache-busting
2. L'ancien `index.html` référence les anciens hashes
3. Il faut TOUJOURS uploader l'index.html ET le dossier assets ensemble

## Test après déploiement
URL à tester : `https://taxiassur.com/espace-prospect/[TOKEN]`

Le token est visible dans l'URL de la capture d'écran :
`9ea9aa10237ca1f0db56449a566b82253d1fc406ab16304e8e1c79a737228732`
