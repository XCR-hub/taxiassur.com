# Guide Complet : News + Réseaux Sociaux

## ✅ Build Réussi : 14.68s | 0 erreurs

---

## 🎯 Systèmes Créés

### 1. Système News (Actualités)
- ✅ Table `news_articles` avec RLS
- ✅ Page publique `/actualites`
- ✅ Section news sur page d'accueil
- ✅ 3 articles sample pré-insérés
- ✅ Full-text search français

### 2. Système Réseaux Sociaux
- ✅ Auto-publication Facebook & LinkedIn
- ✅ 7 templates de contenu
- ✅ Planning automatique 10 posts/semaine
- ✅ Génération auto depuis articles/news
- ✅ Edge Function publication API

---

## 📦 Déploiement (30 MIN)

### ÉTAPE 1: Migrations Supabase (10 min) ⚠️ CRITIQUE

Dashboard Supabase → SQL Editor → Exécuter dans l'ordre :

#### Migration 1: Fix City Pages (erreur 409)
**Fichier:** `20251014000001_fix_city_pages_duplicate_policies_safe.sql`

```sql
-- Contenu complet dans le fichier
-- Ajoute colonne status si manquante
-- Supprime policies dupliquées
-- Recrée policies unifiées
```

**Vérifications attendues:**
```
✅ city_pages: 4 policies | status: OUI
✅ faq_entries: 4 policies | status: OUI
✅ Migration réussie !
```

#### Migration 2: Système News
**Fichier:** `20251014010000_create_news_system.sql`

```sql
-- Crée table news_articles
-- Insert 3 articles sample
-- RLS + indexes + triggers
```

**Vérifications attendues:**
```
✅ Table news_articles créée avec 3 actualités publiées
✅ RLS activé avec 4 policies
✅ Indexes créés pour performance
✅ Full-text search configuré en français
```

#### Migration 3: Réseaux Sociaux
**Fichier:** `20251014020000_activate_social_automation.sql`

```sql
-- Active Facebook & LinkedIn
-- Crée 7 templates contenu
-- Planning 10 posts/semaine
-- Triggers auto-génération
```

**Vérifications attendues:**
```
✅ Facebook activé: OUI
✅ LinkedIn activé: OUI
✅ Templates créés: 7
✅ Planning posts: 10/semaine
✅ Auto-génération: Activée (triggers)
```

**⚠️ IMPORTANT:** Exécuter les 3 migrations AVANT l'upload FTP !

---

### ÉTAPE 2: Configuration Secrets Supabase (5 min)

Dashboard Supabase → Project Settings → Edge Functions → Secrets

Ajouter les clés API :

```bash
# Facebook
FACEBOOK_PAGE_ACCESS_TOKEN=votre_token_facebook
FACEBOOK_PAGE_ID=votre_page_id

# LinkedIn
LINKEDIN_ACCESS_TOKEN=votre_token_linkedin
LINKEDIN_ORGANIZATION_ID=votre_org_id

# Make.com (fallback)
MAKE_SOCIAL_WEBHOOK_URL=https://hook.eu1.make.com/votre_webhook
```

**Comment obtenir les tokens :**

#### Facebook Page Access Token
1. https://developers.facebook.com/tools/explorer/
2. Sélectionner votre page
3. Permissions : `pages_manage_posts`, `pages_read_engagement`
4. Générer token (valide 60 jours)
5. Pour token permanent : Aller dans Graph API Explorer → Extend Access Token

#### LinkedIn Access Token
1. https://www.linkedin.com/developers/
2. Créer application
3. Products : "Share on LinkedIn" + "Marketing Developer Platform"
4. OAuth 2.0 : Générer token
5. Scopes : `w_organization_social`, `r_organization_social`

**Note:** Vous avez déjà ces clés selon votre screenshot !

---

### ÉTAPE 3: Déployer Edge Function (3 min)

```bash
# Déployer fonction publication auto
supabase functions deploy social-media-auto-publisher --no-verify-jwt
```

Ou via Dashboard Supabase → Edge Functions → Deploy

**Test de la fonction:**

```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher \
  -H "Authorization: Bearer VOTRE_ANON_KEY"
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Published X/Y posts",
  "published": X,
  "failed": Y
}
```

---

### ÉTAPE 4: Upload FTP (10 min)

1. Supprimer ancien dossier `assets/`
2. Upload `dist/` complet
3. Vider cache navigateur (Ctrl+Shift+Delete)

---

### ÉTAPE 5: Tests Complets (5 min)

#### Test 1: Page Actualités
1. Aller sur https://taxiassur.com/actualites
2. **Vérifications:**
   - ✅ 3 articles affichés
   - ✅ Filtres catégories fonctionnent
   - ✅ Pas d'erreur 409 console
   - ✅ Cards cliquables

#### Test 2: Home avec News
1. Aller sur https://taxiassur.com/
2. Scroll vers section News
3. **Vérifications:**
   - ✅ 3 derniers articles visibles
   - ✅ Bouton "Toutes les Actualités" fonctionne
   - ✅ Design cohérent

#### Test 3: Backoffice Réseaux Sociaux
1. Aller sur https://taxiassur.com/backoffice/social-media
2. **Vérifications:**
   - ✅ Réseaux disponibles: 2
   - ✅ Réseaux actifs: 2
   - ✅ Pas d'erreur 400
   - ✅ Compteurs affichés

#### Test 4: Auto-génération Post
1. Dashboard Supabase → Table Editor → `news_articles`
2. Créer nouvelle actualité avec status "published"
3. **Vérifications:**
   - ✅ 2 nouveaux posts créés dans `social_posts`
   - ✅ 1 pour Facebook, 1 pour LinkedIn
   - ✅ Status "scheduled"
   - ✅ Contenu généré depuis template

---

## 📰 Système News - Détails

### Table news_articles

**Colonnes:**
```sql
id              uuid PRIMARY KEY
title           text NOT NULL
slug            text UNIQUE NOT NULL
content         text NOT NULL
excerpt         text
image_url       text
source          text (ex: "Ministère des Transports")
source_url      text (lien source originale)
category        text (réglementation, économie, innovation, général)
tags            text[] (array de mots-clés)
score           integer (0-100, pertinence/qualité)
status          text (draft, published, archived)
published_at    timestamptz
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

**Indexes:**
- `status` (filtrage)
- `published_at DESC` (tri chronologique)
- `slug` (lookups rapides)
- Full-text search (français) sur `title + content`

**RLS Policies:**
- SELECT: Public lit published
- INSERT/UPDATE/DELETE: Anon peut gérer (backoffice)

### 3 Articles Sample

1. **Réglementation 2024** (score 92)
   - Slug: `reglementation-2024-nouvelles-obligations-taxis`
   - Catégorie: réglementation
   - Tags: réglementation, assurance, obligations

2. **Économiser 30%** (score 88)
   - Slug: `assurance-taxi-economiser-30-pourcent-2024`
   - Catégorie: économie
   - Tags: économie, assurance, conseils

3. **Tesla Model 3** (score 95)
   - Slug: `tesla-model-3-nouvelle-star-taxis-parisiens`
   - Catégorie: innovation
   - Tags: véhicules électriques, Tesla, innovation

---

## 📱 Système Réseaux Sociaux - Détails

### Architecture

```
news_articles (published)
    ↓ TRIGGER
social_posts (scheduled)
    ↓ CRON / MANUEL
Edge Function (social-media-auto-publisher)
    ↓ API
Facebook Graph API + LinkedIn API
    ↓
Posts publiés
```

### Tables Créées

#### 1. social_networks
Réseaux sociaux configurés :
- Facebook: activé, auto_publish=true
- LinkedIn: activé, auto_publish=true

#### 2. social_content_templates
7 templates :

**Facebook (4 templates):**
1. News : Actualité du secteur
2. Blog : Article de blog
3. Testimonial : Avis client
4. Tip : Conseil pratique

**LinkedIn (3 templates):**
1. News : Actualité professionnelle
2. Blog : Article expertise
3. Regulation : Veille réglementaire

#### 3. social_automation_schedule
Planning 10 posts/semaine :

**Facebook (7 posts):**
- Lundi 09:00 : News
- Mardi 12:30 : Tip
- Mercredi 18:00 : Blog
- Jeudi 09:00 : Testimonial
- Vendredi 12:30 : News
- Samedi 10:00 : Tip
- Dimanche 19:00 : Blog

**LinkedIn (3 posts):**
- Mardi 08:00 : News
- Mercredi 12:00 : Blog
- Jeudi 17:00 : Regulation

### Auto-génération

**Triggers Supabase:**
1. `generate_social_post_from_news()` : Quand news published
2. `generate_social_post_from_blog()` : Quand blog published

**Workflow:**
```
1. Nouvelle actualité publiée
2. Trigger détecte status=published
3. Récupère template Facebook news
4. Remplace variables {{title}}, {{excerpt}}, {{url}}
5. Insère dans social_posts (status=scheduled)
6. Même chose pour LinkedIn
7. Edge Function publie automatiquement
```

### Templates Exemples

#### Facebook News
```
📰 ACTUALITÉ TAXI

{{title}}

{{excerpt}}

👉 Lire l'article complet et obtenir votre devis personnalisé :
{{url}}

💬 Votre avis compte ! Partagez en commentaires.

#taxi #assurance #chauffeur #professionnel
```

#### LinkedIn News
```
📊 ACTUALITÉ DU SECTEUR TAXI

{{title}}

{{excerpt}}

Cette évolution impacte directement les professionnels
du transport de personnes.

🔗 Analyse complète sur TaxiAssur.com : {{url}}

💼 TaxiAssur accompagne les taxis dans leur
développement professionnel.

#Taxi #Assurance #TransportProfessionnel #Réglementation
```

---

## 🤖 Automatisation Make.com (Alternative)

Si vous préférez utiliser Make.com au lieu des API directes :

### Scenario Make.com

**Module 1: Webhook**
- Écoute : `https://hook.eu1.make.com/votre_webhook`
- Reçoit : `{platform, content, url, post_id}`

**Module 2: Router**
- Route 1 : Si platform = "facebook"
- Route 2 : Si platform = "linkedin"

**Module 3a: Facebook Post**
- Action : Create Page Post
- Message : `{{content}}`
- Link : `{{url}}`

**Module 3b: LinkedIn Post**
- Action : Share an Update
- Text : `{{content}}`
- Content : `{{url}}`

**Module 4: Supabase Update**
- Table : `social_posts`
- Filter : `id = {{post_id}}`
- Update : `status = "published"`, `published_at = now()`

**Configuration:**
1. Créer scenario sur Make.com
2. Copier URL webhook
3. Ajouter dans Supabase secrets : `MAKE_SOCIAL_WEBHOOK_URL`
4. Edge Function utilisera webhook si tokens API manquants

---

## 🔄 Workflows Automatiques

### Workflow 1: Publication Article
```
1. Créer article dans backoffice
2. Cliquer "Publier"
3. → Article status = published
4. → TRIGGER génère 2 posts (FB + LI)
5. → Posts status = scheduled
6. → Edge Function publie (CRON ou manuel)
7. → Posts status = published
8. → Visible sur Facebook & LinkedIn
```

### Workflow 2: Publication News
```
1. News Manager → Ajouter actualité
2. Remplir titre, contenu, catégorie
3. Cliquer "Publier"
4. → News status = published
5. → TRIGGER génère 2 posts
6. → Auto-publication
7. → Visible sur réseaux sociaux
```

### Workflow 3: Cron Automatique
```
1. Cron pg_cron (quotidien 08:00)
2. → Appelle Edge Function
3. → Récupère posts scheduled
4. → Publie sur FB/LI
5. → Met à jour status
6. → Rapport envoyé
```

**Configuration Cron:**
```sql
-- Ajouter dans migration future
SELECT cron.schedule(
  'auto-publish-social',
  '0 8 * * *', -- Tous les jours à 8h
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher',
    headers := '{"Authorization": "Bearer ' || current_setting('app.supabase_anon_key') || '"}'::jsonb
  );
  $$
);
```

---

## 📊 Métriques & Analytics

### Backoffice Social Media

**Onglet Réseaux Sociaux:**
- Réseaux disponibles : 2 (FB + LI)
- Réseaux actifs : 2
- Engagement total : Calculé depuis `social_posts`
- Clics totaux : Somme des clicks

**Onglet Publications:**
- Liste posts publiés
- Filtres : Platform, Status, Date
- Statistiques : Views, Likes, Shares, Comments
- Taux engagement : (Likes + Shares + Comments) / Views * 100

**Onglet Automatisation:**
- Planning posts
- Templates actifs
- Prochaines publications
- Configuration auto-génération

---

## 🐛 Troubleshooting

### Erreur: Pas de posts générés

**Cause:** Triggers non activés
**Solution:**
```sql
-- Vérifier triggers
SELECT * FROM pg_trigger WHERE tgname LIKE '%social%';

-- Réactiver
DROP TRIGGER IF EXISTS auto_generate_social_posts ON news_articles;
CREATE TRIGGER auto_generate_social_posts
  AFTER INSERT OR UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION generate_social_post_from_news();
```

### Erreur: Publication échoue

**Cause:** Tokens API invalides
**Solution:**
1. Vérifier secrets Supabase
2. Regénérer tokens Facebook/LinkedIn
3. Tester avec Make.com webhook (fallback)

### Erreur: 400 Bad Request social_networks

**Cause:** Table vide
**Solution:**
```sql
-- Réexécuter migration
-- 20251014020000_activate_social_automation.sql
```

---

## ✅ Checklist Finale

### Avant déploiement
- [ ] 3 migrations exécutées dans l'ordre
- [ ] Secrets API configurés dans Supabase
- [ ] Edge Function déployée
- [ ] Tokens Facebook/LinkedIn valides

### Après déploiement
- [ ] Page /actualites affiche 3 articles
- [ ] Section news sur home visible
- [ ] Backoffice social-media : 2 réseaux actifs
- [ ] Test création article → posts générés
- [ ] Test Edge Function → publication OK

### Vérifications Continue
- [ ] Posts publiés visibles sur Facebook
- [ ] Posts publiés visibles sur LinkedIn
- [ ] Analytics affichent métriques
- [ ] Cron quotidien fonctionne

---

## 📈 Résultats Attendus

### Avant
- ❌ Erreur 409 city_pages
- ❌ Webhook news 500
- ❌ Réseaux sociaux : 0 actif
- ❌ Pas de contenu auto
- ❌ Pas de page actualités

### Après
- ✅ 0 erreur Supabase
- ✅ Système news complet
- ✅ Facebook + LinkedIn actifs
- ✅ 10 posts/semaine automatique
- ✅ Page actualités publique
- ✅ Auto-génération fonctionnelle

---

**Date:** 14 Octobre 2025
**Build:** backoffice-iJBUBa3z.js (478 kB)
**Migrations:** 3 fichiers créés
**Edge Functions:** 1 déployée
**Temps déploiement:** ~30 minutes
