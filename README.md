# 🚕 TaxiAssur - Plateforme CRM SaaS Assurance Taxi

> Plateforme complète de gestion et d'acquisition clients pour courtiers en assurance taxi

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ecf8e.svg)](https://supabase.com/)

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Déploiement](#-déploiement)
- [Structure du projet](#-structure-du-projet)
- [Scripts disponibles](#-scripts-disponibles)
- [Documentation](#-documentation)

## 🎯 Aperçu

**TaxiAssur** est une plateforme SaaS complète qui combine :
- 📊 **CRM Avancé** - Gestion complète du cycle de vie client
- 🤖 **IA Autonome** - Automatisation intelligente des tâches
- 📧 **Email Marketing** - Campagnes multi-canal Brevo/IONOS
- 💬 **Communication** - WhatsApp, SMS, Email unifié
- 📱 **Social Media** - Publication automatique multi-réseaux
- 📰 **Content Marketing** - Génération et publication automatique
- 🔒 **Sécurité** - RLS Supabase + authentification robuste

## ✨ Fonctionnalités

### 🎯 CRM Ultra-Complet
- **12 modules intégrés** avec sidebar persistante
- Pipeline Kanban avec drag & drop
- Inbox multicanal (Email, WhatsApp, SMS)
- Scoring intelligent des leads
- Automatisation des relances
- Historique complet des interactions
- Gestion documentaire avancée

### 🤖 Intelligence Artificielle
- **Master AI Dashboard** - Vue unifiée de toutes les IAs
- Génération de contenu anti-détection
- Réponses automatiques aux emails
- Scoring prédictif des leads
- Optimisation SEO automatique
- A/B testing intelligent

### 📧 Email Marketing
- Campagnes Brevo + IONOS
- Templates intelligents
- Tracking avancé (ouvertures, clics, géolocalisation)
- A/B testing automatique
- Segmentation dynamique
- Automations basées sur le comportement

### 📱 Communication Unifiée
- **WhatsApp Business** via Twilio
- SMS transactionnels
- Email multicanal
- Réponses IA automatiques
- Historique unifié
- Templates personnalisables

### 🌐 Social Media Management
- Publication automatique (LinkedIn, Twitter, Pinterest, YouTube)
- Génération de contenu IA
- Planning éditorial
- Analytics par plateforme
- OAuth sécurisé

### 📰 Content Marketing
- **2000+ articles SEO** générés
- **150+ pages ville** (géolocalisation)
- Actualités agrégées automatiquement
- Newsletter autonome
- Backlinks automatisés
- Sitemap dynamique

## 🏗 Architecture

### Frontend
- **React 18.3** avec TypeScript
- **Vite 5.4** pour un build ultra-rapide
- **TailwindCSS** pour le design
- **React Router 7** pour la navigation
- **PWA** avec Service Worker

### Backend
- **Supabase** (PostgreSQL + Edge Functions)
- **196 migrations SQL** pour la base de données
- **71 Edge Functions** Deno
- **RLS (Row Level Security)** sur toutes les tables
- **Webhooks** Brevo, Twilio, Make.com

### Intégrations
- **Brevo** - Email marketing & transactionnel
- **IONOS** - IMAP pour inbox
- **Twilio** - WhatsApp & SMS
- **OpenAI** - Génération contenu IA
- **Pexels** - Images stock
- **LinkedIn/Twitter/Pinterest** - Social OAuth

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou pnpm
- Compte Supabase
- (Optionnel) Comptes API : Brevo, Twilio, OpenAI, Pexels

### Étapes

1. **Cloner le projet**
```bash
git clone <repository-url>
cd taxiassur-website
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos clés API
```

4. **Lancer le dev server**
```bash
npm run dev
```

Le site sera accessible sur `http://localhost:5173`

## ⚙️ Configuration

### Variables d'environnement essentielles

```env
# Supabase (OBLIGATOIRE)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email (Brevo)
BREVO_API_KEY=your-brevo-key
IONOS_EMAIL=your-email@domain.com
IONOS_PASSWORD=your-password

# WhatsApp/SMS (Twilio)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+33...

# IA (OpenAI)
OPENAI_API_KEY=sk-...

# Images (Pexels)
PEXELS_API_KEY=your-key
```

Voir `.env.example` pour la liste complète (92 variables).

### Configuration Supabase

1. Créer un nouveau projet Supabase
2. Appliquer les migrations :
```bash
supabase db push
```
3. Déployer les edge functions :
```bash
supabase functions deploy
```

## 📦 Build & Déploiement

### Build Production
```bash
npm run build
```

Génère le dossier `dist/` (3.5MB, 63 chunks JS)

### Déploiement IONOS
```bash
npm run deploy
```

### Déploiement automatique
```bash
npm run auto-deploy
```

### Test du build localement
```bash
npm run preview
```

## 📁 Structure du projet

```
taxiassur-website/
├── src/
│   ├── backoffice/          # 80+ composants backoffice
│   │   ├── CRMLayout.tsx    # Layout principal CRM
│   │   ├── CRMPipelineKanban.tsx
│   │   ├── EmailMarketingHub.tsx
│   │   └── ...
│   ├── components/          # 118 composants réutilisables
│   ├── pages/              # 78 pages publiques
│   ├── lib/                # Utilitaires & services
│   ├── hooks/              # Custom React hooks
│   └── contexts/           # React contexts
├── supabase/
│   ├── migrations/         # 196 migrations SQL
│   └── functions/          # 71 edge functions
├── public/
│   ├── api/                # API PHP legacy
│   ├── content/            # JSON content
│   ├── documents/          # PDFs assurance
│   └── _tests_archive/     # Fichiers de test archivés
├── _ARCHIVES/              # 5.6MB de docs/backups archivés
│   ├── docs_dev/           # 163 fichiers documentation
│   ├── backups/            # 2 archives .zip
│   └── project_duplicate/  # 3.7MB dossier dupliqué
└── scripts/                # 35 scripts automation
```

## 🛠 Scripts disponibles

```bash
# Développement
npm run dev              # Dev server (localhost:5173)
npm run build            # Build production
npm run preview          # Preview du build

# Qualité code
npm run lint             # ESLint check
npm run test             # Vitest tests
npm run test:coverage    # Coverage report

# Base de données
npm run setup            # Setup initial BDD
npm run verify           # Vérifier automations

# Déploiement
npm run deploy           # Build + deploy IONOS
npm run auto-deploy      # Déploiement automatique

# Maintenance
npm run backup:full      # Backup complet
npm run backup:critical  # Backup critique uniquement
```

## 📚 Documentation

- **README.md** : Ce fichier (vue d'ensemble)
- **AUDIT_FINAL_COMPLET_2026-01-10.md** : Rapport d'audit exhaustif
- **_ARCHIVES/docs_dev/** : 163 fichiers de documentation technique

### Guides rapides
- **Configuration Email** : Voir `_ARCHIVES/docs_dev/CONFIGURATION_EMAIL_COMPLETE.md`
- **WhatsApp Setup** : Voir `_ARCHIVES/docs_dev/GUIDE_TWILIO_WHATSAPP_SETUP.md`
- **Connexion Admin** : `/backoffice/login`

## 🔒 Sécurité

- ✅ **RLS activé** sur toutes les tables sensibles (255 commandes RLS)
- ✅ **AuthGuard** sur 55+ routes backoffice
- ✅ **77 Error Boundaries** pour capturer les erreurs
- ✅ **CSP (Content Security Policy)** configuré
- ✅ **Sanitization** des inputs utilisateur
- ✅ **Rate limiting** sur les APIs
- ✅ **Secrets** via variables d'environnement uniquement

## 📊 Statistiques

- **276 composants React** (80 backoffice + 78 pages + 118 communs)
- **196 migrations SQL** appliquées
- **71 Edge Functions** déployables
- **3.5MB** build production
- **96 fichiers** précachés PWA
- **~40 secondes** temps de build

## 🤝 Contribution

Ce projet est propriétaire. Voir LICENSE pour les détails.

## 📝 License

Proprietary - Tous droits réservés

## 🆘 Support

Pour toute question :
- Email : support@taxiassur.com
- Documentation : `/_ARCHIVES/docs_dev/`

---

**Made with ❤️ using React, TypeScript, Supabase & AI**

*Dernière mise à jour : 10 Janvier 2026*
