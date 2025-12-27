# Instructions pour voir les corrections

## Les corrections appliquées :

1. ✅ Texte invisible dans "Page Ville: Bordeaux" → Corrigé avec `text-gray-900` explicite
2. ✅ Contenu complet invisible → Corrigé avec fond blanc et texte noir
3. ✅ Erreur "Multiple GoTrueClient instances" → Corrigé avec singleton global

## Pour voir les corrections :

### Option 1 : Hard Refresh du navigateur (le plus rapide)
1. Ouvrez https://taxiassur.com/backoffice/ai-generator
2. Faites un **hard refresh** pour vider le cache :
   - **Windows/Linux** : `Ctrl + Shift + R`
   - **Mac** : `Cmd + Shift + R`
   - Ou ouvrez les DevTools (F12) → Onglet Network → Cochez "Disable cache"

### Option 2 : Déployer le nouveau build sur IONOS
Si le hard refresh ne suffit pas, déployez le nouveau build :

```bash
# Le nouveau build est dans le dossier /dist
# Uploadez tout le contenu de /dist sur votre serveur IONOS
```

## Vérification que les corrections sont appliquées :

Dans la console, vous ne devriez plus voir :
- ❌ `backoffice-all-ayRa4Iww.js` (ancien)
- ❌ `vendor-supabase-yRCnqIo1.js` (ancien)

Mais plutôt :
- ✅ `backoffice-all-DSyehxC6.js` (nouveau)
- ✅ `vendor-supabase-DD_IDIjS.js` (nouveau)

Et l'erreur "Multiple GoTrueClient instances" devrait disparaître.
