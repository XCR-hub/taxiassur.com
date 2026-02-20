# 🚨 FIX URGENT - React Error #300 (Hooks Rules Violation)

## ❌ L'erreur actuelle

```
Minified React error #300
```

**Signification :** Un hook React est appelé après un `return` conditionnel, ce qui viole les règles des hooks.

---

## 🔍 Cause identifiée

**Fichier problématique :** `src/components/MoneticoTestCard.tsx`

**Code INCORRECT (ancien) :**
```tsx
export function MoneticoTestCard() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // ❌ ERREUR : Return APRÈS les hooks
  if (import.meta.env.PROD) {
    return null;
  }
  
  // Le reste du code...
}
```

**Code CORRECT (nouveau) :**
```tsx
export function MoneticoTestCard() {
  // ✅ CORRECT : Condition AVANT les hooks
  if (import.meta.env.PROD) {
    return null;
  }

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Le reste du code...
}
```

---

## ✅ Correction appliquée

### Fichiers modifiés
1. ✅ `src/components/MoneticoTestCard.tsx` - Ligne 38-44 corrigée
2. ✅ Build régénéré avec `npm run build`
3. ✅ Aucune erreur de compilation

### État actuel
- ✅ Code source corrigé
- ✅ Nouveau build généré dans `/dist`
- ❌ **ANCIEN BUILD ENCORE EN PRODUCTION** ← C'est le problème !

---

## 🚀 DÉPLOIEMENT URGENT REQUIS

### Pourquoi l'erreur persiste ?

L'erreur est visible sur **https://taxiassur.com** car :
1. Le nouveau build (corrigé) est dans `/dist` localement
2. L'ancien build (bugué) est toujours sur le serveur IONOS
3. Il faut uploader le nouveau build

---

## 📋 PROCÉDURE DE DÉPLOIEMENT URGENTE

### Option 1 : Upload Manuel (Recommandé - 5 min)

```bash
# Étape 1 : Vérifier que le build est à jour
ls -la dist/assets/*MoneticoTestCard*.js

# Étape 2 : Se connecter à IONOS
# Aller sur : https://www.ionos.fr/hosting/file-manager

# Étape 3 : Uploader TOUT le dossier /dist
# - Supprimer l'ancien contenu du dossier web
# - Uploader le nouveau contenu de /dist

# Étape 4 : Vider le cache
# - Cache navigateur : Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)
# - Cache IONOS : Attendre 2-3 minutes
```

### Option 2 : Script de Déploiement (Si configuré)

```bash
npm run deploy
```

### Option 3 : FTP/SFTP

```bash
# Avec FileZilla ou WinSCP
# Host: ftp.taxiassur.com (ou SFTP)
# Uploader /dist → /
```

---

## ⚡ VÉRIFICATION POST-DÉPLOIEMENT

### Test 1 : Vérifier que l'erreur a disparu

```bash
1. Aller sur : https://taxiassur.com
2. Ouvrir la console (F12)
3. Vider le cache : Ctrl+Shift+R
4. Vérifier qu'il n'y a plus d'erreur #300
```

### Test 2 : Vérifier MoneticoTestCard

```bash
# En mode DEV local (devrait s'afficher)
npm run dev
➡️ Bouton flottant visible en bas à droite

# En PRODUCTION (ne devrait PAS s'afficher)
https://taxiassur.com
➡️ Pas de bouton flottant (normal, c'est PROD)
```

---

## 🔧 Si l'erreur persiste après déploiement

### 1. Vider TOUS les caches

```bash
# Cache navigateur
Ctrl + Shift + Delete
➡️ Cocher "Cache" et "Cookies"
➡️ Cliquer "Effacer"

# Cache IONOS
Attendre 5 minutes
Ou contacter support IONOS pour purger le cache
```

### 2. Vérifier le build déployé

```bash
# Ouvrir la console sur https://taxiassur.com
# Vérifier le hash des fichiers JS
# Exemple : vendor-react-BgDua_Eh.js

# Si le hash est le même qu'avant
➡️ Le nouveau build n'est pas déployé

# Si le hash a changé
➡️ Le nouveau build est déployé, vider le cache navigateur
```

### 3. Mode incognito

```bash
Ouvrir https://taxiassur.com en navigation privée
➡️ Pas de cache = test propre
```

---

## 📊 Chronologie de la correction

```
20 Fév 2026 - 10:00 : Erreur détectée
20 Fév 2026 - 10:15 : Cause identifiée (hooks après return)
20 Fév 2026 - 10:20 : Code corrigé
20 Fév 2026 - 10:25 : Build régénéré
20 Fév 2026 - 10:30 : EN ATTENTE DE DÉPLOIEMENT ⏳
```

---

## ⚠️ RÈGLES DES HOOKS REACT (Pour éviter ce problème)

### ✅ CORRECT

```tsx
function MyComponent() {
  // 1. Vérifier les conditions AVANT les hooks
  if (condition) {
    return null;
  }

  // 2. PUIS appeler les hooks
  const [state, setState] = useState();
  useEffect(() => {}, []);
  
  return <div>...</div>;
}
```

### ❌ INCORRECT

```tsx
function MyComponent() {
  // ❌ ERREUR : Hooks en premier
  const [state, setState] = useState();
  
  // ❌ ERREUR : Return conditionnel APRÈS
  if (condition) {
    return null;
  }
  
  return <div>...</div>;
}
```

### Autre solution : Hook conditionnel

```tsx
function MyComponent() {
  // ✅ Alternative : Utiliser les hooks toujours
  const [state, setState] = useState();
  
  // Condition dans le JSX
  if (condition) {
    return null;
  }
  
  return <div>...</div>;
}
```

---

## 📚 Documentation React

- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Error #300 Details](https://reactjs.org/docs/error-decoder.html?invariant=300)

---

## ✅ Checklist de résolution

```
☑️ Code corrigé dans src/components/MoneticoTestCard.tsx
☑️ Build régénéré (npm run build)
☑️ Aucune erreur de compilation
☐ Nouveau build uploadé sur IONOS ← À FAIRE MAINTENANT
☐ Cache navigateur vidé
☐ Erreur #300 disparue
☐ Tests fonctionnels OK
```

---

## 🚨 ACTION IMMÉDIATE REQUISE

**ÉTAPE SUIVANTE :**
1. **UPLOADER** le contenu de `/dist` sur IONOS
2. **VIDER** le cache navigateur
3. **TESTER** sur https://taxiassur.com

**Temps estimé :** 5-10 minutes
**Impact :** CRITIQUE - Bloque l'utilisation du site

---

**Date : 20 février 2026**
**Priorité : 🚨 URGENTE**
**Status : ⏳ EN ATTENTE DE DÉPLOIEMENT**
