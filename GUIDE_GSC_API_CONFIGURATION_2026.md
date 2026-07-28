# Configuration API Google Search Console - Guide Complet 2026

## Problème Actuel

✅ **Système en place** : Tables, fonctions Edge, crons
❌ **Pas de données** : Les secrets Google ne sont pas correctement configurés
📊 **Opportunités manquées** : 42 requêtes détectées dans GSC mais pas dans le système

## Étape 1 : Créer un Service Account Google

### 1.1 Accéder à Google Cloud Console

1. Allez sur https://console.cloud.google.com
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Nom du projet : `taxiassur-gsc-api` (ou autre)

### 1.2 Activer l'API Search Console

1. Menu → **APIs & Services** → **Library**
2. Recherchez : `Google Search Console API`
3. Cliquez sur **Enable** (Activer)

### 1.3 Créer un Service Account

1. Menu → **APIs & Services** → **Credentials**
2. Cliquez **+ CREATE CREDENTIALS** → **Service account**
3. Remplissez :
   ```
   Service account name: taxiassur-gsc-reader
   Service account ID: taxiassur-gsc-reader (auto-généré)
   Description: Lecture des données GSC pour optimisation SEO
   ```
4. Cliquez **CREATE AND CONTINUE**

### 1.4 Télécharger la Clé Privée

1. Dans la liste des Service Accounts, cliquez sur le compte créé
2. Onglet **KEYS** → **ADD KEY** → **Create new key**
3. Choisissez **JSON**
4. Téléchargez le fichier (ex: `taxiassur-gsc-reader-xxxxx.json`)

**IMPORTANT** : Ne partagez JAMAIS ce fichier !

### 1.5 Format du fichier JSON téléchargé

```json
{
  "type": "service_account",
  "project_id": "taxiassur-gsc-api",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----\n",
  "client_email": "taxiassur-gsc-reader@taxiassur-gsc-api.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://..."
}
```

## Étape 2 : Donner l'Accès au Service Account dans GSC

### 2.1 Copier l'Email du Service Account

Dans le fichier JSON téléchargé, copiez la valeur de `client_email` :
```
taxiassur-gsc-reader@taxiassur-gsc-api.iam.gserviceaccount.com
```

### 2.2 Ajouter dans Google Search Console

1. Allez sur https://search.google.com/search-console
2. Sélectionnez la propriété `taxiassur.com`
3. Menu → **Settings** (Paramètres)
4. Section **Users and permissions** (Utilisateurs et autorisations)
5. Cliquez **ADD USER** (Ajouter un utilisateur)
6. Collez l'email du service account
7. Permission : **Full** (Owner n'est pas nécessaire, Restricted est suffisant pour lecture)
8. Cliquez **ADD**

## Étape 3 : Configurer les Secrets Supabase

### 3.1 Extraire les Valeurs du JSON

Du fichier JSON téléchargé, vous avez besoin de :

1. **GOOGLE_SERVICE_ACCOUNT_EMAIL** :
   ```
   taxiassur-gsc-reader@taxiassur-gsc-api.iam.gserviceaccount.com
   ```

2. **GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY** :
   ```
   -----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----
   ```

### 3.2 Mettre à Jour les Secrets

**Option A : Via Supabase Dashboard**

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Menu **Edge Functions** → **Manage secrets**
4. Mettez à jour ou créez :

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=taxiassur-gsc-reader@taxiassur-gsc-api.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----\n"
```

**Option B : Via CLI Supabase**

```bash
# Email
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="taxiassur-gsc-reader@taxiassur-gsc-api.iam.gserviceaccount.com"

# Private Key (avec guillemets et \n préservés)
supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----"
```

**ATTENTION** : La clé privée doit contenir les sauts de ligne `\n` ou être en une seule ligne.

## Étape 4 : Tester la Configuration

### 4.1 Test Manuel via Edge Function

```bash
# Depuis votre terminal
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/gsc-sync-performance \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

**Résultat attendu** :
```json
{
  "success": true,
  "message": "Synchronisation GSC réussie",
  "data": {
    "period": "2026-03-04 → 2026-03-11",
    "queries_imported": 42,
    "pages_imported": 15,
    "opportunities_detected": 12,
    "duration_ms": 2341
  }
}
```

### 4.2 Vérifier les Données dans Supabase

```sql
-- Vérifier les requêtes importées
SELECT
  COUNT(*) as total,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  MAX(date) as last_sync
FROM gsc_queries;

-- Top requêtes avec impressions mais 0 clics
SELECT
  query,
  impressions,
  position,
  ctr
FROM gsc_queries
WHERE clicks = 0
AND impressions >= 10
ORDER BY impressions DESC
LIMIT 20;
```

## Étape 5 : Activer la Synchronisation Automatique

### 5.1 Vérifier le Cron

Le cron doit être déjà configuré dans Supabase :

```sql
-- Vérifier les crons actifs
SELECT * FROM cron.job
WHERE jobname LIKE '%gsc%';
```

### 5.2 Activer le Cron (si nécessaire)

Si le cron n'existe pas, créez-le :

```sql
SELECT cron.schedule(
  'gsc-daily-sync',
  '0 2 * * *', -- Tous les jours à 2h du matin
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/gsc-sync-performance',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{"days": 7}'::jsonb
  ) as request_id;
  $$
);
```

## Étape 6 : Optimisation Automatique du Contenu

Une fois les données synchronisées, le système analyse automatiquement :

### 6.1 Opportunités Détectées

Le système identifie :
- ✅ Requêtes avec **impressions élevées** mais **0 clics**
- ✅ Pages avec **CTR < 5%** et **> 100 impressions**
- ✅ Requêtes bien **positionnées** (top 20) mais ignorées

### 6.2 Actions Automatiques

Pour chaque opportunité détectée :

1. **Analyse sémantique** de la requête
2. **Identification** de la page la mieux adaptée
3. **Suggestion** d'optimisations :
   - Améliorer le titre
   - Optimiser la meta description
   - Enrichir le contenu
   - Ajouter des FAQ

4. **Génération** de contenu optimisé (si AI activée)

### 6.3 Dashboard d'Opportunités

Accéder au dashboard :
```
https://taxiassur.com/admin/seo/opportunities
```

Vous verrez :
- Liste des requêtes à fort potentiel
- Score d'opportunité (0-100)
- Suggestions d'amélioration
- Boutons d'action rapide

## Dépannage

### Erreur : "Invalid JWT signature"

**Cause** : La clé privée n'est pas correctement formatée

**Solution** :
1. Vérifiez que la clé contient `\n` (sauts de ligne)
2. Ou utilisez le format multi-lignes complet
3. Testez avec : `echo $GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY | openssl rsa -check`

### Erreur : "403 Forbidden"

**Cause** : Le service account n'a pas accès à la propriété GSC

**Solution** :
1. Vérifiez que l'email est bien ajouté dans GSC
2. Attendez 5-10 minutes (propagation)
3. Vérifiez l'orthographe exacte de l'email

### Erreur : "401 Unauthorized"

**Cause** : Token d'accès invalide ou expiré

**Solution** :
1. Vérifiez que le Service Account existe toujours
2. Recréez une nouvelle clé JSON
3. Mettez à jour les secrets Supabase

### Pas de données récupérées

**Cause** : GSC a un délai de 1-2 jours pour les données

**Solution** :
1. Testez avec `days: 7` au lieu de `days: 1`
2. Vérifiez que votre site a du trafic dans GSC
3. Attendez 24-48h après ajout du service account

## Monitoring Continu

### Vérifications Hebdomadaires

```sql
-- 1. Vérifier la synchronisation
SELECT * FROM gsc_sync_history
ORDER BY sync_date DESC
LIMIT 7;

-- 2. Top opportunités actuelles
SELECT
  query,
  impressions,
  clicks,
  position,
  opportunity_score
FROM gsc_queries
WHERE opportunity_score > 50
ORDER BY opportunity_score DESC
LIMIT 20;

-- 3. Pages à optimiser en priorité
SELECT
  url,
  impressions,
  ctr,
  optimization_priority
FROM gsc_pages
WHERE needs_optimization = true
ORDER BY optimization_priority DESC
LIMIT 10;
```

## Support

- **Google Cloud Console** : https://console.cloud.google.com
- **Search Console** : https://search.google.com/search-console
- **Supabase Dashboard** : https://app.supabase.com
- **Documentation GSC API** : https://developers.google.com/webmaster-tools/v1/searchanalytics

---

**Après Configuration** : Les données seront synchronisées automatiquement chaque jour et vous recevrez des alertes sur les meilleures opportunités SEO à exploiter !
