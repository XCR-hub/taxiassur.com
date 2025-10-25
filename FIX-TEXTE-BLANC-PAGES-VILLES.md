# ✅ CORRECTION: Texte Blanc Illisible Pages Villes

## Problème Identifié
Sur les pages villes générées par l'IA (ex: `/ville/assurance-taxi-pas-cher-saint-fargeau`), le texte était blanc sur fond blanc = **illisible**.

## Cause
- La page a `bg-white` (fond blanc)
- Le contenu généré par l'IA contient probablement des classes CSS avec `text-white` ou styles inline
- Résultat : texte blanc invisible sur fond blanc

## Solution Appliquée

### 1. Modification `src/pages/CityPage.tsx`
Ajout de classes CSS spécifiques au contenu :
- `.city-page-content` pour le contenu structuré
- `.city-page-raw-content` pour le contenu HTML brut

```tsx
<article className="prose prose-lg max-w-none city-page-content">
  {/* Contenu avec parsing JSON */}
</article>

// Fallback pour HTML brut
<div
  className="city-page-raw-content"
  dangerouslySetInnerHTML={{ __html: cityPageData.content }}
/>
```

### 2. Ajout Styles CSS `src/index.css`
Ajout de 130+ lignes de styles CSS avec `!important` pour **forcer** le texte en couleur sombre :

```css
/* Forcer le texte en couleur sombre */
.city-page-content *,
.city-page-raw-content * {
  color: #374151 !important;
}

/* Titres */
.city-page-content h1 { color: #111827 !important; }
.city-page-content h2 { color: #1f2937 !important; }
.city-page-content h3 { color: #374151 !important; }

/* Paragraphes, listes, liens, tableaux... */
/* Tous forcés en couleur sombre */
```

## Résultat
- ✅ Tout le texte des pages villes est maintenant en **gris foncé** (`#374151`)
- ✅ Titres en **noir** (`#111827`)
- ✅ Liens en **bleu** (`#2563eb`)
- ✅ **Lisible** sur fond blanc
- ✅ Build validé : 14.66s, 0 erreur

## Déploiement
1. Uploadez le nouveau build (`/dist`)
2. Actualisez une page ville : `https://taxiassur.com/ville/[slug]`
3. Faites **Ctrl+Shift+R** pour vider le cache CSS
4. Le texte devrait maintenant être **parfaitement lisible** en gris foncé

## Fichiers Modifiés
- `src/pages/CityPage.tsx` : Ajout classes CSS
- `src/index.css` : +130 lignes de styles CSS avec !important

## Test Rapide
```
https://taxiassur.com/ville/assurance-taxi-pas-cher-saint-fargeau
```

Le texte doit être en gris foncé, parfaitement lisible.

---

**Note :** L'utilisation de `!important` est justifiée ici car le contenu HTML est généré par l'IA et peut contenir des styles inline ou classes qui écrasent les styles normaux.
