# Correction Affichage Emails - Inbox Multicanal

## Problème Identifié

Lorsque vous ouvrez un email dans l'Inbox Multicanal, le contenu de l'email n'est pas visible. La zone reste vide/blanche.

## Cause

Votre navigateur utilise encore l'**ancien code JavaScript en cache**. Les corrections ont été appliquées, mais votre navigateur ne les voit pas car il charge les anciens fichiers mis en cache.

## Solution CRITIQUE - VIDER LE CACHE

### Méthode 1 : Raccourci Clavier (RECOMMANDÉ)

1. **Chrome/Edge/Firefox** :
   - Windows : `Ctrl + Shift + Suppr`
   - Mac : `Cmd + Shift + Suppr`

2. Une fenêtre s'ouvre, cochez :
   - **Images et fichiers en cache** ✓
   - **Fichiers JavaScript et CSS** ✓

3. Sélectionnez la période : **"Dernières 24 heures"**

4. Cliquez sur **"Effacer les données"**

5. **Fermez complètement le navigateur** (toutes les fenêtres)

6. Rouvrez et reconnectez-vous

### Méthode 2 : Actualisation Forcée

1. Ouvrez les DevTools : `F12`

2. **Clic droit** sur le bouton actualiser du navigateur (à côté de l'URL)

3. Choisissez **"Vider le cache et actualiser de force"** ou **"Hard Reload"**

4. Fermez les DevTools et actualisez encore une fois : `Ctrl + F5`

### Méthode 3 : Mode Incognito (Test)

Pour tester si c'est bien un problème de cache :

1. Ouvrez une **fenêtre de navigation privée** :
   - Chrome : `Ctrl + Shift + N`
   - Firefox : `Ctrl + Shift + P`
   - Edge : `Ctrl + Shift + N`

2. Allez sur le backoffice et connectez-vous

3. Testez l'affichage d'un email

Si ça marche en mode incognito, c'est bien le cache qui pose problème.

## Comment Vérifier Que Ça Marche

Après avoir vidé le cache, quand vous ouvrez un email, vous **DEVEZ** voir en haut :

```
🔴 VERSION DU 31 JANVIER 2026 - 20h45 🔴
Si vous ne voyez pas cette bannière rouge, videz votre cache (Ctrl+Shift+Suppr)
```

Cette bannière rouge vif avec bordure épaisse est **impossible à manquer**. Si vous ne la voyez pas, c'est que le cache n'a pas été vidé correctement.

## Corrections Appliquées

### 1. Affichage Direct du HTML

Au lieu de convertir le HTML en texte, le système affiche maintenant **directement le HTML** de l'email, ce qui garantit que tout le contenu est visible.

### 2. Suppression des Styles Problématiques

Les styles inline qui rendaient le texte invisible (texte blanc sur fond blanc) sont automatiquement supprimés.

### 3. Fond Sombre Forcé

La zone de contenu a un fond sombre avec du texte blanc forcé, garantissant la lisibilité même si l'email contient des styles problématiques.

### 4. Fallback pour Texte Brut

Si l'email ne contient que du texte brut (pas de HTML), il est affiché ligne par ligne avec une mise en forme correcte.

### 5. Message d'Erreur Visible

Si un email ne contient vraiment aucun contenu, un message jaune clair s'affiche.

## IMPORTANT : Déployez les Fichiers

Uploadez le dossier `/dist` complet sur votre serveur IONOS pour que les corrections soient visibles en production.
