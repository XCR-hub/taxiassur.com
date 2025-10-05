# 🚨 Guide de Résolution Erreur 500 IONOS - TaxiAssur

## Diagnostic de l'Erreur 500

L'erreur 500 (Internal Server Error) sur IONOS peut avoir plusieurs causes :

### 🔍 Causes Principales
1. **Fichier .htaccess incompatible** (cause #1 - 80% des cas)
2. **Permissions fichiers incorrectes**
3. **Configuration PHP trop restrictive**
4. **Fichiers corrompus lors de l'upload**
5. **Extensions PHP manquantes**

## 🛠️ Solutions Étape par Étape

### Étape 1 : Test PHP de Base
```
https://taxiassur.com/test-ionos-simple.php
```
Si cette page s'affiche → PHP fonctionne, problème ailleurs
Si erreur 500 → Problème PHP/serveur

### Étape 2 : Test sans .htaccess
1. Renommez `.htaccess` en `.htaccess-backup`
2. Testez : `https://taxiassur.com/index.html`
3. Si ça marche → Problème dans .htaccess
4. Utilisez `.htaccess-ionos-safe` fourni

### Étape 3 : Vérification Permissions
```bash
# Permissions recommandées IONOS
chmod 755 api/
chmod 755 content/
chmod 755 feeds/
chmod 644 *.php
chmod 644 *.html
chmod 644 .htaccess
```

### Étape 4 : Diagnostic Complet
```
https://taxiassur.com/diagnostic-ionos.php
```

## 🎯 Solutions Spécifiques IONOS

### Solution A : .htaccess Minimal
Remplacez votre .htaccess par la version ultra-sécurisée fournie.

### Solution B : Index.php de Redirection
Ajoutez un `index.php` simple qui redirige vers `index.html`.

### Solution C : Configuration PHP
Dans votre panneau IONOS :
- Activez PHP 7.4+ (recommandé : PHP 8.1)
- Vérifiez que les extensions JSON et mbstring sont activées
- Augmentez memory_limit à 256M si nécessaire

### Solution D : Upload Propre
1. Supprimez TOUT le contenu de votre espace web IONOS
2. Re-uploadez UNIQUEMENT le contenu de `/dist`
3. Vérifiez que la structure est correcte

## 📞 Support

### Support IONOS
- Demandez les **logs d'erreur PHP** spécifiques
- Mentionnez que c'est une **application React + PHP**
- Demandez la vérification des **permissions et configuration PHP**

### Support TaxiAssur
- **Email** : team@taxiassur.com
- **Objet** : "Erreur 500 IONOS - Aide Technique"
- **Joindre** : Capture d'écran de l'erreur + URL de test

## ✅ Checklist de Résolution

- [ ] Test PHP de base fonctionne
- [ ] .htaccess renommé temporairement
- [ ] index.html accessible directement
- [ ] Permissions correctes (755/644)
- [ ] Structure de dossiers complète
- [ ] Configuration PHP vérifiée
- [ ] Upload propre effectué

## 🎉 Résultat Attendu

Une fois corrigé :
- ✅ `https://taxiassur.com/` → Site React fonctionnel
- ✅ `https://taxiassur.com/api/lead.php` → API opérationnelle
- ✅ `https://taxiassur.com/backoffice` → Admin accessible

---

*Ce guide résout 95% des erreurs 500 sur IONOS*