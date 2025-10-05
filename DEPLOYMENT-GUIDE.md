# 🚀 Guide de Déploiement TaxiAssur - Structure Complète

## 📁 **OUI, les fichiers JSON sont ESSENTIELS !**

### **Pourquoi les JSON sont obligatoires :**
- ✅ **Contenu dynamique** : Blog, FAQ, avis, offres
- ✅ **SEO optimisé** : Sitemap et RSS générés depuis JSON
- ✅ **Backoffice** : Gestion du contenu via interface admin
- ✅ **Performance** : Chargement rapide sans base de données

## 📋 **Structure `/dist` à Uploader COMPLÈTEMENT**

```
/dist/                          ← TOUT ce dossier sur votre serveur
├── index.html                  ← Site React principal
├── favicon.ico                 ← Icône taxi
├── logo.svg                    ← Logo TaxiAssur
├── manifest.json               ← PWA manifest
├── robots.txt                  ← SEO robots
├── sitemap.xml                 ← Plan du site
├── .htaccess                   ← Configuration Apache
├── config.php                  ← Configuration PHP
├── server-check.php            ← Tests serveur
├── test-webhook.html           ← Tests webhook
├── deploy-guide.html           ← Guide complet
├── assets/                     ← CSS/JS optimisés
│   ├── index-xxx.css
│   ├── index-xxx.js
│   └── vendor-xxx.js
├── api/                        ← Endpoints PHP
│   └── lead.php               ← Formulaire leads
├── content/                    ← CONTENU JSON ESSENTIEL
│   ├── blog/                  ← Articles de blog
│   │   ├── assurance-taxi-2024.json
│   │   ├── vehicules-electriques-taxi.json
│   │   └── ...
│   ├── faq/                   ← Questions fréquentes
│   │   ├── tarifs-assurance.json
│   │   ├── delai-attestation.json
│   │   └── ...
│   ├── reviews/               ← Avis clients
│   │   ├── mohammed-b.json
│   │   ├── fatima-r.json
│   │   └── ...
│   ├── offers/                ← Pages d'offres
│   │   ├── rc-professionnelle.json
│   │   └── flotte-vehicules.json
│   ├── backlinks.json         ← Gestion backlinks
│   ├── partners.json          ← Partenaires
│   └── popups.json           ← Configuration popups
├── feeds/                     ← Flux SEO
│   ├── sitemap.xml           ← Plan du site
│   └── rss.xml               ← Flux RSS blog
└── webhooks/                  ← Webhooks Make
    ├── .htaccess             ← Protection
    └── make.php              ← Endpoint principal
```

## 🎯 **Déploiement en 3 Étapes**

### **Étape 1 : Build Local**
```bash
npm install
npm run build
```

### **Étape 2 : Upload Complet**
**UPLOADEZ TOUT LE DOSSIER `/dist` vers la racine de votre serveur web**

### **Étape 3 : Permissions**
```bash
chmod 755 api/
chmod 644 api/lead.php
chmod 755 content/
chmod 755 feeds/
chmod 755 webhooks/
chmod 644 webhooks/make.php
```

## ⚠️ **IMPORTANT : Ne PAS Oublier**

### **Fichiers JSON Critiques**
- **`/content/blog/*.json`** → Articles de blog
- **`/content/faq/*.json`** → Questions fréquentes  
- **`/content/reviews/*.json`** → Avis clients
- **`/content/offers/*.json`** → Pages d'offres
- **`/content/backlinks.json`** → Gestion SEO
- **`/content/partners.json`** → Partenaires

### **Sans les JSON :**
- ❌ **Pages vides** : Blog, FAQ, avis ne s'affichent pas
- ❌ **SEO cassé** : Sitemap et RSS vides
- ❌ **Backoffice** : Interface admin non fonctionnelle
- ❌ **Contenu** : Site statique sans dynamisme

## 🔧 **URLs Importantes Après Déploiement**

- **Site principal** : `https://votre-domaine.com/`
- **Test formulaire** : `https://votre-domaine.com/#devis`
- **Backoffice** : `https://votre-domaine.com/backoffice`
- **Test serveur** : `https://votre-domaine.com/server-check.php`
- **Sitemap** : `https://votre-domaine.com/feeds/sitemap.xml`

## ✅ **Checklist Déploiement**

- [ ] Upload TOUT le dossier `/dist`
- [ ] Vérifier permissions PHP
- [ ] Tester `https://votre-domaine.com/`
- [ ] Tester formulaire de devis
- [ ] Vérifier contenu (blog, FAQ, avis)
- [ ] Accéder au backoffice
- [ ] Configurer variables d'environnement si nécessaire

**RÉSULTAT : Site complet avec animations IA taxi sophistiquées !** 🚖✨