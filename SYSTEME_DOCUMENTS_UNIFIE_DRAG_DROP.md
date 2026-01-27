# 📄 Système de Gestion Unifiée des Documents avec Drag & Drop

## ✨ Vue d'ensemble

**Système unifié et intuitif** pour gérer tous les documents des prospects, avec **drag & drop** pour classer rapidement les documents dans les bonnes catégories et validation en un clic.

---

## 🎯 Concept

### **Un seul endroit pour tout gérer**

Plus besoin de jongler entre plusieurs interfaces. Tout se passe dans **un seul composant** :

1. **📥 Panier de Documents** (en haut)
   - Documents reçus par email (non classés)
   - Documents uploadés mais mal classés
   - Documents en attente de classification

2. **📋 Cards de Documents** (10 types)
   - Une card par type de document
   - Affiche les documents déjà classés
   - Zone de drop pour recevoir de nouveaux documents
   - Boutons de validation/rejet

---

## 🖱️ Workflow Simplifié

### **Scénario 1 : Document reçu par email**
```
1. Email arrive avec pièce jointe → Panier de Documents
2. Commercial glisse le document → Card correspondante
3. Document apparaît dans la card
4. Commercial clique "Valider" ✅
5. Document validé et checklist mise à jour
```

### **Scénario 2 : Upload direct par le prospect**
```
1. Prospect upload via l'espace prospect → Card correspondante
2. Document apparaît directement dans la bonne card
3. Commercial vérifie et clique "Valider" ✅
4. Document validé
```

### **Scénario 3 : Reclassification**
```
1. Document dans la mauvaise card
2. Commercial le glisse → Card correcte
3. Document se déplace dans la nouvelle card
4. Commercial clique "Valider" ✅
5. Document validé dans la bonne catégorie
```

---

## 🎨 Interface Utilisateur

### **Panier de Documents**
```
┌─────────────────────────────────────────────┐
│ 📥 Panier de Documents         [3 non classés]│
├─────────────────────────────────────────────┤
│ 💡 Glissez ces documents vers les cards      │
│                                               │
│ ┌──────────────────────────────────────┐    │
│ │ ⋮⋮ 📄 permis_recto_verso.pdf         │    │
│ │    150 KB • Suggéré: Permis de conduire   │
│ └──────────────────────────────────────┘    │
│                                               │
│ ┌──────────────────────────────────────┐    │
│ │ ⋮⋮ 📄 carte_grise_vehicle.pdf        │    │
│ │    220 KB • Suggéré: Carte grise      │    │
│ └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### **Card de Document**
```
┌─────────────────────────────────────────────┐
│ 🚕 Licence de taxi professionnelle *  [À valider]│
├─────────────────────────────────────────────┤
│                                               │
│ Documents dans cette catégorie:               │
│                                               │
│ ┌──────────────────────────────────────┐    │
│ │ ⋮⋮ 📄 licence_taxi_2024.pdf          │    │
│ │    340 KB                      [👁️ Voir]   │
│ └──────────────────────────────────────┘    │
│                                               │
│                         [✅ Valider] [❌ Rejeter] │
└─────────────────────────────────────────────┘
```

### **Drag & Drop Visuel**
```
┌─────────────────────────────────────────────┐
│ 🚕 Licence de taxi professionnelle *        │
├─────────────────────────────────────────────┤
│ 📥 Déposez ici pour classer                 │ ← Zone de drop active
│                                             │
│ [Fond bleu + bordure bleue + effet ring]   │
└─────────────────────────────────────────────┘
```

---

## 🔧 Fonctionnalités Détaillées

### **1. Drag & Drop Natif**
- ✅ **Glisser depuis le panier** → Vers une card
- ✅ **Glisser d'une card** → Vers une autre card (reclassification)
- ✅ **Feedback visuel** : Card s'illumine en bleu au survol
- ✅ **Curseur adapté** : grab/grabbing pendant le drag
- ✅ **Icône grip** (⋮⋮) pour indiquer que c'est draggable

### **2. Classification Automatique**
- 🤖 **Suggestion IA** pour les emails
- 📝 Badge "Suggéré: [type]" affiché dans le panier
- ⚡ Déposer sur une card = classification immédiate

### **3. Validation Multi-Source**
- ✅ Documents uploadés par le prospect
- ✅ Documents reçus par email
- ✅ Documents ajoutés manuellement
- ✅ Tous visibles au même endroit

### **4. Gestion des Doublons**
- Si un document existe déjà pour ce type → L'ancien reste visible
- Possibilité de garder plusieurs versions
- Drag & drop permet de remplacer facilement

### **5. Statuts Visuels**
```
✅ Validé        → Vert (bg-green-500/10)
⏱️ À valider    → Ambre (bg-amber-500/10)
❌ Rejeté       → Rouge (bg-red-500/10)
⚠️ Manquant     → Gris (bg-gray-700/50)
```

### **6. Actions Rapides**
```
Cards avec documents uploadés:
- [✅ Valider]  → Valide le document
- [❌ Rejeter]  → Ouvre modal pour raison du rejet

Cards avec documents validés:
- [🔄 Redemander] → Rejette et demande un nouveau document

Toutes les cards:
- [👁️ Voir] → Ouvre le document dans un nouvel onglet
```

---

## 📊 Indicateurs en Temps Réel

### **Barre de Progression (Header)**
```
Reçus: 60%    ████████░░░░ [Ambre]
Validés: 40%  ██████░░░░░░ [Vert]
```

### **Alert Documents Manquants**
```
⚠️ 6 document(s) manquant(s)
Licence de taxi professionnelle, Permis de conduire, ...
[📧 Relancer]
```

---

## 🗄️ Base de Données

### **Tables Utilisées**

**1. `prospect_documents`** (documents uploadés)
```sql
- id (uuid)
- lead_id (uuid)
- document_type (text)  -- Type de document
- file_name (text)
- file_path (text)
- file_size (int)
- status (text)
- uploaded_at (timestamp)
- metadata (jsonb)
```

**2. `email_attachments`** (pièces jointes emails)
```sql
- id (uuid)
- lead_id (uuid)
- email_message_id (uuid)
- file_name (text)
- file_size (int)
- download_url (text)
- classification_status (text)  -- 'pending' | 'classified'
- auto_detected_type (text)     -- Type suggéré par l'IA
- created_at (timestamp)
```

**3. `crm_leads`** (checklist)
```sql
- id (uuid)
- document_checklist (jsonb)  -- État de validation de chaque document
  {
    "licence_taxi": {
      "status": "uploaded",
      "validated": false,
      "file_name": "licence.pdf",
      "uploaded_at": "2026-01-27T10:30:00Z"
    },
    ...
  }
```

---

## 🔄 Flux de Données

### **1. Chargement Initial**
```typescript
loadData() → Récupère:
  - crm_leads.document_checklist
  - prospect_documents (tous les docs uploadés)
  - email_attachments (toutes les pièces jointes)

→ Unifie en un seul tableau allDocuments[]
→ Filtre les documents non classés → unclassifiedDocuments[]
```

### **2. Drag & Drop**
```typescript
handleDragStart(doc)
  → Stocke le document draggé dans l'état

handleDrop(targetType)
  → Si source = email_attachment:
      → Crée un prospect_document
      → Marque l'attachment comme 'classified'
  → Si source = prospect_upload:
      → Update document_type dans prospect_documents
  → Met à jour document_checklist dans crm_leads
  → Recharge les données
```

### **3. Validation**
```typescript
handleValidate(docType)
  → Appelle RPC validate_document()
  → Met à jour document_checklist.validated = true
  → Recharge les données
```

---

## 📝 Types de Documents (10)

| ID                         | Label                              | Obligatoire | Icône |
|----------------------------|------------------------------------|-------------|-------|
| `licence_taxi`             | Licence de taxi professionnelle    | ✅ Oui      | 🚕    |
| `permis_conduire`          | Permis de conduire                 | ✅ Oui      | 🪪    |
| `piece_identite`           | Pièce d'identité                   | ✅ Oui      | 🆔    |
| `carte_grise`              | Carte grise du véhicule            | ✅ Oui      | 🚗    |
| `autorisation_stationnement` | Autorisation de stationnement    | ✅ Oui      | 🅿️    |
| `rib`                      | RIB                                | ✅ Oui      | 🏦    |
| `releve_information`       | Relevé d'information               | ❌ Non      | 📋    |
| `kbis`                     | KBIS / SIRENE                      | ❌ Non      | 🏢    |
| `carte_professionnelle`    | Carte professionnelle              | ❌ Non      | 🪪    |
| `justificatif_domicile`    | Justificatif de domicile           | ❌ Non      | 🏠    |

---

## 🎯 Avantages vs Ancien Système

| Fonctionnalité               | Ancien Système | Nouveau Système |
|------------------------------|----------------|-----------------|
| **Sources unifiées**         | ❌ Séparées    | ✅ Unifiées     |
| **Drag & Drop**              | ❌ Non         | ✅ Oui          |
| **Reclassification**         | ❌ Difficile   | ✅ Facile       |
| **Visualisation claire**     | ⚠️ Moyenne     | ✅ Excellente   |
| **Panier de documents**      | ❌ Non         | ✅ Oui          |
| **Feedback visuel drag**     | ❌ Non         | ✅ Oui          |
| **Documents multiples/type** | ⚠️ Caché       | ✅ Visible      |
| **Validation rapide**        | ⚠️ Lent        | ✅ Rapide       |

---

## 🧪 Tests Recommandés

### **Test 1 : Email → Drag & Drop**
1. Envoyer un email avec pièce jointe à `contact@taxiassur.com`
2. Observer le document dans le panier
3. Glisser vers une card
4. Vérifier qu'il apparaît dans la card
5. Valider le document

### **Test 2 : Upload Prospect**
1. Aller dans l'espace prospect
2. Uploader un document (ex: permis de conduire)
3. Observer qu'il apparaît directement dans la bonne card
4. Valider

### **Test 3 : Reclassification**
1. Avoir un document dans une card
2. Le glisser vers une autre card
3. Vérifier qu'il se déplace
4. Valider dans la nouvelle card

### **Test 4 : Documents Multiples**
1. Uploader 2 versions du même document
2. Vérifier que les 2 sont visibles dans la card
3. Pouvoir en glisser un vers une autre card si besoin

---

## 🚀 Prochaines Améliorations

1. **Prévisualisation inline** : Voir le document sans ouvrir un nouvel onglet
2. **Comparaison de versions** : Comparer 2 versions du même document côte à côte
3. **Annotations** : Annoter les documents directement dans l'interface
4. **OCR automatique** : Extraction automatique des infos (numéro permis, etc.)
5. **Validation par lot** : Valider plusieurs documents d'un coup
6. **Historique des modifications** : Voir qui a validé/rejeté quand

---

## 📞 Support

En cas de problème :
1. Vérifier que le document est bien draggable (icône grip ⋮⋮ visible)
2. Vérifier que la card s'illumine en bleu au survol
3. Vérifier les logs console pour les erreurs
4. Vérifier que les RLS policies permettent l'accès aux tables

---

## 📦 Composant Créé

**Fichier** : `/src/components/crm/DocumentUnifiedManager.tsx`

**Props** :
```typescript
interface DocumentUnifiedManagerProps {
  leadId: string;              // ID du lead
  leadEmail: string;           // Email du lead
  leadFirstName: string;       // Prénom du lead
  accessToken?: string;        // Token d'accès prospect
  onDocumentsComplete?: () => void;        // Callback quand tous les docs sont validés
  onRequestDocuments?: (missingDocs: string[]) => void;  // Callback pour relancer
}
```

**Utilisation** :
```tsx
<DocumentUnifiedManager
  leadId={lead.id}
  leadEmail={lead.email}
  leadFirstName={lead.first_name}
  accessToken={lead.access_token}
  onDocumentsComplete={() => console.log('Tous les docs validés !')}
  onRequestDocuments={(docs) => console.log('Manquants:', docs)}
/>
```

---

**Créé le** : 27 janvier 2026
**Version** : 1.0.0
**Auteur** : Système TaxiAssur CRM Killer
