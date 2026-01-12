# 📤 Guide d'upload avec FileZilla (le plus simple)

## 1. Téléchargez FileZilla

Si vous n'avez pas FileZilla :
- 🌐 https://filezilla-project.org/download.php?type=client
- Téléchargez la version "Client" (gratuit)
- Installez-le normalement

## 2. Récupérez vos identifiants FTP IONOS

Dans votre espace IONOS :
1. Connectez-vous à votre compte IONOS
2. Allez dans **"Hébergement"** → **"Accès FTP"**
3. Notez :
   - **Hôte** : ftp.votre-domaine.com ou une IP
   - **Nom d'utilisateur** : votre login FTP
   - **Mot de passe** : votre mot de passe FTP
   - **Port** : 21 (FTP) ou 22 (SFTP)

## 3. Connectez-vous avec FileZilla

### Méthode rapide (Quickconnect) :

Dans FileZilla, en haut :
```
┌─────────────────────────────────────────────────────────────┐
│ Hôte: ftp.taxiassur.com  Nom: votre_login  MdP: ••••••      │
│ Port: 21                                    [Connexion rapide]│
└─────────────────────────────────────────────────────────────┘
```

Cliquez sur **"Connexion rapide"**

### Méthode avec gestionnaire de sites (recommandé) :

1. **Fichier** → **Gestionnaire de sites**
2. Cliquez sur **"Nouveau site"**
3. Nommez-le "IONOS - TaxiAssur"
4. Remplissez :
   ```
   Protocole : FTP
   Hôte : ftp.taxiassur.com
   Port : 21
   Type d'authentification : Normale
   Identifiant : votre_login
   Mot de passe : votre_mot_de_passe
   ```
5. Cliquez sur **"Connexion"**

## 4. Naviguez vers le bon dossier

Une fois connecté, dans le **panneau de droite** (serveur distant) :
- Trouvez le dossier `/public_html` ou `/htdocs` ou `/www`
- C'est la racine de votre site web
- Double-cliquez dessus

## 5. Uploadez le contenu de /dist

Dans le **panneau de gauche** (ordinateur local) :
- Naviguez jusqu'au dossier du projet
- Ouvrez le dossier `/dist`
- Vous devez voir : `index.html`, dossier `assets`, etc.

### IMPORTANT : Uploader TOUT le contenu

**SÉLECTIONNEZ TOUT** dans le dossier `/dist` :
```
✓ index.html
✓ dossier assets/
✓ dossier api/
✓ dossier content/
✓ .htaccess
✓ test-prospect-access.html
✓ tous les autres fichiers
```

**Méthode 1 - Glisser-déposer :**
- Sélectionnez tout (Ctrl+A)
- Glissez vers le panneau de droite (serveur)

**Méthode 2 - Menu contextuel :**
- Clic droit sur la sélection
- **"Envoyer"** ou **"Upload"**

### ⚠️ ÉCRASEZ les fichiers existants

Quand FileZilla demande :
```
┌────────────────────────────────────────┐
│ Le fichier existe déjà                 │
│ Écraser ? [Oui] [Non] [Oui pour tout]│
└────────────────────────────────────────┘
```

→ Cochez **"Oui pour tout"** et **"Toujours effectuer cette action"**

## 6. Attendez la fin du transfert

En bas de FileZilla, vous verrez :
```
📁 File d'attente : 150 fichiers
⏳ Transfert en cours...
✅ Transferts réussis : 150
```

**Attendez que tout soit à 0 et que tous les transferts soient terminés**

## 7. Vérifiez que les fichiers sont bien uploadés

Dans le panneau de droite (serveur), vérifiez :
```
✓ /index.html               (date récente)
✓ /assets/page-prospectdocuments-DrF6DFce.js
✓ /test-prospect-access.html (nouveau)
✓ /.htaccess                (date récente)
```

**IMPORTANT : Vérifiez la date de modification**
- Si c'est aujourd'hui → OK
- Si c'est une vieille date → le fichier n'a pas été écrasé

## 8. Testez immédiatement

### Test 1 - Page de diagnostic

Ouvrez dans votre navigateur :
```
https://taxiassur.com/test-prospect-access.html
```

**Ce que vous devez voir :**
```
✅ Accès réussi !
Nom: TONY CERDA
Email: tcerda@xcr.fr
```

### Test 2 - Vraie page documents

```
https://taxiassur.com/prospect/documents/abad70754f988c31533bfa8ce962a4ce4f7f15c1a547fdf4f9a2bf099fd98912
```

**Ce que vous devez voir :**
```
🚕 Espace Documents
Bonjour TONY
```

**PAS d'erreur "Accès refusé"**

## 9. Si ça ne marche pas

### Problème : "Accès refusé" persiste

**Solution 1 : Videz le cache**
```
Chrome/Edge : Ctrl + Shift + R
Firefox : Ctrl + Shift + R
Safari : Cmd + Option + R
```

**Solution 2 : Navigation privée**
- Ouvrez le lien en navigation privée
- Ctrl + Shift + N (Chrome)
- Ctrl + Shift + P (Firefox)

**Solution 3 : Vérifiez le hash du fichier**

Ouvrez la console (F12) → onglet Network → recherchez "prospectdocuments"
- Si vous voyez `DrF6DFce` → le nouveau build est chargé ✅
- Si vous voyez un autre hash → le cache n'est pas vidé ❌

### Problème : Le fichier n'apparaît pas sur le serveur

**Vérifiez les permissions :**
- Clic droit sur le fichier → Permissions
- Doit être 644 (rw-r--r--)

**Vérifiez le dossier :**
- Vous devez être dans `/public_html` ou équivalent
- PAS dans un sous-dossier

### Problème : Connexion FTP impossible

**Vérifiez le pare-feu :**
- Le port 21 doit être ouvert

**Essayez SFTP :**
- Port : 22 au lieu de 21
- Protocole : SFTP au lieu de FTP

**Demandez à IONOS :**
- Support technique IONOS
- Demandez les paramètres FTP corrects

---

## 🎯 Checklist finale

- [ ] FileZilla installé
- [ ] Connecté au serveur IONOS
- [ ] Dossier `/dist` entièrement uploadé
- [ ] Fichiers écrasés (dates récentes)
- [ ] Cache navigateur vidé
- [ ] Test 1 : `/test-prospect-access.html` ✅
- [ ] Test 2 : `/prospect/documents/[token]` affiche "Bonjour TONY" ✅

---

## 📞 Besoin d'aide ?

Si vous bloquez :
1. Prenez une capture d'écran de FileZilla (les 2 panneaux)
2. Prenez une capture d'écran de l'erreur dans le navigateur
3. Ouvrez la console (F12) et copiez les erreurs
