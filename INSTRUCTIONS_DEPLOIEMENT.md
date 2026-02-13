# 🚀 INSTRUCTIONS DE DÉPLOIEMENT URGENT

## 🔴 Problème

Le site cherche un ancien fichier JavaScript qui n'existe plus. Il faut déployer le nouveau build.

## ✅ SOLUTION RAPIDE (5 minutes)

### Option 1 : FileZilla (Recommandé pour les non-techniciens)

1. **Ouvrir FileZilla**

2. **Se connecter**
   ```
   Hôte     : sftp://home749874859.1and1-data.host
   Port     : 22
   User     : acc1591324770
   Password : TAXIassur2025!,&
   ```

3. **Uploader les fichiers**
   - Côté gauche : Naviguer vers le dossier `dist/` de votre projet
   - Côté droit : Aller à la racine du site web
   - Sélectionner TOUT le contenu de `dist/`
   - Glisser-déposer vers la droite
   - Confirmer le remplacement des fichiers existants
   - Attendre la fin de l'upload (environ 5 minutes)

4. **Vider le cache**
   - Dans le navigateur : CTRL + SHIFT + R
   - Ou ouvrir en navigation privée

5. **Tester**
   - Aller sur l'espace prospect
   - Ça doit fonctionner !

### Option 2 : Ligne de Commande (Pour les techniciens)

```bash
# 1. Aller dans le dossier du projet
cd /chemin/vers/le/projet

# 2. Vérifier que le dossier dist existe
ls -la dist/

# 3. Uploader via SFTP
sftp -P 22 acc1591324770@home749874859.1and1-data.host

# 4. Dans SFTP, taper ces commandes :
cd /
put -r dist/*
bye

# 5. Vider le cache navigateur
# Chrome : CTRL + SHIFT + DELETE
# Ou navigation privée
```

### Option 3 : Utiliser l'archive

```bash
# 1. L'archive est déjà prête : dist-deploy-latest.tar.gz (17MB)

# 2. Extraire l'archive
tar -xzf dist-deploy-latest.tar.gz

# 3. Uploader le contenu du dossier dist/ via FileZilla
# (voir Option 1 ci-dessus)
```

## 📝 Checklist de Vérification

- [ ] Tous les fichiers du dossier `dist/` sont uploadés
- [ ] Le fichier `index.html` est bien à jour sur le serveur
- [ ] Les fichiers dans `assets/` sont présents
- [ ] Le cache navigateur est vidé (CTRL + SHIFT + R)
- [ ] Test en navigation privée fonctionne
- [ ] L'espace prospect charge sans erreur

## ⚠️ IMPORTANT

**Ne PAS oublier** :
- ✅ Uploader TOUT le contenu de `dist/` (pas seulement quelques fichiers)
- ✅ Remplacer les fichiers existants
- ✅ Uploader le fichier `index.html` (critique !)
- ✅ Vider le cache après déploiement

## 🆘 Support

Si le problème persiste après le déploiement :

1. **Vérifier dans la console navigateur** (F12)
   - Onglet "Network"
   - Chercher les erreurs 404
   - Noter le nom exact du fichier recherché

2. **Vérifier sur le serveur SFTP**
   - Se connecter avec FileZilla
   - Aller dans le dossier `assets/`
   - Vérifier que `page-espaceprospect-COtDDKvi.js` existe

3. **Forcer le rechargement complet**
   - Ouvrir en navigation privée
   - Ajouter `?v=123` à la fin de l'URL

---

**Build date** : 13/02/2026 09:19
**Fichier correct** : `page-espaceprospect-COtDDKvi.js`
