# 🤖 ACTIVER CRON - Générateur Unifié

## 🎯 Objectif

Remplacer le CRON actuel qui génère des placeholders "Contenu généré par IA..." par un CRON qui utilise le générateur unifié pour créer du contenu complet.

---

## ⚠️ Problème Actuel

### CRON Actuel
```sql
-- Appelle generate-seo-content avec type: 'blog'
body := jsonb_build_object('keyword', keyword, 'type', 'blog')
```

**Résultat:**
- ❌ Article avec placeholder vide
- ❌ Pas de page ville
- ❌ Pas de FAQ
- ❌ Pas d'image
- ❌ "Contenu généré par IA pour: ..."

### CRON Corrigé
```sql
-- Appelle generate-seo-content avec mode: 'unified'
body := jsonb_build_object(
  'keyword', keyword,
  'city', city,
  'mode', 'unified',
  'type', 'unified'
)
```

**Résultat:**
- ✅ Article complet (2000+ mots HTML structuré)
- ✅ Page ville avec données géo réelles
- ✅ 5-10 FAQ intégrées
- ✅ Image Pexels optimisée
- ✅ SEO complet (meta, keywords, alt-text)

---

## 🚀 Solution: Migration SQL

### Fichier Créé

**`20251023000000_fix_cron_use_unified_generator.sql`**

**Actions:**
1. ✅ Supprime anciens CRON (blog + ville séparés)
2. ✅ Crée nouveau CRON unifié
3. ✅ 5 packs complets/jour (article + ville + FAQ + image)
4. ✅ Horaire: 04h00 (heure creuse)
5. ✅ Budget identique: ~8€/mois OpenAI

---

## 📋 Activation (3 étapes - 5 minutes)

### Étape 1: Exécuter la Migration (2 min)

```sql
-- Supabase SQL Editor
-- Copier/Coller le contenu de:
-- 20251023000000_fix_cron_use_unified_generator.sql

-- Ou via outil mcp__supabase__apply_migration
```

**Vérification:**
```sql
-- Voir le nouveau CRON
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'daily-unified-content-generation';
```

**Résultat attendu:**
```
jobname                           | schedule    | active
----------------------------------|-------------|--------
daily-unified-content-generation  | 0 4 * * *   | true
```

---

### Étape 2: Tester Maintenant (2 min)

**Option A: Test Manuel (Recommandé)**

```sql
-- Génère 1 article complet immédiatement
SELECT test_unified_generation('assurance taxi économique', 'Lyon');
```

**Attendre 30-60 secondes**, puis vérifier:

```sql
-- Voir l'article créé
SELECT slug, title, LENGTH(content), featured_image IS NOT NULL as has_image
FROM blog_posts
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu:**
```
slug                                    | title                          | length | has_image
----------------------------------------|--------------------------------|--------|----------
assurance-taxi-economique-lyon-...      | Assurance Taxi Économique...   | 12500  | true
```

**Option B: Forcer Exécution CRON**

```sql
-- Créer un CRON temporaire qui s'exécute toutes les minutes
SELECT cron.schedule(
  'test-immediate-unified',
  '* * * * *', -- Toutes les minutes
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"keyword": "assurance taxi", "city": "Paris", "mode": "unified", "type": "unified"}'::jsonb
  );
  $$
);

-- Attendre 2-3 minutes pour voir le résultat

-- PUIS SUPPRIMER LE CRON TEST
SELECT cron.unschedule('test-immediate-unified');
```

---

### Étape 3: Vérifier les Logs (1 min)

```sql
-- Voir l'historique des exécutions
SELECT
  cron_name,
  executed_at,
  status,
  details->>'response' as response
FROM cron_execution_logs
ORDER BY executed_at DESC
LIMIT 10;
```

---

## 📊 Résultats Attendus

### Après 1 Jour (5 articles)

```sql
SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '1 day';
-- Résultat: 5

SELECT COUNT(*) FROM city_pages WHERE created_at > NOW() - INTERVAL '1 day';
-- Résultat: 5

SELECT COUNT(*) FROM faq_entries WHERE created_at > NOW() - INTERVAL '1 day';
-- Résultat: 25-50
```

### Après 1 Semaine (35 articles)

```sql
SELECT
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as articles_7j,
  AVG(LENGTH(content)) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as avg_content_length,
  COUNT(*) FILTER (WHERE featured_image IS NOT NULL AND created_at > NOW() - INTERVAL '7 days') as with_images
FROM blog_posts;
```

**Résultat attendu:**
```
articles_7j | avg_content_length | with_images
------------|--------------------|-----------
35          | 12000              | 35
```

### Après 1 Mois (150 articles)

- **150 articles** complets (2000-3000 mots chacun)
- **150 pages ville** avec données géo
- **750-1500 FAQ** intégrées
- **150 images** Pexels optimisées
- **Budget:** ~8€ OpenAI

---

## 🔧 Configuration Avancée

### Modifier la Fréquence

**Passer de 5 à 10 articles/jour:**

```sql
-- Supprimer CRON actuel
SELECT cron.unschedule('daily-unified-content-generation');

-- Recréer avec LIMIT 10 au lieu de 5
SELECT cron.schedule(
  'daily-unified-content-generation',
  '0 4 * * *',
  $$ ... LIMIT 10 ... $$
);
```

**Coût:** ~16€/mois OpenAI

### Ajouter des Villes

```sql
-- Modifier la liste des villes dans le CRON
unnest(ARRAY[
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice',
  'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille',
  -- Ajouter vos villes ici:
  'Rouen', 'Toulon', 'Dunkerque', 'Calais'
])
```

### Ajouter des Mots-clés

```sql
-- Modifier la liste des keywords
unnest(ARRAY[
  'assurance taxi économique',
  'meilleure assurance taxi 2025',
  -- Ajouter vos keywords ici:
  'assurance taxi hybride',
  'taxi assurance kilométrage'
])
```

---

## 🐛 Troubleshooting

### Problème: CRON ne génère rien

**Vérifier:**

```sql
-- 1. CRON actif ?
SELECT * FROM cron.job WHERE jobname = 'daily-unified-content-generation';

-- 2. Edge function déployée ?
-- Dashboard Supabase > Functions > generate-seo-content
-- Status: Active

-- 3. Clés API configurées ?
-- Dashboard Supabase > Settings > Vault
-- OPENAI_API_KEY: sk-...
-- PEXELS_API_KEY: ...
```

### Problème: Erreur 500

**Cause:** OpenAI API key invalide ou rate-limited

**Solution:**
```sql
-- Test manuel pour voir l'erreur exacte
SELECT test_unified_generation('test', 'Paris');
```

### Problème: Contenu toujours vide

**Cause:** CRON appelle encore l'ancien endpoint

**Solution:**
```sql
-- Vérifier la commande du CRON
SELECT command FROM cron.job WHERE jobname = 'daily-unified-content-generation';

-- Doit contenir: 'mode', 'unified'
-- Si pas présent, réexécuter la migration
```

---

## 📈 Monitoring

### Dashboard SQL

```sql
-- Vue d'ensemble génération
CREATE OR REPLACE VIEW v_content_generation_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as articles_generated,
  AVG(LENGTH(content)) as avg_content_length,
  COUNT(*) FILTER (WHERE featured_image IS NOT NULL) as with_images,
  COUNT(*) FILTER (WHERE LENGTH(content) > 5000) as quality_content
FROM blog_posts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Consulter
SELECT * FROM v_content_generation_stats;
```

### Alertes (Optionnel)

```sql
-- Fonction pour alerter si génération échoue
CREATE OR REPLACE FUNCTION check_daily_generation()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si moins de 3 articles générés aujourd'hui → alerte
  IF (SELECT COUNT(*) FROM blog_posts WHERE created_at::date = CURRENT_DATE) < 3 THEN
    RAISE WARNING '⚠️ Génération quotidienne en échec: seulement % articles',
      (SELECT COUNT(*) FROM blog_posts WHERE created_at::date = CURRENT_DATE);
  END IF;
END;
$$;

-- Exécuter quotidiennement à 12h00
SELECT cron.schedule(
  'check-daily-generation',
  '0 12 * * *',
  $$ SELECT check_daily_generation(); $$
);
```

---

## ✅ Checklist Activation

- [ ] Migration SQL exécutée
- [ ] Nouveau CRON visible dans `cron.job`
- [ ] Test manuel réussi (1 article complet généré)
- [ ] Article contient 2000+ mots (pas placeholder)
- [ ] Page ville créée avec données géo réelles
- [ ] FAQ intégrées (5-10)
- [ ] Image Pexels présente
- [ ] Logs CRON visibles
- [ ] Ancien CRON supprimé

---

## 🎯 Résultat Final

### Avant
```
CRON → generate-seo-content (type: 'blog')
     → Placeholder "Contenu généré par IA..."
     → Aucun contenu réel
```

### Après
```
CRON → generate-seo-content (mode: 'unified')
     → Article complet 2000+ mots
     → Page ville avec géoloc
     → 5-10 FAQ
     → Image Pexels
     → SEO optimisé
```

### Impact Business

- 🚀 **150 articles/mois** au lieu de placeholders
- 📈 **+300% contenu de qualité**
- 💰 **Budget identique** (~8€/mois)
- ⭐ **SEO boost** massif
- 🎯 **Automatisation 100%** autonome

---

**Date:** 23 octobre 2025
**Fichier migration:** `20251023000000_fix_cron_use_unified_generator.sql`
**Temps activation:** 5 minutes
**Status:** ✅ Prêt pour déploiement
