# Workflow Prospect → Client Complet - Architecture 2026

## 📊 Vue d'Ensemble du Système

Ce document décrit l'architecture complète pour gérer le cycle de vie client de bout en bout.

---

## 🔄 Workflow Complet

### Phase 1: Prospect (Nouveau Lead)
```
Lead créé → Documents uploadés → Devis envoyés
```
- **Interface**: Espace Prospect (via token unique)
- **Tables**: `crm_leads`, `prospect_documents`, `lead_company_quotes`
- **Actions**:
  - Upload de documents (licence taxi, permis, carte grise, RIB, etc.)
  - Consultation des devis par compagnie
  - Sélection de la compagnie

### Phase 2: Négociation & Signature

#### A. Pour **GENERALI (Délégation Totale)** ⚡
```
Devis uploadé → Signature électronique (EDI/Yousign) → Contrat signé
```
- **Signature**: EDI Signature / Yousign
- **Documents à signer**:
  - Devis Generali
  - Contrat Generali
  - Mandat SEPA
- **Workflow**:
  1. Upload du devis par le commercial
  2. Envoi lien de signature électronique au prospect
  3. Prospect signe électroniquement
  4. Webhook de confirmation reçu
  5. **Passage automatique en CLIENT**

#### B. Pour **Courtiers Grossistes** (MFA, +Simple, Solly Azar, Zephir) 🏢
```
Devis uploadé → Compagnie gère signature → Docs récupérés → Client créé
```
- **Workflow**:
  1. Upload du devis par le commercial
  2. La compagnie gère la signature avec le client directement
  3. Le commercial reçoit les docs signés par email
  4. Le commercial upload contrat signé + attestation
  5. **Passage manuel en CLIENT**

### Phase 3: Transition Prospect → Client

#### Critères de Passage en Client
- ✅ Contrat signé (électroniquement ou scan uploadé)
- ✅ Paiement premier comptant reçu (si applicable)
- ✅ Documents obligatoires validés
- ✅ Attestation générée/reçue

#### Actions Automatiques lors de la Conversion
1. **Base de données**:
   - `crm_leads.converted_to_client = true`
   - `crm_leads.converted_at = now()`
   - Création dans `client_portal_users`
   - Création du lien `client_id` ↔ `lead_id`

2. **Gestion Documentaire**:
   - Copie de tous les documents de `prospect_documents` → `client_documents`
   - Copie des documents contractuels de `contract_documents` → `client_documents`
   - Création de l'historique documentaire

3. **Communication Client**:
   - Email de bienvenue avec identifiants espace client
   - Lien direct vers espace client: `https://taxiassur.com/client/dashboard?token={unique_token}`

### Phase 4: Espace Client

#### Interface Cliente Unifiée
```
/client/dashboard → Tableau de bord client complet
```

**Sections disponibles**:

1. **📄 Mes Documents**
   - Contrat signé
   - Attestation d'assurance en cours
   - Conditions générales
   - IPID (Document d'information)
   - Mandat SEPA
   - Mémo véhicules assurés
   - Documents uploadés initialement (permis, carte grise, etc.)
   - Avenants éventuels
   - Quittances de paiement

2. **🚗 Mes Contrats**
   - Contrats actifs/résiliés
   - Informations de couverture
   - Véhicules assurés
   - Échéances de paiement
   - Historique des modifications

3. **💰 Mes Paiements**
   - Quittances
   - Prochaines échéances
   - Historique de paiement
   - Téléchargement des factures

4. **🛡️ Mes Sinistres**
   - Déclaration de sinistre en ligne
   - Suivi des dossiers
   - Upload de documents (photos, constats, etc.)
   - Historique des sinistres

5. **✉️ Messagerie**
   - Communication directe avec le conseiller
   - Historique des échanges
   - Notifications en temps réel

6. **⚙️ Mon Profil**
   - Informations personnelles
   - Préférences de notification
   - Gestion du mot de passe

---

## 🗄️ Architecture Base de Données

### Tables Principales

#### 1. `crm_leads` (Table Centrale)
```sql
- id (uuid)
- first_name, last_name, email, phone
- status (lead_status enum)
- converted_to_client (boolean) ← Clé de conversion
- converted_at (timestamp)
- access_token (text) ← Token pour espace prospect
```

#### 2. `client_portal_users` (Comptes Clients)
```sql
- id (uuid)
- lead_id (uuid) ← Lien vers crm_leads
- client_id (uuid) ← ID client unique
- email, password_hash
- is_active (boolean)
- created_at, last_login_at
```

#### 3. `client_documents` (Documents Client)
```sql
- id (uuid)
- client_id (uuid)
- document_type (text) ← devis, contrat, attestation, quittance, etc.
- document_name (text)
- file_url (text)
- document_category (text) ← contrat, sinistre, paiement, etc.
- created_at, uploaded_at
- is_client_visible (boolean) ← Afficher dans l'espace client
```

#### 4. `client_contracts` (Contrats Clients)
```sql
- id (uuid)
- client_id (uuid)
- company_id (uuid) ← Compagnie d'assurance
- contract_number (text)
- start_date, end_date
- premium_amount (decimal)
- payment_frequency (text)
- status (text) ← active, suspended, cancelled
- created_at, signed_at
```

#### 5. `client_claims` (Sinistres Clients)
```sql
- id (uuid)
- client_id (uuid)
- contract_id (uuid)
- claim_number (text)
- claim_date (date)
- claim_type (text)
- status (text) ← declared, in_progress, closed
- description (text)
- created_at
```

#### 6. `lead_contract_signatures` (Signatures Électroniques)
```sql
- id (uuid)
- lead_id (uuid)
- company_id (uuid)
- signature_provider (text) ← yousign, edi_signature, docusign
- signature_request_id (text) ← ID externe
- document_type (text) ← devis, contrat, mandat_sepa
- signature_url (text)
- signed_at (timestamp)
- signer_name, signer_email, signer_ip
- status (text) ← pending, signed, refused, expired
```

---

## 🔌 Intégration EDI Signature / Yousign

### Configuration

#### EDI Signature (Recommandé pour France)
```typescript
// Configuration
const EDI_SIGNATURE_API_KEY = process.env.EDI_SIGNATURE_API_KEY;
const EDI_SIGNATURE_API_URL = 'https://api.edi-signature.com/v1';

// Environnement: Production ou Test
const EDI_ENVIRONMENT = 'production'; // ou 'sandbox'
```

#### Yousign (Alternative)
```typescript
const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY;
const YOUSIGN_API_URL = 'https://api.yousign.com/v3';
```

### Workflow de Signature

#### Étape 1: Création de la demande de signature
```typescript
async function createSignatureRequest(leadId: string, companyId: string, documentType: string) {
  // 1. Récupérer les infos du lead
  const { data: lead } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('id', leadId)
    .single();

  // 2. Récupérer le document à signer
  const { data: document } = await supabase
    .from('contract_documents')
    .select('*')
    .eq('lead_id', leadId)
    .eq('company_id', companyId)
    .eq('document_type', documentType)
    .single();

  // 3. Appel API EDI Signature
  const response = await fetch(`${EDI_SIGNATURE_API_URL}/signature-requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EDI_SIGNATURE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `Signature ${documentType} - ${lead.first_name} ${lead.last_name}`,
      documents: [{
        name: document.document_name,
        content: document.file_url, // URL du PDF
        type: 'url'
      }],
      signers: [{
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        locale: 'fr'
      }],
      webhook_url: `${SUPABASE_URL}/functions/v1/edi-signature-webhook`,
      expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
    })
  });

  const result = await response.json();

  // 4. Sauvegarder la demande
  await supabase.from('lead_contract_signatures').insert({
    lead_id: leadId,
    company_id: companyId,
    signature_provider: 'edi_signature',
    signature_request_id: result.id,
    document_type: documentType,
    signature_url: result.signers[0].signature_link,
    status: 'pending'
  });

  // 5. Envoyer l'email au prospect
  await sendSignatureEmail(lead.email, result.signers[0].signature_link, documentType);

  return result;
}
```

#### Étape 2: Webhook de confirmation
```typescript
// Edge Function: edi-signature-webhook
export async function handleEDISignatureWebhook(req: Request) {
  const payload = await req.json();

  // Événements possibles:
  // - signature_request.signed
  // - signature_request.refused
  // - signature_request.expired

  if (payload.event === 'signature_request.signed') {
    const signatureRequestId = payload.signature_request.id;

    // 1. Mettre à jour le statut de la signature
    const { data: signature } = await supabase
      .from('lead_contract_signatures')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signer_ip: payload.signer.ip_address
      })
      .eq('signature_request_id', signatureRequestId)
      .select()
      .single();

    // 2. Mettre à jour le document
    await supabase
      .from('contract_documents')
      .update({
        is_signed: true,
        signed_at: new Date().toISOString(),
        status: 'signed'
      })
      .eq('lead_id', signature.lead_id)
      .eq('document_type', signature.document_type);

    // 3. Vérifier si TOUS les documents requis sont signés
    const { data: allSignatures } = await supabase
      .from('lead_contract_signatures')
      .select('*')
      .eq('lead_id', signature.lead_id)
      .eq('company_id', signature.company_id);

    const allSigned = allSignatures.every(s => s.status === 'signed');

    // 4. Si tout est signé → CONVERSION EN CLIENT
    if (allSigned) {
      await convertProspectToClient(signature.lead_id);
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### Étape 3: Conversion automatique Prospect → Client
```typescript
async function convertProspectToClient(leadId: string) {
  // 1. Récupérer le lead
  const { data: lead } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('id', leadId)
    .single();

  // 2. Créer le compte client
  const clientId = crypto.randomUUID();
  const temporaryPassword = generateSecurePassword();
  const hashedPassword = await hashPassword(temporaryPassword);

  await supabase.from('client_portal_users').insert({
    client_id: clientId,
    lead_id: leadId,
    email: lead.email,
    password_hash: hashedPassword,
    first_name: lead.first_name,
    last_name: lead.last_name,
    phone: lead.phone,
    is_active: true
  });

  // 3. Marquer le lead comme converti
  await supabase
    .from('crm_leads')
    .update({
      converted_to_client: true,
      converted_at: new Date().toISOString()
    })
    .eq('id', leadId);

  // 4. Copier tous les documents vers client_documents
  const { data: prospectDocs } = await supabase
    .from('prospect_documents')
    .select('*')
    .eq('lead_id', leadId);

  const { data: contractDocs } = await supabase
    .from('contract_documents')
    .select('*')
    .eq('lead_id', leadId);

  const allDocs = [...(prospectDocs || []), ...(contractDocs || [])];

  for (const doc of allDocs) {
    await supabase.from('client_documents').insert({
      client_id: clientId,
      document_type: doc.document_type,
      document_name: doc.document_name || doc.file_name,
      file_url: doc.file_url || doc.download_url,
      document_category: getDocumentCategory(doc.document_type),
      is_client_visible: true,
      created_at: doc.created_at
    });
  }

  // 5. Créer le contrat client
  const { data: leadContract } = await supabase
    .from('lead_contracts')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (leadContract) {
    await supabase.from('client_contracts').insert({
      client_id: clientId,
      company_id: leadContract.company_id,
      contract_number: generateContractNumber(),
      start_date: leadContract.start_date,
      end_date: leadContract.end_date,
      premium_amount: leadContract.premium_amount,
      payment_frequency: leadContract.payment_frequency,
      status: 'active',
      signed_at: new Date().toISOString()
    });
  }

  // 6. Envoyer email de bienvenue avec identifiants
  await sendClientWelcomeEmail({
    email: lead.email,
    first_name: lead.first_name,
    temporary_password: temporaryPassword,
    login_url: `https://taxiassur.com/espace-client`
  });

  // 7. Notifier le commercial
  await notifyCommercialOfConversion(leadId);

  return { success: true, client_id: clientId };
}
```

---

## 📱 Composants Frontend

### 1. ContractSignatureManager (CRM)
**Fichier**: `src/components/crm/ContractSignatureManager.tsx`

Permet au commercial de:
- Envoyer une demande de signature électronique
- Suivre le statut des signatures
- Relancer le prospect si pas signé
- Voir l'historique des signatures

### 2. ClientDocumentsViewer (Espace Client)
**Fichier**: `src/components/client/ClientDocumentsViewer.tsx`

Permet au client de:
- Voir tous ses documents
- Télécharger les documents
- Filtrer par catégorie (contrat, sinistre, paiement, etc.)
- Rechercher un document

### 3. ClientContractDetails (Espace Client)
**Fichier**: `src/components/client/ClientContractDetails.tsx`

Affiche:
- Détails du contrat
- Véhicules assurés
- Garanties
- Échéances
- Documents liés

---

## 🚀 Plan d'Implémentation

### Phase 1: Préparation (Jour 1-2)
- ✅ Créer les tables manquantes
- ✅ Créer les fonctions Supabase (RPC)
- ✅ Mettre en place les webhooks

### Phase 2: Intégration EDI Signature (Jour 3-5)
- ✅ Configuration de l'API EDI Signature
- ✅ Création de l'Edge Function webhook
- ✅ Tests en environnement sandbox
- ✅ Composant CRM pour envoi de signature

### Phase 3: Workflow Conversion (Jour 6-8)
- ✅ Fonction automatique de conversion
- ✅ Copie des documents
- ✅ Création compte client
- ✅ Email de bienvenue

### Phase 4: Espace Client (Jour 9-12)
- ✅ Dashboard client unifié
- ✅ Gestion documentaire
- ✅ Gestion des contrats
- ✅ Gestion des sinistres
- ✅ Messagerie

### Phase 5: Tests & Déploiement (Jour 13-15)
- ✅ Tests unitaires
- ✅ Tests d'intégration
- ✅ Tests end-to-end
- ✅ Déploiement en production

---

## 🎯 Résumé Final

### Pour GENERALI (Délégation Totale) ⚡
```
Lead → Devis → Signature EDI → Conversion Auto → Espace Client
```

### Pour Courtiers Grossistes 🏢
```
Lead → Devis → Signature externe → Upload docs → Conversion Manuelle → Espace Client
```

### Espace Client Unifié
```
Client → Login → Dashboard → Documents/Contrats/Sinistres/Paiements
```

Ce système garantit:
- ✅ Workflow fluide et automatisé
- ✅ Traçabilité complète
- ✅ Expérience client optimale
- ✅ Conformité légale (signature électronique)
- ✅ Gain de temps pour les commerciaux
