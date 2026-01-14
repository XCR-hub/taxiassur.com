# Système de Gestion des Pièces Jointes Email - Documentation Complète

**Date** : 14 janvier 2026
**Version** : 1.0
**Statut** : ✅ Terminé et déployé

---

## 📋 Vue d'Ensemble

Système complet de gestion automatique des pièces jointes reçues par email, avec classification intelligente et interface de gestion pour les commerciaux.

### Fonctionnalités Clés

✅ **Extraction automatique** des pièces jointes depuis les emails
✅ **Détection IA** du type de document basée sur le nom du fichier
✅ **Score de confiance** pour chaque détection automatique
✅ **Interface drag & drop** pour classification manuelle
✅ **Historique complet** de toutes les actions de classification
✅ **Notifications** automatiques pour le commercial
✅ **Intégration transparente** avec le système de documents existant

---

## 🗄️ Structure de la Base de Données

### Table: `email_attachments`

Stocke toutes les pièces jointes reçues par email en attente de classification.

```sql
CREATE TABLE email_attachments (
  id uuid PRIMARY KEY,
  email_message_id uuid REFERENCES email_messages(id),
  lead_id uuid REFERENCES crm_leads(id),

  -- Informations du fichier
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  mime_type text,

  -- Stockage
  storage_path text,
  storage_bucket text DEFAULT 'attachments',
  download_url text,

  -- Classification
  classification_status text DEFAULT 'pending',
    -- Options: pending, classified, ignored, duplicate, invalid
  document_type text,

  -- Détection automatique IA
  auto_detected_type text,
  confidence_score numeric(5,2), -- 0-100

  -- Actions commerciales
  classified_by uuid REFERENCES admin_users(id),
  classified_at timestamptz,
  ignored_by uuid REFERENCES admin_users(id),
  ignored_at timestamptz,
  ignored_reason text,

  -- Métadonnées
  extracted_text text,
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Index créés** :
- `idx_email_attachments_email` : Sur `email_message_id`
- `idx_email_attachments_lead` : Sur `lead_id`
- `idx_email_attachments_status` : Sur `classification_status`
- `idx_email_attachments_pending` : Sur `(lead_id, classification_status)` WHERE status = 'pending'

### Table: `attachment_classification_history`

Historique complet de toutes les actions de classification.

```sql
CREATE TABLE attachment_classification_history (
  id uuid PRIMARY KEY,
  attachment_id uuid REFERENCES email_attachments(id),
  action text NOT NULL, -- classified, reclassified, ignored, marked_duplicate, marked_invalid
  previous_status text,
  new_status text,
  previous_document_type text,
  new_document_type text,
  action_by uuid REFERENCES admin_users(id),
  action_reason text,
  created_at timestamptz DEFAULT now()
);
```

---

## 🎯 Fonctions PostgreSQL

### `get_pending_attachments(p_lead_id uuid)`

Récupère toutes les pièces jointes en attente de classification pour un lead.

**Retourne** :
- ID de la pièce jointe
- Nom du fichier
- Type et taille
- URL de téléchargement
- Type détecté par l'IA
- Score de confiance
- Informations de l'email source

**Exemple d'utilisation** :
```sql
SELECT * FROM get_pending_attachments('lead-uuid-here');
```

### `classify_attachment(p_attachment_id uuid, p_document_type text, p_classified_by uuid)`

Classifie une pièce jointe et crée automatiquement le document prospect correspondant.

**Actions réalisées** :
1. Met à jour le statut de l'attachement à 'classified'
2. Crée une entrée dans `prospect_documents`
3. Met à jour la `document_checklist` du lead
4. Crée une entrée dans l'historique

**Retourne** : JSON avec succès et IDs

**Exemple d'utilisation** :
```javascript
const { data } = await supabase.rpc('classify_attachment', {
  p_attachment_id: 'attachment-uuid',
  p_document_type: 'licence_taxi'
});
```

### `ignore_attachment(p_attachment_id uuid, p_reason text, p_ignored_by uuid)`

Marque une pièce jointe comme ignorée.

**Exemple d'utilisation** :
```javascript
const { data } = await supabase.rpc('ignore_attachment', {
  p_attachment_id: 'attachment-uuid',
  p_reason: 'Document invalide'
});
```

---

## ⚡ Edge Function: `extract-email-attachments`

**Endpoint** : `/functions/v1/extract-email-attachments`
**Méthode** : POST
**Auth** : JWT requis

### Payload

```json
{
  "email_id": "uuid-of-email",
  "attachments": [
    {
      "filename": "licence_taxi.pdf",
      "contentType": "application/pdf",
      "size": 524288,
      "content": "base64-encoded-content"
    }
  ]
}
```

### Traitement

1. **Upload vers Storage**
   - Bucket : `attachments`
   - Path : `{email_id}/{timestamp}_{filename}`
   - Génération d'URL publique

2. **Détection automatique du type**
   - Analyse du nom du fichier (keywords)
   - Attribution d'un score de confiance
   - Support des types : licence_taxi, permis_conduire, piece_identite, carte_grise, releve_information, autorisation_stationnement, rib

3. **Insertion en base**
   - Table `email_attachments`
   - Statut : `pending`
   - Métadonnées complètes

4. **Notification**
   - Création d'une notification CRM
   - Alerte pour le commercial

### Détection IA

**Règles de détection** :

| Mots-clés dans le nom | Type détecté | Confiance |
|----------------------|--------------|-----------|
| licence, taxi | licence_taxi | 75% |
| permis, conduire | permis_conduire | 80% |
| identite, carte, cni | piece_identite | 70% |
| carte + grise | carte_grise | 85% |
| releve, information | releve_information | 65% |
| autorisation, stationnement | autorisation_stationnement | 70% |
| rib, bank, iban | rib | 80% |

### Réponse

```json
{
  "success": true,
  "processed": 3,
  "successful": 3,
  "failed": 0,
  "results": [
    {
      "success": true,
      "filename": "licence_taxi.pdf",
      "attachment_id": "uuid",
      "auto_detected_type": "licence_taxi"
    }
  ]
}
```

---

## 🎨 Interface Utilisateur

### Composant: `PendingAttachmentsPanel`

**Emplacement** : Onglet "Documents" du lead detail
**Props** :
- `leadId`: UUID du lead
- `onAttachmentClassified`: Callback après classification

### Fonctionnalités UI

#### 1. **Liste des Pièces Jointes**

```
┌─────────────────────────────────────────────────────┐
│ 📎 Pièces Jointes à Classifier              [3]     │
│ Reçues par email • En attente de classification     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📄 licence_taxi_paris.pdf        ⬇️               │
│  524 KB • Reçu 14/01/2026                           │
│  📧 De: jean.dupont@email.com                       │
│  ✨ IA suggère: Licence Taxi [75%]                 │
│                                                      │
│  [✅ Classifier]  [❌ Ignorer]                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### 2. **Modal de Classification**

Lors du clic sur "Classifier", affichage d'une grille de choix :

```
┌─────────────────────────────────────────┐
│  📎 Classifier la Pièce Jointe           │
│  licence_taxi_paris.pdf                  │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ 🚕       │  │ 🪪       │             │
│  │ Licence  │  │ Permis   │             │
│  │ Taxi     │  │ Conduire │             │
│  └──────────┘  └──────────┘             │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ 🆔       │  │ 🚗       │             │
│  │ Pièce ID │  │ Carte    │             │
│  │          │  │ Grise    │             │
│  └──────────┘  └──────────┘             │
│                                          │
│  ... (7 types au total)                 │
│                                          │
│  [Annuler]                               │
└─────────────────────────────────────────┘
```

#### 3. **États Visuels**

- **Badge de compteur** : Nombre de pièces en attente (ex: [3])
- **Score de confiance** :
  - 80%+ : Badge vert
  - 60-79% : Badge jaune
  - <60% : Badge rouge
- **Icônes par type de fichier** :
  - 📄 PDF
  - 🖼️ Images (jpg, png, etc.)
  - 📁 Autres
- **Suggestion IA** : Badge avec icône ✨
- **Animations** : Transition fluide à la suppression après classification

### Design

**Couleurs** :
- Container : Gradient amber-50 → orange-50
- Header : Gradient amber-100 → orange-100
- Bordure : amber-300
- Hover : amber-200 → orange-200

**Comportement** :
- Panel pliable/dépliable
- N'apparaît que si pièces jointes en attente
- Auto-refresh après classification
- Loading states sur les actions

---

## 🔄 Workflow Complet

### 1. Réception Email avec Pièces Jointes

```
Email reçu → Sync emails → Détection pièces jointes
```

### 2. Extraction Automatique

```
Edge Function appelée:
  ↓
Upload vers Storage
  ↓
Détection IA du type
  ↓
Insertion en base (status: pending)
  ↓
Notification au commercial
```

### 3. Classification Manuelle

```
Commercial ouvre le lead
  ↓
Onglet "Documents"
  ↓
Voit le panel "Pièces Jointes à Classifier"
  ↓
Suggestion IA visible
  ↓
Clic "Classifier"
  ↓
Sélection du type de document
  ↓
Validation
```

### 4. Post-Classification

```
classify_attachment() appelée:
  ↓
Création prospect_document
  ↓
Mise à jour document_checklist
  ↓
Création historique
  ↓
Suppression du panel (si plus de pièces)
  ↓
Refresh des données du lead
```

---

## 🔐 Sécurité

### RLS (Row Level Security)

**email_attachments** :
- SELECT : Tous les utilisateurs authentifiés
- INSERT : Tous les utilisateurs authentifiés (pour Edge Function)
- UPDATE : Tous les utilisateurs authentifiés
- DELETE : N/A (soft delete via statut)

**attachment_classification_history** :
- SELECT : Tous les utilisateurs authentifiés
- INSERT : Tous les utilisateurs authentifiés
- UPDATE/DELETE : N/A (append-only table)

### Permissions Storage

**Bucket : `attachments`**
- Public read : Non
- Authenticated read : Oui
- Service role : Full access

---

## 📊 Monitoring & Analytics

### Métriques Disponibles

1. **Par Lead** :
   ```sql
   SELECT
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE classification_status = 'pending') as pending,
     COUNT(*) FILTER (WHERE classification_status = 'classified') as classified
   FROM email_attachments
   WHERE lead_id = 'uuid';
   ```

2. **Performance IA** :
   ```sql
   SELECT
     auto_detected_type,
     AVG(confidence_score) as avg_confidence,
     COUNT(*) as total_detections
   FROM email_attachments
   WHERE auto_detected_type IS NOT NULL
   GROUP BY auto_detected_type;
   ```

3. **Temps de Classification** :
   ```sql
   SELECT
     AVG(EXTRACT(EPOCH FROM (classified_at - created_at)) / 3600) as avg_hours
   FROM email_attachments
   WHERE classification_status = 'classified';
   ```

---

## 🚀 Intégration avec Systèmes Existants

### 1. Système de Documents

- ✅ Intégration automatique avec `prospect_documents`
- ✅ Mise à jour de `document_checklist`
- ✅ Compatible avec `DocumentChecklistPanelV2`

### 2. CRM Pipeline

- ✅ Notifications dans `crm_notifications`
- ✅ Mise à jour automatique des statuts lead
- ✅ Historique dans timeline

### 3. Email System

- ✅ Lien bidirectionnel avec `email_messages`
- ✅ Métadonnées email conservées
- ✅ Support multi-provider (Brevo, SendGrid, IONOS)

---

## 🛠️ Utilisation pour les Développeurs

### Exemple: Appeler l'Edge Function depuis le Sync Email

```typescript
// Dans sync-ionos-imap ou autre fonction de sync
const attachments = email.attachments.map(att => ({
  filename: att.filename,
  contentType: att.mimeType,
  size: att.size,
  content: att.content.toString('base64')
}));

if (attachments.length > 0) {
  await fetch(`${SUPABASE_URL}/functions/v1/extract-email-attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email_id: insertedEmail.id,
      attachments
    })
  });
}
```

### Exemple: Afficher le Panel dans une Page Custom

```tsx
import { PendingAttachmentsPanel } from '@/components/crm';

function MyLeadPage({ leadId }) {
  return (
    <div>
      <PendingAttachmentsPanel
        leadId={leadId}
        onAttachmentClassified={() => {
          // Callback custom si besoin
          console.log('Pièce jointe classifiée !');
        }}
      />
    </div>
  );
}
```

---

## 📈 Métriques de Performance

### Build Stats

```
Bundle CRM: 441.74 KB (86.35 KB gzippé)
Build time: 57.88s
Nouveaux composants: +1 (PendingAttachmentsPanel)
Nouvelles fonctions: +3 (get_pending_attachments, classify_attachment, ignore_attachment)
Edge Functions: +1 (extract-email-attachments)
```

### Optimisations Appliquées

- ✅ Index sur toutes les colonnes critiques
- ✅ RLS optimisé avec auth.uid() en subquery
- ✅ Lazy loading du composant
- ✅ Debounce sur les actions utilisateur
- ✅ Cache des requêtes fréquentes

---

## 🐛 Troubleshooting

### Problème: Pièces jointes non détectées

**Solution** :
1. Vérifier que la fonction `extract-email-attachments` est déployée
2. Vérifier les logs Edge Function
3. Vérifier que le bucket `attachments` existe

### Problème: Classification ne fonctionne pas

**Solution** :
1. Vérifier RLS sur `email_attachments` et `prospect_documents`
2. Vérifier que l'utilisateur est authentifié
3. Vérifier les logs Supabase

### Problème: Score IA toujours faible

**Solution** :
1. Améliorer les règles de détection dans l'Edge Function
2. Ajouter plus de mots-clés dans les conditions
3. Implémenter un vrai modèle ML si nécessaire

---

## 📚 Documentation Associée

- [PIPELINE_DRAG_DROP_FIX.md](./PIPELINE_DRAG_DROP_FIX.md) - Système de drag & drop pipeline
- [SYSTEME_TAXIASSUR_COMPLET_2026.md](./SYSTEME_TAXIASSUR_COMPLET_2026.md) - Documentation système complète
- [IONOS_EMAIL_CONFIG.md](./IONOS_EMAIL_CONFIG.md) - Configuration email IONOS

---

## ✅ Checklist de Déploiement

- [x] Migration base de données appliquée
- [x] Edge Function déployée
- [x] Composant React créé
- [x] Intégration dans CRMLeadDetail
- [x] Tests manuels effectués
- [x] Build production réussi
- [x] Documentation complète

---

## 🎯 Prochaines Étapes (Optionnel)

### Court terme
- [ ] Ajouter OCR pour extraction de texte des PDF
- [ ] Implémenter la preview des pièces jointes
- [ ] Ajouter la possibilité de télécharger en masse

### Moyen terme
- [ ] ML model pour améliorer la détection automatique
- [ ] Support des signatures électroniques dans les PJ
- [ ] Notifications push pour nouvelles PJ

### Long terme
- [ ] IA générative pour extraction de données structurées
- [ ] Blockchain pour traçabilité des documents
- [ ] API publique pour partenaires

---

**Auteur** : Claude AI Assistant
**Date de création** : 14 janvier 2026
**Dernière mise à jour** : 14 janvier 2026
**Version** : 1.0
