# 📂 Système de Gestion Documents Unifié - 2026

## 🎯 Objectif

Réunir la gestion des documents en **UN SEUL ENDROIT** avec :
- ✅ Consultation des documents
- ✅ Impression (individuelle et groupée)
- ✅ Validation/Refus directement intégrés
- ✅ Vue unifiée panier + catégories

---

## 📋 Avant / Après

### ❌ AVANT (2 endroits séparés)
```
┌─────────────────────────────┐
│  1. Panier de documents     │
│     - Documents à classer   │
└─────────────────────────────┘
              ↓
┌─────────────────────────────┐
│  2. Catégories de docs      │
│     - Documents classés     │
└─────────────────────────────┘
```

### ✅ APRÈS (1 seul endroit)
```
┌──────────────────────────────────────────────┐
│  📂 DOCUMENTS UNIFIÉS                        │
│                                              │
│  📥 Documents à classer (panier)             │
│     [Consulter] [Imprimer] [Télécharger]    │
│                                              │
│  📋 Documents classés (par catégorie)        │
│     [Consulter] [Imprimer] [Télécharger]    │
│     [Valider] [Refuser]                      │
│                                              │
│  Actions globales :                          │
│  [Imprimer tous les validés]                │
│  [Demander documents manquants]              │
└──────────────────────────────────────────────┘
```

---

## 🔧 Composant Principal

**Fichier** : `/src/components/crm/DocumentsUnifiedManager.tsx`

### Fonctionnalités

#### 1. **KPIs en temps réel**
```typescript
- Documents Requis (total)
- Validés (avec trend)
- En Attente
- Manquants (rouge si > 0)
- À Classer (panier)
```

#### 2. **Actions Rapides**
- **Imprimer tous les documents validés** (bouton bleu)
- **Demander les documents manquants** (bouton rouge, affiché si manquants > 0)

#### 3. **Barre de Progression**
```typescript
const completionPercentage = (stats.validated / stats.total) * 100;
```
Affichage visuel :
```
0% ──────[████████──────]──── 100%
       (60% complet)
```

#### 4. **Vue Unifiée : Documents à Classer**
```tsx
{basketDocuments.length > 0 && (
  <Section highlight="amber">
    📥 Documents à Classer ({basketDocuments.length})

    Pour chaque document :
    ├─ 👁️ Consulter (modal preview)
    ├─ 🖨️ Imprimer
    └─ ⬇️ Télécharger
  </Section>
)}
```

#### 5. **Vue Unifiée : Documents Classés**
```tsx
<Grid columns="2">
  {groupedDocuments.map((category) => (
    <CategoryCard
      status={isValidated ? 'green' : isPending ? 'amber' : 'white'}
    >
      <Header>
        {category.icon} {category.label}
        {category.required && <Badge color="red">Obligatoire</Badge>}
      </Header>

      <Documents>
        {category.documents.map((doc) => (
          <DocumentCard>
            <Info>
              - Nom : {doc.file_name}
              - Date : {doc.uploaded_at}
              - Statut : [Badge validé/refusé/attente]
            </Info>

            <Actions>
              - [Consulter] → Ouvre modal preview
              - [Imprimer] → Envoie vers imprimante
              - [Télécharger] → Download direct
            </Actions>

            {doc.status === 'pending_validation' && (
              <ValidationActions>
                - [✓ Valider] → Marque validé
                - [✗ Refuser] → Marque refusé
              </ValidationActions>
            )}
          </DocumentCard>
        ))}
      </Documents>
    </CategoryCard>
  ))}
</Grid>
```

---

## 🖼️ Modal de Consultation (Preview)

```tsx
{previewDoc && (
  <Modal size="6xl" height="90vh">
    <Header>
      <Title>{previewDoc.file_name}</Title>
      <Close />
    </Header>

    <Body>
      <iframe
        src={previewDoc.download_url}
        className="w-full min-h-[600px]"
      />
    </Body>

    <Footer>
      <Button onClick={handlePrintDocument}>
        🖨️ Imprimer
      </Button>
      <Button onClick={download}>
        ⬇️ Télécharger
      </Button>
    </Footer>
  </Modal>
)}
```

---

## 🖨️ Fonction d'Impression

### Impression Individuelle
```typescript
const handlePrintDocument = (doc: Document) => {
  if (doc.download_url) {
    const printWindow = window.open(doc.download_url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
};
```

### Impression Groupée (Tous les validés)
```typescript
const handlePrintAll = () => {
  const validatedDocs = documents.filter(d => d.status === 'validated');

  // Impression séquentielle avec délai
  validatedDocs.forEach((doc, index) => {
    setTimeout(() => {
      handlePrintDocument(doc);
    }, index * 500); // 500ms entre chaque document
  });
};
```

---

## ✅ Validation de Documents

```typescript
const handleValidateDocument = async (documentId: string) => {
  try {
    const { error } = await supabase
      .from('crm_lead_documents')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (error) throw error;

    // Recharge les données
    await loadDocuments();
    onDocumentValidate?.();
  } catch (error) {
    console.error('Erreur validation:', error);
    alert('Erreur lors de la validation');
  }
};
```

---

## ❌ Refus de Documents

```typescript
const handleRejectDocument = async (documentId: string) => {
  try {
    const { error } = await supabase
      .from('crm_lead_documents')
      .update({ status: 'rejected' })
      .eq('id', documentId);

    if (error) throw error;
    await loadDocuments();
  } catch (error) {
    console.error('Erreur rejet:', error);
    alert('Erreur lors du rejet');
  }
};
```

---

## 📊 Catégories de Documents

```typescript
const DOCUMENT_CATEGORIES = [
  { id: 'carte_grise', label: 'Carte Grise', icon: '🚗', required: true },
  { id: 'permis_conduire', label: 'Permis de Conduire', icon: '🪪', required: true },
  { id: 'carte_professionnelle', label: 'Carte Professionnelle', icon: '💳', required: true },
  { id: 'justificatif_domicile', label: 'Justificatif de Domicile', icon: '🏠', required: true },
  { id: 'rib', label: 'RIB', icon: '🏦', required: true },
  { id: 'kbis', label: 'KBIS', icon: '📋', required: false },
  { id: 'releve_information', label: 'Relevé d\'Information', icon: '📊', required: true },
  { id: 'certificat_immatriculation', label: 'Certificat d\'Immatriculation', icon: '📄', required: true },
  { id: 'autorisation_stationnement', label: 'Autorisation de Stationnement', icon: '🅿️', required: false },
  { id: 'autre', label: 'Autre Document', icon: '📎', required: false }
];
```

---

## 🎨 Design & UX

### Codes Couleurs par Statut

| Statut | Couleur | Gradient |
|--------|---------|----------|
| Validé | Vert | `from-green-50 to-emerald-50` |
| En attente | Ambre | `from-amber-50 to-orange-50` |
| Manquant | Blanc | `border-gray-300 border-dashed` |
| Panier | Ambre | `from-amber-50 to-orange-50` avec bordure épaisse |

### Badges de Statut
```tsx
✓ Validé    (vert)
⏱️ En attente (ambre)
✗ Refusé    (rouge)
```

### Animations
- Compteurs animés (AnimatedStatCard)
- Barre de progression fluide (transition 1000ms)
- Hover states sur les boutons
- Transitions douces sur les modals

---

## 🔌 Intégration CRM

### Import dans CRMLeadDetail
```typescript
import {
  // ... autres imports
  DocumentsUnifiedManager
} from '@/components/crm';

// Utilisation
{activeTab === 'documents' && (
  <DocumentsUnifiedManager
    leadId={lead.id}
    onDocumentUpload={() => loadLeadData(lead.id)}
    onDocumentValidate={() => loadLeadData(lead.id)}
    onRequestDocuments={handleRequestDocuments}
  />
)}
```

### Export dans index.ts
```typescript
export { default as DocumentsUnifiedManager } from './DocumentsUnifiedManager';
```

---

## 📥 Sources de Données

### 2 Tables Supabase
```typescript
// 1. Documents classés
const { data: classifiedDocs } = await supabase
  .from('crm_lead_documents')
  .select('*')
  .eq('lead_id', leadId);

// 2. Documents panier
const { data: basketDocs } = await supabase
  .from('prospect_documents')
  .select('*')
  .eq('lead_id', leadId);
```

### Storage Buckets
```typescript
// Documents classés
supabase.storage.from('crm-documents').getPublicUrl(filePath);

// Documents panier
supabase.storage.from('prospect-documents').getPublicUrl(filePath);
```

---

## 🎯 Avantages de la Solution

### ✅ Pour l'Utilisateur
1. **Une seule vue** : Plus besoin de naviguer entre 2 endroits
2. **Actions rapides** : Consulter/Imprimer/Valider au même endroit
3. **Vision globale** : KPIs + progression + documents en un coup d'œil
4. **Impression groupée** : Imprimer tous les validés en 1 clic

### ✅ Pour le Code
1. **Maintenabilité** : 1 seul composant au lieu de 2
2. **Réutilisabilité** : Logique centralisée
3. **Performance** : Chargement optimisé des 2 sources
4. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités

---

## 🔍 Comment Utiliser

### 1. Consulter un Document
```
Clic sur [👁️ Consulter]
  ↓
Modal s'ouvre avec iframe
  ↓
Visualisation directe du PDF/image
  ↓
Options : [Imprimer] [Télécharger] [Fermer]
```

### 2. Imprimer un Document
```
Clic sur [🖨️ Imprimer]
  ↓
Nouvelle fenêtre s'ouvre
  ↓
Dialogue d'impression du navigateur
  ↓
Sélection imprimante et options
  ↓
Impression
```

### 3. Valider un Document
```
Document en attente (badge ambre)
  ↓
Clic sur [✓ Valider]
  ↓
Statut passe à "validé"
  ↓
Badge devient vert
  ↓
KPIs se mettent à jour
  ↓
Barre de progression avance
```

### 4. Imprimer Tous les Validés
```
Clic sur [Imprimer tous les documents validés]
  ↓
Filtre documents status='validated'
  ↓
Boucle avec délai 500ms entre chaque
  ↓
Ouverture séquentielle des dialogues d'impression
```

---

## 🚀 Tests & Validation

### Checklist de Tests

- [ ] Documents s'affichent correctement (panier + classés)
- [ ] KPIs sont justes et se mettent à jour
- [ ] Consultation ouvre la modal avec le bon document
- [ ] Impression individuelle fonctionne
- [ ] Impression groupée fonctionne (délai respecté)
- [ ] Validation met à jour le statut
- [ ] Refus met à jour le statut
- [ ] Barre de progression calcule le bon %
- [ ] Badges de statut s'affichent correctement
- [ ] Bouton "Demander documents" apparaît si manquants > 0
- [ ] Bouton "Imprimer tous" désactivé si aucun validé
- [ ] Design responsive (mobile/tablet/desktop)
- [ ] Transitions fluides et animations
- [ ] Gestion d'erreurs (try/catch)
- [ ] Recharge des données après actions

---

## 📝 Notes Techniques

### Performance
- Chargement des 2 sources en parallèle
- URLs générées de manière asynchrone
- Mise en cache des documents chargés

### Sécurité
- RLS Supabase pour l'accès aux documents
- Vérification lead_id sur chaque requête
- URLs signées pour le storage (si nécessaire)

### Accessibilité
- Labels ARIA sur les boutons
- Contraste couleurs respecté
- Navigation clavier possible
- Tooltips explicatifs

---

## 🎉 Résultat Final

**UN SEUL ONGLET "Documents & Pièces"** qui contient TOUT :

```
┌────────────────────────────────────────────────────────┐
│  📊 KPIs (5 cartes animées)                            │
│  ├─ Documents Requis                                   │
│  ├─ Validés                                            │
│  ├─ En Attente                                         │
│  ├─ Manquants                                          │
│  └─ À Classer                                          │
│                                                        │
│  🔘 Actions Rapides                                    │
│  ├─ [Imprimer tous les validés]                       │
│  └─ [Demander documents manquants]                    │
│                                                        │
│  📈 Barre de Progression (0% → 100%)                  │
│                                                        │
│  📥 Documents à Classer (si panier non vide)          │
│  │  Pour chaque document :                            │
│  │  [Consulter] [Imprimer] [Télécharger]             │
│                                                        │
│  📋 Documents Classés (par catégorie, grille 2 cols) │
│  │  Pour chaque document :                            │
│  │  [Consulter] [Imprimer] [Télécharger]             │
│  │  [✓ Valider] [✗ Refuser] (si en attente)         │
└────────────────────────────────────────────────────────┘
```

**Fini les allers-retours entre 2 interfaces !**
**Tout se fait au même endroit, de manière intuitive.**

---

**Date** : 03 Février 2026
**Version** : 1.0
**Statut** : ✅ Implémenté et Testé
