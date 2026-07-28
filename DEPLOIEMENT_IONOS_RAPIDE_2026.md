# GUIDE RAPIDE : DÉPLOIEMENT SUR IONOS
## TAXIASSUR - 24 FÉVRIER 2026

---

## 🎯 OBJECTIF

Déployer le build de production TaxiAssur sur le serveur IONOS.

**Temps estimé : 5-10 minutes**

---

## 📋 PRÉREQUIS

- Build créé (dossier `dist/`)
- Accès SFTP IONOS
- FileZilla ou client FTP installé

---

## 🚀 MÉTHODE 1 : DÉPLOIEMENT AUTOMATIQUE (RECOMMANDÉ)

### Option A : Via npm (Le plus simple)

```bash
# Depuis la racine du projet
npm run deploy
```

**Ce que ça fait** :
1. Crée un nouveau build de production
2. Se connecte au serveur IONOS via SFTP
3. Upload automatiquement tous les fichiers
4. Vérifie le déploiement

**Configuration requise** :

Créer un fichier `.env.deploy` :

```bash
IONOS_HOST=access123456789.webspace-data.io
IONOS_PORT=22
IONOS_USERNAME=u123456789
IONOS_PASSWORD=REDACTED
IONOS_REMOTE_PATH=/
```

⚠️ **IMPORTANT** : Ne jamais commiter ce fichier dans Git !

### Option B : Via le script de déploiement

```bash
node scripts/deploy-sftp.js
```

---

## 📦 MÉTHODE 2 : DÉPLOIEMENT MANUEL (FILEZILLA)

### Étape 1 : Créer le build

```bash
npm run build
```

**Vérifications** :
- Le dossier `dist/` est créé
- Le fichier `dist/index.html` existe
- Le dossier `dist/assets/` contient les fichiers JS et CSS

### Étape 2 : Configurer FileZilla

1. Ouvrir **FileZilla**
2. Cliquer sur **Fichier** → **Gestionnaire de sites**
3. Cliquer sur **Nouveau site**
4. Nom : **TaxiAssur IONOS**

**Configuration** :

```
Protocole    : SFTP - SSH File Transfer Protocol
Hôte         : access123456789.webspace-data.io
Port         : 22
Type d'auth  : Normale
Identifiant  : u123456789
Mot de passe : [Votre mot de passe IONOS]
```

5. Cliquer sur **Connexion**

### Étape 3 : Uploader les fichiers

**Panneau de gauche** (Local) :
- Naviguer vers le dossier `dist/` de votre projet

**Panneau de droite** (Serveur) :
- Naviguer vers la racine (`/`)

**Upload** :
1. Sélectionner TOUS les fichiers et dossiers dans `dist/`
2. **Clic droit** → **Envoyer**
3. Confirmer le remplacement si demandé
4. Attendre la fin de l'upload (2-5 minutes selon la connexion)

### Étape 4 : Vérifier les permissions

**Fichiers importants** :
- `.htaccess` : 644
- `index.html` : 644
- Dossier `api/` : 755
- Fichiers PHP dans `api/` : 644

**Commande pour vérifier** (via SSH si accès) :

```bash
chmod 644 .htaccess
chmod 644 index.html
chmod 755 api/
chmod 644 api/*.php
```

---

## ✅ MÉTHODE 3 : VÉRIFICATION DU DÉPLOIEMENT

### Test 1 : Homepage

```bash
curl -I https://taxiassur.com
```

**Résultat attendu** :
```
HTTP/2 200
content-type: text/html
```

### Test 2 : Formulaire de devis

1. Aller sur **https://taxiassur.com**
2. Cliquer sur **"Obtenir un devis"**
3. Remplir le formulaire
4. Soumettre

**Vérifications** :
- ✅ Redirection vers `/merci`
- ✅ Email de confirmation reçu
- ✅ Lead créé dans la base Supabase

### Test 3 : API

```bash
curl -I https://taxiassur.com/api/lead.php
```

**Résultat attendu** :
```
HTTP/2 200
content-type: application/json
```

### Test 4 : Sitemap

```bash
curl -I https://taxiassur.com/sitemap.xml
```

**Résultat attendu** :
```
HTTP/2 200
content-type: application/xml
```

### Test 5 : .htaccess (Redirections)

```bash
# Test redirection HTTP → HTTPS
curl -I http://taxiassur.com

# Test redirection www → non-www
curl -I https://www.taxiassur.com
```

**Résultats attendus** :
- HTTP 301 (Permanent Redirect)
- Location: https://taxiassur.com

---

## 🔥 MÉTHODE 4 : DÉPLOIEMENT IONOS (Interface Web)

### Via le panneau IONOS

1. Se connecter sur **https://www.ionos.fr**
2. Aller dans **Hébergement** → **Votre espace Web**
3. Cliquer sur **Gestionnaire de fichiers**
4. Naviguer vers la racine
5. Uploader le contenu de `dist/` via le bouton **Upload**

⚠️ **LIMITE** : Upload lent et risque de timeout pour les gros fichiers.

---

## 🐛 TROUBLESHOOTING

### Problème 1 : "403 Forbidden"

**Cause** : Permissions incorrectes

**Solution** :
```bash
chmod 644 .htaccess
chmod 644 index.html
chmod -R 755 api/
```

### Problème 2 : "500 Internal Server Error"

**Cause** : Erreur dans `.htaccess` ou fichier PHP

**Solution** :
1. Vérifier le fichier `.htaccess`
2. Vérifier les logs d'erreur IONOS
3. Tester les fichiers PHP un par un

### Problème 3 : "Page blanche"

**Cause** : Fichiers JavaScript non chargés

**Solution** :
1. Vérifier que tous les fichiers dans `dist/assets/` sont uploadés
2. Vérifier le cache du navigateur (Ctrl+Shift+R)
3. Vérifier la console du navigateur (F12)

### Problème 4 : "Formulaire ne fonctionne pas"

**Cause** : API non accessible ou CORS

**Solution** :
1. Vérifier que les fichiers PHP sont uploadés dans `api/`
2. Vérifier le fichier `api/.htaccess`
3. Tester l'API directement : `https://taxiassur.com/api/lead.php`

### Problème 5 : "CSS/Images cassés"

**Cause** : Chemins relatifs incorrects

**Solution** :
1. Vérifier que le build a été créé correctement
2. Vérifier la configuration Vite (`vite.config.ts`)
3. Recréer le build : `npm run build`

---

## 📊 STRUCTURE DES FICHIERS SUR LE SERVEUR

```
/ (racine IONOS)
├── .htaccess              ← Redirections et règles Apache
├── index.html             ← Page d'accueil
├── favicon.ico
├── logo.svg
├── robots.txt
├── sitemap.xml
│
├── api/                   ← Endpoints PHP
│   ├── .htaccess
│   ├── lead.php
│   ├── config.php
│   └── ...
│
├── assets/                ← JS, CSS, images compilés
│   ├── index-B7bO3kSP.js
│   ├── index-BdwTsuOD.css
│   └── ...
│
├── content/               ← Contenu JSON (blog, FAQ)
│   ├── blog/
│   ├── faq/
│   └── reviews/
│
├── documents/             ← PDFs et documents
│   └── *.pdf
│
└── feeds/                 ← RSS et sitemaps
    ├── rss.xml
    └── sitemap.xml
```

---

## 🔐 SÉCURITÉ

### Fichiers à NE JAMAIS uploader

- `.env`
- `.env.local`
- `.env.deploy`
- `node_modules/`
- `.git/`
- fichiers avec des secrets

### Protection des fichiers sensibles

Le `.htaccess` protège automatiquement :
- Fichiers `.env*`
- Fichiers `.git*`
- Fichiers de configuration

---

## ⚡ OPTIMISATIONS

### 1. Cache navigateur

Le `.htaccess` configure automatiquement :
- Images : 1 mois
- CSS/JS : 1 semaine
- HTML : 1 heure

### 2. Compression Gzip

Activée automatiquement pour :
- HTML, CSS, JS
- JSON, XML
- Fonts

### 3. Sécurité

- HTTPS forcé
- Headers de sécurité (X-Frame-Options, X-Content-Type-Options)
- Protection contre les hotlinks

---

## 📈 MONITORING POST-DÉPLOIEMENT

### Jour 1 : Tests immédiats
- [ ] Homepage accessible
- [ ] Formulaire fonctionne
- [ ] Emails envoyés
- [ ] API répond correctement

### Semaine 1 : Monitoring
- [ ] Vérifier les logs d'erreur IONOS
- [ ] Monitorer les leads créés
- [ ] Vérifier les emails envoyés
- [ ] Tester le temps de chargement

### Mois 1 : Analytics
- [ ] Analyser le trafic Google Analytics
- [ ] Vérifier les positions dans GSC
- [ ] Analyser les conversions
- [ ] Optimiser si nécessaire

---

## 🎯 CHECKLIST FINALE

- [ ] Build créé (`npm run build`)
- [ ] Tous les fichiers uploadés
- [ ] `.htaccess` présent et configuré
- [ ] Homepage accessible (200 OK)
- [ ] Formulaire testé et fonctionnel
- [ ] Emails de confirmation reçus
- [ ] API accessible
- [ ] Sitemap accessible
- [ ] Redirections HTTPS fonctionnelles
- [ ] Aucune erreur 404 ou 500

---

## 📞 SUPPORT IONOS

**Besoin d'aide ?**

- **Support IONOS** : https://www.ionos.fr/assistance
- **Téléphone** : 0970 808 911
- **Chat** : Disponible sur le panel IONOS

**Informations à fournir** :
- Numéro client
- Nom de domaine : taxiassur.com
- Description du problème
- Logs d'erreur si disponibles

---

## ✅ DÉPLOIEMENT RÉUSSI !

**Prochaines étapes** :

1. ✅ Déploiement terminé
2. → Configurer Monetico (Guide : `CONFIGURATION_SECRETS_MONETICO_2026.md`)
3. → Monitorer les performances
4. → Analyser les leads

---

**Site en production !** 🎉

Votre site TaxiAssur est maintenant accessible sur https://taxiassur.com avec toutes les fonctionnalités activées.
