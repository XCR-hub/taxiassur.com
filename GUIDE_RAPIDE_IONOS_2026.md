# 🚀 Guide rapide IONOS - TaxiAssur 2026

## Installation en 3 étapes

### 1️⃣ Installer les dépendances
```bash
npm install
```

### 2️⃣ Configurer IONOS
```bash
npm run ionos:configure
```

### 3️⃣ Déployer le site
```bash
npm run deploy
```

---

## 📋 Commandes essentielles

| Commande | Description |
|----------|-------------|
| `npm run deploy` | Build + déploiement SFTP automatique |
| `npm run ionos:configure` | Configurer les secrets IONOS |
| `npm run ionos:test` | Tester la configuration IONOS |
| `npm run dev` | Serveur de développement local |
| `npm run build` | Compiler le projet |

---

## ✅ Ce qui est automatisé

### 🚀 Déploiement
- Build du projet
- Upload SFTP vers IONOS
- Confirmation de succès

### 📧 Emails
- Nouveau lead → Email au prospect + commercial
- Upload document → Email au commercial
- Synchronisation IMAP automatique

### 🔄 Synchronisation
- Emails IONOS → Base de données
- Documents → Stockage Supabase
- Notifications temps réel

---

## 🔑 Identifiants configurés

### Email IONOS
- **Adresse** : contact@taxiassur.pro
- **SMTP** : smtp.ionos.fr:587
- **IMAP** : imap.ionos.fr:993

### SFTP IONOS
- **Serveur** : home749874859.1and1-data.host
- **Port** : 22
- **Utilisateur** : acc1591324770

---

## 📞 Besoin d'aide ?

Consultez `CONFIGURATION_IONOS_SFTP_2026.md` pour :
- Documentation complète
- Résolution de problèmes
- Détails techniques

---

## 🎯 Workflow quotidien

### Développement
```bash
# 1. Développer localement
npm run dev

# 2. Tester
npm test

# 3. Déployer
npm run deploy
```

### Vérification
```bash
# Tester la configuration IONOS
npm run ionos:test

# Vérifier les secrets
npm run secrets:list
```

---

## ⚡ Démarrage rapide après clonage

```bash
# 1. Installer
npm install

# 2. Copier .env
cp .env.example .env
# Éditer .env avec vos valeurs

# 3. Configurer IONOS
npm run ionos:configure

# 4. Tester
npm run ionos:test

# 5. Déployer
npm run deploy
```

---

## 🔗 Liens utiles

- **Site** : https://taxiassur.pro
- **Backoffice** : https://taxiassur.pro/admin
- **Espace prospect** : https://taxiassur.pro/espace-prospect
- **Documentation IONOS** : https://www.ionos.fr/assistance

---

**Tout est prêt ! Lancez `npm run deploy` pour déployer votre site. 🚀**
