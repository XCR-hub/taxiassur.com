# Configuration complète IONOS + SFTP - TaxiAssur 2026

## ✅ Identifiants configurés

### 📧 IONOS Email (SMTP + IMAP)
- **Email** : team@taxiassur.com
- **Mot de passe** : TAXIassur2026!,&
- **SMTP** : smtp.ionos.fr:587
- **IMAP** : imap.ionos.fr:993

### 🚀 IONOS SFTP (Déploiement)
- **Serveur** : home749874859.1and1-data.host
- **Port** : 22
- **Protocole** : SFTP
- **Utilisateur** : acc1591324770
- **Mot de passe** : TAXIassur2026!,&

---

## 🔧 Installation et configuration

### 1. Installer les dépendances

```bash
npm install
```

Cela installe automatiquement :
- `ssh2` : pour le déploiement SFTP
- `nodemailer` : pour les tests SMTP
- Toutes les autres dépendances du projet

### 2. Configurer les secrets Supabase

```bash
npm run ionos:configure
```

Ce script configure automatiquement :
- ✅ IONOS SMTP (envoi d'emails)
- ✅ IONOS IMAP (réception d'emails)
- ✅ SFTP IONOS (déploiement)
- ✅ URLs du site

### 3. Vérifier la configuration

```bash
npm run ionos:test
```

Ce script teste :
1. Connexion SMTP (envoi d'un email de test)
2. Connexion IMAP (récupération des derniers emails)
3. Connexion SFTP (lecture du répertoire distant)

---

## 🚀 Déploiement automatique

### Déploiement complet (Build + Upload SFTP)

```bash
npm run deploy
```

Cette commande :
1. Compile le projet (`npm run build`)
2. Upload automatiquement vers IONOS via SFTP
3. Affiche la progression de l'upload
4. Confirme le succès du déploiement

### Déploiement manuel (Build seulement)

```bash
npm run deploy:manual
```

Compile le projet sans upload automatique (pour upload manuel via FileZilla).

---

## 📧 Système d'emails automatiques

### Fonctionnalités activées

1. **Envoi automatique lors de la création d'un lead**
   - Email de confirmation au prospect
   - Email de notification au commercial
   - Lien d'accès à l'espace prospect

2. **Upload de documents par le prospect**
   - Email de notification au commercial
   - Email de confirmation au prospect
   - Compteurs de documents mis à jour

3. **Synchronisation IMAP automatique**
   - Récupération des nouveaux emails
   - Liaison automatique avec les leads
   - Extraction des pièces jointes

### Edge Functions déployées

- `send-email-ionos` : Envoi d'emails via IONOS SMTP
- `sync-ionos-imap` : Synchronisation des emails entrants
- `send-lead-notification` : Notifications automatiques
- `send-document-notification` : Alertes upload de documents

---

## 📁 Structure de déploiement

### Fichiers uploadés vers IONOS

```
/ (racine SFTP)
├── index.html
├── assets/
│   ├── *.js
│   ├── *.css
│   └── images/
├── api/
│   └── *.php (si nécessaire)
├── content/
│   ├── blog/
│   ├── faq/
│   └── reviews/
└── documents/
    └── *.pdf
```

### Dossiers ignorés

- `node_modules/`
- `src/`
- `.git/`
- `.env`
- `*.md` (sauf README.md si nécessaire)

---

## 🔍 Vérifications post-déploiement

### 1. Vérifier le site

```
https://taxiassur.pro
```

- Page d'accueil charge correctement
- Formulaire de lead fonctionne
- Espace prospect accessible

### 2. Tester l'envoi d'emails

Via l'interface backoffice :
1. Aller dans **CRM Killer**
2. Créer un nouveau lead
3. Vérifier la réception de l'email

### 3. Vérifier les logs Supabase

```bash
supabase functions logs send-email-ionos --tail
```

---

## 🛠️ Commandes utiles

### Configuration

```bash
# Lister les secrets Supabase
npm run secrets:list

# Reconfigurer IONOS
npm run ionos:configure

# Tester la connexion IONOS
npm run ionos:test
```

### Déploiement

```bash
# Build + déploiement SFTP
npm run deploy

# Build seulement
npm run deploy:manual

# Vérifier le build
npm run verify:build
```

### Développement

```bash
# Serveur de développement
npm run dev

# Tests
npm run test

# Linter
npm run lint
```

---

## 🐛 Résolution de problèmes

### Erreur : "SFTP Connection Failed"

**Causes possibles :**
- Mauvais identifiants SFTP
- Serveur IONOS inaccessible
- Port 22 bloqué par un firewall

**Solutions :**
```bash
# Re-vérifier les identifiants
npm run ionos:configure

# Tester la connexion
npm run ionos:test
```

### Erreur : "SMTP Authentication Failed"

**Causes possibles :**
- Mauvais mot de passe email
- Secrets Supabase non configurés
- SMTP IONOS temporairement indisponible

**Solutions :**
```bash
# Reconfigurer les secrets
npm run ionos:configure

# Tester l'envoi d'email
npm run ionos:test
```

### Erreur : "Upload timeout"

**Causes possibles :**
- Fichier trop volumineux
- Connexion internet lente
- Serveur SFTP surchargé

**Solutions :**
- Réduire la taille du build (optimiser les images)
- Relancer le déploiement
- Utiliser une meilleure connexion internet

---

## 📊 Statistiques de déploiement

### Taille moyenne du build
- **Total** : ~5-10 MB
- **JavaScript** : ~2-3 MB
- **CSS** : ~500 KB
- **Images** : ~2-5 MB

### Temps de déploiement moyen
- **Build** : 30-60 secondes
- **Upload SFTP** : 2-5 minutes
- **Total** : 3-6 minutes

---

## 🔐 Sécurité

### Secrets protégés

Les identifiants suivants sont stockés de manière sécurisée :

1. **Dans Supabase Secrets** (Edge Functions)
   - IONOS_SMTP_PASSWORD
   - IONOS_IMAP_PASSWORD
   - SFTP_PASSWORD

2. **Dans .env local** (non versionné)
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

### Bonnes pratiques

- ✅ Ne JAMAIS commit les mots de passe dans Git
- ✅ Utiliser des tokens différents pour dev/prod
- ✅ Renouveler les mots de passe régulièrement
- ✅ Activer 2FA sur le compte IONOS

---

## 📞 Support

### En cas de problème

1. **Vérifier les logs Supabase**
   ```bash
   supabase functions logs --tail
   ```

2. **Tester la configuration**
   ```bash
   npm run ionos:test
   ```

3. **Consulter la documentation**
   - [IONOS Support](https://www.ionos.fr/assistance)
   - [Supabase Docs](https://supabase.com/docs)

---

## ✅ Checklist de déploiement

Avant chaque déploiement :

- [ ] Build réussi (`npm run build`)
- [ ] Tests passent (`npm test`)
- [ ] Secrets configurés (`npm run ionos:configure`)
- [ ] Connexion IONOS testée (`npm run ionos:test`)
- [ ] Modifications commitées dans Git
- [ ] Déploiement lancé (`npm run deploy`)
- [ ] Site vérifié en production (`https://taxiassur.pro`)

---

## 🎉 Félicitations !

Votre système TaxiAssur est maintenant :
- ✅ Déployé automatiquement via SFTP
- ✅ Connecté à IONOS pour les emails
- ✅ Configuré pour envoyer des notifications
- ✅ Prêt à recevoir des leads !

**Prochaines étapes :**
1. Tester le formulaire de lead sur le site
2. Vérifier la réception des emails
3. Former l'équipe commerciale
4. Lancer les campagnes marketing
