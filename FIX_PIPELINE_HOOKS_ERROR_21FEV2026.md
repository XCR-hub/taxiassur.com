# Fix : React Error #300 - Passage d'Étapes Pipeline - 21 FÉV 2026

## Problème

**Erreur** :
```
Unexpected Application Error!
Minified React error #300
```

**Contexte** : Lors du passage d'une étape à une autre dans le pipeline commercial.

---

## Cause

### Qu'est-ce que l'erreur #300 ?

React Error #300 = **"Rendered more hooks than during the previous render"**

### Dans notre code

**Fichier** : `src/components/crm/PipelineWorkflow7Etapes.tsx`

Le composant rend conditionnellement différents steps selon `currentStage` :

- Étape 2 : `<CollecteDocumentsStep />` → 11 hooks
- Étape 3 : `<SaisieDevisStep />` → nombre différent de hooks
- Étape 4 : `<ValidationDevisStep />` → encore différent

Quand on change d'étape, React détecte un changement dans le nombre de hooks → **erreur #300**.

---

## Solution

### ✅ Ajout de `key={currentStage}`

**Fichier** : `src/components/crm/PipelineWorkflow7Etapes.tsx`
**Ligne** : 243

```diff
-  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
+  <div key={currentStage} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
```

### Pourquoi ça marche ?

La **clé React** force React à :
1. Démonter complètement le composant de l'étape précédente
2. Réinitialiser tous les hooks
3. Monter un nouveau composant avec son propre état

---

## Test

1. CRM → Ouvrir un lead
2. Aller dans l'onglet Pipeline
3. Cliquer sur "Étape Suivante"
4. **Résultat** : ✅ Pas d'erreur, changement fluide

---

## Build

```bash
npm run build
# ✅ Build réussi
```

---

**Date** : 21 février 2026
**Statut** : ✅ Corrigé et déployé
