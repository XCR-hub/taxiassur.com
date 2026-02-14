# Fix Doublons Leads - 14 Février 2026

## Problème Résolu

Plusieurs leads avec le même email (ex: Tony CERDA avec `tcerda@cc.fr`) apparaissaient en doublon dans le Pipeline Kanban.

**Capture d'écran du problème** : 4+ entrées "Tony CERDA" visibles dans les colonnes "Nouveau Lead" et "Collecte Documents".

---

## Cause du Problème

Les deux fonctions Edge qui créent automatiquement des leads depuis les emails n'utilisaient **PAS** la fonction `upsert_lead()` qui évite les doublons :

1. **`auto-create-leads-from-emails`** : Créait un nouveau lead à chaque email reçu sans vérifier les doublons
2. **`parse-form-emails-create-leads`** : Créait un nouveau lead depuis les formulaires sans utiliser l'upsert

Résultat : À chaque synchronisation d'emails (toutes les 1-2 minutes), un nouveau lead était créé pour le même email.

---

## Solutions Appliquées

### 1. Migration de Fusion des Doublons Existants

**Fichier** : `supabase/migrations/merge_existing_duplicate_leads_2026.sql`

Cette migration :
- Exécute `auto_merge_all_duplicates()` pour fusionner tous les doublons actuels
- Garde le lead avec le plus d'informations remplies (master)
- Consolide tous les documents, interactions, devis, contrats, paiements
- Archive les leads dupliqués (ne les supprime pas)
- Log complet dans `lead_merge_log`

**Résultat** : Tous les Tony CERDA dupliqués ont été fusionnés en un seul lead.

### 2. Modification de `auto-create-leads-from-emails`

**Avant** :
```typescript
// Vérifiait si le lead existe
const { data: existingLead } = await supabase
  .from('crm_leads')
  .select('id')
  .eq('email', email.from_email)
  .maybeSingle();

if (existingLead) {
  leadId = existingLead.id;
  linked++;
} else {
  // Créait un nouveau lead avec INSERT
  const { data: newLead } = await supabase
    .from('crm_leads')
    .insert({ ... })
    .select()
    .single();
}
```

**Après** :
```typescript
// Utilise upsert_lead() qui gère automatiquement les doublons
const { data: upsertResult } = await supabase
  .rpc('upsert_lead', {
    p_email: email.from_email,
    p_first_name: firstName || 'Prospect',
    p_last_name: lastName || 'Email',
    p_phone: phone || '0000000000',
    p_city: null,
    p_source: 'email_inbound',
    p_metadata: { ... }
  });

const leadId = upsertResult[0].lead_id;
const isNew = upsertResult[0].is_new;

if (isNew) {
  created++;
  // Notification seulement pour nouveaux leads
} else {
  linked++;
}
```

**Avantages** :
- Garantit l'unicité des emails (contrainte unique sur `LOWER(email)`)
- Met à jour le lead existant si l'email existe déjà
- Régénère le token d'accès à chaque upsert
- Réactive les leads perdus/archivés si un nouvel email arrive

### 3. Modification de `parse-form-emails-create-leads`

**Avant** :
```typescript
const { data: existingLead } = await supabase
  .from('crm_leads')
  .select('id')
  .eq('email', parsedLead.email)
  .maybeSingle();

if (existingLead) {
  skipped++;
  continue;
}

// Créait un nouveau lead
const { data: newLead } = await supabase
  .from('crm_leads')
  .insert({ ... })
  .select('id')
  .single();
```

**Après** :
```typescript
const { data: upsertResult } = await supabase
  .rpc('upsert_lead', {
    p_email: parsedLead.email,
    p_first_name: parsedLead.first_name,
    p_last_name: parsedLead.last_name,
    p_phone: parsedLead.phone || '0000000000',
    p_city: parsedLead.city,
    p_source: 'website',
    p_metadata: { ... }
  });

const leadId = upsertResult[0].lead_id;
const isNew = upsertResult[0].is_new;
```

### 4. Déploiement des Edge Functions

Les deux edge functions ont été redéployées avec succès :
- `auto-create-leads-from-emails` : ✅ Deployed
- `parse-form-emails-create-leads` : ✅ Deployed

---

## Système de Protection Anti-Doublons

### A. Contrainte UNIQUE sur l'Email

**Migration** : `20260214114845_add_unique_email_correct_columns_2026.sql`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_email_unique_active
ON crm_leads (LOWER(email))
WHERE deleted_at IS NULL;
```

Cette contrainte **empêche** la création de doublons au niveau base de données.

### B. Fonction `upsert_lead()`

**Migration** : `20260214114845_add_unique_email_correct_columns_2026.sql`

Cette fonction :
1. Normalise l'email en lowercase
2. Cherche si un lead existe déjà avec cet email
3. Si OUI : Met à jour le lead existant (prénom, nom, téléphone, ville, metadata)
4. Si NON : Crée un nouveau lead
5. Retourne : `lead_id`, `access_token`, `is_new`

**Signature** :
```sql
upsert_lead(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_city text,
  p_source text DEFAULT 'website',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
```

### C. Système de Fusion des Doublons

**Migration** : `20260214121221_create_lead_deduplication_system_2026.sql`

Fonctions disponibles :
- `find_duplicate_leads()` : Trouve tous les emails avec plusieurs leads
- `merge_two_leads(lead1_id, lead2_id)` : Fusionne 2 leads intelligemment
- `merge_all_duplicates_for_email(email)` : Fusionne tous les doublons d'un email
- `auto_merge_all_duplicates()` : Fusionne automatiquement TOUS les doublons

**Table de log** : `lead_merge_log`
- Historique complet de toutes les fusions
- Données du lead fusionné sauvegardées en JSON
- Audit trail : qui, quand, combien de documents/interactions déplacés

---

## Vérification du Système

### 1. Vérifier les Doublons Restants

```sql
-- Trouver les emails avec plusieurs leads actifs
SELECT * FROM find_duplicate_leads();

-- Résultat attendu : 0 ligne (plus de doublons)
```

### 2. Tester la Création de Lead

```sql
-- Test 1 : Créer un nouveau lead
SELECT * FROM upsert_lead(
  'test@example.com',
  'Jean',
  'Dupont',
  '0123456789',
  'Paris',
  'test',
  '{"test": true}'::jsonb
);

-- Résultat : is_new = true, lead_id = [UUID], access_token = [TOKEN]

-- Test 2 : Essayer de créer le même lead
SELECT * FROM upsert_lead(
  'test@example.com',
  'Jean Updated',
  'Dupont Updated',
  '0987654321',
  'Lyon',
  'test',
  '{"updated": true}'::jsonb
);

-- Résultat : is_new = false, lead_id = [SAME UUID], access_token = [NEW TOKEN]
-- ✅ Le lead a été mis à jour, pas de doublon créé
```

### 3. Simuler un Email Entrant

1. Envoyer un email à `team@taxiassur.com`
2. Attendre 1 minute (cron sync)
3. Attendre 2 minutes (cron auto-create)
4. Vérifier dans le Pipeline Kanban → "Nouveau Lead"
5. Envoyer un 2ème email avec le MÊME expéditeur
6. Vérifier qu'aucun doublon n'est créé

### 4. Logs des Edge Functions

```bash
# Supabase Dashboard → Edge Functions → auto-create-leads-from-emails → Logs
```

**Logs attendus** :
```
🔄 Upsert lead: Tony CERDA (tcerda@cc.fr)
✅ Lead existant mis à jour pour tcerda@cc.fr: [UUID]
🔗 Email [EMAIL_ID] lié au lead [LEAD_ID]
```

**Pas de log** :
```
❌ duplicate key value violates unique constraint
❌ Erreur création lead pour tcerda@cc.fr
```

---

## Monitoring

### 1. Compter les Leads par Email

```sql
SELECT
  email,
  COUNT(*) as count,
  array_agg(id) as lead_ids
FROM crm_leads
WHERE status != 'archived'
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Résultat attendu : 0 ligne
```

### 2. Historique des Fusions

```sql
SELECT
  master_lead_id,
  merged_lead_ids,
  documents_count,
  interactions_count,
  merged_at
FROM lead_merge_log
ORDER BY merged_at DESC
LIMIT 10;
```

### 3. Statistiques Globales

```sql
SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE status = 'archived') as archived,
  COUNT(*) FILTER (WHERE status != 'archived') as active,
  COUNT(DISTINCT email) as unique_emails
FROM crm_leads;
```

---

## Dépannage

### Erreur : "duplicate key value violates unique constraint"

**Cause** : Un doublon essaie de se créer malgré la contrainte unique.

**Solution** :
```sql
-- Trouver les doublons
SELECT * FROM find_duplicate_leads();

-- Fusionner manuellement
SELECT merge_all_duplicates_for_email('email@example.com');
```

### Erreur : "function upsert_lead does not exist"

**Cause** : La migration `20260214114845_add_unique_email_correct_columns_2026.sql` n'a pas été appliquée.

**Solution** :
```bash
# Vérifier les migrations appliquées
SELECT * FROM supabase_migrations.schema_migrations
WHERE version LIKE '%20260214114845%';

# Si absent, réappliquer la migration
```

### Les Doublons Réapparaissent

**Cause** : Les edge functions utilisent encore l'ancien système `INSERT` au lieu de `upsert_lead()`.

**Solution** :
```bash
# Vérifier les logs des edge functions
Supabase Dashboard → Edge Functions → Logs

# Redéployer les fonctions
supabase functions deploy auto-create-leads-from-emails
supabase functions deploy parse-form-emails-create-leads
```

---

## Résumé des Corrections

| Élément | Avant | Après |
|---------|-------|-------|
| **Détection doublon** | Vérification manuelle `SELECT` | Contrainte UNIQUE + upsert_lead() |
| **Création lead** | INSERT (peut créer des doublons) | upsert_lead() (évite les doublons) |
| **Mise à jour lead** | Ignoré si existe | Met à jour automatiquement |
| **Doublons existants** | Manuels à fusionner | Fusionnés automatiquement par migration |
| **Logs fusion** | Aucun | Table lead_merge_log avec audit complet |
| **Risque doublon** | Élevé | Quasi nul (contrainte DB) |

---

## Performance

### Avant les Corrections

- 4+ leads "Tony CERDA" avec le même email
- Nouveaux doublons créés toutes les 1-2 minutes
- Base de données polluée avec des leads dupliqués
- Confusion dans le Pipeline Kanban

### Après les Corrections

- 1 seul lead "Tony CERDA" par email
- Mise à jour automatique des leads existants
- Aucun nouveau doublon créé
- Pipeline Kanban propre et clair
- Historique complet des fusions dans `lead_merge_log`

---

## Prochaines Étapes (Optionnel)

### 1. Surveillance Automatique

Créer un cron qui vérifie les doublons toutes les heures :

```sql
SELECT cron.schedule(
  'check-duplicates-hourly',
  '0 * * * *',
  $$
  DO $$
  DECLARE
    v_duplicates integer;
  BEGIN
    SELECT COUNT(*) INTO v_duplicates
    FROM (
      SELECT email FROM crm_leads
      WHERE status != 'archived'
      GROUP BY email HAVING COUNT(*) > 1
    ) dups;

    IF v_duplicates > 0 THEN
      RAISE WARNING 'ALERTE: % emails avec des doublons détectés!', v_duplicates;
    END IF;
  END $$;
  $$
);
```

### 2. Fusion Automatique Quotidienne

```sql
SELECT cron.schedule(
  'auto-merge-duplicates-daily',
  '0 3 * * *', -- Tous les jours à 3h du matin
  $$SELECT auto_merge_all_duplicates();$$
);
```

### 3. Dashboard de Monitoring

Créer une vue pour le dashboard admin :

```sql
CREATE OR REPLACE VIEW admin_leads_quality AS
SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE status = 'archived') as archived,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(*) - COUNT(DISTINCT email) as potential_duplicates,
  (SELECT COUNT(*) FROM lead_merge_log WHERE merged_at > now() - interval '7 days') as merges_last_7_days
FROM crm_leads;
```

---

## Support

Pour toute question :
- **Documentation** : Ce fichier
- **Logs Backend** : Supabase Dashboard → Edge Functions → Logs
- **Logs Fusion** : `SELECT * FROM lead_merge_log ORDER BY merged_at DESC LIMIT 20;`
- **Support** : team@taxiassur.com

---

**Date** : 14 Février 2026
**Version** : v1.0
**Status** : ✅ Doublons éliminés, système anti-doublon opérationnel
