# 📰 Système d'Actualités Automatisé - Documentation Complète

## 🎯 Vue d'Ensemble

Système complet et professionnel d'agrégation, synthèse et diffusion d'actualités pour le secteur taxi et assurance taxi.

---

## 🏗️ Architecture du Système

### 1. **Sources d'Actualités** (8 sources configurées)

#### Sources RSS Actives
- **Taxi Magazine** - Actualités spécialisées taxi
- **Mobilité Magazine** - Transport et mobilité urbaine
- **Transport Info** - Réglementation professionnelle
- **Google News Taxi France** - Actualités grand public
- **Service Public Transport** - Informations officielles
- **DREAL Transports** - Réglementation environnement

#### Sources Scraping
- **Légifrance Transport** - Décrets et arrêtés officiels
- **LinkedIn Taxi Pros** - Actualités professionnelles LinkedIn

---

## 📦 Base de Données Supabase

### Tables Créées

#### `french_cities` ✅
Référentiel des villes françaises avec département et région
```sql
- name: text (ex: "Montévrain")
- dept_code: text (ex: "77")
- dept_name: text (ex: "Seine-et-Marne")
- region: text (ex: "Île-de-France")
- population: integer
- 50+ villes pré-remplies
```

#### `news_sources` ✅
Configuration des sources d'actualités
```sql
- name: text
- url: text
- type: enum (rss, api, scraping, linkedin)
- enabled: boolean
- keywords: text[]
- priority: integer (1-10)
- check_interval: integer (secondes)
- last_check: timestamptz
- error_count: integer
```

#### `news_articles` ✅ (existante, 18 articles)
Stockage des actualités récupérées
```sql
- title: text
- slug: text (unique)
- content: text
- excerpt: text
- source: text
- source_url: text
- category: text
- tags: text[]
- score: integer (pertinence 0-100)
- status: text (draft/ready/published/archived)
- published_at: timestamptz
```

#### `news_digest` ✅
Synthèses quotidiennes/hebdomadaires
```sql
- type: text (daily/weekly)
- title: text
- content: text (HTML)
- summary: text
- articles_count: integer
- period_start: timestamptz
- period_end: timestamptz
- sent_at: timestamptz
```

#### `cron_jobs_config` ✅
Configuration des tâches automatisées
```sql
- job_name: text
- function_url: text
- schedule: text (format cron)
- payload: jsonb
- enabled: boolean
- last_run: timestamptz
- last_status: text
```

---

## ⚙️ Edge Functions Supabase

### 1. **`rss-parser`** 📡
**Fichier**: `supabase/functions/rss-parser/index.ts`

**Rôle**: Parser les flux RSS en contournant les problèmes CORS

**Fonctionnalités**:
- Récupère n'importe quel flux RSS/Atom
- Parse le XML sans bibliothèque externe
- Nettoie et formate les données
- Gère CDATA et entités HTML
- Retourne JSON structuré

**Appel**:
```typescript
POST /functions/v1/rss-parser
{
  "url": "https://www.taximag.fr/feed",
  "sourceName": "Taxi Magazine"
}
```

**Réponse**:
```json
{
  "success": true,
  "items": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "link": "...",
      "pubDate": "...",
      "source": "...",
      "category": "..."
    }
  ],
  "count": 15
}
```

---

### 2. **`linkedin-scraper`** 💼
**Fichier**: `supabase/functions/linkedin-scraper/index.ts`

**Rôle**: Scraper les actualités LinkedIn professionnelles

**Sources LinkedIn**:
- G7 Taxi
- Uber France
- Bolt France
- Fédération Nationale Artisans Taxi
- Pages professionnelles transport

**Fonctionnalités**:
- Utilise API LinkedIn officielle (si token configuré)
- Mode mock avec données réalistes (si pas de token)
- Filtre par mots-clés pertinents
- Score basé sur engagement (likes + comments)
- Sauvegarde directe dans `news_articles`

**Appel**:
```typescript
POST /functions/v1/linkedin-scraper
{}
```

**Configuration requise**:
```bash
LINKEDIN_ACCESS_TOKEN=your_token  # Optionnel
```

---

### 3. **`news-aggregator-master`** 🎯
**Fichier**: `supabase/functions/news-aggregator-master/index.ts`

**Rôle**: Orchestrateur principal - agrège TOUTES les sources

**Workflow**:
1. Récupère les sources actives depuis `news_sources`
2. Vérifie l'intervalle de vérification (rate limiting)
3. Pour chaque source RSS:
   - Appelle `rss-parser`
   - Calcule score de pertinence
   - Filtre par mots-clés
4. Pour source LinkedIn:
   - Appelle `linkedin-scraper`
5. Sauvegarde dans `news_articles`
6. Met à jour `last_check` et `error_count`

**Scoring de Pertinence**:
```typescript
Score = (occurrences mots-clés × 10) + bonus prioritaires
Bonus : "assurance taxi" = +25, "réglementation" = +25
Score minimum pour sauvegarder : 30/100
Status "ready" si score ≥ 70, sinon "draft"
```

**Appel**:
```typescript
POST /functions/v1/news-aggregator-master
{}
```

**Réponse**:
```json
{
  "success": true,
  "message": "Agrégation terminée : 12 nouveaux articles sur 45 traités",
  "stats": {
    "newArticles": 12,
    "totalProcessed": 45,
    "sourcesChecked": 8,
    "errors": 0
  }
}
```

---

### 4. **`news-digest-generator`** 📝
**Fichier**: `supabase/functions/news-digest-generator/index.ts`

**Rôle**: Génère les synthèses IA quotidiennes/hebdomadaires

**Fonctionnalités**:
- **Digest quotidien**: Top 10 actualités des dernières 24h
- **Digest hebdomadaire**: Top 30 actualités des 7 derniers jours
- Utilise OpenAI GPT-4o-mini pour synthèse
- Structure par thématiques (réglementation, marché, innovation)
- Format HTML professionnel
- Résumé exécutif en 2-3 phrases

**Prompt OpenAI**:
```
Tu es un expert en synthèse d'actualités pour le secteur du taxi
et de l'assurance taxi. Tu dois créer un digest quotidien/hebdomadaire
professionnel, concis et pertinent.

Crée une synthèse avec :
- title: Titre accrocheur
- summary: Résumé exécutif 2-3 phrases
- content: HTML structuré par sections thématiques
```

**Appel**:
```typescript
POST /functions/v1/news-digest-generator
{
  "type": "daily"  // ou "weekly"
}
```

**Configuration requise**:
```bash
OPENAI_API_KEY=sk-...  # Optionnel (mode mock sinon)
```

---

### 5. **`news-email-alerts`** 📧
**Fichier**: `supabase/functions/news-email-alerts/index.ts`

**Rôle**: Envoie les digests par email aux abonnés

**Fonctionnalités**:
- Récupère le dernier digest non envoyé
- Charge les leads avec newsletter opt-in
- Template email HTML responsive professionnel
- Envoi via Resend API
- Rate limiting (100 emails/batch)
- Marque le digest comme envoyé

**Template Email**:
- Design moderne gradient violet/indigo
- Résumé exécutif en haut
- Articles structurés par sections
- CTA vers site web
- Lien désabonnement

**Appel**:
```typescript
POST /functions/v1/news-email-alerts
{
  "type": "daily"  // ou "weekly"
}
```

**Configuration requise**:
```bash
RESEND_API_KEY=re_...  # Optionnel (simulation sinon)
```

---

## ⏰ Automatisation (Cron Jobs)

### Jobs Configurés

| Job | Schedule | Fonction | Description |
|-----|----------|----------|-------------|
| `news-aggregation-hourly` | `0 * * * *` | `news-aggregator-master` | Agrège toutes les sources **chaque heure** |
| `news-digest-daily` | `0 8 * * *` | `news-digest-generator` | Génère digest quotidien **à 8h** |
| `news-email-daily` | `15 8 * * *` | `news-email-alerts` | Envoie email quotidien **à 8h15** |
| `news-digest-weekly` | `0 8 * * 1` | `news-digest-generator` | Génère digest hebdo **lundi 8h** |
| `news-email-weekly` | `15 8 * * 1` | `news-email-alerts` | Envoie email hebdo **lundi 8h15** |
| `news-cleanup-monthly` | `0 2 1 * *` | SQL direct | Archive articles > 90 jours **1er du mois 2h** |

**Format Cron**:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Jour de la semaine (0-7, 0=dimanche)
│ │ │ └─── Mois (1-12)
│ │ └───── Jour du mois (1-31)
│ └─────── Heure (0-23)
└───────── Minute (0-59)
```

---

## 🚀 Déploiement des Edge Functions

### Méthode 1: Déploiement Manuel (Recommandé)

Pour chaque fonction, exécutez :

```bash
# 1. RSS Parser
supabase functions deploy rss-parser

# 2. LinkedIn Scraper
supabase functions deploy linkedin-scraper

# 3. Master Aggregator
supabase functions deploy news-aggregator-master

# 4. Digest Generator
supabase functions deploy news-digest-generator

# 5. Email Alerts
supabase functions deploy news-email-alerts
```

### Méthode 2: Déploiement via Dashboard Supabase

1. Allez sur **Supabase Dashboard** > **Edge Functions**
2. Cliquez **New Function**
3. Copiez le code de `supabase/functions/[nom-fonction]/index.ts`
4. Cliquez **Deploy**
5. Répétez pour chaque fonction

---

## 🔧 Configuration Environnement

### Variables Requises

Ajoutez dans **Supabase Dashboard** > **Settings** > **Secrets**:

```bash
# OpenAI (Requis pour synthèse IA)
OPENAI_API_KEY=sk-...

# Pexels (Optionnel, pour images articles)
PEXELS_API_KEY=...

# Resend (Optionnel, pour emails)
RESEND_API_KEY=re_...

# LinkedIn (Optionnel, pour scraping LinkedIn)
LINKEDIN_ACCESS_TOKEN=...
```

### Variables Auto-Configurées

Ces variables sont automatiques dans Supabase :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

---

## 📊 Utilisation Frontend

### Interface NewsManager

Fichier : `src/backoffice/NewsManager.tsx`

**Fonctionnalités**:
- Dashboard avec statistiques
- Liste des actualités récupérées
- Bouton refresh manuel
- Configuration des paramètres
- Activation/désactivation du système

**Appel Manuel**:
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/news-aggregator-master`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({})
  }
);
```

---

## 🧪 Tests du Système

### Test 1: Parser RSS
```bash
curl -X POST https://VOTRE_URL.supabase.co/functions/v1/rss-parser \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://news.google.com/rss/search?q=taxi+france&hl=fr&gl=FR&ceid=FR:fr", "sourceName": "Google News"}'
```

**Résultat attendu**: JSON avec 10-20 actualités parsées

### Test 2: Agrégation Complète
```bash
curl -X POST https://VOTRE_URL.supabase.co/functions/v1/news-aggregator-master \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Résultat attendu**:
- Message de succès
- Nombre d'articles récupérés
- Stats par source

### Test 3: Génération Digest
```bash
curl -X POST https://VOTRE_URL.supabase.co/functions/v1/news-digest-generator \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'
```

**Résultat attendu**:
- Digest HTML généré
- Sauvegarde dans `news_digest`

### Test 4: Envoi Email
```bash
curl -X POST https://VOTRE_URL.supabase.co/functions/v1/news-email-alerts \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'
```

**Résultat attendu**:
- Nombre d'emails envoyés
- Confirmation de marquage "sent_at"

---

## 📈 Monitoring et Maintenance

### Vérifier l'État des Sources

```sql
SELECT
  name,
  enabled,
  last_check,
  last_success,
  error_count,
  EXTRACT(EPOCH FROM (NOW() - last_check)) / 3600 AS hours_since_check
FROM news_sources
ORDER BY priority DESC;
```

### Statistiques Actualités

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as articles_count,
  AVG(score) as avg_score,
  COUNT(*) FILTER (WHERE status = 'ready') as ready_count
FROM news_articles
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Vérifier les Digests

```sql
SELECT
  type,
  title,
  articles_count,
  created_at,
  sent_at,
  CASE
    WHEN sent_at IS NULL THEN 'Non envoyé'
    ELSE 'Envoyé'
  END as status
FROM news_digest
ORDER BY created_at DESC
LIMIT 10;
```

### Logs Edge Functions

Consultez les logs dans **Supabase Dashboard** > **Edge Functions** > **Logs**

---

## 🔒 Sécurité et Bonnes Pratiques

### Row Level Security (RLS)

✅ **Toutes les tables ont RLS activé**

- `news_sources`: Lecture publique (actives), modification authentifiée
- `news_articles`: Lecture publique, modification authentifiée
- `news_digest`: Lecture publique, modification authentifiée
- `cron_jobs_config`: Lecture publique, modification authentifiée

### Rate Limiting

- **RSS sources**: Respect des `check_interval` (1h-6h selon source)
- **Email envoi**: Max 100 emails par batch
- **LinkedIn**: Respect des limites API officielle
- **Error tracking**: `error_count` incrémenté, sources désactivées auto si > 10

### Gestion des Erreurs

- Try/catch sur toutes les opérations externes
- Logging détaillé dans console Edge Functions
- Status 500 avec message explicite en cas d'échec
- Continuation du workflow si une source échoue

---

## 📝 Maintenance Régulière

### Quotidienne
- ✅ Automatique : Agrégation horaire
- ✅ Automatique : Digest + Email à 8h

### Hebdomadaire
- ✅ Automatique : Digest + Email lundi 8h
- ⚠️ Manuel : Vérifier les sources en erreur

### Mensuelle
- ✅ Automatique : Archive articles > 90 jours
- ⚠️ Manuel : Ajouter nouvelles sources si besoin
- ⚠️ Manuel : Réviser mots-clés sources

### Trimestrielle
- ⚠️ Manuel : Audit complet des sources
- ⚠️ Manuel : Optimisation des prompts OpenAI
- ⚠️ Manuel : Révision templates emails

---

## 🎉 Fonctionnalités Avancées

### Scoring Intelligent
- Pondération par mots-clés source
- Bonus termes prioritaires (assurance taxi, RC pro, etc.)
- Prise en compte de la fraîcheur

### Synthèse IA Avancée
- Structuration thématique automatique
- Résumé exécutif actionable
- Ton professionnel adapté au secteur

### Template Email Premium
- Design responsive mobile-first
- Gradients modernes
- Structure claire par sections
- CTA vers site web

---

## 🚦 Prochaines Étapes

### À Faire Immédiatement
1. ✅ Tables créées
2. ✅ Edge Functions développées
3. ⚠️ Déployer les 5 Edge Functions
4. ⚠️ Configurer variables d'environnement
5. ⚠️ Tester chaque fonction individuellement
6. ⚠️ Activer le premier cron job (agrégation)

### Optimisations Futures
- Scraping Légifrance automatisé (actuellement scraping manuel)
- Intégration Twitter/X pour actualités temps réel
- Webhooks pour alertes instantanées (décrets urgents)
- Machine Learning pour améliorer le scoring
- Dashboard analytics avancé
- Export PDF des digests
- Personnalisation par profil utilisateur

---

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs Supabase Edge Functions
2. Consultez la table `news_sources` pour l'état des sources
3. Testez manuellement chaque fonction via API
4. Vérifiez les variables d'environnement

---

**Système créé le**: 27/12/2024
**Version**: 1.0
**Status**: ✅ Prêt à déployer
