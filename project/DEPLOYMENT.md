# 🚀 Guide de Déploiement TaxiAssur.com

## Méthodes de Récupération du Projet

### Méthode 1 : Téléchargement depuis Bolt.new (Recommandé)

1. **Dans Bolt.new** : Cliquez sur "Download" ou "Export" 
2. **Décompressez** dans votre dossier local
3. **Installez** :
```bash
npm install
npm run deploy
```

### Méthode 2 : Copie Manuelle

Si le téléchargement n'est pas disponible :

1. **Initialisez** le projet :
```bash
npm run setup
```

2. **Copiez** tous les fichiers depuis Bolt.new vers votre dossier local

3. **Installez** et déployez :
```bash
npm install
npm run deploy
```

## Structure après Build

```
/dist/
├── index.html                    # App React
├── assets/                       # CSS/JS optimisés  
├── content/                      # Contenu JSON
├── feeds/                        # Sitemap + RSS
├── webhooks/                     # PHP endpoints
├── .htaccess                     # Config Apache
├── config.php                    # Config PHP
├── server-check.php              # Tests serveur
├── test-webhook.html             # Tests webhook
└── deploy-guide.html             # Guide complet
```

## Upload sur Serveur

1. **Uploadez** tout le contenu de `/dist` vers la racine de votre hébergement
2. **Configurez** les variables d'environnement dans `.htaccess` ou panneau de contrôle
3. **Testez** via `/server-check.php`

## URLs Importantes

- **Site** : `https://votre-domaine.com/`
- **Backoffice** : `https://votre-domaine.com/backoffice` (mot de passe: `taxiassur2024`)
- **Tests** : `https://votre-domaine.com/test-webhook.html`
- **Vérification** : `https://votre-domaine.com/server-check.php`

## Support

- **Email** : team@taxiassur.com
- **Téléphone** : 01 80 85 57 86