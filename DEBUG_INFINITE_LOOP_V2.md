# 🔧 Debug Boucle Infinie - Documents & Pièces V2

**Date:** 19 janvier 2026
**Status:** 🛠️ Version avec logs de débogage

---

## ✅ Corrections Appliquées

### 1. Suppression de l'appel problématique
```typescript
// ❌ AVANT (causait la boucle)
if (leadResult.data?.documents_complete && onDocumentsComplete) {
  onDocumentsComplete();  // Déclenchait loadLeadData() → re-render → boucle
}

// ✅ APRÈS (supprimé complètement)
// Plus d'appel à onDocumentsComplete
```

### 2. Simplification du useEffect
```typescript
// ✅ Ne dépend QUE de leadId
const loadData = useCallback(async () => {
  // ... chargement des données ...
}, [leadId]);  // Seule dépendance stable

useEffect(() => {
  loadData();
}, [leadId]);  // Se déclenche uniquement au montage et si leadId change
```

### 3. Ajout de logs de débogage
```typescript
console.log('🔄 DocumentChecklistPanelV2: loadData called');
console.log('🎯 DocumentChecklistPanelV2: useEffect triggered');
console.log('✅ DocumentChecklistPanelV2: loadData completed');
```

---

## 🔍 Comment Débugger (si le problème persiste)

### Étape 1: Ouvrir la Console Développeur

1. Ouvrir Chrome DevTools (F12)
2. Aller dans l'onglet "Console"
3. Cliquer sur l'onglet "Documents & Pièces" du lead

### Étape 2: Observer les Logs

**Si le composant fonctionne normalement:**
```
🎯 DocumentChecklistPanelV2: useEffect triggered, leadId: xxx
🔄 DocumentChecklistPanelV2: loadData called for leadId: xxx
✅ DocumentChecklistPanelV2: loadData completed
```
→ 1 seule fois au chargement

**Si le problème persiste (boucle infinie):**
```
🎯 DocumentChecklistPanelV2: useEffect triggered, leadId: xxx
🔄 DocumentChecklistPanelV2: loadData called for leadId: xxx
✅ DocumentChecklistPanelV2: loadData completed
🎯 DocumentChecklistPanelV2: useEffect triggered, leadId: xxx  ← SE RÉPÈTE
🔄 DocumentChecklistPanelV2: loadData called for leadId: xxx
✅ DocumentChecklistPanelV2: loadData completed
🎯 DocumentChecklistPanelV2: useEffect triggered, leadId: xxx  ← ENCORE
...
```
→ Se répète indéfiniment

### Étape 3: Identifier la Cause

Si la boucle persiste, vérifier:

#### A. Le leadId change-t-il constamment ?
```javascript
// Dans la console
let lastLeadId = null;
setInterval(() => {
  const leadId = window.location.pathname.split('/').pop();
  if (leadId !== lastLeadId) {
    console.log('⚠️ leadId has changed:', lastLeadId, '→', leadId);
    lastLeadId = leadId;
  }
}, 100);
```

#### B. D'autres composants déclenchent-ils loadLeadData ?
Chercher dans les logs:
```
CRMLeadDetail: loadLeadData called
DocumentBasket: callback triggered
PendingAttachmentsPanel: callback triggered
DocumentValidationPanel: callback triggered
```

---

## 🎯 Causes Possibles

### 1. Multiples composants en cascade
```
DocumentBasket → loadLeadData()
  → lead change → DocumentChecklistPanelV2 re-render
    → PendingAttachmentsPanel → loadLeadData()
      → lead change → DocumentChecklistPanelV2 re-render
        → BOUCLE
```

**Solution:** Débouncer les appels à loadLeadData

### 2. leadId change constamment
Si l'URL change constamment ou si le router ne stabilise pas le param.

**Solution:** Vérifier react-router-dom et useParams

### 3. Props instables du parent
Si le composant parent passe des props qui changent à chaque render.

**Solution:** Mémoriser les props avec useMemo ou useCallback

---

## 🛠️ Solutions Avancées

### Solution 1: Débouncer loadLeadData (dans CRMLeadDetail)

```typescript
import { useCallback, useRef } from 'react';

const loadLeadData = useCallback(async (id: string) => {
  // Annuler le chargement précédent
  if (loadTimeoutRef.current) {
    clearTimeout(loadTimeoutRef.current);
  }

  // Attendre 300ms avant de charger
  loadTimeoutRef.current = setTimeout(async () => {
    setLoading(true);
    try {
      const leadData = await pipelineService.getLead(id);
      setLead(leadData);
      // ...
    } finally {
      setLoading(false);
    }
  }, 300);
}, []);
```

### Solution 2: Limiter les re-renders avec React.memo

```typescript
// Dans DocumentChecklistPanelV2.tsx
export const DocumentChecklistPanelV2 = React.memo(({
  leadId,
  leadEmail,
  leadFirstName,
  accessToken,
  onDocumentsComplete,
  onRequestDocuments
}: DocumentChecklistPanelV2Props) => {
  // ... composant ...
}, (prevProps, nextProps) => {
  // Ne re-render que si leadId change
  return prevProps.leadId === nextProps.leadId;
});
```

### Solution 3: Supprimer les callbacks inutiles

Dans `CRMLeadDetail.tsx`, remplacer:
```typescript
// ❌ AVANT
<DocumentBasket
  onDocumentClassified={() => {
    loadLeadData(lead.id);
    loadStats(lead.id);
  }}
/>

// ✅ APRÈS (si pas nécessaire de recharger immédiatement)
<DocumentBasket
  onDocumentClassified={() => {
    // Le composant gère son propre état
    // Pas besoin de recharger tout le lead
  }}
/>
```

---

## 📊 Checklist de Vérification

- [ ] Build réussi sans erreurs
- [ ] Logs visibles dans la console
- [ ] leadId stable dans l'URL
- [ ] Un seul chargement au montage du composant
- [ ] Pas de répétition des logs
- [ ] Interface réactive et stable

---

## 🔄 Prochaines Étapes

Si le problème persiste après cette correction:

1. **Collecter les logs** de la console (faire un screenshot)
2. **Identifier** quel autre composant déclenche des rechargements
3. **Appliquer** une des solutions avancées ci-dessus
4. **Tester** avec un seul composant à la fois dans l'onglet Documents

---

## 📝 Fichiers Modifiés

### `src/components/crm/DocumentChecklistPanelV2.tsx`
- Supprimé l'appel à `onDocumentsComplete()`
- Supprimé `onDocumentsComplete` des dépendances de useCallback
- Ajouté des logs de débogage
- Simplifié le flux de chargement

---

**Build:** ✅ Réussi (52s)
**Status:** 🛠️ Version avec logs - Testez et observez la console
