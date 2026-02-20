# 🐛 Fix React Error #300 - Hooks Rules Violation

## ❌ Erreur rencontrée

```
Minified React error #300
```

**Cause :** Hooks appelés après une condition de return

---

## 🔍 Le problème

```tsx
// ❌ INCORRECT
export function MoneticoTestCard() {
  const [copiedField, setCopiedField] = useState(null); // Hook appelé
  const [showHelp, setShowHelp] = useState(false);      // Hook appelé

  if (import.meta.env.PROD) {
    return null; // Return APRÈS les hooks !
  }
}
```

**Violation :** Les hooks React doivent toujours être appelés dans le même ordre à chaque render.

---

## ✅ Solution

```tsx
// ✅ CORRECT
export function MoneticoTestCard() {
  // Vérifier AVANT d'appeler les hooks
  if (import.meta.env.PROD) {
    return null;
  }

  const [copiedField, setCopiedField] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
}
```

---

## 📚 Règle d'or des Hooks

**Les hooks doivent TOUJOURS être appelés :**
- ✅ Au niveau racine du composant
- ✅ Dans le même ordre à chaque render
- ❌ Jamais conditionnellement
- ❌ Jamais dans des boucles
- ❌ Jamais après un return

---

## ✅ Correction appliquée

**Fichier :** `src/components/MoneticoTestCard.tsx`

**Changement :** Déplacement de la condition `if (import.meta.env.PROD)` AVANT les hooks

**Build :** ✅ Réussi

**Status :** ✅ RÉSOLU

---

**Date : 20 février 2026**
**Temps : 2 minutes**
**Impact : Critique (application crash)**
