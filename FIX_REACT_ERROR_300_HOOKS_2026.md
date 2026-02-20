# Fix : React Error #300 - Problème de Hooks

## Problème

Après l'intégration Keyyo dans le composant `CallDialog`, une erreur React minifiée #300 apparaissait :

```
Unexpected Application Error!
Minified React error #300
```

Cette erreur indique généralement un problème avec l'utilisation des hooks React (nombre de hooks différent entre les renders, ou problème de dépendances).

---

## Cause Racine

### 1. **Fonction `initializeKeyyo` appelée dans useEffect sans être stable**

```typescript
// ❌ AVANT (problème)
useEffect(() => {
  if (!isOpen) {
    cleanup();
  } else {
    initializeKeyyo(); // Fonction non stable !
  }
}, [isOpen]); // Manque initializeKeyyo dans les dépendances

const initializeKeyyo = async () => {
  // ... code
};
```

**Problème** : La fonction `initializeKeyyo` est recréée à chaque render, ce qui cause des re-renders infinis car elle n'est pas dans le tableau de dépendances.

### 2. **Fonction `cleanup` définie après son utilisation**

```typescript
// ❌ AVANT (problème)
useEffect(() => {
  if (!isOpen) {
    cleanup(); // Utilisée avant d'être définie !
  }
}, [isOpen]);

// ... 50 lignes plus loin
const cleanup = () => {
  // ...
};
```

**Problème** : JavaScript hoisting fait que la fonction existe, mais ce n'est pas une bonne pratique et peut causer des problèmes avec les dépendances de useEffect.

### 3. **Pas d'import de `useCallback`**

Le hook `useCallback` n'était pas importé, ce qui empêchait de mémoriser les fonctions.

---

## Solution Implémentée

### ✅ 1. Import de `useCallback`

```typescript
// ✅ APRÈS
import React, { useState, useEffect, useRef, useCallback } from 'react';
```

### ✅ 2. Fonction `cleanup` mémorisée et définie en premier

```typescript
// ✅ APRÈS (stable)
const cleanup = useCallback(() => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
    mediaRecorderRef.current.stop();
  }
  setCallStatus('idle');
  setCallDuration(0);
  setIsRecording(false);
  setNotes('');
  setRecordingStartTime(null);
  setKeyyoCallId(null);
  audioChunksRef.current = [];
}, []); // Dépendances vides = fonction stable
```

**Bénéfices** :
- Fonction stable (ne change jamais)
- Peut être utilisée dans les dépendances de useEffect
- Pas de re-création à chaque render

### ✅ 3. Fonction `initializeKeyyo` mémorisée

```typescript
// ✅ APRÈS (stable)
const initializeKeyyo = useCallback(async () => {
  try {
    const isConfigured = await keyyoService.isConfigured();
    setKeyyoEnabled(isConfigured);

    if (isConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const extension = await keyyoService.getUserExtension(user.id);
        setUserExtension(extension);
        if (extension) {
          setCallMode('keyyo');
        }
      }
    }
  } catch (error) {
    logger.error('Failed to initialize Keyyo:', error);
  }
}, []); // Dépendances vides = fonction stable
```

**Bénéfices** :
- Fonction stable
- Peut être utilisée dans les dépendances de useEffect
- Pas de re-création à chaque render

### ✅ 4. useEffect avec dépendances correctes

```typescript
// ✅ APRÈS (dépendances complètes)
useEffect(() => {
  if (!isOpen) {
    cleanup();
  } else {
    initializeKeyyo();
  }
}, [isOpen, cleanup, initializeKeyyo]); // Toutes les dépendances présentes
```

**Bénéfices** :
- Pas d'avertissement ESLint
- Comportement prévisible
- Pas de re-renders infinis

### ✅ 5. Suppression de la définition dupliquée

La fonction `cleanup` était définie deux fois dans le fichier. La deuxième définition a été supprimée.

---

## Règles des Hooks React

Pour éviter ce type d'erreur à l'avenir :

### 1. **Ordre des définitions**

```typescript
// ✅ BON ORDRE
const ref = useRef();           // 1. Refs
const [state, setState] = ...;  // 2. State
const callback = useCallback(); // 3. Callbacks
useEffect(() => {});            // 4. Effects
```

### 2. **Mémorisation des fonctions utilisées dans useEffect**

```typescript
// ❌ MAUVAIS (fonction recréée à chaque render)
const myFunction = () => { ... };
useEffect(() => {
  myFunction();
}, [myFunction]); // Cause des re-renders infinis !

// ✅ BON (fonction mémorisée)
const myFunction = useCallback(() => {
  ...
}, []); // ou [dépendances]
useEffect(() => {
  myFunction();
}, [myFunction]); // Pas de re-renders infinis
```

### 3. **Toujours inclure toutes les dépendances**

```typescript
// ❌ MAUVAIS (dépendance manquante)
useEffect(() => {
  myFunction(); // Utilisée mais pas dans les dépendances
}, []);

// ✅ BON (toutes les dépendances présentes)
useEffect(() => {
  myFunction();
}, [myFunction]);
```

### 4. **useCallback pour les fonctions passées en props ou utilisées dans useEffect**

```typescript
// ✅ BON
const handleClick = useCallback(() => {
  // Code
}, [dependencies]);

// Peut être passé en prop ou utilisé dans useEffect sans problème
<Button onClick={handleClick} />
```

---

## Tests

### Test 1 : Ouvrir le dialogue d'appel

**Étapes** :
1. Ouvrir une fiche lead
2. Cliquer sur "Appeler"
3. Le dialogue s'ouvre

**Résultat attendu** :
- ✅ Pas d'erreur React
- ✅ Le dialogue s'affiche correctement
- ✅ Si Keyyo configuré : Le mode Keyyo est sélectionné par défaut

### Test 2 : Fermer et rouvrir le dialogue

**Étapes** :
1. Ouvrir le dialogue d'appel
2. Fermer avec X
3. Rouvrir le dialogue

**Résultat attendu** :
- ✅ Pas d'erreur React
- ✅ Le dialogue se réinitialise correctement
- ✅ Pas de re-renders infinis

### Test 3 : Changer de mode d'appel

**Étapes** :
1. Ouvrir le dialogue (si Keyyo configuré)
2. Basculer entre mode Keyyo et Manuel
3. Fermer et rouvrir

**Résultat attendu** :
- ✅ Pas d'erreur React
- ✅ Le mode sélectionné change
- ✅ À la réouverture, le mode Keyyo est à nouveau sélectionné par défaut

---

## React Error #300 : Qu'est-ce que c'est ?

React Error #300 correspond généralement à l'une de ces erreurs :

### 1. "Rendered more hooks than during the previous render"

Cela arrive quand :
- Des hooks sont appelés conditionnellement
- Le nombre de hooks change entre les renders
- Des fonctions non mémorisées causent des re-renders infinis

### 2. "Rendered fewer hooks than expected"

Cela arrive quand :
- Des hooks sont dans des conditions (if, loops)
- L'ordre des hooks change entre les renders

### Exemple d'erreur typique

```typescript
// ❌ ERREUR : hooks conditionnels
function MyComponent({ show }) {
  if (show) {
    const [state, setState] = useState(); // Hook conditionnel !
  }
  return <div>...</div>;
}

// ✅ CORRECT
function MyComponent({ show }) {
  const [state, setState] = useState(); // Hook toujours appelé
  if (!show) return null;
  return <div>...</div>;
}
```

---

## Outils de diagnostic

### 1. **React DevTools**

Installer l'extension React DevTools et activer "Highlight updates when components render".

### 2. **ESLint Plugin**

```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 3. **Console.log dans useEffect**

```typescript
useEffect(() => {
  console.log('Effect running', { isOpen, cleanup, initializeKeyyo });
  // ...
}, [isOpen, cleanup, initializeKeyyo]);
```

---

## Documentation React

Pour en savoir plus sur les hooks et éviter ces erreurs :

- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [useCallback](https://react.dev/reference/react/useCallback)
- [useEffect](https://react.dev/reference/react/useEffect)
- [React Error Decoder](https://reactjs.org/docs/error-decoder.html?invariant=300)

---

## Résumé

### Ce qui a été corrigé

1. ✅ Ajout de `useCallback` à l'import
2. ✅ Fonction `cleanup` mémorisée avec `useCallback`
3. ✅ Fonction `initializeKeyyo` mémorisée avec `useCallback`
4. ✅ Ordre des définitions corrigé (cleanup et initializeKeyyo avant useEffect)
5. ✅ Dépendances complètes dans useEffect
6. ✅ Suppression de la définition dupliquée de `cleanup`
7. ✅ Build réussi

### Leçons apprises

- **Toujours mémoriser** les fonctions utilisées dans useEffect
- **Définir les fonctions** avant de les utiliser dans useEffect
- **Inclure toutes les dépendances** dans le tableau de dépendances
- **Utiliser ESLint** pour détecter les problèmes de hooks

**Le composant CallDialog est maintenant stable et ne cause plus d'erreur React #300 !**
