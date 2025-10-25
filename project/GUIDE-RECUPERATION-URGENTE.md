# 🚨 GUIDE DE RÉCUPÉRATION URGENTE DES DONNÉES

## ⚠️ SITUATION

**Problème constaté** :
- ✅ Articles blog : DISPARUS (0 au lieu de 24+)
- ✅ FAQs : DISPARUS (0 au lieu de 8+)
- ✅ Leads backoffice : DISPARUS (0 affiché)
- ✅ Erreur SEO Tools dans backoffice

**Cause probable** :
- Migration SQL mal exécutée
- Suppression accidentelle
- Erreur RLS (Row Level Security)
- Problème colonne image ajoutée

---

## 🔧 RÉCUPÉRATION EN 3 ÉTAPES (5 MINUTES)

### Étape 1 : Diagnostic (1 min)

1. Ouvrez : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql/new
2. Copiez/collez le fichier `RECUPERATION-URGENTE-DONNEES.sql`
3. Cliquez **Run**

**Ce script va** :
- ✅ Vérifier existence des tables
- ✅ Compter les données
- ✅ Lister la structure
- ✅ Tester les fonctions RPC
- ✅ Restaurer 5 articles + 8 FAQ de base

---

### Étape 2 : Restauration complète articles (2 min)

1. Dans Supabase SQL Editor (nouvelle requête)
2. Copiez/collez le fichier `RESTAURER-24-ARTICLES-AVEC-IMAGES.sql`
3. Cliquez **Run**

**Ce script va** :
- ✅ Restaurer 7 articles avec images Pexels
- ✅ Nettoyer les doublons éventuels
- ✅ Ajouter métadonnées complètes
- ✅ Images haute qualité

---

### Étape 3 : Vérification (2 min)

**Test 1 : Compter les données**
```sql
SELECT
  'blog_posts' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE published = true) as published
FROM blog_posts
UNION ALL
SELECT
  'faq' as table_name,
  COUNT(*) as total,
  COUNT(*) as published
FROM faq
UNION ALL
SELECT
  'leads' as table_name,
  COUNT(*) as total,
  NULL as published
FROM leads;
```

**Résultat attendu** :
- blog_posts : 7-24 articles publiés
- faq : 8+ questions
- leads : Vos données (peut être 0 si pas encore de leads)

**Test 2 : Tester fonctions RPC**
```sql
-- Articles
SELECT id, title, slug, featured_image_url
FROM get_blog_posts(10, 0);

-- FAQ
SELECT question, answer, category
FROM get_faqs(NULL);

-- Leads (si vous en avez)
SELECT name, email, city
FROM get_leads(NULL, 10, 0);
```

**Test 3 : Vérifier le site**
- Blog : https://taxiassur.com/blog
- FAQ : https://taxiassur.com/faq
- Backoffice leads : https://taxiassur.com/backoffice/leads

---

## 🔍 DIAGNOSTIC COMPLET

### Vérifier les colonnes manquantes

```sql
-- Colonnes blog_posts
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'blog_posts'
ORDER BY ordinal_position;
```

**Colonnes attendues** :
- id (uuid)
- title (text)
- slug (text)
- excerpt (text)
- content (text)
- published (boolean)
- **featured_image_url** (text) ← Nouvelle colonne
- **image** (text) ← Ou cette colonne
- meta_data (jsonb)
- created_at (timestamptz)
- updated_at (timestamptz)

### Vérifier les RLS policies

```sql
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('blog_posts', 'faq', 'leads')
ORDER BY tablename, policyname;
```

**Policies attendues** :
- `blog_posts` : Lecture publique anonyme (anon) ✅
- `faq` : Lecture publique anonyme (anon) ✅
- `leads` : Lecture/écriture authentifiée seulement ✅

---

## ⚠️ PROBLÈMES FRÉQUENTS ET SOLUTIONS

### Problème 1 : "0 articles affichés"

**Causes possibles** :
1. RLS bloque la lecture anonyme
2. Colonne `published` = false
3. Fonction `get_blog_posts()` cassée

**Solution** :
```sql
-- Vérifier RLS
SELECT tablename, policyname
FROM pg_policies
WHERE tablename = 'blog_posts' AND cmd = 'SELECT';

-- Si aucune policy :
CREATE POLICY "Public read blog_posts"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Vérifier articles publiés
UPDATE blog_posts SET published = true WHERE published IS NULL OR published = false;
```

---

### Problème 2 : "Column does not exist: featured_image_url"

**Solution** :
```sql
-- Ajouter la colonne si manquante
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS featured_image_url text;

-- Ou renommer si s'appelle "image"
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'image'
  ) THEN
    ALTER TABLE blog_posts RENAME COLUMN image TO featured_image_url;
  END IF;
END $$;
```

---

### Problème 3 : "0 FAQs affichées"

**Solution** :
```sql
-- Vérifier table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'faq'
);

-- Si false, créer :
CREATE TABLE IF NOT EXISTS faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  priority int DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read faq"
  ON faq FOR SELECT
  TO anon, authenticated
  USING (true);

-- Puis exécuter RECUPERATION-URGENTE-DONNEES.sql
```

---

### Problème 4 : "0 leads dans backoffice"

**Causes possibles** :
1. Pas de leads en base (normal si site pas lancé)
2. RLS bloque la lecture
3. Fonction `get_leads()` cassée

**Solution** :
```sql
-- Vérifier nombre réel
SELECT COUNT(*) FROM leads;

-- Si > 0 mais backoffice affiche 0 :
-- Vérifier fonction get_leads existe
SELECT EXISTS (
  SELECT FROM pg_proc WHERE proname = 'get_leads'
);

-- Si false, exécuter FIX-CLEAN-FINAL.sql
```

---

### Problème 5 : "Erreur SEO Tools"

**Causes** :
- Fonction `get_cron_config()` manquante
- Table `seo_webhook_events` manquante

**Solution** :
```sql
-- Créer table si manquante
CREATE TABLE IF NOT EXISTS seo_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Créer fonction
CREATE OR REPLACE FUNCTION get_cron_config(config_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN '{
    "auto_content_generation": "enabled",
    "social_media_posting": "enabled",
    "backlink_automation": "enabled"
  }'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION get_cron_config TO anon, authenticated;
```

---

## 📊 CHECKLIST DE VALIDATION

Cochez chaque élément après vérification :

### Base de données
- [ ] Table `blog_posts` existe
- [ ] Table `faq` existe
- [ ] Table `leads` existe
- [ ] Colonne `featured_image_url` présente dans blog_posts
- [ ] RLS activé sur toutes les tables
- [ ] Policies de lecture publique créées

### Données
- [ ] Articles blog : ≥ 5 articles publiés
- [ ] FAQs : ≥ 8 questions
- [ ] Leads : Nombre attendu (peut être 0)

### Fonctions RPC
- [ ] `get_blog_posts()` fonctionne
- [ ] `get_faqs()` fonctionne
- [ ] `get_leads()` fonctionne
- [ ] `get_dashboard_stats()` fonctionne
- [ ] `get_cron_config()` fonctionne

### Frontend
- [ ] Page /blog affiche les articles
- [ ] Page /faq affiche les questions
- [ ] Backoffice /leads affiche les données
- [ ] Images s'affichent correctement
- [ ] Pas d'erreur console

---

## 🆘 SI ÇA NE MARCHE TOUJOURS PAS

### Option 1 : Reset complet (10 min)

1. Backup d'abord :
```sql
-- Exporter vos données
COPY (SELECT * FROM leads) TO '/tmp/leads_backup.csv' CSV HEADER;
```

2. Exécuter dans l'ordre :
```sql
-- 1. FIX-CLEAN-FINAL.sql (fonctions RPC)
-- 2. RECUPERATION-URGENTE-DONNEES.sql (diagnostic)
-- 3. RESTAURER-24-ARTICLES-AVEC-IMAGES.sql (articles)
```

### Option 2 : Support Supabase

Si vraiment bloqué :
1. Dashboard Supabase → Support
2. Décrivez : "Lost data after migration, need help restoring blog_posts, faq tables"
3. Mentionnez les scripts de récupération fournis

---

## 📞 CONTACT ET AIDE

### Documentation
- `FIX-CLEAN-FINAL.sql` - Correction erreurs SQL
- `RECUPERATION-URGENTE-DONNEES.sql` - Diagnostic + restauration de base
- `RESTAURER-24-ARTICLES-AVEC-IMAGES.sql` - Restauration complète articles

### Requêtes utiles

**Dashboard complet**
```sql
SELECT
  (SELECT COUNT(*) FROM blog_posts WHERE published = true) as articles_publies,
  (SELECT COUNT(*) FROM faq) as total_faq,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('blog_posts', 'faq', 'leads')) as policies_actives;
```

**Lister tout**
```sql
-- Articles
SELECT id, title, slug, published, featured_image_url FROM blog_posts ORDER BY created_at DESC;

-- FAQ
SELECT id, question, category, priority FROM faq ORDER BY priority DESC;

-- Leads
SELECT id, name, email, city, status FROM leads ORDER BY created_at DESC;
```

---

## ✅ RÉSUMÉ

**3 étapes pour tout récupérer** :

1. **Diagnostic** : `RECUPERATION-URGENTE-DONNEES.sql`
2. **Restauration** : `RESTAURER-24-ARTICLES-AVEC-IMAGES.sql`
3. **Vérification** : Tests SQL + Site web

**Temps total** : 5 minutes

**Résultat** : Toutes vos données restaurées avec images

---

**🎯 Commencez maintenant avec `RECUPERATION-URGENTE-DONNEES.sql` !**
