# Correction Espace Prospect - Documents et Progression
**Date** : 20 février 2026
**Statut** : ✅ Corrigé et déployé

## 🐛 Problèmes Identifiés

### 1. Badge "10/7" en Rouge
**Problème** : Le badge affiche "10/7" en rouge alors que tous les documents semblent validés.

**Cause racine** :
```sql
-- Ancienne requête dans get_lead_by_token
SELECT COUNT(*)
INTO v_uploaded_docs
FROM crm_lead_documents
WHERE lead_id = v_lead_id
  AND uploaded_at IS NOT NULL;
```

**Explication** :
- Cette requête compte **TOUS les documents uploadés**, pas les types distincts
- Si un document est rejeté puis re-uploadé → compte 2 fois
- Exemple :
  - 7 types de documents requis
  - Prospect uploade licence_taxi → rejetée → uploade à nouveau = **2 documents**
  - Prospect uploade carte_grise → rejetée → uploade à nouveau = **2 documents**
  - Total = 4 re-uploads + 6 documents OK = **10 documents** (mais seulement 7 types !)

**Résultat** : Badge affiche "10/7" 🔴

### 2. Progression 143%
**Problème** : La progression affiche "143%" au lieu de ~14.3%

**Cause racine** :
```sql
v_progression := ROUND((v_uploaded_docs::numeric / v_total_docs::numeric) * 100)::integer;
```

**Explication** :
- 10 documents uploadés / 7 total = 142.8% → arrondi à 143%
- Le calcul devrait être basé sur les documents **VALIDÉS**, pas uploadés

### 3. Onglet Documents Pas Vert
**Problème** : L'onglet Documents reste jaune/orange même quand tous les documents sont validés, alors que Devis et Paiement deviennent verts.

**Cause racine** :
```typescript
// Frontend - EspaceProspect.tsx ligne 346-347
case 'documents':
  return leadInfo.documents_complete ? 'completed' : 'current';
```

Le champ `documents_complete` restait toujours `false` car :
1. Il n'était jamais mis à jour dans la base de données
2. La fonction `get_lead_by_token` retournait la valeur de la table au lieu de la calculer

## ✅ Solutions Implémentées

### 1. Backend - Migration SQL

**Fichier** : `20260220220000_fix_document_counters_and_badge_20fev2026.sql`

#### Changements clés :

**a) Compter les TYPES distincts de documents**
```sql
-- ✅ Compte les TYPES distincts, pas tous les documents
SELECT COUNT(DISTINCT document_type)
INTO v_uploaded_docs
FROM crm_lead_documents
WHERE lead_id = v_lead_id
  AND uploaded_at IS NOT NULL
  AND document_type IN (
    'licence_taxi',
    'permis_conduire',
    'piece_identite',
    'carte_grise',
    'autorisation_stationnement',
    'rib'
  );
```

**b) Ajouter un compteur pour les documents validés**
```sql
-- ✅ Nouveau compteur pour les documents VALIDÉS
SELECT COUNT(DISTINCT document_type)
INTO v_validated_docs
FROM crm_lead_documents
WHERE lead_id = v_lead_id
  AND (validated = true OR status = 'validated')
  AND document_type IN (...);
```

**c) Calculer la progression sur les validés**
```sql
-- ✅ Progression basée sur VALIDÉS, pas uploadés
IF v_total_docs > 0 THEN
  v_progression := ROUND((v_validated_docs::numeric / v_total_docs::numeric) * 100)::integer;

  -- ✅ Documents complets = tous validés
  v_docs_complete := (v_validated_docs >= v_total_docs);
END IF;
```

**d) Retourner le champ calculé**
```sql
RETURN QUERY
SELECT
  ...
  v_docs_complete as documents_complete,  -- ✅ Valeur calculée
  ...
  v_validated_docs as validated_documents  -- ✅ Nouveau champ
FROM crm_leads l
```

#### Nouveau schéma de retour :

```typescript
interface LeadInfo {
  // Anciens champs
  total_documents: number;        // 6 (documents requis)
  uploaded_documents: number;     // 7 (types distincts uploadés)

  // ✅ Nouveau champ
  validated_documents: number;    // 6 (types distincts validés)

  // ✅ Champ calculé correctement
  documents_complete: boolean;    // true si validated_documents >= total_documents

  // ✅ Progression corrigée
  progression_percentage: number; // (validated / total) * 100
}
```

### 2. Frontend - EspaceProspect.tsx

#### a) Interface TypeScript mise à jour (ligne 30-57)
```typescript
interface LeadInfo {
  ...
  validated_documents?: number;  // ✅ Nouveau champ ajouté
  ...
}
```

#### b) Badge avec logique de couleur dynamique (ligne 491-503)

**Avant** :
```tsx
<div className="bg-red-500 text-white font-black text-xl px-5 py-3 rounded-xl mb-2 animate-bounce">
  {leadInfo.uploaded_documents || 0} / {leadInfo.total_documents || 7}
</div>
<p className="text-sm text-gray-400 font-semibold">Documents manquants</p>
```

**Après** :
```tsx
<div className={`text-white font-black text-xl px-5 py-3 rounded-xl mb-2 ${
  (leadInfo.validated_documents || 0) === 0
    ? 'bg-red-500 animate-bounce'           // ✅ Rouge si aucun validé
    : (leadInfo.validated_documents || 0) < (leadInfo.total_documents || 6)
    ? 'bg-amber-500'                        // ✅ Ambre si en cours
    : 'bg-green-500'                        // ✅ Vert si tous validés
}`}>
  {leadInfo.validated_documents || 0} / {leadInfo.total_documents || 6}
</div>
<p className="text-sm text-gray-400 font-semibold">
  {(leadInfo.validated_documents || 0) === (leadInfo.total_documents || 6)
    ? 'Documents complets'                  // ✅ Message adapté
    : 'Documents validés'}
</p>
```

**Logique des couleurs** :
- 🔴 **Rouge + animation** : Aucun document validé (0/6) → urgence !
- 🟠 **Ambre** : Quelques documents validés (1-5/6) → en cours
- 🟢 **Vert** : Tous documents validés (6/6) → complet !

#### c) Onglet Documents avec checkmark vert (ligne 534-562)

Le code existant fonctionne maintenant correctement car `documents_complete` est calculé :

```typescript
const getStepStatus = (step) => {
  switch (step) {
    case 'documents':
      return leadInfo.documents_complete ? 'completed' : 'current';
      // ✅ documents_complete est maintenant true quand tous validés
    ...
  }
};

// Rendu de l'onglet avec checkmark
{status === 'completed' && activeTab !== tab.key && (
  <CheckCircle2 size={16} className="absolute -top-1 -right-1 text-green-400" />
  // ✅ Affiche le checkmark vert quand completed
)}
```

## 📊 Comparaison Avant/Après

### Avant
| Situation | Badge | Progression | Onglet Documents |
|-----------|-------|-------------|------------------|
| 7 types uploadés, dont 3 re-uploadés | 10/7 🔴 | 143% | 🟠 Orange |
| Tous validés | 10/7 🔴 | 143% | 🟠 Orange |

### Après
| Situation | Badge | Progression | Onglet Documents |
|-----------|-------|-------------|------------------|
| 0 validé | 0/6 🔴 | 0% | 🟠 Orange |
| 3 validés sur 6 | 3/6 🟠 | 50% | 🟠 Orange |
| 6 validés (tous) | 6/6 🟢 | 100% | 🟢 Vert ✓ |

## 🎯 Résultats

### Backend
- ✅ Fonction `get_lead_by_token` corrigée
- ✅ Compte DISTINCT document_type au lieu de COUNT(*)
- ✅ Nouveau champ `validated_documents`
- ✅ `documents_complete` calculé dynamiquement
- ✅ Progression basée sur documents validés

### Frontend
- ✅ Interface TypeScript mise à jour
- ✅ Badge avec couleur dynamique (rouge/ambre/vert)
- ✅ Animation uniquement quand urgence (0 documents)
- ✅ Message adapté ("Documents validés" vs "Documents complets")
- ✅ Onglet Documents devient vert avec checkmark quand complet

### UX Améliorée
- ✅ Badge reflète la réalité (types distincts de documents)
- ✅ Couleurs intuitives (rouge = urgent, vert = OK)
- ✅ Progression réaliste (0-100%, pas 143%)
- ✅ Cohérence visuelle entre onglets (Devis ✓, Paiement ✓, Documents ✓)

## 🧪 Tests à Effectuer

### Test 1 : Badge rouge - Aucun document
1. Ouvrir espace prospect sans documents uploadés
2. **Vérifier** : Badge affiche "0/6" en rouge avec animation
3. **Vérifier** : Onglet Documents est orange

### Test 2 : Badge ambre - Documents en cours
1. Uploader 3 documents sur 6
2. Commercial valide 2 documents
3. **Vérifier** : Badge affiche "2/6" en ambre
4. **Vérifier** : Progression ~33%
5. **Vérifier** : Onglet Documents reste orange

### Test 3 : Badge vert - Tous validés
1. Commercial valide les 6 documents requis
2. Rafraîchir l'espace prospect
3. **Vérifier** : Badge affiche "6/6" en vert (pas d'animation)
4. **Vérifier** : Message "Documents complets"
5. **Vérifier** : Progression 100%
6. **Vérifier** : Onglet Documents devient vert avec checkmark ✓

### Test 4 : Re-upload ne compte pas double
1. Uploader licence_taxi → rejetée par commercial
2. Re-uploader licence_taxi → validée
3. **Vérifier** : Badge compte 1/6, pas 2/6

## 📝 Notes Techniques

### Documents requis (6 obligatoires)
```typescript
const REQUIRED_DOCS = [
  'licence_taxi',
  'permis_conduire',
  'piece_identite',
  'carte_grise',
  'autorisation_stationnement',
  'rib'
];
```

### Logique de validation
Un document est considéré **validé** si :
```sql
validated = true OR status = 'validated'
```

### Logique documents_complete
```sql
documents_complete = (validated_documents >= total_documents)
```

## 🚀 Déploiement

### Base de données
```bash
✅ Migration appliquée : fix_document_counters_and_badge_20fev2026
```

### Frontend
```bash
npm run build
✅ built in 1m 19s
✅ page-espaceprospect-CyCeoXIk.js : 27.50 kB
```

### Vérification
1. Ouvrir un espace prospect en production
2. Vérifier le badge (couleur et compteur)
3. Vérifier la progression (0-100%)
4. Vérifier l'onglet Documents (vert quand complet)

---

**Résultat** : L'espace prospect affiche maintenant des informations cohérentes et intuitives. Le badge reflète le nombre réel de types de documents validés (pas les uploads multiples), avec des couleurs qui guident l'utilisateur (rouge = urgent, ambre = en cours, vert = OK). L'onglet Documents devient vert avec un checkmark exactement comme Devis et Paiement.
