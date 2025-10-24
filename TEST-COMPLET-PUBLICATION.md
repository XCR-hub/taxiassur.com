# TEST COMPLET - Publication Manuelle et Automatisée

## 🎯 Objectif
Vérifier que les 2 systèmes de publication fonctionnent correctement après le debug de cette nuit.

---

## ✅ ÉTAPE 1 : Diagnostic Initial

Exécutez ce fichier SQL dans Supabase Dashboard :
```
DIAGNOSTIC-PUBLICATION-MANUELLE-ET-AUTO.sql
```

Ce diagnostic va vérifier :
- ✅ Structure des tables (blog_posts, city_pages, faq_entries)
- ✅ RLS policies (permissions pour publication)
- ✅ Fonction `generate_daily_blog_post()`
- ✅ Cron job actif
- ✅ Dernières exécutions
- ✅ Variables d'environnement

---

## ✅ ÉTAPE 2 : Test Publication Manuelle

### 2.1 - Ouvrir l'interface
1. Allez sur : https://taxiassur.com/backoffice/ai-generator
2. Remplir le formulaire :
   - **Mot-clé** : `assurance taxi pas cher`
   - **Ville** : `Paris`
   - **Mots-clés secondaires** : (laisser vide)
   - **Prompt image** : (laisser vide pour génération auto)

### 2.2 - Générer le contenu
3. Cliquez sur **"🚀 Générer TOUT le Contenu"**
4. Attendre 30-60 secondes

### 2.3 - Vérifier le résultat
✅ **Attendu** :
```
📝 Article de blog (1800-2200 mots)
🏙️ Page ville (1200-1500 mots)
❓ 5-10 FAQ
🖼️ Image SEO générée (Pexels)
📰 Actualité (400-600 mots)
```

✅ **Vérifier dans l'aperçu** :
- Titre article présent
- Image affichée (Pexels)
- Alt-text de l'image présent
- Infos ville (dept, région, population, taxi_count)
- FAQ avec catégories

### 2.4 - Publier
5. Cliquez sur **"Publier TOUT"**
6. Attendre le message de succès

### 2.5 - Vérifier en base
Exécutez dans Supabase SQL Editor :
```sql
-- Vérifier l'article publié
SELECT
  title,
  slug,
  LENGTH(content) AS content_length,
  featured_image IS NOT NULL AS has_image,
  image_alt,
  published,
  created_at
FROM blog_posts
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier la page ville
SELECT
  city,
  title,
  dept,
  region,
  population,
  taxi_count,
  status
FROM city_pages
WHERE city = 'Paris'
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier les FAQ
SELECT
  question,
  answer,
  category
FROM faq_entries
ORDER BY created_at DESC
LIMIT 5;
```

✅ **Attendu** :
- Article avec `featured_image` non NULL
- Article avec `image_alt` rempli
- Page ville avec dept='75', region='Île-de-France'
- 5-10 FAQ insérées

---

## ✅ ÉTAPE 3 : Test Publication Automatisée (Cron)

### 3.1 - Vérifier le cron job
```sql
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE '%blog%';
```

✅ **Attendu** :
- Job nommé `generate_daily_blog_post` ou similaire
- `active = true`
- Schedule = `'0 8 * * *'` (tous les jours à 8h) ou autre fréquence

### 3.2 - Test manuel de la fonction
```sql
-- Tester manuellement (simule l'exécution du cron)
SELECT generate_daily_blog_post();
```

✅ **Attendu** :
```
✅ Article créé: [KEYWORD] à [VILLE] (IA: 4200 car)
```

OU en cas de fallback :
```
✅ Article créé: [KEYWORD] à [VILLE] (Fallback)
```

### 3.3 - Vérifier le log d'exécution
```sql
SELECT
  id,
  job_name,
  status,
  created_count,
  error_message,
  execution_time_ms,
  details->>'ai_generated' AS ai_generated,
  details->>'content_length' AS content_length,
  details->>'city' AS city,
  details->>'keyword' AS keyword,
  created_at
FROM cron_execution_log
WHERE job_name = 'generate_daily_blog_post'
ORDER BY created_at DESC
LIMIT 5;
```

✅ **Attendu** :
- `status = 'success'`
- `created_count = 1`
- `ai_generated = true` (si IA marche)
- `content_length > 3000` (si IA marche)

### 3.4 - Vérifier l'article créé
```sql
SELECT
  title,
  slug,
  LENGTH(content) AS content_length,
  featured_image IS NOT NULL AS has_image,
  image_alt,
  created_at
FROM blog_posts
ORDER BY created_at DESC
LIMIT 1;
```

✅ **Attendu** :
- Article avec titre cohérent
- `content_length > 3000` si IA, sinon ~800 (fallback)
- `has_image = true` si IA marche
- `created_at` = maintenant

---

## ⚠️ PROBLÈMES POSSIBLES ET SOLUTIONS

### Problème 1 : Erreur 502 sur Edge Function
**Symptôme** : Console affiche `502 Bad Gateway`

**Cause** : Edge Function pas déployée

**Solution** :
```bash
# Vérifier que l'Edge Function est déployée
# Dans Supabase Dashboard > Edge Functions > generate-seo-content
# Doit être "Deployed" avec statut vert
```

**Alternative** : Edge Function déjà déployée via le système (vérifier dans Supabase Dashboard)

---

### Problème 2 : Erreur 401 (Unauthorized)
**Symptôme** : `Error 401: Unauthorized` lors de la publication

**Cause** : RLS policy trop restrictive

**Solution** :
```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'blog_posts';

-- Si besoin, ajouter policy pour authenticated
CREATE POLICY "Allow authenticated full access" ON blog_posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

### Problème 3 : Pas d'image générée
**Symptôme** : `featured_image = NULL` dans la base

**Cause** : Clé Pexels manquante ou invalide

**Solution** :
```sql
-- Vérifier dans Supabase Dashboard > Project Settings > Edge Functions
-- Secrets : PEXELS_API_KEY doit être configurée
```

Si la clé manque, le système fonctionne quand même mais sans image.

---

### Problème 4 : Contenu fallback au lieu de l'IA
**Symptôme** : Articles de ~800 mots au lieu de 3000-4000

**Cause** :
- Clé OpenAI manquante
- Edge Function pas accessible
- Variables d'environnement pas configurées

**Solution** :
```sql
-- Vérifier les variables
SELECT
  current_setting('app.settings.supabase_url', true) AS supabase_url,
  current_setting('app.settings.supabase_service_role_key', true) IS NOT NULL AS has_service_key;

-- Si NULL, configurer dans Supabase Dashboard > SQL Editor:
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://drohhxrkoequjphvabvq.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

---

### Problème 5 : Cron job pas actif
**Symptôme** : Aucune exécution récente

**Cause** : Cron job désactivé ou supprimé

**Solution** :
```sql
-- Vérifier les crons actifs
SELECT * FROM cron.job WHERE jobname LIKE '%blog%';

-- Si désactivé, réactiver:
UPDATE cron.job SET active = true WHERE jobname = 'generate_daily_blog_post';

-- Si supprimé, recréer:
SELECT cron.schedule(
  'generate_daily_blog_post',
  '0 8 * * *', -- Tous les jours à 8h
  $$SELECT generate_daily_blog_post();$$
);
```

---

## 📊 CHECKLIST FINALE

### Publication Manuelle (backoffice/ai-generator)
- [ ] Interface accessible
- [ ] Génération complète fonctionne (30-60s)
- [ ] Contenu affiché : article + ville + FAQ + image
- [ ] Bouton "Publier TOUT" fonctionne
- [ ] Article inséré en base avec image
- [ ] Page ville créée avec infos géographiques
- [ ] FAQ insérées (5-10)
- [ ] Actualité créée

### Publication Automatisée (Cron)
- [ ] Cron job existe et est actif
- [ ] Fonction `generate_daily_blog_post()` existe
- [ ] Test manuel réussi
- [ ] Log d'exécution avec status='success'
- [ ] Article créé automatiquement
- [ ] Contenu IA (3000-4000 mots) ou Fallback (800 mots)
- [ ] Image présente (si IA marche)

### Infrastructure
- [ ] Edge Function déployée
- [ ] RLS policies correctes
- [ ] Variables d'environnement configurées
- [ ] Clés API présentes (OpenAI, Pexels)

---

## 🎉 RÉSULTAT ATTENDU

**Si tout fonctionne** :
1. ✅ Publication manuelle : 1 clic → contenu complet publié avec image
2. ✅ Publication auto : Cron génère 1 article/jour automatiquement
3. ✅ Les deux systèmes utilisent la même Edge Function
4. ✅ Contenu riche : 3000-4000 mots + images + FAQ + pages ville

**Performance** :
- Génération manuelle : 30-60 secondes
- Génération automatique : 1 article/jour (configurable)
- Coût IA : ~0.01-0.03€ par article généré
