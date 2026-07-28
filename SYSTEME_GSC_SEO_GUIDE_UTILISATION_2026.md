# Guide d'Utilisation - Système d'Optimisation SEO Google Search Console

**Date:** 21 Février 2026
**Version:** 1.0
**Statut:** ✅ Déployé et opérationnel

---

## 📋 Vue d'Ensemble

Le système d'optimisation SEO Google Search Console a été créé pour **améliorer automatiquement le positionnement SEO de TaxiAssur.com** sans modifier le contenu existant déjà bien référencé.

### Objectifs

1. **Importer automatiquement** les données Google Search Console
2. **Analyser les opportunités** SEO à fort potentiel
3. **Enrichir la génération de contenu IA** avec les vraies requêtes des utilisateurs
4. **Créer de nouvelles pages optimisées** sans toucher à l'existant
5. **Suivre les performances** dans le temps

---

## 🚀 Fonctionnalités Implémentées

### 1. Tables de Données (Base de données)

✅ **6 tables créées** pour stocker et analyser les données GSC :

| Table | Description | Usage |
|-------|-------------|-------|
| `gsc_queries` | Toutes les requêtes avec métriques (impressions, clics, CTR, position) | Historique complet des requêtes |
| `gsc_pages` | Performance de chaque page/URL | Identifie les pages à optimiser |
| `seo_opportunities` | Opportunités SEO détectées automatiquement | Priorise les actions à prendre |
| `seo_content_improvements` | Contenu généré par IA avec tracking | Suivi des améliorations |
| `ai_content_prompts` | Templates de prompts enrichis SEO | Génération de contenu optimisé |
| `gsc_sync_history` | Historique des synchronisations | Audit et suivi |

### 2. Edge Functions Déployées

✅ **2 Edge Functions opérationnelles** :

#### **gsc-sync-performance**
- Synchronise les données GSC automatiquement
- Calcule les scores d'opportunité (0-100)
- Détecte les requêtes à fort potentiel
- Fréquence : **Quotidienne à 3h du matin** + manuel à la demande

#### **ai-content-with-gsc**
- Génère du contenu IA enrichi avec requêtes GSC
- Intègre naturellement les top requêtes dans le contenu
- Compatible avec OpenAI GPT-4
- Tracking automatique des performances

### 3. Dashboard Backoffice

✅ **Interface complète** accessible via : `/backoffice/gsc-optimization`

**4 onglets principaux :**

1. **📊 Vue d'ensemble**
   - Statistiques globales
   - Top 10 requêtes
   - Top 5 opportunités SEO

2. **🎯 Opportunités SEO**
   - Liste complète des opportunités détectées
   - Scores de priorité
   - Actions suggérées
   - Génération de contenu en 1 clic

3. **🔍 Top Requêtes**
   - Toutes les requêtes triées par impressions
   - Filtres par catégorie
   - Métriques détaillées (CTR, position, clics)

4. **✍️ Contenu Généré**
   - Historique du contenu créé par IA
   - Statuts (draft, review, approved, published)
   - Suivi des performances

### 4. Automatisations (Crons)

✅ **2 crons configurés** :

- **gsc-daily-sync** : Tous les jours à 3h - Import des 7 derniers jours
- **gsc-update-opportunities** : Tous les jours à 3h30 - Détection des opportunités

### 5. Algorithme de Scoring

✅ **Score d'opportunité intelligent** (0-100 points) :

```
Score = Impressions (max 40 pts)
      + Position 5-15 (20 pts)        [Sweet spot]
      + CTR faible + impressions élevées (20 pts)
      + Quelques clics existants (20 pts)
```

**Types d'opportunités détectés :**
- `high_impression_low_ctr` : Beaucoup vu, peu cliqué → améliorer titre/meta
- `position_5_15` : En page 2 → pousser en page 1
- `zero_clicks` : Visible mais jamais cliqué → revoir l'angle
- `general` : Potentiel à analyser

---

## 📖 Guide d'Utilisation

### Étape 1 : Configuration Google Service Account

**⚠️ IMPORTANT** : Pour que la synchronisation fonctionne, vous devez configurer les secrets Supabase :

1. **Créer un Service Account Google** :
   - Aller sur [Google Cloud Console](https://console.cloud.google.com)
   - Activer l'API "Google Search Console"
   - Créer un Service Account
   - Télécharger la clé JSON

2. **Ajouter le compte à Google Search Console** :
   - Aller sur [Google Search Console](https://search.google.com/search-console)
   - Ajouter l'email du Service Account comme utilisateur (lecture seule)

3. **Configurer les secrets Supabase** :
   ```bash
   # Dans votre terminal
   supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="votre-service-account@projet.iam.gserviceaccount.com"
   supabase secrets set GOOGLE_SERVICE_ACCOUNT_KEY=REDACTED
   ```

> **Note** : Sans cette configuration, le système fonctionne en mode test (pas de vraies données GSC)

### Étape 2 : Première Synchronisation

1. **Accéder au dashboard** : `/backoffice/gsc-optimization`
2. **Cliquer sur "Synchroniser GSC"** (bouton bleu en haut)
3. **Attendre la synchronisation** (quelques secondes pour 7 jours de données)
4. **Vérifier les résultats** :
   - Nombre de requêtes importées
   - Nombre de pages analysées
   - Opportunités détectées

### Étape 3 : Analyser les Opportunités

1. **Aller dans l'onglet "Opportunités SEO"**
2. **Trier par "Score de priorité"** (décroissant)
3. **Pour chaque opportunité :**
   - Lire la requête et les métriques
   - Vérifier le type d'opportunité
   - Décider de l'action à prendre

**Exemples d'actions :**

| Type | Action recommandée |
|------|-------------------|
| `high_impression_low_ctr` | Améliorer le titre et la meta description |
| `position_5_15` | Créer du contenu plus complet sur le sujet |
| `zero_clicks` | Revoir l'angle d'attaque de la page |

### Étape 4 : Générer du Contenu Optimisé

**Option A : Depuis une opportunité**
1. Dans l'onglet "Opportunités SEO"
2. Cliquer sur "Générer Contenu" pour une requête
3. Le contenu sera enrichi automatiquement avec les top requêtes liées

**Option B : Génération manuelle**
1. Utiliser l'API directement :
   ```javascript
   const { data } = await supabase.functions.invoke('ai-content-with-gsc', {
     body: {
       category: 'blog',  // blog, city_page, faq, product, news
       topic: 'Assurance taxi jeune conducteur',
       max_queries: 5  // Nombre de requêtes GSC à intégrer
     }
   });
   console.log(data.content);  // Contenu généré
   ```

### Étape 5 : Publier et Suivre

1. **Réviser le contenu généré** (onglet "Contenu Généré")
2. **Approuver** et publier sur le site
3. **Attendre 2-4 semaines** pour voir l'impact dans GSC
4. **Comparer avant/après** dans les métriques de l'opportunité

---

## 🎯 Cas d'Usage Pratiques

### Cas 1 : Requête "assurance taxi jeune conducteur paris" - 500 impressions, position 8

**Problème** : Beaucoup de visibilité mais position moyenne (page 1 bas)

**Solution** :
1. Générer un article complet avec GSC
2. Intégrer naturellement les requêtes liées :
   - "prix assurance taxi jeune conducteur"
   - "assurance taxi paris jeune"
   - "tarif assurance taxi moins 25 ans"
3. Publier l'article sur `/blog/assurance-taxi-jeune-conducteur-paris`
4. Suivre l'évolution de la position

**Résultat attendu** : Position 3-5 en 3-4 semaines

---

### Cas 2 : Requête "comparatif assurance taxi" - 800 impressions, CTR 2%

**Problème** : Beaucoup vu mais peu cliqué (CTR faible)

**Solution** :
1. Améliorer le titre et meta description de la page existante
2. Ou créer une nouvelle page dédiée avec tableau comparatif
3. Utiliser le prompt template `comparison_page_seo`

**Résultat attendu** : CTR passe de 2% à 5-8%

---

### Cas 3 : Requête "RC pro taxi" - 300 impressions, 0 clics, position 12

**Problème** : Visible en page 2 mais jamais cliqué

**Solution** :
1. Créer une page dédiée `/rc-professionnelle-taxi`
2. Intégrer FAQ structurée (position 0)
3. Ajouter données structurées schema.org

**Résultat attendu** : Position 5-7 + featured snippet

---

## ⚙️ Configuration Avancée

### Modifier le Seuil de Détection

Par défaut, seules les opportunités avec un score ≥ 40 sont créées.

Pour modifier :
```sql
UPDATE system_config
SET value = '30'  -- Nouveau seuil
WHERE key = 'gsc_opportunity_threshold';
```

### Changer la Fréquence de Sync

Par défaut : quotidien à 3h.

Pour modifier :
```sql
-- Exemple : toutes les 6h
SELECT cron.alter_job('gsc-daily-sync', '0 */6 * * *');
```

### Ajouter un Prompt Template

```sql
INSERT INTO ai_content_prompts (name, category, base_prompt, seo_enhancement) VALUES
(
  'landing_page_seo',
  'product',
  'Crée une landing page optimisée pour {product}',
  'Cible ces requêtes : {target_queries}. Inclus CTA clair, témoignages, FAQ.'
);
```

---

## 📊 Métriques à Suivre

### KPIs Principaux

1. **Nombre d'opportunités créées** par semaine
2. **Score moyen** des opportunités
3. **Taux de conversion** opportunité → contenu publié
4. **Amélioration de position** (avant/après)
5. **Croissance du CTR** sur les pages optimisées

### Dashboard Analytics

Le dashboard affiche automatiquement :
- Total des requêtes suivies
- Total des impressions
- Total des clics
- Position moyenne
- Opportunités en attente
- Contenu généré ce mois

---

## 🔧 Maintenance

### Vérifier que les Crons Fonctionnent

```sql
SELECT * FROM gsc_sync_history
ORDER BY sync_date DESC
LIMIT 10;
```

Si aucune entrée récente, vérifier les logs Edge Functions.

### Nettoyer les Anciennes Données

```sql
-- Supprimer les données de plus de 90 jours
DELETE FROM gsc_queries WHERE date < CURRENT_DATE - INTERVAL '90 days';
DELETE FROM gsc_pages WHERE date < CURRENT_DATE - INTERVAL '90 days';
```

### Réinitialiser les Opportunités

```sql
-- Recréer toutes les opportunités depuis les données actuelles
TRUNCATE seo_opportunities;
SELECT auto_create_opportunities();
```

---

## 🚨 Dépannage

### "Pas de données GSC"

**Cause** : Service Account non configuré ou non autorisé.

**Solution** :
1. Vérifier que `GOOGLE_SERVICE_ACCOUNT_EMAIL` et `GOOGLE_SERVICE_ACCOUNT_KEY` sont configurés
2. Vérifier que le compte est autorisé dans Google Search Console

### "Sync échoue"

**Cause** : API Google indisponible ou quota dépassé.

**Solution** :
1. Vérifier les quotas Google Cloud
2. Attendre et réessayer plus tard
3. Vérifier les logs : `/backoffice/analytics`

### "Pas d'opportunités détectées"

**Cause** : Données insuffisantes ou seuil trop élevé.

**Solution** :
1. Baisser le seuil : `UPDATE system_config SET value = '20' WHERE key = 'gsc_opportunity_threshold'`
2. Attendre plus de données (au moins 7 jours)
3. Vérifier que des requêtes sont bien importées : `SELECT COUNT(*) FROM gsc_queries`

---

## 📈 Évolutions Futures Possibles

- [ ] Import automatique des données Google Analytics
- [ ] Détection automatique de cannibalisation de contenu
- [ ] Suggestions de maillage interne automatique
- [ ] A/B testing automatique des titres/metas
- [ ] Prédiction des tendances saisonnières
- [ ] Intégration avec Google Trends
- [ ] Génération automatique d'images optimisées
- [ ] Recommandations de backlinks ciblés

---

## ✅ Checklist de Vérification

Avant de commencer à utiliser le système, vérifier :

- [x] ✅ Tables créées dans la base de données
- [x] ✅ Edge Functions déployées
- [x] ✅ Crons configurés
- [x] ✅ Dashboard accessible
- [x] ✅ Route ajoutée au router
- [ ] ⚠️ Service Account Google configuré
- [ ] ⚠️ Première synchronisation effectuée
- [ ] ⚠️ Opportunités détectées
- [ ] ⚠️ Premier contenu généré et publié

---

## 📞 Support

Pour toute question ou problème :

1. Vérifier les logs dans `/backoffice/analytics`
2. Consulter l'historique de sync : `SELECT * FROM gsc_sync_history`
3. Vérifier la documentation Supabase Edge Functions
4. Consulter la documentation Google Search Console API

---

## 📚 Ressources

- [Google Search Console API](https://developers.google.com/webmaster-tools/search-console-api-original)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

**Version:** 1.0
**Dernière mise à jour:** 21 Février 2026
**Auteur:** Système TaxiAssur CRM
