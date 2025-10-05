# 📧 Configuration Email IONOS - TaxiAssur

## 🎯 3 Méthodes de Configuration

### Méthode 1 : Panneau IONOS (Recommandé)

1. **Connectez-vous** à votre panneau IONOS
2. **Allez dans** : Hébergement → Votre domaine → Configuration PHP
3. **Ajoutez les variables** :

```
SMTP_HOST = smtp.ionos.fr
SMTP_PORT = 587
SMTP_USER = noreply@taxiassur.com
SMTP_PASS = VotreMotDePasseEmail
ADMIN_EMAIL_1 = commercial@xcr.fr
ADMIN_EMAIL_2 = tcerda@xcr.fr
```

### Méthode 2 : Fichier .htaccess

1. **Ouvrez** votre fichier `.htaccess`
2. **Ajoutez** ces lignes :

```apache
SetEnv SMTP_HOST "smtp.ionos.fr"
SetEnv SMTP_PORT "587"
SetEnv SMTP_USER "noreply@taxiassur.com"
SetEnv SMTP_PASS "VotreMotDePasseEmail"
SetEnv ADMIN_EMAIL_1 "commercial@xcr.fr"
SetEnv ADMIN_EMAIL_2 "tcerda@xcr.fr"
```

### Méthode 3 : Configuration Directe

1. **Modifiez** le fichier `config-email.php`
2. **Décommentez** la section "Configuration directe"
3. **Remplacez** par vos vraies valeurs

## 🔧 Configuration IONOS Requise

### Dans votre Panneau IONOS :

1. **Email** → **Comptes Email**
2. **Créez** : `noreply@taxiassur.com`
3. **Mot de passe** : Notez-le pour la config
4. **Activez** : "Envoi d'emails via PHP"

### Paramètres SMTP IONOS :
- **Serveur SMTP** : `smtp.ionos.fr`
- **Port** : `587` (STARTTLS) ou `465` (SSL)
- **Authentification** : Oui
- **Utilisateur** : `noreply@taxiassur.com`
- **Mot de passe** : Celui créé dans le panneau

## 🧪 Tests de Validation

### 1. Test Configuration
```
https://taxiassur.com/test-email.php
```

### 2. Test Debug
```
https://taxiassur.com/debug-email.php
```

### 3. Test Formulaire
```
https://taxiassur.com/#devis
```

## ⚠️ Points d'Attention

### Sécurité
- ❌ **Ne jamais** mettre le mot de passe en dur dans le code
- ✅ **Toujours** utiliser les variables d'environnement
- ✅ **Vérifier** que `.htaccess` n'est pas accessible publiquement

### IONOS Spécifique
- Activez "Envoi d'emails via PHP" dans votre panneau
- Utilisez une adresse email de votre domaine comme expéditeur
- Vérifiez que votre domaine a un enregistrement SPF

## 🎯 Résultat Attendu

Une fois configuré, chaque soumission de formulaire enverra :

1. **Email client** → Confirmation avec prochaines étapes
2. **Email commercial@xcr.fr** → Notification du lead
3. **Email tcerda@xcr.fr** → Copie de la notification

## 📞 Support

Si problème persistant :
- **IONOS** : Support technique pour configuration SMTP
- **TaxiAssur** : team@taxiassur.com pour aide configuration