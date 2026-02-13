# 🚨 DÉPLOIEMENT URGENT - CORRECTION ESPACE PROSPECT

## Problème Identifié

L'espace prospect cherche le fichier `page-espaceprospect-DYd5dnNt.js` mais le nouveau build a généré `page-espaceprospect-COtDDKvi.js`.

**Cause**: Build obsolète sur le serveur IONOS.

## ✅ Solution Immédiate (3 méthodes)

### Méthode 1 : SFTP Automatique (Recommandé) ⚡

```bash
# Installer lftp si nécessaire
# sudo apt-get install lftp (Linux)
# brew install lftp (Mac)

# Déployer automatiquement
npm run auto-deploy
```

### Méthode 2 : Upload Manuel via FileZilla 📁

1. **Télécharger l'archive**
   ```bash
   # L'archive est prête dans le dossier projet :
   # dist-deploy-20260213-0919.tar.gz (17MB)
   ```

2. **Se connecter à IONOS via SFTP**
   - Hôte : `home749874859.1and1-data.host`
   - Port : `22`
   - Protocole : `SFTP`
   - Utilisateur : `acc1591324770`
   - Mot de passe : `TAXIassur2025!,&`

3. **Uploader**
   - Extraire l'archive localement
   - Uploader TOUT le contenu du dossier `dist/` vers le dossier racine web sur IONOS
   - Remplacer tous les fichiers existants

4. **Vider les caches**
   - Navigateur : CTRL + SHIFT + R (forcer le rechargement)
   - Vider le cache IONOS si disponible dans le panel

### Méthode 3 : Ligne de Commande SFTP 📤

```bash
# Créer un script de déploiement temporaire
cat > deploy.sh << 'SCRIPT'
#!/bin/bash
cd dist
sftp -P 22 acc1591324770@home749874859.1and1-data.host << 'SFTP'
cd /
put -r *
bye
SFTP
SCRIPT

chmod +x deploy.sh
./deploy.sh
```

## 🔍 Vérification Post-Déploiement

1. **Vider le cache navigateur**
   ```
   Chrome/Edge : CTRL + SHIFT + DELETE
   Firefox : CTRL + SHIFT + DELETE
   Safari : CMD + OPTION + E
   ```

2. **Tester l'espace prospect**
   - Aller sur : https://taxiassur.com/espace-prospect/[TOKEN]
   - Le fichier chargé doit être : `page-espaceprospect-COtDDKvi.js`

3. **Vérifier dans la console navigateur (F12)**
   - Onglet Network
   - Chercher `page-espaceprospect`
   - Doit charger : `page-espaceprospect-COtDDKvi.js` (Status 200)

## 📊 Fichiers du Dernier Build

```
dist/
├── index.html (4.03 kB) ⭐ CRITIQUE
├── assets/
│   ├── page-espaceprospect-COtDDKvi.js (18.67 kB) ⭐ NOUVEAU
│   ├── vendor-react-DigZqvBx.js (271.21 kB)
│   ├── backoffice-crm-BP_PHHQs.js (414.15 kB)
│   └── ... (tous les autres assets)
├── api/ (dossier complet)
├── content/ (dossier complet)
└── feeds/ (dossier complet)
```

## ⚠️ Points Critiques

1. **NE PAS oublier index.html**
   - C'est le fichier qui référence tous les bundles JavaScript
   - Sans lui, les nouveaux hashes ne seront pas reconnus

2. **Vider TOUS les caches**
   - Cache navigateur : CTRL + SHIFT + R
   - Cache CDN IONOS (si activé)
   - Service Worker : Navigation privée pour tester

3. **Déployer TOUT le dossier dist/**
   - Pas seulement les fichiers modifiés
   - Tous les assets doivent être synchronisés

## 🆘 Si le Problème Persiste

1. **Vérifier les fichiers sur le serveur**
   ```bash
   # Se connecter en SFTP et vérifier
   ls -la assets/page-espaceprospect-*.js
   ls -la index.html
   ```

2. **Forcer le rechargement**
   ```
   # Ouvrir en navigation privée
   # Ou ajouter ?v=timestamp à l'URL
   ```

3. **Contacter le support IONOS**
   - Demander de vider le cache CDN
   - Vérifier les logs d'erreur 404

---

**Date du build** : 13/02/2026 09:19  
**Fichier correct** : `page-espaceprospect-COtDDKvi.js`  
**Archive prête** : `dist-deploy-20260213-0919.tar.gz` (17MB)
