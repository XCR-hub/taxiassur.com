# 🧪 GUIDE COMPLET - TEST DES AUTOMATISATIONS

## 🎯 3 MÉTHODES POUR TESTER

### ⚡ MÉTHODE 1 : BACKOFFICE TAXIASSUR (RECOMMANDÉ - IMMÉDIAT)

**Le plus simple et rapide !**

#### Accès
1. Connectez-vous au backoffice : `https://taxiassur.fr/backoffice`
2. Mot de passe admin : `TaxiAssur2025!,&`
3. Cliquez sur le bouton **"Test Automatisations"** (jaune, icône ⚡)

#### Interface
Vous verrez **10 automatisations testables** organisées par catégorie :

**📰 Actualités (5 tests)**
- ✅ **RSS Parser** : Parse flux RSS Google News
- ✅ **LinkedIn Scraper** : Récupère actualités LinkedIn
- ✅ **Agrégateur Master** : Agrège toutes les 8 sources
- ✅ **Générateur Digest** : Crée synthèse IA quotidienne
- ✅ **Alertes Email** : Envoie digest par email

**🔍 SEO (1 test)**
- ✅ **Générateur SEO** : Génère contenu SEO optimisé

**🔗 Backlinks (2 tests)**
- ✅ **Scanner Backlinks** : Scan opportunités backlinks
- ✅ **Outreach Automatique** : Envoi emails prospection

**👥 Leads (1 test)**
- ✅ **Auto Follow-up** : Relances automatiques

**📱 Social (1 test)**
- ✅ **Publication Social Media** : Publie sur réseaux sociaux

#### Comment utiliser

**Test individuel** :
1. Cliquez sur le bouton **"Tester"** à droite de l'automatisation
2. Attendez la réponse (5-30 secondes selon la fonction)
3. Voyez le résultat : ✅ Succès ou ❌ Erreur
4. Cliquez sur "Voir détails" pour voir les données complètes

**Test global** :
1. Cliquez sur **"Tester Tout"** en haut à droite
2. Toutes les automatisations seront testées séquentiellement
3. Un résumé s'affiche : taux de réussite, nombre de succès/échecs
4. Barre de progression visuelle

**Résultat attendu** : 7-8/10 tests réussis (88-100%)

---

### 🖥️ MÉTHODE 2 : DASHBOARD SUPABASE

**Pour voir les logs en temps réel**

#### Accès
1. Allez sur https://supabase.com/dashboard
2. Projet : `drohhxrkoequjphvabvq`
3. Menu : **Edge Functions**

#### Tester manuellement une fonction

1. Cliquez sur une fonction (ex: `rss-parser`)
2. Onglet **"Invoke"**
3. Méthode : `POST`
4. Body (exemple) :
```json
{
  "url": "https://news.google.com/rss/search?q=taxi+france&hl=fr",
  "sourceName": "Google News Test"
}
```
5. Cliquez **"Invoke Function"**
6. Résultat s'affiche en bas

#### Voir les logs en temps réel

1. Menu : **Edge Functions**
2. Sélectionnez une fonction
3. Onglet **"Logs"**
4. Les logs s'affichent en temps réel
5. Filtrez par niveau : INFO, ERROR, DEBUG

#### Vérifier les cron jobs

1. Menu : **Database** → **Tables**
2. Table : `cron_jobs_config`
3. Vous voyez les 6 jobs configurés
4. Colonnes importantes :
   - `enabled` : true/false
   - `schedule` : format cron
   - `last_run` : dernière exécution
   - `last_status` : statut dernier run

---

### 💻 MÉTHODE 3 : LIGNE DE COMMANDE (TECHNIQUE)

**Pour les développeurs**

#### Script de test automatisé

```bash
npm run build
node scripts/test-complete-system.js
```

**Ce qu'il fait** :
- ✅ Vérifie la base de données (7 tables)
- ✅ Compte les enregistrements
- ✅ Vérifie les cron jobs (6 configurés)
- ✅ Liste les sources d'actualités (8 actives)
- ✅ Teste 8 Edge Functions critiques
- ✅ Génère un rapport détaillé

**Durée** : ~60 secondes

**Résultat** :
```
✅ Tests réussis: 7/8
❌ Tests échoués: 1/8
📈 Taux de réussite: 88%
```

#### Test manuel d'une fonction via curl

```bash
# Test RSS Parser
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/rss-parser \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.google.com/rss/search?q=taxi+france&hl=fr",
    "sourceName": "Google News"
  }'

# Test Agrégateur Master
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/news-aggregator-master \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test Générateur Digest
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/news-digest-generator \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'
```

---

## 📊 QUE VÉRIFIER DANS CHAQUE TEST ?

### RSS Parser
**✅ Succès si** :
- `success: true`
- `items: [...]` (array avec 10-20 articles)
- `count: 15` (nombre d'articles parsés)

**Données retournées** :
```json
{
  "success": true,
  "items": [
    {
      "id": "google-news-1234567890",
      "title": "Nouvelle réglementation taxi...",
      "description": "Les taxis devront...",
      "link": "https://...",
      "pubDate": "2024-12-28T10:00:00Z",
      "source": "Google News",
      "category": "Actualité"
    }
  ],
  "count": 15
}
```

### LinkedIn Scraper
**✅ Succès si** :
- `success: true`
- `posts: [...]` (3 posts minimum en mode mock)
- `count: 3`
- `message: "3 posts LinkedIn récupérés"`

### News Aggregator Master
**✅ Succès si** :
- `success: true`
- `newArticles: 5-15` (nombre d'articles ajoutés)
- `sourcesChecked: 8`
- `errors: 0` ou faible

**Données importantes** :
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

### News Digest Generator
**✅ Succès si** :
- `success: true`
- `digest: {...}` (objet avec title, content, summary)
- `articles_count: 5-10`

### Generate SEO Content
**✅ Succès si** :
- `success: true`
- Contenu généré avec prompt anti-détection IA
- Image Pexels récupérée (si API key configurée)

### Auto Follow-up
**✅ Succès si** :
- `success: true`
- `followupsSent: 0-5` (dépend du nombre de leads à relancer)

---

## ⏰ TESTER LES CRON JOBS AUTOMATIQUES

Les cron jobs **s'exécutent automatiquement** selon leur planning.

### Vérifier qu'ils tournent

**Méthode 1 : Base de données**
```sql
SELECT
  job_name,
  schedule,
  enabled,
  last_run,
  last_status
FROM cron_jobs_config
ORDER BY last_run DESC;
```

**Méthode 2 : Supabase Dashboard**
1. Database → Tables → `cron_jobs_config`
2. Regardez la colonne `last_run`
3. Si NULL : pas encore exécuté
4. Si date récente : fonctionne ✅

### Planning des crons

| Job | Quand | Prochaine exécution |
|-----|-------|---------------------|
| `news-aggregation-hourly` | Toutes les heures (`0 * * * *`) | Prochaine heure pile |
| `news-digest-daily` | 8h du matin (`0 8 * * *`) | Demain 8h |
| `news-email-daily` | 8h15 du matin (`15 8 * * *`) | Demain 8h15 |
| `news-digest-weekly` | Lundi 8h (`0 8 * * 1`) | Lundi prochain 8h |
| `news-email-weekly` | Lundi 8h15 (`15 8 * * 1`) | Lundi prochain 8h15 |
| `news-cleanup-monthly` | 1er du mois 2h (`0 2 1 * *`) | 1er janvier 2h |

### Forcer l'exécution immédiate

**⚠️ Les crons Supabase ne peuvent pas être déclenchés manuellement**

**Solution** : Utilisez le backoffice TaxiAssur pour tester manuellement les fonctions sans attendre le cron.

---

## 📈 VÉRIFIER LES RÉSULTATS

### 1. Actualités agrégées

**Base de données** :
```sql
SELECT
  title,
  source,
  score,
  status,
  created_at
FROM news_articles
ORDER BY created_at DESC
LIMIT 20;
```

**Attendu** :
- 18 articles actuellement
- Nouveaux articles après test agrégation
- Scores entre 30 et 100

### 2. Digests générés

```sql
SELECT
  type,
  title,
  articles_count,
  created_at,
  sent_at
FROM news_digest
ORDER BY created_at DESC;
```

**Attendu** :
- Nouveau digest après test
- `type: 'daily'` ou `'weekly'`
- `articles_count: 5-10`

### 3. Sources vérifiées

```sql
SELECT
  name,
  last_check,
  last_success,
  error_count
FROM news_sources
WHERE enabled = true
ORDER BY priority DESC;
```

**Attendu** :
- `last_check` mis à jour après agrégation
- `error_count = 0` ou faible

---

## 🐛 RÉSOUDRE LES ERREURS

### Erreur : "Authorization required"
**Cause** : Token invalide ou expiré
**Solution** :
- Reconnectez-vous au backoffice
- Ou utilisez le service_role_key pour tests CLI

### Erreur : "Function timeout"
**Cause** : Fonction trop lente (>30s)
**Solution** :
- Normal pour agrégation complète
- Attendez ou testez fonction par fonction

### Erreur : "OPENAI_API_KEY not configured"
**Cause** : Variable d'environnement manquante
**Solution** :
- Mode mock activé automatiquement
- Pour synthèse IA complète : configurez la clé dans Supabase

### Erreur : "No articles found"
**Cause** : Aucun article ne correspond aux critères
**Solution** :
- Normal si tous les articles récents déjà traités
- Attendez quelques heures ou ajustez les mots-clés

### Erreur : "network_ids required" (Social Media)
**Cause** : Paramètres manquants
**Solution** :
- Utilisez le payload correct :
```json
{
  "platform": "linkedin",
  "content": "Votre contenu",
  "network_ids": ["test_id"]
}
```

---

## ✅ CHECKLIST DE VALIDATION

### Tests Basiques
- [ ] RSS Parser fonctionne (Google News)
- [ ] LinkedIn Scraper retourne 3 posts mock
- [ ] Agrégateur Master traite les 8 sources
- [ ] Base de données contient les données
- [ ] Cron jobs sont configurés (6)

### Tests Avancés
- [ ] Digest quotidien se génère
- [ ] Contenu IA utilise prompts anti-détection
- [ ] Emails de digest s'envoient (si Resend configuré)
- [ ] Scanner backlinks trouve opportunités
- [ ] Follow-ups automatiques fonctionnent

### Monitoring Continu
- [ ] Vérifier logs Supabase quotidiennement
- [ ] Surveiller erreurs dans `news_sources`
- [ ] Valider qualité des articles agrégés
- [ ] Tester détecteurs IA sur contenu généré

---

## 🎯 RÉSULTATS ATTENDUS

### Immédiat (Tests manuels)
- ✅ 7-8/10 fonctions testées avec succès
- ✅ Articles parsés depuis RSS
- ✅ Sources LinkedIn scrapées (mode mock)
- ✅ Base données mise à jour

### Court terme (24h)
- ✅ Première agrégation automatique (1h)
- ✅ Premier digest quotidien (demain 8h)
- ✅ Premier email envoyé (demain 8h15)
- ✅ 10-20 nouveaux articles agrégés

### Moyen terme (1 semaine)
- ✅ 7 digests quotidiens générés
- ✅ 1 digest hebdomadaire (lundi)
- ✅ 100-150 articles agrégés
- ✅ Sources fonctionnant sans erreur

---

## 📞 SUPPORT

### Problème avec le backoffice
→ Vérifiez connexion : `/backoffice` avec mot de passe admin

### Problème avec les Edge Functions
→ Supabase Dashboard > Edge Functions > Logs

### Problème avec les cron jobs
→ Database > `cron_jobs_config` > vérifier `enabled = true`

### Besoin d'aide
→ Consultez les logs détaillés dans Supabase
→ Relancez le script de test complet

---

**Document créé le** : 28 Décembre 2024
**Version** : 1.0
**Statut** : ✅ Prêt à utiliser
