# 🚀 SYSTÈME DE PUBLICATION AUTOMATIQUE IA → GIT → BOLT.NEW

## 📊 Architecture complète

```
┌─────────────────────────────────────────────────────────────┐
│  1. GOOGLE SEARCH CONSOLE                                   │
│     - Détecte opportunités SEO                              │
│     - Analyse performances actuelles                        │
└──────────────────┬──────────────────────────────────────────┘
                   │ Données GSC
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CRON SUPABASE (toutes les 6h)                           │
│     Fonction: gsc-sync-performance                          │
│     - Synchronise les données GSC                           │
│     - Détecte les nouvelles opportunités                    │
└──────────────────┬──────────────────────────────────────────┘
                   │ Trigger
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  3. IA ORCHESTRATOR                                         │
│     Fonction: gsc-ai-orchestrator                           │
│     - Analyse collaborative (GPT-4, Claude, Gemini)         │
│     - Décisions SEO intelligentes                           │
│     - Priorise les actions                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │ Recommandations SEO
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  4. GÉNÉRATEUR DE CODE IA                                   │
│     Fonction: ai-code-generator                             │
│     - Génère du code React (pages, composants)              │
│     - Optimise le code existant                             │
│     - Ajoute métadonnées SEO                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ Code React généré
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  5. FILE D'ATTENTE PUBLICATION                              │
│     Table: code_publish_queue                               │
│     - Stocke les modifications en attente                   │
│     - Gère les priorités                                    │
│     - Logs et traçabilité                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │ Toutes les 10 minutes
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  6. PUBLICATION GIT AUTOMATIQUE                             │
│     Fonction: git-auto-publisher                            │
│     - Commit vers GitHub                                    │
│     - Push automatique                                      │
│     - Gestion des conflits                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │ Git Push
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  7. GITHUB REPOSITORY                                       │
│     - Stocke le code source                                 │
│     - Historique des commits                                │
│     - Webhook vers Bolt.new                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │ Webhook
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  8. BOLT.NEW AUTO-REBUILD                                   │
│     - Détecte le nouveau commit                             │
│     - Rebuild automatique                                   │
│     - Déploiement Cloudflare                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ Site mis à jour
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  9. SITE WEB EN LIGNE                                       │
│     - Nouvelles pages SEO live                              │
│     - Optimisations appliquées                              │
│     - Performance améliorée                                 │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuration requise

### 1. Secrets Supabase (déjà configurés automatiquement)

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx           # Token GitHub avec droits repo
BOLT_REBUILD_WEBHOOK_URL=https://...     # Webhook Bolt.new (optionnel)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx          # Pour l'IA
```

### 2. Configuration Git Repository

```sql
-- Vérifier la configuration Git
SELECT * FROM git_repository_config;

-- Mettre à jour si nécessaire
UPDATE git_repository_config
SET
  repository_url = 'https://github.com/VOTRE-USERNAME/taxiassur',
  branch_name = 'main',
  auto_commit_enabled = true,
  auto_deploy_enabled = true
WHERE id = (SELECT id FROM git_repository_config LIMIT 1);
```

### 3. Connecter GitHub à Bolt.new

Dans Bolt.new:
1. Settings → Integrations
2. Connect GitHub Repository
3. Sélectionner votre repo `taxiassur`
4. Activer "Auto-deploy on push"
5. Branche: `main`

## 🔄 Workflow automatique complet

### Exemple concret: Création page "Assurance Taxi Marseille"

**Jour 1 - 9h00**: GSC détecte opportunité
```
Requête: "assurance taxi marseille"
Position: 15
Clics: 5/mois
Potentiel: 50 clics/mois si position 3
```

**Jour 1 - 9h30**: Cron sync GSC
```sql
-- Nouvelle opportunité détectée
INSERT INTO gsc_seo_opportunities (
  query, impressions, clicks, position, potential_clicks
) VALUES (
  'assurance taxi marseille', 500, 5, 15, 50
);
```

**Jour 1 - 10h00**: IA analyse
```
🤖 gsc-ai-orchestrator déclenché
└─ Analyse collaborative GPT-4 + Claude + Gemini
   ├─ Recommandation: Créer page dédiée Marseille
   ├─ Priorité: HAUTE (potentiel +45 clics/mois)
   └─ Brief SEO: Cibler "assurance taxi marseille pas cher"
```

**Jour 1 - 10h05**: Génération code
```typescript
🤖 ai-code-generator créé:
├─ src/pages/AssuranceTaxiMarseille.tsx (contenu optimisé)
├─ Métadonnées SEO complètes
├─ Schema.org LocalBusiness
└─ FAQ ciblée Marseille
```

**Jour 1 - 10h10**: Ajout à la queue
```sql
INSERT INTO code_publish_queue (
  file_path: 'src/pages/AssuranceTaxiMarseille.tsx',
  operation: 'create',
  commit_message: '[IA SEO] Création page Marseille - assurance taxi marseille',
  priority: 7
)
```

**Jour 1 - 10h20**: Publication Git (cron 10min)
```bash
🚀 git-auto-publisher
├─ Commit: [IA SEO] Création page Marseille
├─ Push: main
└─ SHA: a3f7b9c
```

**Jour 1 - 10h22**: Rebuild Bolt.new
```
🔨 Bolt.new détecte nouveau commit
├─ npm run build
├─ Deploy Cloudflare
└─ Site live en 2 minutes
```

**Jour 1 - 10h25**: Page en ligne!
```
✅ https://taxiassur.com/assurance-taxi-marseille
└─ Indexation Google en 24-48h
```

## 📈 Monitoring et statistiques

### Dashboard Publication

```sql
-- Stats en temps réel
SELECT * FROM get_publish_stats();
```

Retourne:
```json
{
  "pending": 3,           // En attente
  "processing": 1,        // En cours
  "published": 47,        // Publiées
  "failed": 2,            // Échouées
  "total_last_24h": 12,   // Dernières 24h
  "success_rate": 95.92   // Taux de réussite
}
```

### Historique des publications

```sql
-- Dernières publications
SELECT
  file_path,
  operation,
  commit_sha,
  success,
  published_at
FROM code_publish_history
ORDER BY published_at DESC
LIMIT 20;
```

### Queue en temps réel

```sql
-- Voir ce qui va être publié
SELECT
  file_path,
  commit_message,
  priority,
  status,
  created_at
FROM code_publish_queue
WHERE status = 'pending'
ORDER BY priority DESC, created_at ASC;
```

## 🛠️ Commandes manuelles utiles

### Déclencher une publication immédiate

```sql
-- Forcer publication maintenant (sans attendre le cron)
SELECT trigger_immediate_publish();
```

### Ajouter manuellement du code à publier

```sql
SELECT add_code_to_publish_queue(
  p_file_path := 'src/pages/TestPage.tsx',
  p_file_content := 'import React from "react";...',
  p_operation := 'create',
  p_commit_message := 'Ajout page test',
  p_triggered_by := 'admin-manuel',
  p_priority := 10
);
```

### Annuler une publication en attente

```sql
UPDATE code_publish_queue
SET status = 'cancelled'
WHERE id = 'UUID-DE-LA-PUBLICATION';
```

## ⚡ Fréquences des automations

| Automation | Fréquence | Fonction |
|------------|-----------|----------|
| Sync GSC | Toutes les 6h | `gsc-sync-performance` |
| Analyse IA SEO | Toutes les 6h | `gsc-ai-orchestrator` |
| Publication Git | Toutes les 10min | `git-auto-publisher` |
| Nettoyage historique | Tous les jours 3h | Suppression > 90j |

## 🔐 Sécurité et validation

### Validation automatique du code

Avant chaque publication, le système:
1. ✅ Vérifie la syntaxe TypeScript
2. ✅ Valide les imports React
3. ✅ Vérifie les balises SEO
4. ✅ Détecte les erreurs évidentes

### Rollback en cas d'erreur

Si le build échoue sur Bolt.new:
1. GitHub conserve l'historique complet
2. Rollback possible en 1 clic
3. Logs détaillés dans `code_publish_history`

## 📊 Exemple de workflow complet (semaine type)

**Lundi 9h**: GSC sync
- 15 nouvelles opportunités détectées

**Lundi 9h30**: IA analyse
- 8 recommandations haute priorité
- 5 pages villes à créer
- 3 optimisations pages existantes

**Lundi 9h40**: Génération code
- 8 fichiers générés et en queue

**Lundi 10h00**: Publication Git #1
- 5 nouvelles pages publiées

**Lundi 10h10**: Publication Git #2
- 3 optimisations publiées

**Lundi 10h15**: Site mis à jour
- 8 nouvelles pages SEO en ligne

**Mardi à Vendredi**:
- Même process automatique
- Environ 5-10 nouvelles pages/jour
- 150-300 pages/mois générées automatiquement

**Résultat fin de mois**:
- +150 nouvelles pages SEO
- +50 optimisations appliquées
- +2000 clics organiques/mois
- 0 intervention humaine

## 🎯 KPIs de performance

```sql
-- Performance mensuelle
SELECT
  COUNT(*) as total_publishes,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(DISTINCT DATE(published_at)) as active_days,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))/60), 2) as avg_time_minutes
FROM code_publish_history
WHERE published_at >= date_trunc('month', now());
```

## 🚨 Alertes et monitoring

Le système envoie automatiquement des notifications si:
- ❌ Publication échouée 3 fois
- ⚠️ Queue > 20 éléments en attente
- 🔴 Aucune publication depuis 24h
- ⚡ Taux d'échec > 10%

## 🎓 Formation IA continue

Le système apprend et s'améliore:
- Analyse quelles pages performent le mieux
- Ajuste les templates de génération
- Optimise les choix de mots-clés
- Améliore les structures SEO

**Votre site web devient autonome et se développe seul!** 🤖✨
