# Système de Notification Email pour Documents Uploadés

## 🎯 Objectif
Envoyer automatiquement un email à `team@taxiassur.com` quand un prospect uploade un document via l'espace prospect.

## ⚙️ Fonctionnement

### 1. Quand un document est uploadé

```typescript
// Frontend appelle la fonction RPC
const { data, error } = await supabase.rpc('upload_prospect_document_by_token', {
  p_token: accessToken,
  p_document_type: 'licence_taxi',
  p_file_name: 'licence.pdf',
  p_file_path: 'bucket/path/licence.pdf',
  p_file_size: 123456
});
```

### 2. La fonction crée une notification

La fonction `upload_prospect_document_by_token()` :
1. ✅ Insère le document dans `prospect_documents`
2. ✅ Met à jour la checklist dans `crm_leads`
3. ✅ Crée une notification dans `crm_event_notifications` :
   - `event_type` = 'document_uploaded'
   - `is_read` = false
   - `email_sent_at` = NULL

### 3. Le cron job traite la notification

**Cron job** : `process-document-notifications`
**Fréquence** : Toutes les minutes
**Fonction** : `process_pending_document_notifications()`

```sql
SELECT cron.schedule(
  'process-document-notifications',
  '* * * * *',  -- Toutes les minutes
  $$SELECT process_pending_document_notifications();$$
);
```

Le cron :
1. 🔍 Récupère les notifications avec `email_sent_at IS NULL`
2. 📤 Appelle l'edge function `send-document-notification` via `net.http_post()`
3. ✅ Marque la notification comme traitée (`email_sent_at = NOW()`)

### 4. L'edge function envoie l'email

**Edge Function** : `send-document-notification`
**Méthode** : SMTP via IONOS (`smtp.ionos.fr:465`)

L'email est envoyé à :
- **Destinataire** : team@taxiassur.com
- **Expéditeur** : team@taxiassur.com
- **Sujet** : "📄 Nouveau document : [TYPE] - [NOM PROSPECT]"

## 📊 Tables impliquées

### `crm_event_notifications`
```sql
CREATE TABLE crm_event_notifications (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES crm_leads(id),
  event_type text,              -- 'document_uploaded'
  message text,
  priority int,
  context_data jsonb,           -- Infos du document
  is_read boolean DEFAULT false,
  email_sent_at timestamptz,    -- NULL = pas encore envoyé
  email_attempts int DEFAULT 0,
  created_at timestamptz DEFAULT NOW()
);
```

### `prospect_documents`
```sql
CREATE TABLE prospect_documents (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES crm_leads(id),
  document_type text,
  file_name text,
  file_path text,
  file_size bigint,
  status text DEFAULT 'uploaded',
  created_at timestamptz DEFAULT NOW()
);
```

## 🔧 Fonctions principales

### `upload_prospect_document_by_token()`
Upload un document et crée la notification

```sql
SELECT upload_prospect_document_by_token(
  'token-access',
  'licence_taxi',
  'licence.pdf',
  'prospect-documents/abc123/licence.pdf',
  123456
);
```

### `process_pending_document_notifications()`
Traite les notifications en attente

```sql
-- Exécution manuelle pour test
SELECT process_pending_document_notifications();

-- Résultat
{
  "success": true,
  "queued": 2,
  "timestamp": "2026-01-27T14:28:17.537227+00:00"
}
```

## 📝 Vérifications

### Vérifier les notifications en attente
```sql
SELECT
  id,
  lead_id,
  message,
  email_sent_at,
  email_attempts,
  created_at
FROM crm_event_notifications
WHERE event_type = 'document_uploaded'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Vérifier les logs d'envoi HTTP
```sql
SELECT
  id,
  status_code,
  error_msg,
  created
FROM net._http_response
WHERE created > NOW() - INTERVAL '10 minutes'
ORDER BY created DESC
LIMIT 10;
```

### Forcer le traitement immédiat
```sql
-- Réinitialiser une notification pour retraitement
UPDATE crm_event_notifications
SET
  email_sent_at = NULL,
  email_attempts = 0,
  is_read = false
WHERE id = 'notification-id';

-- Lancer le traitement
SELECT process_pending_document_notifications();
```

## ⚠️ Notes importantes

### Timeouts
- Les requêtes HTTP via `pg_net` timeout après 5 secondes par défaut
- L'envoi SMTP prend 10-30 secondes
- **L'edge function continue de s'exécuter après le timeout**
- Les emails sont quand même envoyés, mais pg_net rapporte un timeout

### Retry automatique
- Max 5 tentatives par notification
- Si `email_attempts >= 5`, la notification n'est plus traitée
- Les notifications de plus de 48h ne sont plus traitées

### Mode "Fire & Forget"
Le système utilise un mode asynchrone :
1. Le cron marque la notification comme traitée immédiatement
2. L'edge function s'exécute en arrière-plan
3. L'email est envoyé (même si pg_net timeout)

## 🔍 Debugging

### Pas d'email reçu ?

1. **Vérifier que la notification a été créée**
```sql
SELECT * FROM crm_event_notifications
WHERE lead_id = 'lead-id'
AND event_type = 'document_uploaded'
ORDER BY created_at DESC LIMIT 1;
```

2. **Vérifier que le cron fonctionne**
```sql
SELECT * FROM cron.job WHERE jobname = 'process-document-notifications';
```

3. **Forcer le traitement**
```sql
SELECT process_pending_document_notifications();
```

4. **Vérifier les logs de l'edge function**
Aller dans le dashboard Supabase > Edge Functions > Logs

5. **Tester l'edge function directement**
```bash
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-document-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "lead-id",
    "context_data": {
      "document_type": "licence_taxi",
      "file_name": "test.pdf",
      "prospect_name": "Test User",
      "prospect_email": "test@example.com"
    }
  }'
```

## ✅ Système opérationnel

Le système est maintenant en place et fonctionnel :

- ✅ Cron job actif (toutes les minutes)
- ✅ Edge function déployée
- ✅ Tables et fonctions créées
- ✅ SMTP IONOS configuré
- ✅ Mode fire-and-forget (pas de blocage)

**Les emails de notification sont envoyés automatiquement dans la minute suivant l'upload d'un document.**

---

*Dernière mise à jour : 27 janvier 2026*
