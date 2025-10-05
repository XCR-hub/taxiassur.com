# 📊 Guide d'Utilisation du Backoffice TaxiAssur

## 🔐 Accès au Backoffice

### Connexion
- **URL** : `https://votre-domaine.com/backoffice`
- **Mot de passe par défaut** : `taxiassur2024`
- **Changement** : Variable d'environnement `VITE_ADMIN_PASSWORD`

### Sécurité
- Session automatique (pas de déconnexion forcée)
- Accès protégé par mot de passe
- Logs d'accès automatiques

## 🏠 Dashboard Principal

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

## 👥 Gestion des Leads (`/backoffice/leads`)

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

#### Consulter un Lead
- **Bouton** : 👁️ (œil) dans le tableau
- **Informations** : Coordonnées complètes, historique, notes
- **Actions rapides** : Appel direct, email pré-rempli

#### Changer le Statut
1. **Cliquez** sur ✅ (coche verte)
2. **Sélectionnez** le nouveau statut
3. **Ajoutez** des notes si nécessaire
4. **Si "Client"** : Renseignez la prime réalisée

#### Envoyer un Devis
1. **Ouvrir** le modal de modification du lead
2. **Sélectionner** "Devis (PDF)" dans le type de document
3. **Uploader** votre fichier PDF
4. **Cliquer** "Envoyer le Devis"
5. **Résultat** : Lead automatiquement passé en "Devis Envoyé"

#### Envoyer un Contrat
1. **Même processus** que le devis
2. **Sélectionner** "Contrat (PDF)"
3. **Résultat** : Lead automatiquement passé en "Client"

#### Saisir la Prime Réalisée
- **Quand** : Lors du passage en statut "Client"
- **Champ** : "Prime réalisée (€)"
- **Utilité** : Calcul du CA, statistiques

### Statistiques Leads
- **Total leads** : Nombre total de prospects
- **Répartition par statut** : Nouveaux, contactés, etc.
- **CA réalisé** : Somme des primes
- **Taux de conversion** : % de leads devenus clients

## 🔍 Partner Finder (`/backoffice/partner-finder`)

### Recherche de Prospects
- **Requêtes prédéfinies** : Annuaires, associations, blogs
- **Requêtes personnalisées** : Syntaxe Google avancée
- **Déduplication** : Automatique par domaine
- **Quota Google** : Suivi en temps réel

### Qualification des Prospects
1. **Rechercher** avec une requête
2. **Examiner** chaque résultat manuellement
3. **Marquer** "Qualifié" ou "Rejeté"
4. **Exporter** les prospects qualifiés

### Bonnes Pratiques
- Vérifiez toujours la page Contact/Partenariat
- Évitez les concurrents directs
- Privilégiez les sites actifs et professionnels

## 🤝 Gestion des Partenaires (`/backoffice/partners`)

### Ajouter un Partenaire
- **Informations** : Nom, site web, description
- **Catégorie** : Annuaire, équipement, service, etc.
- **Contact** : Email, téléphone, personne
- **Statut** : Actif, en attente, inactif

### Suivi des Partenaires
- **Répertoire complet** : Tous vos partenaires
- **Filtres** : Par catégorie, statut
- **Mise en avant** : Partenaires privilégiés

## 📧 Outreach Composer (`/backoffice/outreach`)

### Campagnes Email
- **Templates** : Modèles pré-rédigés conformes
- **Personnalisation** : Variables automatiques
- **Validation** : Score anti-spam
- **Rate limiting** : 30 emails/heure max

### Conformité RGPD
- **Opt-out automatique** : Lien dans chaque email
- **Base légale** : Intérêt légitime B2B
- **Traçabilité** : Logs complets

## 🛡️ Sécurité (`/backoffice/security`)

### Monitoring
- **Logs temps réel** : Tentatives d'attaque
- **Score sécurité** : Évaluation globale
- **Analyse IP** : Détection des menaces
- **Recommandations** : Actions correctives

### Protection Active
- **Anti-spam** : Honeypot, rate limiting
- **Validation** : Contrôles stricts
- **Alertes** : Notifications automatiques

## 📈 SEO Tools (`/backoffice/seo`)

### Optimisation
- **Régénération feeds** : Sitemap XML, RSS
- **Ping moteurs** : Google, Bing
- **Pages villes** : Génération automatique
- **Checklist SEO** : Vérifications complètes

### Suivi
- **URLs indexées** : Statut d'indexation
- **Score SEO** : Évaluation globale
- **Métriques** : Performance SEO

## 📊 Analytics (`/backoffice/analytics`)

### Conversion
- **Entonnoir** : Étapes de conversion
- **Sources** : Origine du trafic
- **Appareils** : Mobile, desktop, tablet
- **Optimisations** : Recommandations

### Tests A/B
- **CTA** : Boutons d'action
- **Formulaires** : Variantes
- **Pages** : Versions alternatives

## 🎯 Compliance (`/backoffice/compliance`)

### RGPD
- **Registre consentements** : Traçabilité complète
- **Droits personnes** : Export, suppression
- **DSR** : Demandes de droits
- **Audit** : Conformité réglementaire

## 📰 News Manager (`/backoffice/news`)

### Veille Automatisée
- **Sources** : 5 flux RSS configurés
- **IA** : Synthèse automatique
- **Publication** : Manuelle ou automatique
- **SEO** : Optimisation mots-clés

## 💼 Marketplace (`/backoffice/lead-marketplace`)

### Achat de Leads
- **Leads partagés** : 20€ (2-3 courtiers)
- **Leads exclusifs** : 70€ (uniquement vous)
- **Qualité** : Leads frais < 30min
- **Support** : Aide à la conversion

## 🔧 Maintenance et Support

### Fichiers Importants
- **Logs** : `/public/logs/` (rotation quotidienne)
- **Contenu** : `/public/content/` (JSON)
- **Configuration** : `/public/config.php`

### Tests de Fonctionnement
- **Webhook** : `/test-webhook.html`
- **Serveur** : `/server-check.php`
- **Email** : `/test-email.php`

### Dépannage
1. **Erreur 500** : Vérifiez les logs PHP
2. **Emails non reçus** : Testez la configuration SMTP
3. **Webhook KO** : Vérifiez le MAKE_SECRET
4. **Leads manquants** : Vérifiez les permissions

## 📞 Support Technique

### Contact
- **Email** : team@taxiassur.com
- **Téléphone** : 01 80 85 57 86
- **Urgence** : Mentionnez "BACKOFFICE" dans l'objet

### Ressources
- **Documentation** : README.md du projet
- **Guides** : Dossier `/docs/`
- **Tests** : `/test-webhook.html`

---

## 🚀 Workflow Recommandé

### Gestion Quotidienne des Leads
1. **Matin** : Consulter les nouveaux leads
2. **Contacter** : Appeler les prospects chauds
3. **Suivre** : Mettre à jour les statuts
4. **Envoyer** : Devis aux prospects qualifiés

### Gestion Hebdomadaire
1. **Lundi** : Analyser les stats de conversion
2. **Mercredi** : Lancer une campagne Partner Finder
3. **Vendredi** : Exporter et analyser les données

### Gestion Mensuelle
1. **Début de mois** : Calculer le CA réalisé
2. **Mi-mois** : Optimiser les campagnes
3. **Fin de mois** : Rapport complet et planification

---

*Guide mis à jour le : ${new Date().toLocaleDateString('fr-FR')}*