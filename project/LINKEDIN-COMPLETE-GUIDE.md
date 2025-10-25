# Guide Complet LinkedIn + Make.com - TaxiAssur

## 📚 Table des Matières

1. [Configuration OAuth 2.0](#configuration-oauth)
2. [Page Vitrine LinkedIn](#page-vitrine)
3. [Formulaire Lead Gen](#formulaire-lead-gen)
4. [Webhook LinkedIn → Make.com → Supabase](#webhook-automation)
5. [Templates Marketing](#templates-marketing)
6. [QR Codes Personnalisés](#qr-codes)
7. [Tracking & Analytics](#tracking)
8. [Checklist Finale](#checklist)

---

## 🔐 Configuration OAuth 2.0

### Credentials Configurés ✅

```env
VITE_LINKEDIN_CLIENT_ID=78jlte9c2mbjw5
VITE_LINKEDIN_CLIENT_SECRET=WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==
```

### Redirect URLs à Configurer

**Allez sur** : https://www.linkedin.com/developers/apps

1. Cliquez sur votre app
2. Menu **"Auth"** → **"OAuth 2.0 settings"**
3. **Ajoutez ces URLs** :

```
http://localhost:5173/backoffice/social-media
https://taxiassur.com/backoffice/social-media
```

4. **Cliquez "Update"** et attendez 2-3 minutes

### Produits à Demander

#### 1. Community Management API (Prioritaire)

**Pourquoi ?** Publier sur votre Page LinkedIn

**Formulaire** :
```
Use Case: Publication automatisée de contenu pour Page LinkedIn TaxiAssur

Description:
Notre application backoffice génère et publie automatiquement du contenu
informatif pour notre communauté professionnelle de chauffeurs de taxi et
gestionnaires de flotte.

Type de contenu :
- Actualités du secteur assurance taxi
- Conseils pratiques et réglementaires
- Articles de blog éducatifs
- Études de cas clients

Fréquence : 2-3 posts par semaine
Audience : Professionnels du transport (chauffeurs taxi, VTC, flottes)
```

---

## 📄 Page Vitrine LinkedIn

### URL de la Page

```
https://www.linkedin.com/showcase/taxiassur
```

### Configuration Optimale

#### Description Courte (150 caractères max)

```
TaxiAssur — Spécialiste assurance taxi en France. Devis gratuit en 1 minute — RC Pro, flotte & couverture dédiée.
```

#### Description Longue (À propos)

```
TaxiAssur accompagne les chauffeurs de taxi et les petites flottes en France pour obtenir des assurances professionnelles claires, compétitives et adaptées. Obtenez un devis instantané en 1 minute, comparez les garanties (RC Pro, tous risques, flotte) et bénéficiez d'un accompagnement personnalisé pour sécuriser votre activité.

Nos services :
• Devis assurance taxi en ligne (immatriculation)
• Comparatif transparent des garanties et franchises
• Assistance sinistre et conseil prévention

Rejoignez notre réseau d'ambassadeurs pour gagner en visibilité et recevoir un badge officiel TaxiAssur. Pour un devis : https://taxiassur.com/devis?ref=linkedin
```

#### Paramètres

- **Site web** : `https://taxiassur.com/devis?ref=linkedin&utm_source=linkedin&utm_medium=showcase`
- **Bouton CTA** : "Demander un devis" → même URL
- **Spécialités** : Assurance taxi, RC Pro taxi, Devis en ligne
- **Logo** : 1200x1200px (carré)
- **Couverture** : 1920x1080px

### Posts de Lancement (Prêts à Copier)

#### Post 1 - Lancement (À Épingler)

```
🚀 TaxiAssur est lancé !
Chauffeurs de taxi : obtenez un devis gratuit et comparatif en 1 minute. Spécialistes RC Pro et flotte. Rejoignez notre réseau d'ambassadeurs pour être mis en avant.
🔗 https://taxiassur.com/devis?ref=linkedin&utm_source=linkedin&utm_medium=post

#assurancetaxi #taxi #chauffeur #assurance
```

#### Post 2 - Témoignage

```
✅ "Grâce à TaxiAssur j'ai réduit ma prime de 30%" — Jean, taxi Paris.
Vous aussi : testez notre simulateur en ligne et recevez un check gratuit de votre contrat.
🔗 https://taxiassur.com/devis?ref=linkedin&utm_source=linkedin&utm_medium=post

#assurancetaxi #temoignage #taxi
```

#### Post 3 - Ambassadeurs

```
📣 Chauffeurs : devenez Ambassadeur TaxiAssur — visibilité sur notre site, badge officiel, canal VIP. Inscrivez-vous en 2 minutes → https://taxiassur.com/ambassadeur?ref=linkedin

#taxiassur #ambassadeur #assurancetaxi
```

---

## 📝 Formulaire Lead Gen LinkedIn

### Configuration du Formulaire

**Accédez à** : Page LinkedIn → **"Collecter les prospects"**

#### Paramètres Principaux

| Paramètre | Valeur |
|-----------|--------|
| **CTA** | Commencer |
| **Titre** (50 car) | Devis assurance taxi gratuit |
| **Corps** (200 car) | Recevez un devis personnalisé pour votre taxi en moins d'une minute. Après soumission nous vous appelons pour finaliser et sécuriser votre couverture (RC Pro, flotte, tous risques). |
| **Privacy URL** | https://taxiassur.com/policy |
| **Thank You URL** | https://taxiassur.com/merci?ref=linkedin |

#### Champs du Formulaire

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Nom complet | Standard | ✅ Oui |
| Téléphone | Standard | ✅ Oui |
| Email | Standard | Optionnel |
| Immatriculation | Personnalisé (texte) | ✅ Oui |
| Ville | Personnalisé (texte) | Optionnel |

#### Message de Remerciement

```
Merci ! Votre demande a bien été reçue. Notre équipe vous appelle sous 24h pour finaliser votre devis.
```

---

## 🔄 Webhook Automation : LinkedIn → Make.com → Supabase

### Architecture du Flux

```
LinkedIn Lead Gen Form
         ↓
    Make.com (Webhook)
         ↓
   Mapping des Champs
         ↓
  Supabase Edge Function
  (linkedin-lead-webhook)
         ↓
   Table `leads` Supabase
         ↓
  Notification Ambassadeur
```

### Étape 1 : Configuration Make.com

#### 1.1 Créer un Nouveau Scénario

1. Allez sur https://www.make.com
2. **Create a new scenario**
3. **Nommez** : "LinkedIn Leads → TaxiAssur"

#### 1.2 Ajouter le Trigger LinkedIn

1. **Cliquez "+"** → Recherchez **"LinkedIn"**
2. Sélectionnez **"Watch Lead Gen Form Submissions"**
3. **Connectez votre compte LinkedIn**
4. **Sélectionnez votre formulaire** : "Devis assurance taxi gratuit"
5. **Testez** pour récupérer un lead exemple

#### 1.3 Mapper les Champs

**Ajouter un module** : **"Tools" → "Set variables"**

Créez ces variables :

| Variable Make.com | Champ LinkedIn | Description |
|-------------------|----------------|-------------|
| `name` | `fullName` ou `firstName` + `lastName` | Nom complet |
| `phone` | `phoneNumber` | Téléphone |
| `email` | `emailAddress` | Email (optionnel) |
| `immatriculation` | `customField_immatriculation` | Plaque |
| `city` | `customField_ville` | Ville (optionnel) |
| `ref` | (manuel) | Code ambassadeur si présent |
| `utm_source` | (fixe) | `linkedin` |

**Exemple de mapping** :

```json
{
  "name": "{{1.fullName}}",
  "phone": "{{1.phoneNumber}}",
  "email": "{{1.emailAddress}}",
  "immatriculation": "{{1.customField_immatriculation}}",
  "city": "{{1.customField_ville}}",
  "ref": null,
  "utm_source": "linkedin"
}
```

#### 1.4 Appeler l'Edge Function Supabase

**Ajouter un module** : **"HTTP" → "Make a request"**

**Configuration** :

```
URL: https://viuuznfqkauatkjcegcj.supabase.co/functions/v1/linkedin-lead-webhook

Method: POST

Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_SUPABASE_ANON_KEY

Body (JSON):
{
  "name": "{{name}}",
  "phone": "{{phone}}",
  "email": "{{email}}",
  "immatriculation": "{{immatriculation}}",
  "city": "{{city}}",
  "ref": "{{ref}}",
  "utm_source": "{{utm_source}}"
}
```

#### 1.5 Gestion des Erreurs

**Ajouter un module** : **"Tools" → "Error handler"**

- En cas d'échec, **envoyer un email** à l'admin
- **Loguer** l'erreur dans un Google Sheet

#### 1.6 Activer le Scénario

1. **Cliquez "Save"**
2. **Activez** le scénario (bouton ON)
3. **Planifiez** : "Immediately as data arrives"

### Étape 2 : Edge Function Supabase (Déjà Créée ✅)

**Fichier** : `supabase/functions/linkedin-lead-webhook/index.ts`

**URL de la fonction** :
```
https://viuuznfqkauatkjcegcj.supabase.co/functions/v1/linkedin-lead-webhook
```

**Ce qu'elle fait** :
1. ✅ Reçoit le webhook de Make.com
2. ✅ Valide les champs requis (name, phone)
3. ✅ Insère dans la table `leads`
4. ✅ Attribue à l'ambassadeur si `ref` présent
5. ✅ Retourne une confirmation

**Déploiement** :

```bash
# Déjà déployée - Utilisez l'outil mcp__supabase__deploy_edge_function si modifications
```

### Étape 3 : Notification Ambassadeur (Optionnel)

**Ajouter dans Make.com après Supabase** :

1. **Module "Email"** → Envoyer à l'ambassadeur
2. **Condition** : Si `ref` existe
3. **Template email** :

```
Objet : Nouveau lead depuis LinkedIn - {{name}}

Bonjour [Nom Ambassadeur],

Bonne nouvelle ! Un nouveau lead a été généré grâce à votre code de parrainage.

Lead :
- Nom : {{name}}
- Téléphone : {{phone}}
- Ville : {{city}}
- Immatriculation : {{immatriculation}}

Notre équipe va le contacter sous 24h.

Merci de votre contribution !
L'équipe TaxiAssur
```

### Étape 4 : Test Complet

1. **Remplissez le formulaire LinkedIn** avec des données test
2. **Vérifiez dans Make.com** : Historique des exécutions
3. **Vérifiez dans Supabase** : Table `leads`
4. **Vérifiez l'email** : Notification envoyée

---

## 💬 Templates Marketing

### Accès dans le Backoffice

**URL** : `https://taxiassur.com/backoffice/marketing-templates`

### Messages WhatsApp (3 Versions)

#### Version Courte (Statuts)

```
Salut {Prénom}, j'utilise TaxiAssur pour mes assurances taxi. Devis gratuit en 1 min → https://taxiassur.com/devis?ref={CODE}
(copie et partage 😉)
```

#### Version Standard (Groupes)

```
Bonjour à tous, si vous voulez comparer rapidement vos tarifs d'assurance taxi, essayez le simulateur TaxiAssur : https://taxiassur.com/devis?ref={CODE}

C'est rapide, fiable, et ils publient les meilleurs parrains sur leur page. Merci !
```

#### Version Longue (Personnel)

```
Salut {Prénom}, je viens de tester TaxiAssur, ils m'ont fait un devis en 1 minute et m'ont aidé à optimiser ma couverture. Si tu veux, utilise mon lien pour que je puisse suivre : https://taxiassur.com/devis?ref={CODE}

Ils te donnent un petit badge d'ambassadeur et te mettent en avant sur leur site (sans frais).
```

### Communiqué de Presse

**Fichier complet disponible** : `src/data/marketing-templates.json`

**Objet** :
```
TaxiAssur lance un simulateur gratuit d'assurance pour chauffeurs de taxi et un programme d'ambassadeurs
```

**Téléchargeable** depuis le backoffice (bouton "Télécharger")

---

## 🔲 QR Codes Personnalisés

### Accès dans le Backoffice

**URL** : `https://taxiassur.com/backoffice/qr-codes`

### Fonctionnalités

1. ✅ **Sélection ambassadeur** → Génération automatique QR code
2. ✅ **URL de parrainage** : `https://taxiassur.com/devis?ref=AMBASSADOR123&utm_source=qrcode&utm_medium=print`
3. ✅ **Téléchargement PNG** (512x512px)
4. ✅ **Téléchargement batch** (tous les ambassadeurs)
5. ✅ **Copie URL** en un clic

### Spécifications Techniques

- **Format** : PNG (512x512px)
- **API** : QR Server API (gratuite)
- **Taille impression** : Minimum 3x3 cm
- **Résolution** : 300 DPI recommandé

### Utilisation

1. **Affichage véhicule** (vitre arrière)
2. **Carte de visite** ambassadeur
3. **Flyers** et brochures
4. **Stations taxi** (affichage)

---

## 📊 Tracking & Analytics

### LinkedIn Insight Tag (Installé ✅)

**Fichier** : `index.html` (lignes 103-123)

**À Faire** :
1. Récupérez votre **LinkedIn Partner ID**
2. Remplacez `YOUR_PARTNER_ID` dans `index.html` (2 occurrences)
3. Redéployez le site

**Utilité** :
- Tracking conversions LinkedIn Ads
- Création d'audiences personnalisées
- Mesure ROI des campagnes

### UTM Tracking

Tous les liens utilisent des UTM pour tracking :

| Source | Exemple |
|--------|---------|
| **LinkedIn Showcase** | `?ref=linkedin&utm_source=linkedin&utm_medium=showcase` |
| **LinkedIn Posts** | `?ref=linkedin&utm_source=linkedin&utm_medium=post` |
| **LinkedIn Lead Gen** | `?ref=linkedin&utm_source=linkedin&utm_medium=leadgen` |
| **QR Code** | `?ref=AMBASSADOR123&utm_source=qrcode&utm_medium=print` |
| **WhatsApp** | `?ref=AMBASSADOR123&utm_source=whatsapp&utm_medium=social` |

### Suivi dans Google Analytics 4

Les UTM sont automatiquement capturés par GA4 :

**Rapports recommandés** :
1. **Acquisition** → Tout le trafic → Source/Medium
2. **Engagement** → Conversions → Par source
3. **Monétisation** → Valeur client → Par canal

---

## ✅ Checklist Finale

### Configuration OAuth & Produits

- [ ] Redirect URLs ajoutées dans LinkedIn Developer Portal
- [ ] Community Management API : Accès demandé
- [ ] Pages Data Portability API : Accès demandé (optionnel)
- [ ] Credentials LinkedIn ajoutés dans `.env`
- [ ] Test OAuth en local réussi

### Page Vitrine LinkedIn

- [ ] Description courte copiée et mise à jour
- [ ] Description longue copiée et mise à jour
- [ ] Logo carré 1200x1200px uploadé
- [ ] Couverture 1920x1080px uploadée
- [ ] Bouton CTA configuré avec URL + UTM
- [ ] Spécialités ajoutées
- [ ] Post 1 publié et épinglé
- [ ] Post 2 publié
- [ ] Post 3 publié

### Formulaire Lead Gen

- [ ] Formulaire créé dans LinkedIn
- [ ] Titre et corps copiés
- [ ] Champs configurés (Nom, Téléphone, Email, Immat, Ville)
- [ ] URL Privacy ajoutée
- [ ] URL Thank You ajoutée
- [ ] Test de soumission réussi

### Automation Make.com

- [ ] Scénario créé : "LinkedIn Leads → TaxiAssur"
- [ ] Trigger LinkedIn configuré
- [ ] Mapping des champs effectué
- [ ] Module HTTP vers Supabase ajouté
- [ ] Error handler configuré
- [ ] Scénario activé
- [ ] Test bout-en-bout réussi
- [ ] Lead visible dans Supabase

### Edge Function

- [ ] Fonction `linkedin-lead-webhook` déployée
- [ ] URL testée avec Postman/curl
- [ ] Logs vérifiés dans Supabase
- [ ] Insertion dans table `leads` confirmée

### Templates Marketing

- [ ] Accès backoffice `/backoffice/marketing-templates` testé
- [ ] Messages WhatsApp copiés et personnalisés
- [ ] Communiqué de presse téléchargé
- [ ] Templates LinkedIn testés

### QR Codes

- [ ] Accès backoffice `/backoffice/qr-codes` testé
- [ ] QR codes générés pour ambassadeurs
- [ ] Test scan QR code réussi (redirection vers devis)
- [ ] QR codes téléchargés et imprimés

### Tracking

- [ ] LinkedIn Partner ID récupéré
- [ ] `YOUR_PARTNER_ID` remplacé dans `index.html` (2x)
- [ ] Site redéployé avec Insight Tag
- [ ] Test tracking dans LinkedIn Campaign Manager
- [ ] UTM vérifiés dans Google Analytics

### Pages Légales

- [ ] `/policy` accessible publiquement
- [ ] `/legal` accessible publiquement
- [ ] `/conditions` accessible publiquement
- [ ] Section LinkedIn API ajoutée dans Privacy Policy
- [ ] Section LinkedIn ajoutée dans Conditions

### Tests Finaux

- [ ] Formulaire LinkedIn → Lead dans Supabase
- [ ] QR Code scan → Page devis avec ref
- [ ] Lien WhatsApp → Tracking correct
- [ ] Posts LinkedIn → Trafic visible dans GA4
- [ ] Email confirmation envoyé au lead

---

## 🆘 Support & Ressources

### Documentation LinkedIn

- **Developer Portal** : https://www.linkedin.com/developers/
- **OAuth 2.0** : https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
- **Community Management API** : https://learn.microsoft.com/en-us/linkedin/marketing/community-management
- **Lead Gen Forms** : https://www.linkedin.com/help/lms/answer/a417706

### Documentation Make.com

- **LinkedIn Integration** : https://www.make.com/en/integrations/linkedin
- **Webhooks** : https://www.make.com/en/help/tools/webhooks

### Documentation Supabase

- **Edge Functions** : https://supabase.com/docs/guides/functions
- **Database** : https://supabase.com/docs/guides/database

### Accès Backoffice TaxiAssur

- **URL** : https://taxiassur.com/backoffice
- **Mot de passe** : `taxiassur2024`

### Nouveaux Outils Créés

| Outil | URL | Description |
|-------|-----|-------------|
| **Marketing Templates** | `/backoffice/marketing-templates` | Messages WhatsApp, LinkedIn, Email, Presse |
| **QR Code Generator** | `/backoffice/qr-codes` | Génération QR codes personnalisés ambassadeurs |
| **Social Media Manager** | `/backoffice/social-media` | Gestion publications LinkedIn (OAuth) |

---

## 📅 Plan d'Action 30 Jours

### Semaine 1 : Configuration

- Jour 1-2 : Configurer OAuth + Demander accès produits LinkedIn
- Jour 3-4 : Compléter page vitrine LinkedIn
- Jour 5-7 : Créer formulaire Lead Gen + Make.com automation

### Semaine 2 : Contenu

- Jour 8-9 : Publier 3 premiers posts LinkedIn
- Jour 10-11 : Créer templates WhatsApp personnalisés
- Jour 12-14 : Générer QR codes ambassadeurs + impression

### Semaine 3 : Distribution

- Jour 15-17 : Distribuer QR codes aux ambassadeurs
- Jour 18-19 : Campagne WhatsApp (50 messages)
- Jour 20-21 : Publier communiqué de presse

### Semaine 4 : Analyse & Optimisation

- Jour 22-24 : Analyser métriques (leads, trafic, conversions)
- Jour 25-27 : Optimiser messages selon performances
- Jour 28-30 : Lancer challenge "Top 10 Parrains"

---

**Date de création** : 2025-10-09
**Dernière mise à jour** : 2025-10-09
**Version** : 1.0
**Auteur** : TaxiAssur Tech Team
