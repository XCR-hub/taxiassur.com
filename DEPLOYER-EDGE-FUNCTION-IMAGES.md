# 📸 Déployer la mise à jour Edge Function avec Images Pexels

## ✅ Ce qui a été fait

1. **Code corrigé** : `loadPosts()` → `loadRealStats()` dans `SocialMediaManager.tsx`
2. **Images Pexels ajoutées** : L'Edge Function génère maintenant des images automatiquement
3. **Build validé** : Le projet compile sans erreur

---

## 🚀 Action à faire : Redéployer l'Edge Function

### Méthode 1 : Via Supabase Dashboard (RECOMMANDÉ)

1. **Aller dans Supabase Dashboard** → Votre projet → **Edge Functions**

2. **Trouver** : `ai-viral-content-generator`

3. **Cliquer** sur "Edit" ou "Deploy new version"

4. **Copier-coller** le code ci-dessous dans `index.ts`

5. **Déployer** !

---

## 📝 Code complet de l'Edge Function (avec Images Pexels)

Le fichier se trouve ici :
`/tmp/cc-agent/58094969/project/supabase/functions/ai-viral-content-generator/index.ts`

**Changements clés** :

```typescript
// Ligne 112-138 : Nouvelle section Pexels
const pexelsKey = Deno.env.get("PEXELS_API_KEY");
let imageUrl: string | null = null;

if (pexelsKey) {
  try {
    const searchQuery = topic.includes('taxi') ? 'taxi driver city' : 'insurance professional';
    const pexelsResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=15&orientation=landscape`,
      {
        headers: {
          'Authorization': pexelsKey
        }
      }
    );

    if (pexelsResponse.ok) {
      const pexelsData = await pexelsResponse.json();
      if (pexelsData.photos && pexelsData.photos.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(5, pexelsData.photos.length));
        imageUrl = pexelsData.photos[randomIndex].src.large;
      }
    }
  } catch (error) {
    console.error('Pexels error:', error);
  }
}

// Ligne 163 : Image ajoutée dans l'insertion
media_urls: imageUrl ? [imageUrl] : [],
```

---

## 🔑 Vérifier la clé Pexels

Dans Supabase Dashboard → **Settings** → **Secrets** :

```
PEXELS_API_KEY=<votre-clé-pexels>
```

Si elle n'est pas configurée, ajoutez-la !

---

## 🎯 Résultat attendu

Après déploiement, quand vous générez du contenu IA :

✅ **Contenu généré** (comme avant)
✅ **Hashtags optimisés** (comme avant)
✅ **Image Pexels automatique** ← **NOUVEAU**
✅ **Statistiques rafraîchies** (fix loadRealStats)

---

## 📦 Pour déployer le frontend

```bash
npm run build
```

Puis uploadez le dossier `dist/` sur votre serveur IONOS.

---

## ✅ Checklist finale

- [ ] Edge Function redéployée avec le nouveau code
- [ ] Clé `PEXELS_API_KEY` configurée dans Supabase
- [ ] SQL `FIX-SOCIAL-NETWORKS-EMPTY.sql` exécuté (table peuplée)
- [ ] Frontend rebuild et uploadé

🎉 **Tout sera fonctionnel !**
