# Système de Récupération et Classification des Pièces Jointes Email

## 🎯 Objectif

Permettre au système de :
1. Récupérer automatiquement les emails entrants (IMAP IONOS)
2. Extraire les pièces jointes
3. Les classifier automatiquement
4. Les présenter dans un "panier" où le commercial peut les organiser par drag & drop

---

## ✅ Ce qui a été créé

### 1. Base de données (FAIT ✓)

Trois tables créées :

#### `email_messages`
```sql
- id (uuid)
- imap_uid (unique) - ID IMAP pour éviter les doublons
- from_email - Expéditeur
- to_email - Destinataire
- subject - Sujet
- body_text / body_html - Corps du message
- received_at - Date de réception
- case_id - Rattachement automatique au dossier lead
- status - pending/processed/failed/ignored
- raw_headers (jsonb) - Headers complets
```

#### `email_attachments`
```sql
- id (uuid)
- email_message_id - FK vers email_messages
- filename - Nom du fichier
- content_type - Type MIME
- file_size - Taille en octets
- storage_path - Chemin dans Supabase Storage
- preview_path - Miniature (optionnel)
- proposed_doc_type - Type suggéré (RIB, permis, etc.)
- classification_confidence - Score de confiance (0-1)
- classification_method - Comment classifié (filename/ocr/ml)
- assigned_document_id - FK vers crm_documents une fois classé
- status - unclassified/classified/rejected/assigned
```

#### `attachment_classifications`
```sql
- id (uuid)
- attachment_id - FK vers email_attachments
- doc_type - Type de document
- confidence - Score de confiance
- method - Méthode utilisée
- keywords (jsonb) - Mots-clés trouvés
- metadata (jsonb) - Métadonnées additionnelles
```

### 2. Fonctions SQL créées (FAIT ✓)

#### `match_email_to_case()` - Trigger automatique
Rattache automatiquement chaque email entrant au bon lead en cherchant par :
1. Email du prospect
2. Créé dans les 30 derniers jours
3. Non archivé

#### `get_document_basket(case_id)` - API Frontend
Retourne tous les attachments non classés pour un dossier donné avec :
- Infos fichier
- Classification proposée
- Email source
- Date de réception

#### `classify_attachment(attachment_id, doc_type, create_document)` - Action commerciale
Permet de :
1. Classifier un attachment vers un type de document
2. Créer automatiquement l'entrée dans `crm_documents`
3. Mettre à jour le statut de l'attachment

---

## 📋 Ce qu'il reste à faire

### 1. Edge Function IMAP (À créer)

**Fichier** : `supabase/functions/sync-ionos-emails/index.ts`

**Configuration IONOS** :
```env
IONOS_IMAP_HOST=imap.ionos.com
IONOS_IMAP_PORT=993
IONOS_IMAP_USER=tim@taxiassur.com
IONOS_IMAP_PASSWORD=***
IONOS_IMAP_TLS=true
```

**Algorithme** :
```typescript
1. Se connecter à IMAP
2. Sélectionner INBOX
3. Chercher nouveaux messages (UID > dernier traité)
4. Pour chaque message :
   a. Vérifier si imap_uid existe déjà → skip
   b. Parser headers + body
   c. Extraire pièces jointes
   d. Upload pièces dans Supabase Storage
   e. Classifier automatiquement (voir ci-dessous)
   f. Insérer dans email_messages + email_attachments
5. Marquer dernier UID traité
```

**Package recommandé** : `npm:imap-simple` ou `npm:emailjs-imap-client`

### 2. Système de Classification Automatique

**Fichier** : `supabase/functions/classify-document/index.ts`

**Niveau 1 - Heuristiques simples (fiable à 80%)** :
```typescript
const classifyByFilename = (filename: string): { type: string, confidence: number } => {
  const lower = filename.toLowerCase();

  if (lower.match(/rib|iban|bank/)) return { type: 'RIB', confidence: 0.9 };
  if (lower.match(/permis|driving|license/)) return { type: 'permis_conduire', confidence: 0.85 };
  if (lower.match(/carte.grise|registration/)) return { type: 'carte_grise', confidence: 0.9 };
  if (lower.match(/releve|info|assurance/)) return { type: 'releve_information', confidence: 0.8 };
  if (lower.match(/kbis|sirene|siret/)) return { type: 'kbis', confidence: 0.95 };
  if (lower.match(/licence|carte.pro|professional/)) return { type: 'carte_professionnelle', confidence: 0.9 };
  if (lower.match(/identite|cni|passport/)) return { type: 'piece_identite', confidence: 0.85 };

  return { type: 'autre', confidence: 0.3 };
};
```

**Niveau 2 - OCR (optionnel, si PDF/image)** :
```typescript
// Utiliser Tesseract.js ou API externe (Google Vision, AWS Textract)
const extractText = async (fileBuffer: Buffer) => {
  // OCR ici
  const text = await performOCR(fileBuffer);

  // Chercher mots-clés
  if (text.includes('IBAN') || text.includes('BIC')) return 'RIB';
  if (text.includes('Permis de conduire')) return 'permis_conduire';
  // etc.
};
```

### 3. Composant Frontend "Panier" (À créer)

**Fichier** : `src/components/crm/DocumentBasket.tsx`

**UI Proposée** :
```
┌──────────────────────────────────────────────────────────────────┐
│ 📦 Panier de Documents (3 non classés)                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ NON CLASSÉS                          CATÉGORIES ATTENDUES        │
│ ┌──────────────────────────┐         ┌───────────────────┐      │
│ │ 📄 rib_dupont.pdf        │         │ 💳 RIB            │      │
│ │ 2.3 MB • Reçu hier       │         │ (vide)            │      │
│ │ ✨ Proposé: RIB (90%)    │         │ Drag ici →        │      │
│ │ [Voir] [Refuser]         │         └───────────────────┘      │
│ └──────────────────────────┘                                     │
│                                      ┌───────────────────┐       │
│ ┌──────────────────────────┐        │ 🪪 Permis         │       │
│ │ 📷 IMG_2024.jpg          │        │ (vide)            │       │
│ │ 1.8 MB • Reçu aujourd'hui│        │ Drag ici →        │       │
│ │ ✨ Proposé: Permis (75%) │        └───────────────────┘       │
│ │ [Voir] [Refuser]         │                                     │
│ └──────────────────────────┘        ┌───────────────────┐       │
│                                      │ 🚗 Carte Grise    │       │
│ ┌──────────────────────────┐        │ ✓ carte_grise.pdf │       │
│ │ 📄 scan001.pdf           │        │ 890 KB            │       │
│ │ 890 KB • Reçu aujourd'hui│        └───────────────────┘       │
│ │ ❓ Inconnu               │                                     │
│ │ [Voir] [Refuser]         │        ┌───────────────────┐       │
│ └──────────────────────────┘        │ 📋 Relevé Info    │       │
│                                      │ (vide)            │       │
│                                      └───────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

**Bibliothèque** : `@dnd-kit/core` ou `react-beautiful-dnd`

**Props** :
```typescript
interface DocumentBasketProps {
  caseId: string;
  onDocumentClassified: () => void;
}
```

**Logique** :
```typescript
1. Charger les attachments via get_document_basket(caseId)
2. Afficher cartes drag & drop
3. Sur drop dans une catégorie :
   - Appeler classify_attachment(attachmentId, docType, true)
   - Rafraîchir la liste
   - Notification "Document classé ✓"
4. Bouton "Refuser" :
   - Marquer status = 'rejected'
   - Demander motif
```

### 4. Intégration dans CRMLeadDetail

**Fichier** : `src/backoffice/CRMLeadDetail.tsx`

**Ajout onglet** :
```tsx
<LeadWorkflowTabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
  tabs={[
    'overview',
    'documents',
    'basket',  // ← NOUVEAU
    'quotes',
    'timeline',
    'ai'
  ]}
/>

{activeTab === 'basket' && (
  <DocumentBasket
    caseId={lead.id}
    onDocumentClassified={() => loadLeadData(lead.id)}
  />
)}
```

### 5. Cron Job / Déclenchement IMAP

**Option A - Cron Supabase** :
```sql
-- Toutes les 2 minutes
SELECT cron.schedule(
  'sync-ionos-emails',
  '*/2 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://xxx.supabase.co/functions/v1/sync-ionos-emails',
      headers := '{"Authorization": "Bearer xxx"}'::jsonb
    );
  $$
);
```

**Option B - Webhook externe** :
Un service externe (Zapier, n8n, ou serveur Node) déclenche la fonction toutes les X minutes.

---

## 🔐 Sécurité

### Stockage des PJ
- Supabase Storage bucket `email-attachments`
- RLS activé : seulement admins
- Chemin : `{case_id}/{email_id}/{filename}`

### Quarantaine
```typescript
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.scr', '.vbs'];

if (DANGEROUS_EXTENSIONS.some(ext => filename.endsWith(ext))) {
  // Ne pas stocker, logger
  await supabase.from('email_messages').insert({
    ...,
    status: 'ignored',
    processing_error: 'Suspicious file type'
  });
  return;
}
```

### Rate Limiting
- Max 100 emails / minute
- Si plus : log + alert admin

---

## 📊 Métriques à suivre

### Dashboard Admin
```typescript
// Emails traités aujourd'hui
SELECT COUNT(*) FROM email_messages WHERE created_at > current_date;

// Attachments en attente de classification
SELECT COUNT(*) FROM email_attachments WHERE status = 'unclassified';

// Taux de classification automatique réussie
SELECT
  COUNT(*) FILTER (WHERE classification_confidence > 0.8) * 100.0 / COUNT(*) as success_rate
FROM email_attachments
WHERE status != 'unclassified';

// Temps moyen avant classification
SELECT AVG(ea.updated_at - em.received_at) as avg_time
FROM email_attachments ea
JOIN email_messages em ON ea.email_message_id = em.id
WHERE ea.status = 'assigned';
```

---

## 🚀 Plan de déploiement

### Phase 1 - MVP (1-2 jours)
- [x] Tables BDD créées ✓
- [x] Fonctions SQL créées ✓
- [ ] Edge function IMAP basique (fetch 20 derniers emails)
- [ ] Classification par filename uniquement
- [ ] Composant Panier simple (liste + boutons)

### Phase 2 - Amélioration (3-5 jours)
- [ ] Drag & drop complet
- [ ] Prévisualisation images/PDF
- [ ] OCR pour PDFs
- [ ] Notifications temps réel

### Phase 3 - Production (1 semaine)
- [ ] Cron automatique
- [ ] Gestion erreurs complète
- [ ] Dashboard métriques
- [ ] Tests charge

---

## 🧪 Tests

### Test manuel IMAP
```typescript
// supabase/functions/test-imap-connection/index.ts
const testConnection = async () => {
  const connection = await Imap.connect({
    host: 'imap.ionos.com',
    port: 993,
    tls: true,
    auth: {
      user: 'tim@taxiassur.com',
      pass: process.env.IONOS_PASSWORD
    }
  });

  await connection.openBox('INBOX');
  const messages = await connection.search(['ALL'], { bodies: [''] });

  console.log(`✓ ${messages.length} messages trouvés`);
};
```

### Test classification
```typescript
describe('Document Classification', () => {
  it('should classify RIB correctly', () => {
    const result = classifyByFilename('rib_client_2024.pdf');
    expect(result.type).toBe('RIB');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should handle unknown files', () => {
    const result = classifyByFilename('random_doc.pdf');
    expect(result.type).toBe('autre');
    expect(result.confidence).toBeLessThan(0.5);
  });
});
```

---

## 📝 Configuration IONOS

### Variables d'environnement nécessaires
```env
# Dans .env Supabase
IONOS_IMAP_HOST=imap.ionos.com
IONOS_IMAP_PORT=993
IONOS_IMAP_USER=tim@taxiassur.com
IONOS_IMAP_PASSWORD=***
IONOS_IMAP_TLS=true

IONOS_SMTP_HOST=smtp.ionos.com
IONOS_SMTP_PORT=465
IONOS_SMTP_USER=tim@taxiassur.com
IONOS_SMTP_PASSWORD=***
```

### Configuration IONOS (à vérifier)
1. Activer IMAP sur le compte email
2. Autoriser "applications moins sécurisées" si nécessaire
3. Vérifier quotas IONOS (emails/heure)

---

## 💡 Améliorations futures

### V2
- Classification ML avec TensorFlow.js
- Support pièces jointes chiffrées
- Import depuis WhatsApp/SMS
- Extraction automatique données (IBAN, N° permis, etc.)

### V3
- OCR multilingue
- Détection fraude documents
- Signature électronique directement depuis panier
- Export bulk vers assureurs

---

**Status actuel** : ✅ Base de données créée et fonctionnelle
**Prochaine étape** : Créer l'edge function IMAP

**Date** : 15 janvier 2026
