# 🧪 Comment Tester les Automatisations TaxiAssur

## 🎯 Test Rapide (2 minutes)

### Étape 1 : Exécuter le Script de Test

1. **Va sur Supabase Dashboard** → SQL Editor
2. **Colle le contenu** de `TEST-AUTOMATISATIONS.sql`
3. **Clique "Run"**
4. **Attends 5-10 secondes**

### Étape 2 : Analyser les Résultats

Tu verras plusieurs sections :

#### ✅ Ce qui DOIT fonctionner

```
🔍 CRON JOBS ACTIFS
- Au moins 5-10 cron jobs actifs
- Status "✅ Actif" pour la majorité

📋 TABLES PRINCIPALES
- 10+ tables listées
- Chaque table avec plusieurs colonnes

📊 DONNÉES
- Blog Posts : au moins 1
- FAQ : 8+ entrées
- Villes : 5+ entrées
- Leads : variable

✅ TEST DES AUTOMATISATIONS TERMINÉ
- Message de confirmation
- Statistiques résumées
```

#### ⚠️ Si tu vois des problèmes

**Aucun cron job actif :**
```
⚠️ AUCUN cron job actif - À configurer
```
→ Les automatisations ne sont pas encore activées
→ Action : Exécute `ACTIVATION-TOTALE-AUTOMATISATIONS.sql`

**Tables manquantes :**
```
0 résultats pour certaines tables
```
→ Migrations non exécutées
→ Action : Vérifie que toutes les migrations sont appliquées

**Pas de données :**
```
Total : 0 pour blog_posts/faq/villes
```
→ Import non fait
→ Action : Exécute `IMPORT-FAQ-CITIES-SUPABASE.sql`

## 🔍 Tests Détaillés par Fonctionnalité

### Test 1 : Génération Automatique de Contenu

**Objectif :** Vérifier que le système génère du contenu automatiquement

**Comment tester :**
1. Note le nombre actuel d'articles de blog
2. Attends 24 heures (si cron quotidien actif)
3. Vérifie si de nouveaux articles sont apparus

**Vérification immédiate :**
```sql
-- Vérifier les articles créés automatiquement
SELECT
  title,
  slug,
  created_at,
  '✅ Auto-généré' as status
FROM blog_posts
WHERE source = 'auto_generated'
  OR title ILIKE '%2025%'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 2 : Envoi Automatique d'Emails

**Objectif :** Vérifier que les leads reçoivent des emails automatiquement

**Comment tester :**
1. Crée un lead de test (via le formulaire sur le site)
2. Vérifie ta boîte email (sous 5 minutes)
3. Tu devrais recevoir un email de confirmation

**Vérification dans Supabase :**
```sql
-- Vérifier les emails envoyés
SELECT
  lead_id,
  template_name,
  status,
  sent_at,
  '✅ Email envoyé' as result
FROM email_logs
WHERE sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC
LIMIT 10;
```

### Test 3 : Publication Réseaux Sociaux

**Objectif :** Vérifier que les posts sont publiés automatiquement

**Comment tester :**
```sql
-- Vérifier les posts programmés
SELECT
  platform,
  content,
  status,
  scheduled_for,
  published_at,
  CASE
    WHEN status = 'published' THEN '✅ Publié'
    WHEN status = 'scheduled' THEN '⏰ Programmé'
    ELSE '📝 Brouillon'
  END as "Status Visuel"
FROM social_media_posts
ORDER BY scheduled_for DESC
LIMIT 10;
```

### Test 4 : Collecte de Backlinks

**Objectif :** Vérifier que le système trouve des opportunités de backlinks

**Comment tester :**
```sql
-- Vérifier les backlinks prospectés
SELECT
  domain,
  authority_score,
  status,
  last_contacted,
  CASE
    WHEN status = 'acquired' THEN '✅ Acquis'
    WHEN status = 'pending' THEN '⏳ En attente'
    WHEN status = 'contacted' THEN '📧 Contacté'
    ELSE '🔍 Prospecté'
  END as "Status Visuel"
FROM backlink_opportunities
ORDER BY authority_score DESC
LIMIT 10;
```

### Test 5 : Suivi SEO Automatique

**Objectif :** Vérifier que les positions Google sont trackées

**Comment tester :**
```sql
-- Vérifier les positions SEO
SELECT
  keyword,
  position,
  search_volume,
  tracked_at,
  CASE
    WHEN position <= 3 THEN '🥇 Top 3'
    WHEN position <= 10 THEN '🥈 Page 1'
    WHEN position <= 20 THEN '🥉 Page 2'
    ELSE '📉 Au-delà'
  END as "Performance"
FROM seo_rankings
WHERE tracked_at >= NOW() - INTERVAL '7 days'
ORDER BY tracked_at DESC, position ASC
LIMIT 10;
```

## 🛠️ Tests Manuels (Pour Forcer l'Exécution)

### Forcer la génération d'un article de blog

```sql
-- Appel manuel de la fonction de génération
SELECT generate_seo_article(
  'Assurance taxi électrique 2025',
  'assurance-taxi-electrique-2025',
  ARRAY['taxi', 'électrique', 'tesla', 'assurance']
);
```

### Forcer l'envoi d'un email de lead

```sql
-- Appel manuel de l'envoi d'email
SELECT send_lead_notification(
  (SELECT id FROM leads WHERE email = 'test-automation@taxiassur.fr' LIMIT 1)
);
```

### Créer un lead de test complet

```sql
-- Créer un lead avec toutes les infos
INSERT INTO leads (
  email,
  phone,
  name,
  activity_type,
  city,
  vehicle_type,
  status,
  source,
  metadata
)
VALUES (
  'test-' || EXTRACT(EPOCH FROM NOW()) || '@taxiassur.fr',
  '0612345678',
  'Test Automatisation ' || NOW()::date,
  'taxi',
  'Paris',
  'berline',
  'new',
  'test_manuel',
  jsonb_build_object(
    'test_time', NOW(),
    'test_purpose', 'Vérification automatisations'
  )
)
RETURNING
  id,
  email,
  name,
  '✅ Lead créé pour test' as status;
```

## 📊 Dashboard de Monitoring

### Vue d'ensemble du système

```sql
-- Dashboard complet du système
SELECT
  jsonb_build_object(
    'systeme', jsonb_build_object(
      'crons_actifs', (SELECT COUNT(*) FROM cron.job WHERE active = true),
      'crons_total', (SELECT COUNT(*) FROM cron.job),
      'derniere_execution', (SELECT MAX(runid) FROM cron.job_run_details)
    ),
    'contenu', jsonb_build_object(
      'articles_total', (SELECT COUNT(*) FROM blog_posts),
      'articles_publies', (SELECT COUNT(*) FROM blog_posts WHERE published = true),
      'articles_24h', (SELECT COUNT(*) FROM blog_posts WHERE created_at >= NOW() - INTERVAL '24 hours'),
      'faq_total', (SELECT COUNT(*) FROM faq_entries),
      'villes_total', (SELECT COUNT(*) FROM city_pages)
    ),
    'leads', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM leads),
      'nouveaux_24h', (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '24 hours'),
      'nouveaux_7j', (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '7 days'),
      'taux_conversion', ROUND(
        (SELECT COUNT(*)::numeric FROM leads WHERE status = 'converted') /
        NULLIF((SELECT COUNT(*) FROM leads), 0) * 100, 2
      )
    ),
    'social_media', jsonb_build_object(
      'posts_total', (SELECT COUNT(*) FROM social_media_posts WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_media_posts')),
      'posts_publies', (SELECT COUNT(*) FROM social_media_posts WHERE status = 'published' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_media_posts')),
      'posts_programmes', (SELECT COUNT(*) FROM social_media_posts WHERE status = 'scheduled' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_media_posts'))
    )
  ) as "📊 Dashboard Complet";
```

## 🎯 Checklist de Validation

Coche chaque élément après l'avoir vérifié :

### Configuration Système
- [ ] Extension pg_cron installée
- [ ] Extension pg_net installée (pour webhooks)
- [ ] Clés API configurées (OpenAI, SendGrid, etc.)
- [ ] Variables d'environnement Supabase Secrets

### Données de Base
- [ ] Au moins 1 article de blog publié
- [ ] Au moins 8 FAQ publiées
- [ ] Au moins 5 villes publiées
- [ ] Table leads fonctionnelle

### Automatisations
- [ ] Au moins 5 cron jobs actifs
- [ ] Génération de contenu fonctionne
- [ ] Envoi d'emails fonctionne
- [ ] Publication réseaux sociaux programmée

### Edge Functions
- [ ] `send-lead-email` déployée
- [ ] `generate-seo-content` déployée
- [ ] `chatbot` déployée
- [ ] Au moins 5 autres functions déployées

### Monitoring
- [ ] Dashboard SQL fonctionne
- [ ] Logs d'erreurs accessibles
- [ ] Statistiques à jour

## 🚨 Que Faire Si Ça Ne Marche Pas ?

### Problème : Aucun cron job actif

**Solution 1 :** Active les crons manuellement
```sql
-- Dans Supabase SQL Editor
\i ACTIVATION-TOTALE-AUTOMATISATIONS.sql
```

**Solution 2 :** Vérifie l'extension pg_cron
```sql
-- Vérifier si pg_cron est installé
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Si pas installé, l'installer (nécessite droits admin)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Problème : Les Edge Functions ne répondent pas

**Vérification :**
```bash
# Tester une edge function
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/chatbot \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

**Solution :** Redéployer les functions
```bash
# Voir le guide DEPLOY-EDGE-FUNCTION-GUIDE.md
```

### Problème : Pas de nouveaux articles générés

**Vérifications :**
1. Clé OpenAI configurée ?
   ```sql
   SELECT * FROM vault.secrets WHERE name = 'OPENAI_API_KEY';
   ```

2. Cron de génération actif ?
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE '%content%';
   ```

3. Budget OpenAI dépassé ?
   → Vérifie sur platform.openai.com

## 📁 Fichiers Créés

- `TEST-AUTOMATISATIONS.sql` - Script de test complet
- `COMMENT-TESTER-AUTOMATISATIONS.md` - Ce guide

## ✅ Prochaines Étapes

1. **Exécute `TEST-AUTOMATISATIONS.sql`** → Vois l'état actuel
2. **Note ce qui manque** → Identifie les problèmes
3. **Active les automatisations** → Si crons inactifs
4. **Teste sur 24-48h** → Vérifie la génération automatique
5. **Monitore les logs** → Supabase Dashboard → Logs

**Commence par exécuter TEST-AUTOMATISATIONS.sql maintenant !** 🚀
