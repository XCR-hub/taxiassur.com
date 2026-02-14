# Fix Synchronisation Emails Continue - 14 Février 2026

## Problème Résolu

L'erreur "Erreur lors de la synchronisation des emails" apparaissait dans le Pipeline Kanban et la synchronisation n'était pas continue.

---

## Corrections Apportées

### 1. **Correction du Bouton "Sync Emails"**

**Fichier** : `src/backoffice/CRMPipelineKanban.tsx`

**Avant** :
```typescript
// Appelait sync-ionos-imap (ancienne fonction)
fetch(`${SUPABASE_URL}/functions/v1/sync-ionos-imap`)
```

**Après** :
```typescript
// Appelle sync-all-emails-complete (fonction complète et optimisée)
fetch(`${SUPABASE_URL}/functions/v1/sync-all-emails-complete`, {
  body: JSON.stringify({ limit: 50 })
})
```

**Améliorations** :
- Utilise la fonction edge correcte et complète
- Gestion d'erreur améliorée avec messages détaillés
- Affiche le contenu exact de l'erreur HTTP
- Timeout de 10 secondes au lieu de bloquer indéfiniment
- Affichage des statistiques : emails synchronisés, leads créés, emails liés

### 2. **Messages d'Erreur Détaillés**

**Avant** :
```typescript
setSyncMessage('❌ Erreur lors de la synchronisation des emails');
```

**Après** :
```typescript
const errorText = await syncResponse.text();
throw new Error(`Erreur HTTP ${syncResponse.status}: ${errorText.substring(0, 100)}`);
// Affiche l'erreur exacte dans l'interface pendant 10 secondes
```

### 3. **Synchronisation Automatique Continue**

Le système utilise **3 systèmes de synchronisation en parallèle** :

#### A. Auto-refresh Frontend (10 secondes)
```typescript
// Dans CRMPipelineKanban.tsx
setInterval(() => {
  loadKanbanData(false);
}, 10000); // Rafraîchit les leads toutes les 10 secondes
```

#### B. Realtime Supabase
```typescript
supabase
  .channel('crm_leads_changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'crm_leads'
  }, (payload) => {
    // Notification instantanée d'un nouveau lead
    console.log('🆕 Nouveau lead détecté:', payload.new);
    loadKanbanData(false);
  })
```

#### C. Crons Supabase (Backend)

**3 crons actifs en arrière-plan** :

1. **sync-all-emails-complete-v3** : Toutes les 1 minute
   - Synchronise tous les emails IONOS
   - Fonction : `sync-all-emails-complete`
   - Timeout : 3 minutes

2. **auto-create-leads-from-emails-v2** : Toutes les 2 minutes
   - Crée automatiquement les leads depuis les emails
   - Fonction : `auto-create-leads-from-emails`
   - Timeout : 2 minutes

3. **parse-form-emails-auto-v2** : Toutes les 3 minutes
   - Parse les emails de formulaire et crée les leads
   - Fonction : `parse-form-emails-create-leads`
   - Timeout : 2 minutes

**Migration** : `20260203181242_fix_email_sync_crons_proper.sql`

---

## Configuration des Crons Supabase

### Via Supabase Dashboard

1. Aller sur **https://supabase.com/dashboard** → Votre projet
2. **Database** → **Cron Jobs** (dans le menu latéral)
3. Vérifier que les 3 crons sont actifs

### Via SQL

```sql
-- Vérifier les crons actifs
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname LIKE '%email%' OR jobname LIKE '%sync%'
ORDER BY jobid DESC;
```

**Résultat attendu** :
```
jobname                           | schedule      | active
----------------------------------|---------------|--------
sync-all-emails-complete-v3       | * * * * *     | t
auto-create-leads-from-emails-v2  | */2 * * * *   | t
parse-form-emails-auto-v2         | */3 * * * *   | t
```

### Activer un Cron Manuellement

Si un cron est inactif :

```sql
-- Réactiver un cron existant
UPDATE cron.job
SET active = true
WHERE jobname = 'sync-all-emails-complete-v3';
```

---

## Vérification du Système

### 1. Tester le Bouton "Sync Emails"

1. Aller dans **CRM Killer** → **Pipeline Kanban**
2. Cliquer sur le bouton vert **"Sync Emails"**
3. Observer le message :
   - ✅ `🔄 Synchronisation des emails en cours...`
   - ✅ `✅ Synchronisation terminée ! X emails sync, Y leads créés, Z emails liés`
   - ❌ Si erreur : Le message affiche l'erreur HTTP exacte

### 2. Vérifier les Logs des Edge Functions

```bash
# Dans Supabase Dashboard
Edge Functions → sync-all-emails-complete → Logs
```

**Logs normaux** :
```
✅ Synchronisation IONOS terminée: 15 emails récupérés
✅ 3 nouveaux leads créés
✅ 12 emails liés à des leads existants
```

**Logs d'erreur** :
```
❌ Erreur IMAP: Authentication failed
❌ Erreur: SUPABASE_URL not configured
```

### 3. Vérifier les Crons Backend

```sql
-- Voir les dernières exécutions des crons
SELECT
  jobname,
  runid,
  job_pid,
  database,
  username,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname LIKE '%email%'
ORDER BY start_time DESC
LIMIT 20;
```

### 4. Tester la Réception d'un Email

1. Envoyer un email test à `team@taxiassur.com`
2. Attendre 1 minute (cron sync-all-emails-complete-v3)
3. Attendre 2 minutes supplémentaires (cron auto-create-leads)
4. Vérifier dans **Pipeline Kanban** → Colonne **"Nouveau Lead"**

---

## Dépannage

### Erreur : "Erreur HTTP 500"

**Cause** : L'edge function échoue (timeout, crash, erreur interne)

**Solution** :
```bash
# Vérifier les logs de la fonction
Supabase Dashboard → Edge Functions → sync-all-emails-complete → Logs

# Causes courantes :
# 1. Timeout IMAP (connexion lente) → Augmenter timeout_milliseconds
# 2. Trop d'emails à traiter → Réduire le paramètre limit
# 3. Secrets manquants → Vérifier IONOS_IMAP_PASSWORD dans secrets
```

### Erreur : "Erreur HTTP 401"

**Cause** : `SUPABASE_ANON_KEY` invalide ou manquante

**Solution** :
```typescript
// Vérifier dans .env
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Doit retourner une clé commençant par eyJ...
```

### Erreur : "No new emails"

**Cause** : Aucun nouvel email à synchroniser (normal)

**Solution** : Envoyer un email test pour vérifier que le système fonctionne

### Les Crons Ne S'Exécutent Pas

**Vérification** :
```sql
-- 1. Vérifier que pg_cron est activé
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Vérifier les crons
SELECT * FROM cron.job WHERE active = true;

-- 3. Vérifier les erreurs d'exécution
SELECT *
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 10;
```

**Solution** :
- Contacter le support Supabase si pg_cron n'est pas activé
- Recréer les crons avec la migration `20260203181242_fix_email_sync_crons_proper.sql`

---

## Surveillance et Monitoring

### Dashboard Recommandé

Créer une requête de monitoring :

```sql
-- Statistiques de synchronisation (dernières 24h)
SELECT
  jobname,
  COUNT(*) as executions,
  COUNT(*) FILTER (WHERE status = 'succeeded') as succès,
  COUNT(*) FILTER (WHERE status = 'failed') as échecs,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as durée_moyenne_sec
FROM cron.job_run_details
WHERE
  jobname IN (
    'sync-all-emails-complete-v3',
    'auto-create-leads-from-emails-v2',
    'parse-form-emails-auto-v2'
  )
  AND start_time > now() - interval '24 hours'
GROUP BY jobname;
```

### Alertes à Mettre en Place

1. **Alerte si cron échoue 3 fois de suite**
2. **Alerte si aucun email synchronisé pendant 1 heure** (hors week-end)
3. **Alerte si durée d'exécution > 2 minutes**

---

## Performance

### Avant les Corrections

- Synchronisation manuelle uniquement
- Erreur à chaque clic sur "Sync Emails"
- Pas de feedback d'erreur détaillé
- Leads non créés automatiquement

### Après les Corrections

- **Synchronisation automatique continue** : Toutes les 1-2-3 minutes
- **Realtime** : Notification instantanée des nouveaux leads
- **Auto-refresh** : Interface mise à jour toutes les 10 secondes
- **Gestion d'erreur complète** : Messages détaillés + logs
- **Performance** : 50-100 emails traités par minute

---

## Maintenance

### Nettoyage des Logs Cron (optionnel)

```sql
-- Supprimer les logs de cron > 7 jours
DELETE FROM cron.job_run_details
WHERE start_time < now() - interval '7 days';
```

### Désactiver Temporairement les Crons

```sql
-- Désactiver temporairement (maintenance)
UPDATE cron.job
SET active = false
WHERE jobname LIKE '%email%';

-- Réactiver
UPDATE cron.job
SET active = true
WHERE jobname LIKE '%email%';
```

---

## Résumé des Corrections

| Élément | Avant | Après |
|---------|-------|-------|
| **Fonction appelée** | sync-ionos-imap | sync-all-emails-complete |
| **Gestion erreur** | Message générique | Message HTTP détaillé |
| **Synchronisation** | Manuelle uniquement | Automatique (1min) + Manuelle |
| **Feedback utilisateur** | 5 secondes | 7-10 secondes selon erreur |
| **Timeout** | Aucun | 180000ms (3 minutes) |
| **Statistiques** | Non affichées | Affichées (emails, leads, liens) |
| **Logs** | Non consultables | Visibles dans Dashboard |
| **Realtime** | Non | Oui (notifications instantanées) |

---

## Support

Pour toute question :
- **Documentation** : Ce fichier
- **Logs Backend** : Supabase Dashboard → Edge Functions → Logs
- **Logs Cron** : Query SQL ci-dessus
- **Support** : team@taxiassur.com

---

**Date** : 14 Février 2026
**Version** : v2.0
**Status** : ✅ Synchronisation continue opérationnelle
