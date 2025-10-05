# 📊 Guide Complet d'Utilisation du Backoffice TaxiAssur

## 🔐 Accès au Backoffice

### Connexion
- **URL** : `https://votre-domaine.com/backoffice`
- **Mot de passe par défaut** : `taxiassur2024`
- **Changement** : Variable d'environnement `VITE_ADMIN_PASSWORD`

### Sécurité
- Session automatique (pas de déconnexion forcée)
- Accès protégé par mot de passe
- Logs d'accès automatiques

## 🏠 Dashboard Principal (`/backoffice`)

### Vue d'Ensemble
- **Statistiques temps réel** : Articles, FAQ, avis, leads
- **État du système** : Webhook, santé serveur
- **Actions rapides** : Régénération feeds, ping moteurs

### Métriques Affichées
- Nombre d'articles de blog
- Entrées FAQ
- Avis clients
- Offres actives
- Backlinks
- Partenaires
- Leads par période

## 👥 Gestion des Leads (`/backoffice/lead-manager`)

### Vue d'Ensemble des Leads
- **Tableau complet** : Tous vos prospects en un coup d'œil
- **Filtres avancés** : Par statut, ville, date
- **Recherche** : Nom, email, téléphone, ville
- **Export CSV** : Données complètes pour analyse

### États des Leads
1. **🆕 Nouveau** : Lead fraîchement arrivé
2. **📞 Contacté** : Premier contact établi
3. **📄 Devis Envoyé** : Proposition transmise
4. **✅ Client** : Contrat signé
5. **❌ Perdu** : Prospect non converti

### Actions sur les Leads

#### 📞 Appeler un Lead
- **Bouton principal** : Gros bouton vert "APPELER" dans les détails
- **Bouton tableau** : Icône téléphone dans chaque ligne
- **Bouton actions** : Dans la section actions rapides
- **Tracking** : Suivi automatique des appels dans Analytics

#### 👁️ Consulter un Lead
- **Bouton** : 👁️ (œil) dans le tableau
- **Informations** : Coordonnées complètes, historique, notes
- **Actions rapides** : Appel direct, email pré-rempli

#### ✏️ Changer le Statut
1. **Cliquez** sur ✏️ (crayon) dans le tableau
2. **Sélectionnez** le nouveau statut
3. **Ajoutez** des notes si nécessaire
4. **Si "Client"** : Renseignez la prime réalisée

#### 📄 Envoyer un Devis
1. **Ouvrir** le modal de détails du lead
2. **Section "Gestion des Documents"**
3. **Sélectionner** le fichier PDF du devis
4. **Cliquer** "Envoyer le Devis"
5. **Résultat** : Lead automatiquement passé en "Devis Envoyé" + Email envoyé

#### 📋 Envoyer un Contrat
1. **Même processus** que le devis
2. **Sélectionner** le fichier PDF du contrat
3. **Cliquer** "Envoyer le Contrat"
4. **Résultat** : Lead automatiquement passé en "Client" + Email envoyé

#### 💰 Saisir la Prime Réalisée
- **Quand** : Lors du passage en statut "Client"
- **Champ** : "Prime réalisée (€)"
- **Utilité** : Calcul du CA, statistiques

#### ⭐ Demander un Avis Google
1. **Cliquez** sur ⭐ (étoile) dans le tableau ou dans les détails
2. **Confirmer** l'envoi de la demande d'avis
3. **Email automatique** envoyé au client avec lien Google
4. **Publication auto** : Avis positifs publiés sur le site

### Statistiques Leads
- **Total leads** : Nombre total de prospects
- **Répartition par statut** : Nouveaux, contactés, etc.
- **CA réalisé** : Somme des primes
- **Taux de conversion** : % de leads devenus clients

## 📝 Gestion du Contenu (`/backoffice/content`)

### Publication d'Articles
- **Onglet "Articles"** : Création et modification d'articles de blog
- **Éditeur complet** : Titre, résumé, contenu HTML, tags, image
- **Statuts** : Publié ou Brouillon
- **Modification** : Clic sur l'icône crayon pour éditer
- **Publication** : Via webhook Make (automatisme préservé)

### Gestion FAQ
- **Onglet "FAQ"** : Ajout et modification des questions fréquentes
- **Formulaire simple** : Question, réponse, tags
- **Publication immédiate** : Visible sur `/faq`
- **SEO optimisé** : Featured snippets Google

### Envoi de Newsletters
- **Onglet "Newsletter"** : Interface dédiée
- **Destinataires** : Tous abonnés, taxi uniquement, VTC, ou liste custom
- **Programmation** : Envoi immédiat ou programmé
- **Templates** : Contenu pré-formaté
- **Bonnes pratiques** : Conseils intégrés

## 🔍 Partner Finder (`/backoffice/partner-finder`)

### Recherche de Prospects
- **Requêtes prédéfinies** : Annuaires, associations, blogs
- **Requêtes personnalisées** : Syntaxe Google avancée
- **Déduplication** : Automatique par domaine
- **Mode simulation** : Fonctionne même sans clés API Google

### Qualification des Prospects
1. **Rechercher** avec une requête
2. **Examiner** chaque résultat manuellement
3. **Marquer** "Qualifié" ou "Rejeté"
4. **Exporter** les prospects qualifiés

## 🤝 Gestion des Partenaires (`/backoffice/partners`)

### Ajouter un Partenaire
- **Informations** : Nom, site web, description
- **Catégorie** : Annuaire, équipement, service, etc.
- **Contact** : Email, téléphone, personne
- **Statut** : Actif, en attente, inactif

## 📧 Outreach Composer (`/backoffice/outreach`)

### Campagnes Email
- **Templates** : Modèles pré-rédigés conformes
- **Personnalisation** : Variables automatiques
- **Validation** : Score anti-spam
- **Rate limiting** : 30 emails/heure max

## 🛡️ Sécurité (`/backoffice/security`)

### Monitoring
- **Logs temps réel** : Tentatives d'attaque
- **Score sécurité** : Évaluation globale
- **Analyse IP** : Détection des menaces

## 📈 SEO Tools (`/backoffice/seo`)

### Optimisation
- **Régénération feeds** : Sitemap XML, RSS
- **Ping moteurs** : Google, Bing
- **Pages villes** : Génération automatique
- **Checklist SEO** : Vérifications complètes

## 📊 Analytics (`/backoffice/analytics`)

### Conversion
- **Entonnoir** : Étapes de conversion
- **Sources** : Origine du trafic
- **Appareils** : Mobile, desktop, tablet

## 🎯 Compliance (`/backoffice/compliance`)

### RGPD
- **Registre consentements** : Traçabilité complète
- **Droits personnes** : Export, suppression
- **DSR** : Demandes de droits

## 📰 News Manager (`/backoffice/news`)

### Veille Automatisée
- **Sources** : 5 flux RSS configurés
- **IA** : Synthèse automatique
- **Publication** : Manuelle ou automatique

## 💼 Marketplace (`/backoffice/lead-marketplace`)

### Achat de Leads
- **Leads partagés** : 20€ (2-3 courtiers)
- **Leads exclusifs** : 70€ (uniquement vous)
- **Qualité** : Leads frais < 30min

## 🚀 Workflow Recommandé

### Gestion Quotidienne des Leads
1. **Matin** : Consulter les nouveaux leads (`/backoffice/lead-manager`)
2. **Appeler** : Utiliser les boutons d'appel intégrés
3. **Suivre** : Mettre à jour les statuts après contact
4. **Envoyer** : Devis PDF aux prospects qualifiés
5. **Demander** : Avis Google aux clients satisfaits

### Publication de Contenu
1. **Articles** : Publier 1-2 articles/semaine via `/backoffice/content`
2. **FAQ** : Ajouter questions fréquentes reçues
3. **Newsletter** : Envoi hebdomadaire aux abonnés
4. **Avis** : Collecter via demandes automatiques

### Gestion Hebdomadaire
1. **Lundi** : Analyser les stats de conversion
2. **Mercredi** : Lancer une campagne Partner Finder
3. **Vendredi** : Exporter et analyser les données
4. **Dimanche** : Préparer la newsletter de la semaine

## 🔧 Points Importants

### ⚠️ Automatisme Make Préservé
- **Webhook Make** : Reste la méthode principale d'alimentation
- **Publication manuelle** : Fonction supplémentaire uniquement
- **Pas d'interférence** : Les deux systèmes coexistent

### 📞 Boutons d'Appel
- **3 emplacements** : Tableau, détails, actions rapides
- **Tracking** : Suivi automatique dans Analytics
- **Action directe** : Ouvre l'application d'appel du système

### ⭐ Système d'Avis Google
- **Email automatique** : Template professionnel pré-rédigé
- **Lien direct** : Vers votre page Google Avis
- **Publication auto** : Avis positifs (4-5 étoiles) publiés sur le site
- **SEO boost** : Améliore le référencement local

## 📞 Support

Pour toute question sur l'utilisation :
- **Email** : team@taxiassur.com
- **Téléphone** : 01 80 85 57 86
- **Documentation** : Ce guide + README.md

---

*Guide mis à jour avec les nouvelles fonctionnalités de publication manuelle et système d'avis Google*