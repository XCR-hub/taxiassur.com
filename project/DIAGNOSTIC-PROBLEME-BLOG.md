# 🐛 Diagnostic: Articles Blog Non Affichés

## Problème Rapporté

**Symptôme:** Quand on clique sur un article du blog, la page charge mais l'article ne s'affiche pas.

## Diagnostic Initial

### 1. Vérifier la Console du Navigateur (F12)

Ouvrez la console et regardez les erreurs:

**Option A: Fonction RPC manquante**
```
Error: function public.get_blog_post_by_slug does not exist
```
→ Solution: Créer la fonction SQL manquante

**Option B: Aucune donnée**
```
console.log: "⚠️ No blog posts found in Supabase, trying local..."
```
→ Solution: Insérer les articles dans Supabase

**Option C: Erreur de chargement**
```
Error loading blog/index-0.json: 404
```
→ Solution: Vérifier les fichiers JSON locaux

### 2. Vérifier les Routes (Flux Complet)

1. **Liste des articles:** `/blog`
   - Appelle: `getBlogPosts()`
   - Fonction SQL: `get_blog_posts()`

2. **Article individuel:** `/blog/:id`
   - Appelle: `getBlogPost(id)`
   - Fonction SQL: `get_blog_post_by_slug(p_slug)`

### 3. Vérifier Supabase

**Étape 1: Vérifier la table `blog_posts`**
```sql
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE published = true) as published
FROM blog_posts;
```

Résultat attendu: `total > 0` et `published > 0`

**Étape 2: Vérifier les fonctions RPC**
```sql
-- Fonction pour liste
SELECT * FROM get_blog_posts() LIMIT 3;

-- Fonction pour article individuel
SELECT * FROM get_blog_post_by_slug('assurance-taxi-2024');
```

Si erreur: "function does not exist" → Il faut les créer

**Étape 3: Vérifier les slugs**
```sql
SELECT slug, title FROM blog_posts WHERE published = true;
```

Vérifiez que les slugs correspondent aux URLs des articles.

## Solutions Possibles

### Solution 1: Créer les Fonctions RPC Manquantes

Si les fonctions SQL n'existent pas, créez-les:

```sql
-- Fonction pour obtenir tous les articles
CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE (
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  featured_image TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  faq JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.author,
    bp.featured_image,
    bp.tags,
    bp.created_at,
    bp.updated_at,
    bp.faq
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir un article par slug
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug TEXT)
RETURNS TABLE (
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  featured_image TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  faq JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.author,
    bp.featured_image,
    bp.tags,
    bp.created_at,
    bp.updated_at,
    bp.faq
  FROM blog_posts bp
  WHERE bp.slug = p_slug
    AND bp.published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner accès public
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(TEXT) TO anon, authenticated;
```

### Solution 2: Insérer les Articles dans Supabase

Si la table est vide:

```sql
-- Utiliser le fichier existant
-- Chercher: INSERT-24-ARTICLES-BLOG-FIXED.sql
-- Ou: INSERT-ALL-BLOG-POSTS.sql
```

Exécutez l'un de ces fichiers dans Supabase SQL Editor.

### Solution 3: Fallback sur Fichiers Locaux

Si Supabase ne fonctionne pas, vérifiez les fichiers:

```bash
ls public/content/blog/*.json
```

Vérifiez que ces fichiers existent:
- `public/content/blog/index-0.json`
- `public/content/blog/assurance-taxi-2024.json`
- etc.

## Tests à Effectuer

### Test 1: Liste des Articles

1. Aller sur `/blog`
2. Vérifier que les articles s'affichent
3. Console (F12) devrait montrer:
   ```
   ✅ Loaded X blog posts from Supabase
   ```

### Test 2: Article Individuel

1. Cliquer sur un article
2. URL devrait être: `/blog/assurance-taxi-2024`
3. L'article devrait s'afficher avec:
   - Titre
   - Image de couverture
   - Contenu complet
   - FAQ en bas
4. Console devrait montrer:
   ```
   🔍 Fetching blog post "assurance-taxi-2024" via SQL function...
   ```

### Test 3: Données Réelles

Vérifiez dans la page HTML que le contenu est bien présent:
- Inspect (F12) → Elements
- Cherchez: `<article class="blog-content"`
- Vérifiez qu'il y a du contenu à l'intérieur

## Commandes Utiles

### Console Navigateur (F12)

```javascript
// Voir la configuration Supabase
console.log(window.env?.VITE_SUPABASE_URL);

// Tester le chargement d'un article
fetch('https://drohhxrkoequjphvabvq.supabase.co/rest/v1/rpc/get_blog_post_by_slug', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'YOUR_ANON_KEY'
  },
  body: JSON.stringify({ p_slug: 'assurance-taxi-2024' })
}).then(r => r.json()).then(console.log);
```

### SQL Supabase

```sql
-- Compter les articles
SELECT COUNT(*) FROM blog_posts WHERE published = true;

-- Voir les slugs
SELECT slug FROM blog_posts WHERE published = true;

-- Tester la fonction
SELECT * FROM get_blog_post_by_slug('assurance-taxi-2024');
```

## Prochaines Étapes

1. **Ouvrir la console (F12)** et aller sur `/blog`
2. **Noter l'erreur exacte** affichée
3. **Appliquer la solution correspondante**:
   - Fonction manquante → Créer les fonctions RPC
   - Table vide → Insérer les articles
   - Fichiers locaux manquants → Rebuild du projet

## Fichiers à Vérifier

- `/src/components/BlogPost.tsx` - Composant d'affichage
- `/src/lib/content.ts` - Fonctions de chargement (ligne 202)
- `/public/content/blog/*.json` - Fichiers locaux
- Supabase: table `blog_posts` + fonctions RPC

---

**Date:** 23 octobre 2025
**Status:** Diagnostic en attente de logs console
