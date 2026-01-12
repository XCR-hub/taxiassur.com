# 🚕 **Système TaxiAssur - Documentation Complète**

**Date de création :** 12 janvier 2026
**Version :** 2.0 Ultra-Complet
**Auteur :** Équipe Développement TaxiAssur

---

## 📋 **Table des Matières**

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Workflow complet](#workflow-complet)
4. [Côté Client (Taxi)](#côté-client-taxi)
5. [Côté Commercial (TaxiAssur)](#côté-commercial-taxiassur)
6. [Système de notifications multicanal](#système-de-notifications-multicanal)
7. [Gestion des 5 compagnies d'assurance](#gestion-des-5-compagnies-dassurance)
8. [Système de gestion des sinistres](#système-de-gestion-des-sinistres)
9. [Espace client complet](#espace-client-complet)
10. [Chat Léa - Assistant IA](#chat-léa---assistant-ia)
11. [Sécurité et conformité](#sécurité-et-conformité)

---

## 🎯 **Vue d'ensemble**

TaxiAssur est une **plateforme complète de souscription et gestion d'assurance** destinée aux chauffeurs de taxi. Elle automatise l'intégralité du parcours depuis la demande initiale jusqu'à la gestion quotidienne du contrat, avec un système de notifications multicanal (Email/SMS/WhatsApp/Push).

### **Objectifs Business**

- ✅ **Maximiser la conversion** : Parcours guidé étape par étape
- ✅ **Zéro oubli commercial** : Workflow forcé avec checklist obligatoire
- ✅ **Autonomie client** : Espace client 24h/24 avec tous les documents
- ✅ **Automatisation** : Relances intelligentes et notifications multicanal
- ✅ **Cross-selling** : Base solide pour propositions futures

---

## 🏗️ **Architecture Technique**

### **Stack Technique**

- **Frontend** : React 18 + TypeScript + Vite
- **Backend** : Supabase (PostgreSQL + Edge Functions + Storage + Auth)
- **Styling** : TailwindCSS
- **Icons** : Lucide React
- **Notifications** : Système multicanal interne

### **Structure Base de Données**

#### **Tables Principales**

| Table | Description | Clés importantes |
|-------|-------------|------------------|
| `crm_leads` | Tous les prospects | `id`, `workflow_stage`, `access_token` |
| `workflow_stages` | Configuration des 10 étapes | `stage_key`, `stage_order` |
| `insurance_companies` | Les 5 compagnies obligatoires | Generali, DEMA/MFA, Simple, Solide, Hasard, Zéphir |
| `company_quotes` | Devis ou refus par compagnie | `status`: `pending`/`quoted`/`refused` |
| `client_choices` | Choix client (devis + RIB + dates) | `chosen_quote_id`, `iban_encrypted` |
| `contracts` | Contrats générés et signés | `status`, `contract_pdf_url`, `signed_at` |
| `attestations` | Attestations d'assurance | `valid_from`, `valid_until` |
| `contract_modifications` | Demandes RIB/véhicule/adresse | `modification_type`, `status` |
| `claims` | Sinistres déclarés | `claim_number`, `status`, `documents` |
| `notification_queue` | File notifications multicanal | `channel`: `email`/`sms`/`whatsapp`/`push` |
| `scheduled_followups` | Relances programmées | `scheduled_for`, `status` |

---

## 🔄 **Workflow Complet - 10 Étapes**

### **1. NEW → Nouvelle demande**
- Client remplit formulaire sur site
- **Trigger automatique** : Email à tim@taxiassur.com
- Génération `access_token` sécurisé pour espace client

### **2. DOCS_REQUESTED → Documents demandés**
- Commercial demande documents obligatoires
- **Trigger automatique** : Email client + relances programmées
  - J+1 : Email de rappel
  - J+3 : SMS de rappel
  - J+7 : WhatsApp de rappel
- Relances **stoppables** manuellement par commercial

### **3. DOCS_COMPLETE → Documents validés**
- Commercial valide tous les documents
- Passage automatique à étape suivante

### **4. QUOTING → Devis en cours**
- Commercial se connecte sur les 5 extranets compagnies
- Récupère les devis OU marque les refus avec motif

### **5. QUOTES_READY → Devis disponibles**
- **Transition automatique** quand les 5 compagnies sont traitées
- **Trigger automatique** : Notifications Email + SMS + Push au client

### **6. CLIENT_CHOICE → Choix client**
- Client compare les devis dans son espace
- Sélectionne 1 devis + Date d'effet + RIB + Jour de prélèvement
- **Trigger automatique** : Email commercial "choix effectué"

### **7. CONTRACT_READY → Contrat prêt**
- Commercial génère contrat sur extranet compagnie
- Upload du PDF dans TaxiAssur
- **Trigger automatique** : Notifications Email + SMS + Push au client

### **8. SIGNING → Signature en cours**
- Client télécharge et signe le contrat
- Commercial marque "signé" dans le système

### **9. SIGNED → Contrat signé**
- Commercial renvoie contrat signé à la compagnie
- Récupère l'attestation d'assurance depuis l'extranet

### **10. ACTIVE → Contrat actif**
- Commercial upload attestation
- **Trigger automatique** : Notifications Email + SMS + Push au client
- Client peut gérer son contrat (modifications, sinistres, documents)

---

## 👤 **Côté Client (Taxi)**

### **Parcours Client**

#### **Phase 1 : Demande (NEW → DOCS_REQUESTED)**
1. Remplit formulaire en ligne (nom, email, téléphone, véhicule, etc.)
2. Reçoit email de confirmation avec lien vers espace client sécurisé
3. Upload des documents obligatoires :
   - Carte grise
   - Permis de conduire
   - Carte professionnelle taxi
   - RIB
   - Justificatif de domicile

#### **Phase 2 : Sélection (QUOTES_READY → CLIENT_CHOICE)**
1. Reçoit notification "Vos devis sont prêts"
2. Compare les devis dans son espace client :
   - Prix annuel
   - Franchise
   - Garanties incluses
   - PDF téléchargeable
3. Sélectionne le devis souhaité
4. Renseigne :
   - Date d'effet souhaitée
   - Jour de prélèvement (5, 10, 15, 20, 25)
   - IBAN (chiffré en base)
   - BIC
   - Titulaire du compte

#### **Phase 3 : Signature (CONTRACT_READY → SIGNED)**
1. Reçoit notification "Votre contrat est prêt"
2. Télécharge le contrat PDF
3. Signe le contrat (physique ou électronique)
4. Renvoie au commercial

#### **Phase 4 : Activation (ACTIVE)**
1. Reçoit notification "Votre attestation est disponible"
2. Télécharge attestation d'assurance
3. Accède à tous ses documents :
   - Contrat
   - Attestation(s)
   - Dispositions Particulières (DP)
   - Dispositions Générales (DG)
   - Document IPID
   - Constats amiables vierges

### **Fonctionnalités Espace Client**

#### **📄 Documents**
- Téléchargement, impression, visualisation
- Classement par catégorie (Essentiels, Contractuels, Sinistres)
- Historique complet avec dates de validité

#### **🚨 Sinistres**
- Déclaration en ligne avec formulaire détaillé
- Upload constat amiable + photos
- Suivi en temps réel du traitement
- Historique des changements de statut

#### **✏️ Modifications**
- Changement de RIB
- Changement de véhicule
- Changement d'adresse
- Approbation/refus par commercial avec notes

#### **💬 Chat Léa**
- Assistant IA disponible 24h/24
- Réponses instantanées
- Redirection vers commercial si nécessaire

#### **🔔 Notifications Push**
- Nouveaux documents disponibles
- Changement de statut sinistre
- Échéance de prélèvement
- Actions requises

---

## 👨‍💼 **Côté Commercial (TaxiAssur)**

### **Tableau de Bord CRM**

#### **Vue d'ensemble**
- Nombre de leads par étape workflow
- Leads créés dans les dernières 24h
- Temps moyen par étape
- Taux de conversion par étape

#### **WorkflowStageTracker**
- Visualisation graphique des 10 étapes
- Progression en temps réel
- Navigation cliquable entre étapes
- Actions disponibles par étape

### **Gestion des Leads**

#### **1. Réception Nouvelle Demande (NEW)**
- **Email automatique** : tim@taxiassur.com
- Contenu : Nom, email, téléphone, véhicule du prospect
- Action : Assigner à un commercial

#### **2. Demande de Documents (DOCS_REQUESTED)**
- Checklist automatique des documents manquants
- Bouton "Demander documents" → Trigger email + relances
- Validation document par document
- **Stop relances** automatique quand tous validés

#### **3. Gestion des 5 Compagnies (QUOTING)**

##### **FiveCompaniesManager - Interface dédiée**

Pour chaque compagnie (Generali, DEMA/MFA, Simple, Solide, Hasard, Zéphir) :

**Option A : Devis obtenu**
- Upload PDF du devis
- Montant prime annuelle (€)
- Montant franchise (€)
- Liste des garanties (séparées par virgules)
- Notes commerciales internes

**Option B : Refus compagnie**
- Motif de refus obligatoire
- Date de refus
- Notes commerciales internes

**Barre de progression** : 0% → 100% (les 5 doivent être complètes)

**Liens directs** : Accès aux extranets des compagnies

**Transition automatique** : Dès que les 5 sont traitées → QUOTES_READY + Notifications client

#### **4. Suivi Choix Client (CLIENT_CHOICE)**
- Vue récapitulative du choix :
  - Compagnie sélectionnée
  - Montant prime
  - Date d'effet
  - RIB (partiellement masqué)
  - Jour de prélèvement
- **Prochaine action** : Générer contrat sur extranet compagnie

#### **5. Upload Contrat (CONTRACT_READY)**
- Numéro de contrat
- Upload PDF du contrat
- Notifications automatiques au client
- Suivi signature

#### **6. Gestion Post-Signature (SIGNED → ACTIVE)**
- Confirmation signature
- **Action** : Renvoyer à compagnie
- Récupération attestation depuis extranet
- Upload attestation → ACTIVE
- Notifications client

### **Gestion des Sinistres (Backoffice)**

#### **Dashboard Sinistres**
- Liste tous les sinistres déclarés
- Filtres : Type, statut, date
- Assignation commercial

#### **Traitement Sinistre**
- Changement de statut : Déclaré → En instruction → Approuvé/Rejeté → Indemnisé
- Ajout de notes (internes ou visibles client)
- Upload documents complémentaires
- Montant estimé / Montant payé
- **Notifications automatiques** au client à chaque changement

#### **Statistiques**
- Nombre de sinistres par type
- Temps moyen de traitement
- Montants indemnisés

---

## 📬 **Système de Notifications Multicanal**

### **Canaux Disponibles**

#### **📧 Email**
- Nouvelle demande → tim@taxiassur.com
- Toutes communications client
- Templates HTML personnalisés
- Tracking ouverture/clics

#### **📱 SMS**
- Rappels urgents (J+3)
- Notifications importantes (Devis prêts, Contrat prêt)
- Format court et clair

#### **💚 WhatsApp**
- Relances douces (J+7)
- Rappels amicaux
- Possibilité de répondre

#### **🔔 Push (In-App)**
- Notifications instantanées dans l'espace client
- Badge de compteur
- Redirection directe vers l'action

### **Templates de Notifications**

| Template | Canaux | Moment déclencheur |
|----------|--------|-------------------|
| `new_lead_commercial` | Email | Nouveau lead créé |
| `docs_upload_request` | Email | Passage à DOCS_REQUESTED |
| `docs_reminder_j1` | Email | J+1 si documents incomplets |
| `docs_reminder_j3` | SMS | J+3 si documents incomplets |
| `docs_reminder_j7` | WhatsApp | J+7 si documents incomplets |
| `quotes_available` | Email + SMS + Push | Les 5 compagnies traitées |
| `contract_ready` | Email + SMS + Push | Contrat uploadé |
| `attestation_ready` | Email + SMS + Push | Attestation disponible |
| `claim_status_changed` | Email | Changement statut sinistre |

### **Gestion des Relances**

#### **Programmation Automatique**
- Relances créées automatiquement lors du changement de workflow
- Stockées dans `scheduled_followups`
- Exécutées par Edge Function à l'heure programmée

#### **Stop Relances**
- **Manuel** : Bouton "Arrêter les relances" dans le CRM
- **Automatique** : Quand documents validés ou autre action commerciale
- Fonction : `stop_lead_followups(lead_id, 'Documents validés')`

---

## 🏢 **Gestion des 5 Compagnies d'Assurance**

### **Les 5 Compagnies Obligatoires**

1. **Generali**
   - Extranet : https://extranet.generali.fr

2. **DEMA (MFA)**
   - Extranet : https://extranet.mfa.fr

3. **Simple Assurance**
   - Extranet : https://extranet.simple-assurance.fr

4. **Solide Assurance**
   - Extranet : https://extranet.solide-assurance.fr

5. **Hasard Assurance**
   - Extranet : https://extranet.hasard-assurance.fr

6. **Zéphir Assurance**
   - Extranet : https://extranet.zephir-assurance.fr

### **Workflow Commercial**

#### **Pour Chaque Compagnie**

1. **Se connecter** sur l'extranet de la compagnie
2. **Saisir les informations** du prospect
3. **Récupérer** le devis ou le refus
4. **Télécharger** le PDF du devis (si accepté)
5. **Retour dans TaxiAssur** :
   - Upload PDF
   - Saisir prime + franchise + garanties
   - OU marquer refus + motif
6. **Répéter** pour les 5 compagnies

#### **Règle Stricte**
- ❌ **Impossible de passer à l'étape suivante** sans avoir traité les 5 compagnies
- ✅ Chaque compagnie DOIT avoir soit un devis, soit un refus documenté

#### **Barre de Progression**
```
Generali     : ✅ Devis uploadé
DEMA (MFA)   : ✅ Devis uploadé
Simple       : ⏳ En attente
Solide       : ✅ Refusé (Sinistralité élevée)
Hasard       : ⏳ En attente
Zéphir       : ⏳ En attente

Progression : 50% (3/6 complétées)
```

#### **Auto-Transition**
Dès que les 6 compagnies sont complétées :
- Workflow passe automatiquement à `quotes_ready`
- Notifications multicanal envoyées au client
- Client peut comparer et choisir

---

## 🚨 **Système de Gestion des Sinistres**

### **Déclaration par le Client**

#### **Formulaire Complet**
- **Date et heure** du sinistre
- **Type** : Accident / Vol / Incendie / Bris de glace / Vandalisme / Autre
- **Lieu** : Adresse complète
- **Description détaillée** : Circonstances
- **Tiers impliqué** : Oui/Non + Coordonnées
- **Témoins** : Coordonnées
- **Rapport de police** : Oui/Non
- **Documents** :
  - Constat amiable (PDF)
  - Photos (max 5)

#### **Après Déclaration**
- Génération numéro sinistre : `SIN-{timestamp}`
- Email automatique à tim@taxiassur.com
- Statut initial : `declared`
- Client reçoit confirmation avec numéro de sinistre

### **Traitement par le Commercial**

#### **Statuts de Sinistre**

| Statut | Description | Actions disponibles |
|--------|-------------|---------------------|
| `declared` | Déclaré par le client | Passer en instruction |
| `investigating` | En cours d'instruction | Demander docs, contacter compagnie |
| `approved` | Approuvé par compagnie | Saisir montant, passer en payé |
| `rejected` | Rejeté | Motif obligatoire |
| `paid` | Indemnisé | Clôture |

#### **Actions Commerciales**
- Ajouter des **notes internes** (non visibles client)
- Ajouter des **notes client** (visibles dans son espace)
- Demander **documents complémentaires**
- Saisir **montant estimé** puis **montant payé**
- **Notifier le client** à chaque changement de statut

### **Suivi par le Client**

#### **Espace Sinistres**
- Liste de tous ses sinistres avec statuts
- Détails complets de chaque sinistre
- Documents uploadés
- Notes du commercial (si visibles)
- Bouton "Déclarer un nouveau sinistre"

#### **Notifications**
- Email automatique à chaque changement de statut
- SMS si sinistre approuvé ou rejeté
- Push notification in-app

---

## 📚 **Espace Client Complet**

### **Dashboard Unifié**

#### **Carte de Statut Principal**
- Statut actuel du dossier
- Progression visuelle
- Prochaine action à effectuer

#### **Statistiques en Direct** (si contrat actif)
- Numéro de contrat
- Date d'effet
- Date de validité attestation
- Jour de prélèvement mensuel

#### **Navigation par Onglets**

##### **1. Vue d'ensemble**
- Résumé du contrat
- Attestation principale téléchargeable
- Accès rapide aux actions courantes
- Boutons : Documents / Sinistres / Modifications / Chat Léa

##### **2. Documents**
Catégories :
- **Documents essentiels**
  - Contrat d'assurance
  - Attestation(s) d'assurance

- **Documents contractuels**
  - Dispositions Particulières (DP)
  - Dispositions Générales (DG)
  - Document IPID

- **Documents sinistres**
  - Constats amiables vierges

Actions par document :
- 👁️ Voir
- 📥 Télécharger
- 🖨️ Imprimer

##### **3. Sinistres**
- Bouton "Déclarer un sinistre"
- Liste des sinistres avec statuts
- Détails et suivi
- Upload documents complémentaires

##### **4. Modifications**
- Changement RIB
- Changement véhicule
- Changement adresse
- Autres demandes
- Statut des demandes en cours

### **Sécurité Accès Client**

#### **Token d'Accès Unique**
- Généré automatiquement : `access_token` (UUID)
- URL sécurisée : `https://taxiassur.com/espace-client/{access_token}`
- Pas de mot de passe requis
- Accès direct via email

#### **RLS (Row Level Security)**
- Client voit uniquement SES données
- Filtré par `lead_id` côté base de données
- Impossible d'accéder aux données d'un autre client

---

## 💬 **Chat Léa - Assistant IA**

### **Fonctionnalités**

#### **Disponibilité**
- 24h/24, 7j/7
- Réponses instantanées
- Contexte du dossier client

#### **Capacités**
- ✅ Répondre aux questions sur le contrat
- ✅ Expliquer les garanties
- ✅ Guider dans les démarches
- ✅ Fournir des documents types
- ✅ Prendre RDV avec commercial
- ✅ **Rediriger vers commercial si nécessaire**
- ✅ **Recommander TaxiAssur** (cross-selling doux)

#### **Intégration**
- Bouton flottant dans l'espace client
- Modal fullscreen sur clic
- Historique des conversations
- Notifications quand commercial répond

#### **Technologie**
- Composant existant : `SmartChatBot`
- Basé sur l'IA (GPT ou similaire)
- Contexte : `leadId`, informations du dossier

---

## 🔒 **Sécurité et Conformité**

### **Données Sensibles**

#### **Chiffrement**
- IBAN : Chiffré en base (base64 minimum, idéalement AES-256)
- Accès token : UUID v4 cryptographiquement sécurisé
- HTTPS obligatoire sur toutes les communications

#### **RGPD**
- Consentement explicite collecté au formulaire
- Droit d'accès, rectification, suppression
- Conservation limitée des données
- Politique de confidentialité accessible

### **Authentification**

#### **Côté Client**
- Token d'accès unique par lead
- Pas de système de connexion classique
- Lien sécurisé envoyé par email

#### **Côté Commercial**
- Authentification Supabase
- Rôles : `admin`, `commercial`, `user`
- RLS (Row Level Security) activé partout
- Logs d'audit sur actions sensibles

### **Storage Supabase**

#### **Buckets**
- `quotes` : Devis des compagnies
- `contracts` : Contrats signés
- `attestations` : Attestations d'assurance
- `claims` : Documents sinistres
- `documents` : Documents généraux

#### **Politiques d'Accès**
- Public uniquement via URL signée
- Expiration des liens temporaires
- Contrôle d'accès par RLS

---

## 🚀 **Déploiement et Maintenance**

### **Build Production**
```bash
npm run build
```

- Génère `/dist` optimisé
- Copie automatique des API PHP et fichiers statiques
- PWA activé pour mode hors ligne

### **Variables d'Environnement**

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### **Monitoring**

#### **Métriques à Surveiller**
- Temps de conversion par étape
- Taux d'abandon par étape
- Temps de réponse commercial
- Satisfaction client (NPS)
- Taux d'ouverture emails/SMS

#### **Alertes**
- Lead bloqué >48h sur une étape
- Sinistre non traité >24h
- Erreur critique Edge Function

---

## 📈 **Évolutions Futures**

### **Phase 2 - Cross-Selling**
- Proposition assurance habitation
- Assurance santé
- Assurance vie
- Produits d'épargne

### **Phase 3 - Automatisation Avancée**
- Génération automatique devis (API compagnies)
- Signature électronique intégrée (DocuSign, etc.)
- OCR automatique des documents
- Chatbot encore plus intelligent

### **Phase 4 - Analytics & IA**
- Prédiction de conversion
- Scoring automatique des leads
- Recommandation personnalisée de garanties
- Détection fraude sinistres

---

## 📞 **Support Technique**

### **Contact**
- **Email** : tim@taxiassur.com
- **Chat Léa** : Disponible 24h/24 dans l'application

### **Documentation Technique**
- Code source : `/tmp/cc-agent/61788020/project`
- Migrations : `/supabase/migrations`
- Composants : `/src/components/crm` et `/src/components/client`

---

**🎉 TaxiAssur - Votre assurance taxi, simplifiée.**
