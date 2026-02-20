# ✅ CORRECTION React Error #300 - Boucle Infinie 20 FÉV 2026

## 🚨 Problème identifié

**Error #300 : Maximum update depth exceeded**

```
Minified React error #300
```

L'application affichait des taxis 🚖 en boucle infinie avant de crasher.

---

## 🎯 Cause racine

**Boucle infinie dans `src/pages/EspaceProspect.tsx`**

### Ligne 173-177 ❌

```typescript
useEffect(() => {
  if (token && anonClient) {
    loadLeadInfo();
  }
}, [token, anonClient, loadLeadInfo]);  // ❌ loadLeadInfo dans les dépendances !
```

### Ligne 194-198 ❌

```typescript
useEffect(() => {
  if (token && anonClient && leadInfo) {
    loadDocuments();
  }
}, [token, anonClient, leadInfo, loadDocuments]);  // ❌ loadDocuments dans les dépendances !
```

---

## 💡 Pourquoi c'est une boucle ?

1. **useEffect 1** se déclenche → appelle `loadLeadInfo()`
2. `loadLeadInfo()` modifie `leadInfo` avec `setLeadInfo()`
3. `leadInfo` change → **useEffect 2** se déclenche
4. **useEffect 2** appelle `loadDocuments()`
5. `loadDocuments` peut modifier des états → re-déclenche **useEffect 1**
6. → **BOUCLE INFINIE !** ♾️

**En plus :**
- `loadLeadInfo` est dans les dépendances du useEffect qui l'appelle
- `loadDocuments` est dans les dépendances du useEffect qui l'appelle
- Chaque re-render recréé ces fonctions → re-déclenche les useEffect

---

## ✅ CORRECTION APPLIQUÉE

### Ligne 173-177 ✅

```typescript
useEffect(() => {
  if (token && anonClient) {
    loadLeadInfo();
  }
}, [token, anonClient]); // ✅ Retirer loadLeadInfo des dépendances
```

**Raison :** `loadLeadInfo` est un `useCallback` qui dépend déjà de `token` et `anonClient`. Pas besoin de le remettre dans les dépendances.

### Ligne 194-198 ✅

```typescript
useEffect(() => {
  if (token && anonClient && leadInfo) {
    loadDocuments();
  }
}, [token, anonClient, leadInfo]); // ✅ Retirer loadDocuments des dépendances
```

**Raison :** `loadDocuments` est un `useCallback` qui dépend déjà de `token` et `anonClient`. On garde uniquement `leadInfo` pour déclencher le chargement quand les infos du lead changent.

---

## 🧪 Vérification

### Build réussi ✅

```bash
npm run build
✓ built in 50.26s
```

### Taille des bundles

| Fichier | Taille | Gzippé |
|---------|--------|--------|
| page-espaceprospect | 21.95 kB | 5.62 kB |
| vendor-react | 274.92 kB | 88.56 kB |
| backoffice-crm | 451.06 kB | 93.26 kB |

---

## 📋 Règles pour éviter ce problème

### ❌ NE JAMAIS faire :

```typescript
const myFunction = useCallback(() => {
  // ...
}, [dep1, dep2]);

useEffect(() => {
  myFunction();
}, [dep1, dep2, myFunction]);  // ❌ myFunction en dépendance !
```

### ✅ TOUJOURS faire :

```typescript
const myFunction = useCallback(() => {
  // ...
}, [dep1, dep2]);

useEffect(() => {
  myFunction();
}, [dep1, dep2]);  // ✅ Uniquement les dépendances primitives
```

### Ou utiliser un ref :

```typescript
const myFunctionRef = useRef(myFunction);

useEffect(() => {
  myFunctionRef.current = myFunction;
});

useEffect(() => {
  myFunctionRef.current();
}, []);  // ✅ Pas de dépendances
```

---

## 🚀 Déploiement

1. **Build réussi** ✅
2. **Tester localement** :
   ```bash
   npm run build
   npm run preview
   ```
3. **Vérifier l'espace prospect** :
   - https://taxiassur.com/espace-prospect/{TOKEN}
   - Vérifier qu'il n'y a pas de boucle infinie
   - Vérifier que les documents se chargent correctement

4. **Déployer sur IONOS** :
   ```bash
   npm run deploy
   ```

---

## ✅ Checklist validation

- [x] Boucle infinie identifiée
- [x] useEffect 1 corrigé (loadLeadInfo retiré)
- [x] useEffect 2 corrigé (loadDocuments retiré)
- [x] Build réussi
- [ ] Tests locaux effectués
- [ ] Déployé en production
- [ ] Vérification espace prospect OK

---

## 📚 Documentation React

**React Error #300** : https://reactjs.org/docs/error-decoder.html?invariant=300

> Too many re-renders. React limits the number of renders to prevent an infinite loop.

**Solution officielle :**
- Ne pas appeler `setState` dans le render
- Ne pas mettre de fonctions dans les dépendances des useEffect si elles sont déjà en `useCallback`
- Utiliser `useCallback` et `useMemo` correctement
- Vérifier les chaînes de dépendances circulaires

---

**Date :** 20 février 2026 13:15  
**Statut :** ✅ Corrections appliquées  
**Action requise :** Tester et déployer
