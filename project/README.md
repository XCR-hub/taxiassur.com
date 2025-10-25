# TaxiAssur.com - Modules Dynamiques + Intégration Make

Site vitrine ultra-rapide avec modules de contenu auto-actualisés via Make (ex-Integromat), sans base de données obligatoire, compatible IONOS.

## 🚀 Stack Technique

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Contenu**: Fichiers JSON locaux + option Supabase
- **Webhooks**: PHP pour réception des payloads Make
- **SEO**: React Helmet, JSON-LD, sitemap/RSS auto-générés
- **Validation**: Zod pour la validation des données

## 📁 Structure du Projet

```
/public
  /content/           # Contenu JSON
    blog/            # Articles de blog
    faq/             # Questions fréquentes
    reviews/         # Avis clients
    offers/          # Pages d'offres
    leads/           # Leads anonymisés (par mois)
  /feeds/
    sitemap.xml      # Plan du site
    rss.xml          # Flux RSS
  robots.txt
/webhooks
  make.php           # Endpoint pour Make
/src
  /components/       # Composants React
  /lib/             # Utilitaires et logique métier
  /pages/           # Pages de l'application
```

## 🔧 Installation

1. **Cloner et installer les dépendances**
```bash
npm install
```

2. **Configuration des variables d'environnement**
```bash
cp .env.example .env
```

Modifier `.env` avec vos valeurs :
```env
VITE_SITE_URL=https://www.taxiassur.com
VITE_BRAND_NAME=TaxiAssur
VITE_CONTACT_EMAIL=commercial@xcr.fr
VITE_GTAG_ID=G-XXXXXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXX

# Optionnel Supabase (active si définies)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret pour Make -> webhook
MAKE_SECRET=votre_token_securise_2024
```

3. **Démarrer le serveur de développement**
```bash
npm run dev
```

4. **Build pour la production**
```bash
npm run build
```

## 🔐 Accès Backoffice

Le backoffice est accessible via `/backoffice` avec authentification par mot de passe.

**Connexion par défaut :**
- URL : `https://votre-domaine.com/backoffice`
- Mot de passe : `taxiassur2024`

**Sécurisation en production :**
1. Changez le mot de passe via la variable d'environnement `VITE_ADMIN_PASSWORD`
2. Ajoutez une protection `.htaccess` supplémentaire si nécessaire
3. Utilisez HTTPS obligatoirement

**Fonctionnalités backoffice :**
- Dashboard avec statistiques et statut système
- Gestion des backlinks (ajout, suivi, vérification)
- Gestion des partenaires (répertoire, contacts, catégories)
- Outils SEO (régénération feeds, ping moteurs)
- Monitoring webhook Make

## 🔗 Intégration Make (ex-Integromat)

## 🤝 Partnership & SEO Acquisition

### Modules Backoffice Avancés

#### Partner Finder (`/backoffice/partner-finder`)
- **Découverte éthique** via Google Custom Search Engine (CSE)
- **Requêtes prédéfinies** : annuaires, associations, blogs, médias
- **Déduplication automatique** par domaine
- **Rate limiting** : Respect des quotas API Google
- **Export qualifiés** : Sauvegarde des prospects validés

#### Prospect Review (`/backoffice/prospect-review`)
- **Validation humaine** : Vérification manuelle des prospects
- **Gestion consentement** : Enregistrement base légale RGPD
- **Workflow qualité** : Nouveau → Qualifié → Contacté → Partenaire
- **Traçabilité complète** : Qui, quand, pourquoi

#### Outreach Composer (`/backoffice/outreach`)
- **Templates conformes** : Emails avec opt-out obligatoire
- **Personnalisation** : Variables dynamiques par prospect
- **Rate limiting** : 30 emails/heure maximum
- **Validation spam** : Score anti-spam intégré
- **Suivi campagnes** : Envoyé, ouvert, cliqué, répondu

#### Compliance Center (`/backoffice/compliance`)
- **Registre RGPD** : Tous les consentements tracés
- **Droits personnes** : Export/suppression données (DSR)
- **Suppression automatique** : Respect rétention 24 mois
- **Audit trail** : Logs complets conformité

#### Directory Assistant (`/backoffice/directories`)
- **Annuaires autorisés** : Liste blanche stricte
- **Soumissions manuelles** : Contenu pré-rempli à copier
- **APIs autorisées** : Intégration directe si disponible
- **Suivi statuts** : Soumis, approuvé, rejeté

### Configuration CSE (Google)

1. **Créer un Custom Search Engine** :
   - Aller sur [Google CSE](https://cse.google.com/)
   - Créer un moteur de recherche
   - Configurer pour rechercher sur tout le web
   - Noter l'ID du moteur (CX)

2. **Obtenir une clé API** :
   - Aller sur [Google Cloud Console](https://console.cloud.google.com/)
   - Activer l'API Custom Search
   - Créer une clé API
   - Limiter aux domaines autorisés

3. **Configurer les variables** :
```env
VITE_CSE_API_KEY=votre_cle_api_google
VITE_CSE_CX=votre_id_moteur_cse
```

### Conformité et Sécurité

#### Respect RGPD
- ✅ **Base légale** : Intérêt légitime B2B ou consentement explicite
- ✅ **Opt-out** : Lien de désinscription dans chaque email
- ✅ **Rétention** : Suppression automatique après 24 mois
- ✅ **Droits** : Export et suppression des données sur demande
- ✅ **Logs** : Traçabilité complète des traitements

#### Anti-Spam
- ✅ **Rate limiting** : 30 emails/heure maximum
- ✅ **Validation contenu** : Score anti-spam automatique
- ✅ **Liste suppression** : Respect des opt-outs
- ✅ **Authentification** : SPF/DKIM configurés
- ✅ **Monitoring** : Logs détaillés des envois

#### Éthique
- ❌ **Pas de scraping** : Aucune extraction d'emails
- ❌ **Pas d'automation** : Soumissions manuelles uniquement
- ✅ **Consentement** : Base légale documentée
- ✅ **Transparence** : Identité claire dans les emails
- ✅ **Respect CGU** : Conformité aux conditions d'utilisation

### Configuration du Webhook

**URL du webhook** : `https://votre-domaine.com/webhooks/make.php`

**En-têtes requis** :
```
Content-Type: application/json
X-MAKE-SECRET: votre_token_securise_2024
```

### Actions Disponibles

#### 1. Upsert de Contenu (`?action=upsert`)
**Méthode** : `POST`

**Payload pour un article de blog** :
```json
{
  "type": "blog",
  "payload": {
    "id": "assurance-taxi-2024",
    "title": "Assurance Taxi 2024 : Nouvelles Réglementations",
    "excerpt": "Découvrez les changements majeurs...",
    "content": "<h2>Les Évolutions...</h2><p>Contenu HTML...</p>",
    "tags": ["assurance", "réglementation", "2024"],
    "coverImage": "https://images.pexels.com/photos/1545743/...",
    "author": "TaxiAssur",
    "createdAt": "2024-01-15T08:00:00Z",
    "status": "published",
    "faq": [
      {
        "q": "Question exemple ?",
        "a": "Réponse exemple."
      }
    ]
  }
}
```

**Payload pour une FAQ** :
```json
{
  "type": "faq",
  "payload": {
    "id": "tarifs-assurance",
    "question": "Combien coûte une assurance taxi ?",
    "answer": "Nos tarifs négociés vous font économiser...",
    "updatedAt": "2024-01-15T10:00:00Z",
    "tags": ["tarifs", "économies"],
    "status": "published"
  }
}
```

**Payload pour un avis client** :
```json
{
  "type": "reviews",
  "payload": {
    "id": "mohammed-b",
    "name": "Mohammed B.",
    "rating": 5,
    "comment": "Incroyable ! J'ai économisé 580€...",
    "source": "Google",
    "createdAt": "2024-01-12T14:30:00Z",
    "status": "published"
  }
}
```

**Payload pour une offre** :
```json
{
  "type": "offers",
  "payload": {
    "id": "rc-professionnelle",
    "title": "RC Professionnelle Taxi",
    "body": "<h2>Protection Complète...</h2>",
    "benefits": [
      "Couverture jusqu'à 10M€",
      "Protection juridique incluse"
    ],
    "ctaLabel": "Demander un devis RC Pro",
    "updatedAt": "2024-01-15T11:00:00Z",
    "status": "published"
  }
}
```

#### 2. Gestion des Leads (`?action=lead`)
**Méthode** : `POST`

**Payload** :
```json
{
  "name": "Jean Dupont",
  "email": "jean@email.com",
  "phone": "0612345678",
  "status": "taxi",
  "city": "Paris",
  "immatriculation": "AB-123-CD"
}
```

#### 3. Régénération des Feeds (`?action=regenFeeds`)
**Méthode** : `POST`
Régénère `sitemap.xml` et `rss.xml` après mise à jour du contenu.

#### 4. Test de Connectivité (`?action=ping`)
**Méthode** : `GET`
Teste la disponibilité du webhook.

### Flux Make Recommandés

#### 1. Publication d'Article Quotidien (07:00)
```
Source (Notion/Sheet/ChatGPT) 
→ Formatage JSON (BlogPostSchema)
→ POST /webhooks/make.php (X-MAKE-SECRET)
→ POST /webhooks/make.php?action=regenFeeds
→ Partage social (optionnel)
```

#### 2. Mise à Jour FAQ (07:05)
```
Source FAQ 
→ Formatage JSON (FaqEntrySchema)
→ POST /webhooks/make.php
→ Régénération feeds
```

#### 3. Import Avis Clients (hebdomadaire)
```
Google My Business / Sheets
→ Formatage JSON (ReviewSchema)
→ POST /webhooks/make.php
```

## 🗄️ Gestion du Contenu

### Mode Local (par défaut)
Le contenu est stocké dans `/public/content/` sous forme de fichiers JSON. Aucune base de données requise.

### Mode Supabase (optionnel)
Si les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY` sont définies, le système utilise Supabase avec fallback vers les fichiers locaux.

**Tables Supabase requises** :
```sql
-- Blog
CREATE TABLE blog (
  id text PRIMARY KEY,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  cover_image text,
  author text DEFAULT 'TaxiAssur',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  status text DEFAULT 'published',
  faq jsonb
);

-- FAQ
CREATE TABLE faq (
  id text PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  tags text[] DEFAULT '{}',
  status text DEFAULT 'published'
);

-- Reviews
CREATE TABLE reviews (
  id text PRIMARY KEY,
  name text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  source text,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'published'
);

-- Offers
CREATE TABLE offers (
  id text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  benefits text[] DEFAULT '{}',
  cta_label text DEFAULT 'Demander un devis',
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'published'
);
```

## 🔒 Sécurité

### Webhook
- Vérification du token `X-MAKE-SECRET`
- Validation des payloads avec Zod
- Protection anti-spam (honeypot)
- File locking pour les écritures

### Formulaires
- Validation côté client et serveur
- Protection CSRF
- Limitation de débit

## 📊 SEO et Performance

### SEO
- Meta tags dynamiques avec React Helmet
- JSON-LD structuré (Organization, Article, FAQ, Product)
- Sitemap XML auto-généré
- Flux RSS pour le blog
- URLs canoniques
- Open Graph et Twitter Cards

### Performance
- Lazy loading des images
- Code splitting automatique
- Optimisation Tailwind CSS
- Preload des ressources critiques

## 🧪 Tests et Débogage

### Test du Webhook
```bash
# Test de connectivité
curl -H "X-MAKE-SECRET: votre_token" \
     https://votre-domaine.com/webhooks/make.php?action=ping

# Test d'ajout d'article
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-MAKE-SECRET: votre_token" \
     -d '{"type":"blog","payload":{"id":"test","title":"Test","excerpt":"Test","content":"Test","createdAt":"2024-01-15T08:00:00Z","status":"published"}}' \
     https://votre-domaine.com/webhooks/make.php
```

### Composant AdminPing
Le composant `<AdminPing />` en bas de page teste automatiquement la connectivité du webhook et affiche le statut.

## 🚀 Déploiement IONOS

### 1. Build et préparation
```bash
# Build du projet
npm run deploy

# Ou manuellement :
npm run build
chmod +x deploy.sh
./deploy.sh
```

### 2. Upload vers le serveur
Uploadez **tout le contenu du dossier `/dist`** vers la racine de votre hébergement web.

**Structure après upload :**
```
/votre-site/
├── index.html
├── assets/
├── content/
├── feeds/
├── webhooks/
│   └── make.php
├── .htaccess
└── config.php
```

### 3. Configuration PHP
Créer un fichier `.htaccess` pour les variables d'environnement :
```apache
SetEnv MAKE_SECRET "votre_token_securise_2024"
```

### 4. Permissions
```bash
chmod 755 webhooks/
chmod 644 webhooks/make.php
chmod 755 content/
chmod 755 feeds/
```

### 5. Test de fonctionnement
```bash
# Test du webhook
curl "https://votre-domaine.com/webhooks/make.php?action=ping"

# Test du site
curl "https://votre-domaine.com/"

# Test du backoffice
# Accédez à https://votre-domaine.com/backoffice
```

## 📞 Support

Pour toute question technique :
- **Email** : team@taxiassur.com
- **Téléphone** : 01 80 85 57 86

## 📄 Licence

Propriétaire - TaxiAssur.com (XCR - Excellence Coverage Risks)