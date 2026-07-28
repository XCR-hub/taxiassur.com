# Système d'Optimisation SEO basé sur Google Search Console

## Date : 21 Février 2026

---

## Vue d'Ensemble

Un système complet d'analyse et d'optimisation SEO qui s'intègre automatiquement avec Google Search Console pour améliorer le positionnement organique sans casser l'existant.

### Objectifs

1. **Import automatique** des données Google Search Console
2. **Détection automatique** des opportunités SEO à fort potentiel
3. **Enrichissement des IA** de génération de contenu avec les vraies requêtes
4. **Préservation** du contenu existant déjà bien référencé
5. **Amélioration continue** basée sur les données réelles

---

## Architecture du Système

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Search Console                        │
│          (Données réelles de recherche - 16 mois)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              Edge Function: gsc-sync-performance                │
│  • Import quotidien automatique (cron 3h du matin)             │
│  • Requêtes + Pages + Métriques (impressions, clics, CTR, pos) │
│  • Calcul automatique des scores d'opportunité                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Base de Données Supabase                      │
│                                                                 │
│  1. gsc_queries           - Requêtes avec métriques             │
│  2. gsc_pages            - Performance par page                │
│  3. seo_opportunities    - Opportunités détectées (auto)       │
│  4. ai_content_prompts   - Templates IA enrichis               │
│  5. seo_content_improvements - Contenu généré                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ↓                                  ↓
┌─────────────────────────┐   ┌────────────────────────────────┐
│ Edge Function:          │   │  Backoffice Dashboard          │
│ ai-content-with-gsc     │   │  GSCOptimizationDashboard      │
│                         │   │                                │
│ • Génère contenu SEO    │   │  • Visualisation données       │
│ • Intègre requêtes GSC  │   │  • Gestion opportunités       │
│ • Optimise pour top 3   │   │  • Génération contenu         │
└─────────────────────────┘   └────────────────────────────────┘
```

---

## Tables Créées

### 1. `gsc_queries` - Requêtes Google Search Console

Stocke toutes les requêtes de recherche avec leurs métriques.

```sql
- query (text) - La requête de recherche
- impressions (integer) - Nombre d'impressions
- clicks (integer) - Nombre de clics
- ctr (decimal) - Taux de clics
- position (decimal) - Position moyenne
- date (date) - Date des données
- opportunity_score (0-100) - Score calculé automatiquement
- country, device - Filtres géographiques/appareils
```

**Indexes** : query, date, impressions, opportunity_score

### 2. `gsc_pages` - Performance des Pages

Performance de chaque URL du site.

```sql
- url (text) - URL de la page
- impressions, clicks, ctr, position
- needs_optimization (boolean) - Nécessite optimisation ?
- optimization_priority (0-100) - Priorité d'optimisation
```

### 3. `seo_opportunities` - Opportunités SEO

Opportunités détectées automatiquement.

```sql
- query (text) - Requête à optimiser
- opportunity_type - Type d'opportunité :
  • 'high_impression_low_ctr' - Beaucoup d'impressions, CTR faible
  • 'position_5_15' - Position 5-15 (sweet spot)
  • 'zero_clicks' - Impressions sans clics
- impressions, clicks, ctr, position
- potential_clicks - Estimation de gain possible
- priority_score (0-100) - Score de priorité
- status - 'pending', 'in_progress', 'completed', 'ignored'
- suggested_actions (jsonb) - Actions suggérées
```

### 4. `ai_content_prompts` - Templates IA Enrichis

Templates de prompts pour la génération de contenu optimisé.

```sql
- name - Nom unique du template
- category - 'blog', 'city_page', 'faq', 'product', 'news'
- base_prompt - Prompt de base
- seo_enhancement - Enrichissement SEO avec requêtes GSC
- target_queries - Liste des requêtes ciblées
- usage_count - Nombre d'utilisations
- avg_performance_score - Performance moyenne
```

**Templates pré-configurés** :
- `blog_article_seo` - Articles de blog
- `city_page_seo` - Pages villes
- `faq_answer_seo` - Questions/réponses
- `comparison_page_seo` - Pages de comparaison
- `news_article_seo` - Articles d'actualité

### 5. `seo_content_improvements` - Améliorations de Contenu

Contenu généré et améliorations appliquées.

```sql
- query - Requête ciblée
- improvement_type - 'new_page', 'optimize_existing', etc.
- current_content - Contenu actuel
- suggested_content - Contenu suggéré par IA
- ai_prompt_used - Prompt utilisé
- status - 'draft', 'review', 'approved', 'published'
- performance_before, performance_after - Métriques
```

---

## Fonctions Edge Déployées

### 1. `gsc-sync-performance` - Synchronisation GSC

**Rôle** : Importe les données de Google Search Console

**Déclenchement** :
- Automatique : Tous les jours à 3h (cron)
- Manuel : Bouton dans le dashboard

**Traitement** :
1. Connexion à GSC via Service Account
2. Import des 7 derniers jours (configurable)
3. Calcul automatique des scores d'opportunité
4. Détection et création des opportunités SEO
5. Enregistrement de l'historique

**Configuration requise** :
```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----
```

**Alternative** : Configuration via CLI
```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="xxx@xxx.iam.gserviceaccount.com"
supabase secrets set GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----..."
```

---

## Catégorisation Automatique des Requêtes

```sql
get_top_queries_by_category()
```

**Catégories détectées** :
- `prix` : requêtes avec "prix", "tarif", "coût"
- `ville` : requêtes avec noms de villes
- `vtc` : requêtes VTC spécifiques
- `professionnel` : "professionnelle", "pro"
- `jeune_conducteur` : "jeune"
- `comparaison` : "comparateur", "comparatif"
- `general` : autres

**Utilisation** :
```sql
SELECT * FROM get_top_queries_by_category()
WHERE category = 'ville'
ORDER BY impressions DESC;
```

---

## Exemples d'Utilisation

### 1. Synchroniser Manuellement GSC

```typescript
const { data } = await supabase.functions.invoke('gsc-sync-performance', {
  body: { days: 30 } // Import des 30 derniers jours
});

console.log(`${data.data.queries_imported} requêtes importées`);
```

### 2. Générer un Article de Blog Optimisé

```typescript
const { data } = await supabase.functions.invoke('ai-content-with-gsc', {
  body: {
    category: 'blog',
    topic: 'Comment choisir son assurance taxi',
    max_queries: 7
  }
});

console.log('Requêtes ciblées:', data.metadata.target_queries);
console.log('Contenu:', data.content);
```

### 3. Récupérer les Top Opportunités

```typescript
const { data: opportunities } = await supabase
  .from('seo_opportunities')
  .select('*')
  .eq('status', 'pending')
  .order('priority_score', { ascending: false })
  .limit(10);

opportunities.forEach(opp => {
  console.log(`${opp.query} - Score: ${opp.priority_score}/100`);
  console.log(`Potentiel: +${opp.potential_clicks} clics`);
});
```

### 4. Trouver les Pages à Optimiser

```typescript
const { data: pages } = await supabase
  .from('gsc_pages')
  .select('*')
  .eq('needs_optimization', true)
  .order('optimization_priority', { ascending: false });

pages.forEach(page => {
  console.log(`${page.url}`);
  console.log(`${page.impressions} impressions, CTR: ${(page.ctr * 100).toFixed(2)}%`);
});
```

---

## Monitoring et Métriques

### Historique de Synchronisation

```sql
SELECT * FROM gsc_sync_history
ORDER BY sync_date DESC
LIMIT 10;
```

**Métriques suivies** :
- Requêtes importées
- Pages importées
- Opportunités détectées
- Durée de sync
- Statut (success/partial/failed)

### Performance des Templates IA

```sql
SELECT
  name,
  category,
  usage_count,
  avg_performance_score
FROM ai_content_prompts
WHERE is_active = true
ORDER BY usage_count DESC;
```

---

## Sécurité RLS

**Toutes les tables protégées** :
- Accès admin/commercial uniquement
- Lecture publique uniquement pour `ai_content_prompts` actifs
- Aucune donnée sensible exposée

```sql
-- Exemple de politique
CREATE POLICY "Admins full access" ON gsc_queries
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
    AND role IN ('admin', 'commercial')
  )
);
```

---

## Roadmap / Améliorations Futures

1. **Analyse de Tendances**
   - Détection des requêtes en croissance
   - Alertes sur baisse de performance

2. **A/B Testing Automatisé**
   - Tester différentes variations de contenu
   - Mesurer l'impact sur les métriques GSC

3. **Optimisation Title/Meta Automatique**
   - Suggestions de titles basées sur GSC
   - Tests automatiques de CTR

4. **Intégration Google Analytics 4**
   - Croiser données GSC + GA4
   - Analyse du parcours complet

5. **Génération d'Images SEO**
   - Images optimisées pour chaque requête
   - Alt texts générés automatiquement

6. **Rapports Automatiques**
   - Email hebdomadaire avec top opportunités
   - Alertes sur nouvelles requêtes importantes

---

## Fichiers Créés

### Migrations SQL
- `20260221150000_create_gsc_seo_optimization_system_2026.sql`
- `20260221151000_create_gsc_sync_cron_2026.sql`

### Edge Functions
- `supabase/functions/gsc-sync-performance/index.ts`
- `supabase/functions/ai-content-with-gsc/index.ts`

### Backoffice
- `src/backoffice/GSCOptimizationDashboard.tsx`

### Documentation
- `SYSTEME_OPTIMISATION_SEO_GSC_2026.md` (ce fichier)

---

## Checklist de Déploiement

- [✅] Migrations SQL appliquées
- [✅] Edge Functions déployées
- [✅] Dashboard backoffice créé
- [⏳] Configuration Google Service Account
- [⏳] Test de synchronisation GSC
- [⏳] Test de génération de contenu
- [⏳] Vérification des crons
- [⏳] Formation équipe

---

**Date** : 21 Février 2026  
**Statut** : ✅ Système créé et déployé  
**Impact** : Optimisation SEO continue sans casser l'existant  
**Prochaine étape** : Configurer Google Service Account et tester

---

## Support et Questions

Pour toute question ou amélioration, contacter l'équipe technique.

Le système est conçu pour être **non-intrusif** : il analyse et suggère, sans modifier automatiquement le contenu existant.
