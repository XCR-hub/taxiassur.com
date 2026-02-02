# Architecture CRM Vente & Gestion - Système Complet 2026

## 📊 Vue d'Ensemble

Ce système sépare clairement **2 CRM distincts** avec des utilisateurs, workflows et documents différents :

### 🎯 CRM VENTE (Commerciaux)
- **Objectif** : Convertir les prospects en clients
- **Utilisateurs** : Commerciaux
- **Scope** : Leads → Devis → Signature → Conversion
- **Sortie** : Client converti → Envoyé au CRM Gestion

### 📦 CRM GESTION (Gestionnaires)
- **Objectif** : Gérer le portefeuille de contrats actifs
- **Utilisateurs** : Gestionnaires de contrats
- **Scope** : Contrats actifs → Quittances → Avenants → Sinistres → Renouvellements
- **Entrée** : Réception des clients depuis le CRM Vente

---

## 🗄️ Architecture Base de Données

### 1. Gestion Documentaire par Compagnie

#### Table: `company_document_library`
```sql
Bibliothèque de documents FIXES par compagnie d'assurance
```

**Colonnes** :
- `id` (uuid)
- `company_id` (uuid) → insurance_companies
- `document_type` (text) : 'conditions_generales', 'ipid', 'convention_assistance', 'notice_information', 'mandat_sepa_type'
- `document_category` (text) : 'legal', 'contractuel', 'information'
- `document_name` (text) : "Conditions Générales Generali 2026"
- `file_url` (text) : URL du fichier dans Storage
- `version` (text) : "V2026.01"
- `valid_from` (date) : Date de début de validité
- `valid_until` (date) : Date de fin de validité (nullable)
- `is_active` (boolean) : Document en vigueur
- `is_mandatory` (boolean) : Doit être attaché automatiquement
- `auto_attach_on` (text[]) : ['devis', 'contrat', 'prospect_space'] → Quand l'attacher auto
- `display_order` (integer) : Ordre d'affichage
- `description` (text)
- `file_size_bytes` (integer)
- `mime_type` (text)
- `created_at`, `updated_at`

**Indexes** :
```sql
idx_company_docs_company_id ON company_id
idx_company_docs_active ON is_active WHERE is_active = true
idx_company_docs_type ON document_type
```

#### Table: `contract_document_associations`
```sql
Association entre contrats/devis et documents généraux
```

**Colonnes** :
- `id` (uuid)
- `lead_id` (uuid) → crm_leads
- `company_id` (uuid) → insurance_companies
- `company_document_id` (uuid) → company_document_library
- `association_type` (text) : 'devis', 'contrat', 'prospect_access'
- `attached_at` (timestamptz)
- `attached_by` (uuid) → admin_users (qui a fait l'association)
- `is_sent_to_prospect` (boolean)
- `sent_at` (timestamptz)
- `is_viewed` (boolean)
- `viewed_at` (timestamptz)
- `created_at`

**Indexes** :
```sql
idx_doc_assoc_lead ON lead_id
idx_doc_assoc_company ON company_id
idx_doc_assoc_type ON association_type
```

---

### 2. Séparation CRM Vente vs Gestion

#### Table: `user_roles` (Enhanced)
```sql
Rôles utilisateurs avec permissions granulaires
```

**Colonnes** :
- `id` (uuid)
- `name` (text) : 'commercial', 'gestionnaire', 'admin', 'directeur_commercial', 'directeur_gestion'
- `display_name` (text) : "Commercial", "Gestionnaire de Portefeuille"
- `description` (text)
- `crm_access` (text) : 'vente', 'gestion', 'both'
- `permissions` (jsonb) : Object with detailed permissions
- `is_active` (boolean)
- `created_at`, `updated_at`

**Exemple permissions** :
```json
{
  "leads": {
    "view": true,
    "create": true,
    "edit": true,
    "delete": false,
    "assign": false
  },
  "contracts": {
    "view": false,
    "create": false,
    "edit": false,
    "manage": false
  },
  "documents": {
    "upload": true,
    "download": true,
    "validate": false,
    "delete": false
  },
  "quotes": {
    "create": true,
    "send": true,
    "edit": true
  }
}
```

#### Table: `admin_user_roles`
```sql
Association utilisateurs ↔ rôles (many-to-many)
```

**Colonnes** :
- `id` (uuid)
- `admin_user_id` (uuid) → admin_users
- `role_id` (uuid) → user_roles
- `assigned_at` (timestamptz)
- `assigned_by` (uuid)
- `is_active` (boolean)
- `created_at`

#### Table: `contract_portfolio` (Nouveau CRM Gestion)
```sql
Portefeuille de contrats en gestion
```

**Colonnes** :
- `id` (uuid)
- `client_id` (uuid) → client_portal_users.client_id
- `lead_id` (uuid) → crm_leads (traçabilité origine)
- `contract_id` (uuid) → client_contracts
- `company_id` (uuid) → insurance_companies
- `contract_number` (text) UNIQUE
-
- **Informations client**
- `client_name` (text)
- `client_email` (text)
- `client_phone` (text)
- `company_name` (text)
- `siret` (text)
-
- **Gestionnaire assigné**
- `assigned_to` (uuid) → admin_users (gestionnaire)
- `assigned_at` (timestamptz)
-
- **Statut contrat**
- `status` (text) : 'active', 'suspended', 'pending_cancellation', 'cancelled', 'expired'
- `activation_date` (date)
- `expiry_date` (date)
- `renewal_date` (date)
-
- **Financier**
- `annual_premium_ht` (decimal)
- `annual_premium_ttc` (decimal)
- `payment_frequency` (text)
- `next_payment_date` (date)
- `payment_status` (text) : 'up_to_date', 'late', 'very_late'
-
- **Véhicules**
- `vehicles_count` (integer)
- `vehicles` (jsonb) : Array of vehicles
-
- **Indicateurs de gestion**
- `claims_count` (integer)
- `last_claim_date` (date)
- `modifications_count` (integer)
- `last_modification_date` (date)
- `client_satisfaction_score` (integer) : 1-5
- `renewal_probability` (integer) : 0-100 (calculé par IA)
-
- **Alertes**
- `has_pending_actions` (boolean)
- `pending_actions` (jsonb) : Array of pending actions
- `alerts` (jsonb) : Array of alerts
-
- **Dates importantes**
- `last_contact_date` (timestamptz)
- `next_followup_date` (timestamptz)
- `created_at`, `updated_at`

**Indexes** :
```sql
idx_portfolio_client ON client_id
idx_portfolio_gestionnaire ON assigned_to
idx_portfolio_status ON status
idx_portfolio_company ON company_id
idx_portfolio_renewal ON renewal_date WHERE status = 'active'
idx_portfolio_payment ON payment_status WHERE payment_status != 'up_to_date'
```

---

## 🔄 Workflow Documentaire Complet

### Phase 1: Prospect (CRM Vente)

#### 1.1 Upload du Devis
```typescript
Commercial upload devis Generali → Trigger automatique
```

**Action automatique** :
1. Détection de la compagnie (company_id)
2. Récupération des documents obligatoires de la compagnie
3. Association automatique des documents

**SQL Trigger** :
```sql
CREATE TRIGGER auto_attach_company_documents
AFTER INSERT ON lead_company_quotes
FOR EACH ROW
EXECUTE FUNCTION attach_company_documents();
```

**Fonction** :
```sql
CREATE FUNCTION attach_company_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- Attacher tous les documents obligatoires de la compagnie
  INSERT INTO contract_document_associations (
    lead_id,
    company_id,
    company_document_id,
    association_type,
    attached_by,
    is_sent_to_prospect
  )
  SELECT
    NEW.lead_id,
    NEW.company_id,
    cd.id,
    'devis',
    auth.uid(),
    true
  FROM company_document_library cd
  WHERE cd.company_id = NEW.company_id
    AND cd.is_active = true
    AND cd.is_mandatory = true
    AND 'devis' = ANY(cd.auto_attach_on);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 Espace Prospect - Documents Visibles

**Pour GENERALI (Délégation totale)** :
- ✅ Devis Generali
- ✅ Conditions Générales Generali (auto-attaché)
- ✅ IPID Generali (auto-attaché)
- ✅ Convention d'Assistance Generali (auto-attaché)
- ✅ Notice d'information (auto-attaché)

**Pour MFA/+Simple (Courtiers grossistes)** :
- ✅ Devis uniquement
- ℹ️ Message : "Les documents contractuels seront envoyés par la compagnie"

#### 1.3 Signature & Contrat
Quand le contrat est uploadé :
```sql
-- Attacher documents contractuels
INSERT INTO contract_document_associations
SELECT ... WHERE 'contrat' = ANY(auto_attach_on);
```

Documents attachés :
- ✅ Contrat signé (conditions particulières)
- ✅ Attestation d'assurance
- ✅ Conditions Générales (si pas déjà attaché)
- ✅ IPID (si pas déjà attaché)
- ✅ Convention d'Assistance (si pas déjà attaché)

---

### Phase 2: Conversion → Client (Transition)

#### Action: `convert_prospect_to_client()`

**Étapes** :
1. ✅ Créer compte `client_portal_users`
2. ✅ Créer contrat `client_contracts`
3. ✅ Copier tous les documents vers `client_documents`
4. ✅ **Créer entrée dans `contract_portfolio`** (CRM Gestion)
5. ✅ Assigner à un gestionnaire
6. ✅ Marquer lead comme converti
7. ✅ Envoyer email client
8. ✅ Notifier le gestionnaire assigné

---

### Phase 3: Gestion (CRM Gestion)

#### 3.1 Interface Gestionnaire

**Tableau de Bord Portefeuille** :
- Liste des contrats actifs
- Filtres : Compagnie, Statut, Échéance proche
- Alertes : Paiements en retard, Renouvellements proches
- KPIs : Prime totale, Taux de rétention, Sinistralité

**Fiche Contrat** :
```
┌─────────────────────────────────────────┐
│ CONTRAT TAXI-2026-000123                │
│ Client: Jean Dupont                     │
│ Compagnie: Generali                     │
│ Gestionnaire: Marie Martin              │
├─────────────────────────────────────────┤
│ Onglets:                                │
│ • Synthèse                              │
│ • Documents                             │
│ • Échéancier & Quittances               │
│ • Sinistres                             │
│ • Avenants & Modifications              │
│ • Renouvellement                        │
│ • Historique & Notes                    │
└─────────────────────────────────────────┘
```

#### 3.2 Documents en Gestion

**Documents Fixes (Lecture seule)** :
- Contrat initial
- Conditions Générales
- IPID
- Convention d'Assistance

**Documents Variables (Ajout au fil du temps)** :
- Quittances de paiement (générées automatiquement)
- Avenants (ajout véhicule, changement garantie)
- Attestations mises à jour
- Courriers et échanges
- Constats de sinistre

#### 3.3 Cycle de Vie Documentaire

```
┌──────────────────────────────────────────┐
│ CYCLE DE VIE DU CONTRAT                  │
├──────────────────────────────────────────┤
│                                          │
│ Activation (J0)                          │
│ ├─ Contrat signé                         │
│ ├─ Attestation initiale                  │
│ ├─ CG + IPID + Convention                │
│ └─ Mandat SEPA                           │
│                                          │
│ Paiements (Mensuel/Annuel)               │
│ ├─ Quittance #1, #2, #3...               │
│ └─ Reçus de paiement                     │
│                                          │
│ Modifications (Si nécessaire)            │
│ ├─ Avenant #1: Ajout véhicule            │
│ ├─ Avenant #2: Changement garantie       │
│ └─ Nouvelles attestations                │
│                                          │
│ Sinistres (Si surviennent)               │
│ ├─ Déclaration de sinistre               │
│ ├─ Constat amiable                       │
│ ├─ Photos / Expertises                   │
│ └─ Courriers compagnie                   │
│                                          │
│ Renouvellement (Chaque année)            │
│ ├─ Proposition de renouvellement         │
│ ├─ Nouvelle attestation                  │
│ └─ Avenant de tacite reconduction        │
│                                          │
│ Résiliation (Fin de contrat)             │
│ ├─ Lettre de résiliation                 │
│ ├─ Solde de tout compte                  │
│ └─ Archivage du dossier                  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 👥 Rôles & Permissions

### Rôle: Commercial (CRM Vente)

**Accès** :
- ✅ CRM Vente complet
- ✅ Leads & Prospects
- ✅ Création/envoi de devis
- ✅ Upload de documents (devis, contrat)
- ✅ Suivi de la conversion
- ✅ Validation documents prospects
- ❌ CRM Gestion (sauf vue lecture)
- ❌ Modification de contrats actifs
- ❌ Gestion des sinistres

**Permissions détaillées** :
```json
{
  "crm_access": "vente",
  "leads": { "view": true, "create": true, "edit": true, "assign": false },
  "quotes": { "create": true, "send": true, "edit": true },
  "documents": { "upload": true, "download": true, "validate": true },
  "contracts": { "view": false, "edit": false, "manage": false },
  "claims": { "view": false, "create": false, "manage": false }
}
```

### Rôle: Gestionnaire (CRM Gestion)

**Accès** :
- ✅ CRM Gestion complet
- ✅ Portefeuille de contrats
- ✅ Gestion des quittances
- ✅ Gestion des avenants
- ✅ Gestion des sinistres
- ✅ Suivi des renouvellements
- ✅ Upload de documents gestion
- ⚠️ CRM Vente (lecture seule pour historique)
- ❌ Modification des leads actifs

**Permissions détaillées** :
```json
{
  "crm_access": "gestion",
  "leads": { "view": true, "create": false, "edit": false },
  "contracts": { "view": true, "edit": true, "manage": true },
  "claims": { "view": true, "create": true, "manage": true },
  "payments": { "view": true, "manage": true, "generate_quittances": true },
  "renewals": { "view": true, "manage": true, "send_proposals": true },
  "documents": { "upload": true, "download": true, "archive": true }
}
```

### Rôle: Directeur Commercial

**Accès** :
- ✅ Tout CRM Vente
- ✅ Vue d'ensemble des performances
- ✅ Assignation de leads
- ✅ Gestion des commerciaux
- ✅ Stats et reporting vente
- ⚠️ CRM Gestion (lecture)

### Rôle: Directeur Gestion

**Accès** :
- ✅ Tout CRM Gestion
- ✅ Vue d'ensemble du portefeuille
- ✅ Assignation de contrats
- ✅ Gestion des gestionnaires
- ✅ Stats et reporting gestion
- ⚠️ CRM Vente (lecture)

### Rôle: Admin

**Accès** :
- ✅ Accès total aux 2 CRM
- ✅ Gestion des utilisateurs
- ✅ Gestion de la bibliothèque documentaire
- ✅ Configuration des compagnies
- ✅ Gestion des permissions

---

## 🏗️ Interface Utilisateur

### 1. CRM Vente (Commerciaux)

**Navigation** :
```
┌──────────────────────────────────────┐
│ 🎯 CRM VENTE                         │
├──────────────────────────────────────┤
│ • Tableau de Bord                    │
│ • Pipeline Kanban                    │
│ • Mes Leads                          │
│ • Devis en Cours                     │
│ • Signatures en Attente              │
│ • Conversions du Mois                │
│ • Stats & Objectifs                  │
└──────────────────────────────────────┘
```

### 2. CRM Gestion (Gestionnaires)

**Navigation** :
```
┌──────────────────────────────────────┐
│ 📦 CRM GESTION - PORTEFEUILLE        │
├──────────────────────────────────────┤
│ • Tableau de Bord Portefeuille       │
│ • Contrats Actifs                    │
│ • Échéances & Quittances             │
│ • Sinistres en Cours                 │
│ • Renouvellements à Venir            │
│ • Alertes & Actions                  │
│ • Reporting Gestion                  │
└──────────────────────────────────────┘
```

### 3. Bibliothèque Documentaire (Admin)

**Interface** :
```
┌──────────────────────────────────────────────────┐
│ 📚 BIBLIOTHÈQUE DOCUMENTAIRE                     │
├──────────────────────────────────────────────────┤
│ Par Compagnie:                                   │
│                                                  │
│ ▼ GENERALI                                       │
│   ├─ Conditions Générales 2026 (v2026.01)       │
│   │   └─ Auto-attacher: ☑ Devis ☑ Contrat       │
│   ├─ IPID 2026                                   │
│   │   └─ Auto-attacher: ☑ Devis ☑ Contrat       │
│   ├─ Convention d'Assistance                     │
│   │   └─ Auto-attacher: ☑ Contrat               │
│   └─ Notice d'Information                        │
│       └─ Auto-attacher: ☑ Prospect               │
│                                                  │
│ ▼ MFA                                            │
│   ├─ Conditions Générales MFA 2026              │
│   ├─ IPID MFA                                    │
│   └─ Convention d'Assistance MFA                 │
│                                                  │
│ [+ Ajouter un Document]                          │
└──────────────────────────────────────────────────┘
```

---

## 🚀 Flux d'Intégration Automatique

### Scénario: Upload d'un Devis Generali

**Actions automatiques** :

```typescript
// 1. Commercial upload le devis
await uploadQuote({
  lead_id: "xxx",
  company_id: "generali-uuid",
  file: devis_generali.pdf
});

// 2. Trigger automatique s'exécute
TRIGGER: auto_attach_company_documents()

// 3. Documents Generali attachés automatiquement:
✅ Conditions Générales Generali 2026.pdf
✅ IPID Generali.pdf
✅ Convention Assistance Generali.pdf
✅ Notice Information Generali.pdf

// 4. Prospect peut voir dans son espace:
- Devis Generali (uploadé par commercial)
- + 4 documents généraux (auto-attachés)

// 5. Email envoyé au prospect:
"Votre devis est prêt ! Consultez-le avec les documents associés"
```

### Scénario: Signature du Contrat

```typescript
// 1. Signature confirmée (webhook Yousign)
await handleSignatureWebhook({
  signature_request_id: "xxx",
  status: "signed"
});

// 2. Attacher documents contractuels
TRIGGER: auto_attach_contract_documents()

// 3. Documents ajoutés:
✅ Contrat signé (conditions particulières)
✅ Attestation d'assurance
✅ Mandat SEPA signé
(CG, IPID, Convention déjà attachés au devis)

// 4. Conversion automatique en client
await convertProspectToClient(lead_id);

// 5. Création dans CRM Gestion
INSERT INTO contract_portfolio (...)
  - Contrat actif
  - Assignation à un gestionnaire
  - Copie de tous les documents

// 6. Notification gestionnaire:
"Nouveau contrat assigné: Jean Dupont - TAXI-2026-000123"
```

---

## 📊 Reporting & Analytics

### CRM Vente (Commerciaux)

**KPIs** :
- Nombre de leads
- Taux de conversion
- Devis envoyés vs signés
- Chiffre d'affaires généré
- Délai moyen de conversion

### CRM Gestion (Gestionnaires)

**KPIs** :
- Nombre de contrats en portefeuille
- Prime totale gérée
- Taux de rétention
- Taux de sinistralité
- Taux de renouvellement
- Délai moyen de traitement

---

## 🎯 Résumé de l'Architecture

### Documents FIXES par Compagnie
- ✅ Stockés dans `company_document_library`
- ✅ Versionnés et datés
- ✅ Association automatique configurable
- ✅ Interface admin pour gérer

### Documents VARIABLES par Contrat
- ✅ Devis (conditions particulières)
- ✅ Contrat signé
- ✅ Attestations
- ✅ Quittances
- ✅ Avenants
- ✅ Sinistres

### Séparation CRM Vente / Gestion
- ✅ 2 interfaces distinctes
- ✅ Rôles et permissions différents
- ✅ Workflows adaptés
- ✅ Transition automatique lors de la conversion

### Cycle de Vie Complet
- ✅ Prospect → Client → Contrat → Renouvellement
- ✅ Documents suivent le contrat
- ✅ Historique complet
- ✅ Traçabilité totale

---

## 🔧 Prochaines Étapes d'Implémentation

### Phase 1: Base de Données (Jour 1-2)
1. Créer `company_document_library`
2. Créer `contract_document_associations`
3. Créer `user_roles` et `admin_user_roles`
4. Créer `contract_portfolio`
5. Créer triggers d'association automatique

### Phase 2: Bibliothèque Documentaire (Jour 3-4)
1. Interface admin pour gérer les documents par compagnie
2. Upload et versioning
3. Configuration auto-attachment

### Phase 3: Intégration CRM Vente (Jour 5-7)
1. Association automatique au devis
2. Affichage dans espace prospect
3. Gestion dans le lead detail

### Phase 4: CRM Gestion (Jour 8-12)
1. Interface portefeuille de contrats
2. Tableau de bord gestionnaire
3. Gestion des documents de vie du contrat
4. Gestion des quittances, avenants, sinistres

### Phase 5: Permissions & Rôles (Jour 13-14)
1. Système de permissions granulaire
2. Guards de navigation
3. Tests de sécurité

### Phase 6: Tests & Déploiement (Jour 15)
1. Tests end-to-end
2. Formation utilisateurs
3. Déploiement progressif
