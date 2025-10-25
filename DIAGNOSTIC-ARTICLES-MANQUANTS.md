# 🔍 Diagnostic : Pourquoi les Articles ne Sont Pas Visibles ?

## Problème Constaté

Tu as lancé la génération manuelle d'articles :
- ✅ Requête HTTP retournée : ID `47`
- ❌ Aucun nouvel article visible sur taxiassur.com/blog
- 📅 Derniers articles datés du **14 octobre 2025**

---

## 🎯 Causes Possibles

### 1. **L'Edge Function a Échoué**
L'Edge Function `generate-seo-content` a peut-être rencontré une erreur :
- Clé OpenAI invalide ou expirée
- Timeout (génération trop longue)
- Erreur dans le code de génération
- Problème de connexion Supabase

### 2. **Articles Créés mais `published = false`**
Les articles existent dans Supabase mais ne sont pas publiés :
- La fonction RPC `get_blog_posts()` filtre sur `published = true`
- Si `published = false`, ils ne s'affichent pas

### 3. **Cache du Site**
Le site ou le navigateur utilise une version cachée :
- Cache navigateur
- Cache CDN
- Cache Supabase PostgREST

### 4. **Problème de Permissions RLS**
Les politiques RLS (Row Level Security) bloquent peut-être l'accès anonyme :
- Les articles sont créés mais pas accessibles
- La fonction RPC n'a pas les bonnes permissions

---

## ✅ Solution Immédiate : Test Direct

**Étape 1 : Créer un Article de Test Directement**

Dans Supabase SQL Editor, exécute ce fichier :
```
TEST-GENERATION-ARTICLE-DIRECT.sql
```

Ce script va :
1. ✅ Créer un article de test MAINTENANT
2. ✅ Le publier (`published = true`)
3. ✅ Vérifier qu'il est dans la base
4. ✅ Tester la fonction RPC `get_blog_posts()`

**Étape 2 : Vérifier sur le Site**

Après avoir exécuté le script :
1. Va sur https://taxiassur.com/blog
2. Rafraîchis la page (CTRL+F5 pour vider le cache)
3. Tu devrais voir un article commençant par "TEST : Article Généré..."

---

## 🔍 Diagnostic des Logs

Pour voir ce qui s'est passé avec ta requête ID `47` :

### Vérifier les Logs de l'Edge Function

1. Va sur Supabase Dashboard
2. Menu : **Edge Functions**
3. Clique sur `generate-seo-content`
4. Onglet **Logs**
5. Cherche les erreurs récentes (dernières 10 minutes)

**Erreurs Courantes :**
- `OpenAI API error` → Clé API invalide
- `Timeout` → Génération trop longue
- `Supabase error` → Problème de connexion DB
- `JSON parse error` → Réponse OpenAI malformée

---

## 🛠️ Solutions par Scénario

### Scénario A : Clé OpenAI Invalide

**Symptôme** : Logs montrent "OpenAI API error" ou "401 Unauthorized"

**Solution** :
1. Va dans Supabase Dashboard → Project Settings → Secrets
2. Vérifie que `OPENAI_API_KEY` est définie
3. Teste la clé manuellement :

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer ta-clé-openai"
```

Si erreur → Renouvelle la clé sur https://platform.openai.com/api-keys

---

### Scénario B : Articles Créés mais Non Publiés

**Symptôme** : Des articles existent dans Supabase mais `published = false`

**Vérification** :
```sql
-- Voir TOUS les articles (même non publiés)
SELECT id, title, published, created_at
FROM blog_posts
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

**Solution** :
```sql
-- Publier tous les articles d'aujourd'hui
UPDATE blog_posts
SET published = true
WHERE DATE(created_at) = CURRENT_DATE;
```

---

### Scénario C : Problème de Cache

**Symptôme** : Articles dans Supabase mais pas sur le site

**Solutions** :
1. **Cache Navigateur** : CTRL+F5 (hard refresh)
2. **Cache Supabase** : Utilise la fonction RPC au lieu de l'API REST
3. **Cache CDN** : Attends 5 minutes ou purge le cache

---

### Scénario D : Permissions RLS

**Symptôme** : Fonction RPC retourne vide pour utilisateur anonyme

**Vérification** :
```sql
-- Tester comme utilisateur anonyme
SET ROLE anon;
SELECT * FROM get_blog_posts() LIMIT 3;
RESET ROLE;
```

**Solution** :
```sql
-- S'assurer que les permissions sont correctes
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon, authenticated;

-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'blog_posts';
```

---

## 🚀 Plan d'Action Recommandé

### Étape 1 : Test Immédiat (2 min)
```sql
-- Exécute dans Supabase SQL Editor
-- Fichier : TEST-GENERATION-ARTICLE-DIRECT.sql
```
→ Crée un article de test pour vérifier que le système de base fonctionne

### Étape 2 : Vérifier les Articles Existants (1 min)
```sql
-- Voir TOUS les articles d'aujourd'hui
SELECT
  id,
  title,
  published,
  created_at,
  CASE
    WHEN published THEN '✅ Publié'
    ELSE '❌ Non publié'
  END as statut
FROM blog_posts
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

### Étape 3 : Consulter les Logs (2 min)
- Supabase Dashboard → Edge Functions → generate-seo-content → Logs
- Cherche la requête ID `47`
- Note les erreurs éventuelles

### Étape 4 : Action Corrective (selon diagnostic)

**Si aucun article créé** :
- Problème Edge Function ou OpenAI
- Vérifie les logs et la clé API

**Si articles créés mais non publiés** :
```sql
UPDATE blog_posts SET published = true
WHERE DATE(created_at) = CURRENT_DATE;
```

**Si articles publiés mais invisibles** :
- Vide le cache navigateur (CTRL+F5)
- Attends 2-3 minutes

### Étape 5 : Test Final (1 min)
1. Va sur https://taxiassur.com/blog
2. CTRL+F5 (hard refresh)
3. Vérifie la présence du nouvel article

---

## 📊 Requêtes SQL Utiles

### Compter les Articles par Jour
```sql
SELECT
  DATE(created_at) as jour,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE published) as publies
FROM blog_posts
WHERE created_at >= now() - interval '7 days'
GROUP BY DATE(created_at)
ORDER BY jour DESC;
```

### Derniers 10 Articles
```sql
SELECT
  title,
  slug,
  published,
  created_at,
  updated_at
FROM blog_posts
ORDER BY created_at DESC
LIMIT 10;
```

### Tester la Fonction RPC
```sql
-- Comme utilisateur anonyme (ce que fait le site)
SET ROLE anon;
SELECT COUNT(*) as "Articles visibles par le public"
FROM get_blog_posts();
RESET ROLE;
```

---

## 🎯 Résultat Attendu

Après avoir suivi ce diagnostic, tu devrais :
1. ✅ Savoir pourquoi les articles n'apparaissent pas
2. ✅ Avoir créé au moins un article de test visible
3. ✅ Avoir identifié et corrigé le problème
4. ✅ Voir les nouveaux articles sur taxiassur.com/blog

---

## 🔥 Une Fois le Problème Résolu

**Active les automatisations complètes** :
```sql
-- Fichier : ACTIVATION-TOTALE-AUTOMATISATIONS.sql
-- Créera 15 CRON jobs pour générer du contenu automatiquement
```

**Résultat Final** :
- ✅ 5 nouveaux articles/jour (04h)
- ✅ FAQ automatiques (08h)
- ✅ Publications réseaux sociaux (09h, 15h, 19h)
- ✅ Relance leads (10h)
- ✅ Prospection automatique (Lundi, Mercredi)

---

## ❓ Besoin d'Aide ?

Si après ce diagnostic le problème persiste :

1. **Copie les logs d'erreur** de Supabase Edge Functions
2. **Vérifie les variables d'environnement** :
   - OPENAI_API_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
3. **Teste la clé OpenAI** manuellement
4. **Vérifie les quotas OpenAI** (limite de requêtes)

---

## 📁 Fichiers Importants

- `TEST-GENERATION-ARTICLE-DIRECT.sql` → Test immédiat
- `ACTIVATION-TOTALE-AUTOMATISATIONS.sql` → Activer tout automatiquement
- `supabase/functions/generate-seo-content/index.ts` → Code de génération
- `src/lib/content.ts` → Code de chargement des articles
