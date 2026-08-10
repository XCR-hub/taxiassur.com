# 🚨 CONFIGURATION EMAILS URGENTE - 24 FÉVRIER 2026

## PROBLÈME
Les emails ne sont pas envoyés car les secrets IONOS ne sont pas configurés dans Supabase.

## SOLUTION EN 3 ÉTAPES

### ÉTAPE 1 : Configurer les secrets IONOS (5 minutes)

**URL Dashboard Supabase :**
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/vault

1. Connectez-vous au dashboard Supabase
2. Allez dans **Settings** > **Vault** (ou Edge Functions > Secrets)
3. Cliquez sur **"New Secret"**
4. Ajoutez ces 4 secrets :

```
IONOS_EMAIL_USER=team@taxiassur.com
IONOS_EMAIL_PASSWORD=REDACTED,
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=465
```

**⚠️ IMPORTANT : Utilisez le port 465 (TLS direct), pas 587 !**

### ÉTAPE 2 : Vérifier que l'Edge Function est déployée

**URL Edge Functions :**
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/functions

1. Cherchez la function `send-email-ionos`
2. Si elle n'existe pas ou n'est pas déployée, suivez l'étape 3

### ÉTAPE 3 : Redéployer l'Edge Function (si nécessaire)

**Via Supabase CLI (si installé) :**
```bash
supabase functions deploy send-email-ionos
```

**OU via le Dashboard :**
1. Allez dans Functions
2. Cliquez sur "Deploy new function"
3. Uploadez le fichier `/supabase/functions/send-email-ionos/index.ts`

---

## VÉRIFICATION

### Test 1 : Vérifier la queue d'emails

```sql
-- Voir les emails en attente
SELECT * FROM email_queue
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

### Test 2 : Vérifier les emails envoyés

```sql
-- Voir les emails envoyés récemment
SELECT * FROM email_queue
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;
```

### Test 3 : Vérifier les erreurs

```sql
-- Voir les emails en erreur
SELECT id, to_email, subject, error_message, retry_count
FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## SYSTÈME ACTUEL

### Comment ça fonctionne

1. **Formulaire soumis** → Lead créé dans `crm_leads`
2. **Trigger SQL** → Ajoute 2 emails dans `email_queue`
   - Email pour team@taxiassur.com (notification)
   - Email pour le prospect (confirmation)
3. **Cron (toutes les minutes)** → Fonction `process_email_queue_simple()`
4. **Edge Function** → `send-email-ionos` envoie via IONOS SMTP

### Fichiers concernés

- **Trigger** : `/supabase/migrations/20260224005120_fix_email_queue_add_lead_id_24fev2026.sql`
- **Cron** : `/supabase/migrations/20260224005222_create_email_queue_processor_24fev2026.sql`
- **Edge Function** : `/supabase/functions/send-email-ionos/index.ts`

---

## DÉPANNAGE

### Problème : Les emails ne partent toujours pas

1. **Vérifier les secrets :**
   ```sql
   -- Lancer manuellement le processeur de queue
   SELECT process_email_queue_simple(5);
   ```

2. **Vérifier les logs de l'Edge Function :**
   - Allez dans Functions > send-email-ionos > Logs
   - Cherchez les erreurs

3. **Tester l'envoi direct :**
   ```bash
   curl -X POST 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos' \
     -H "Authorization: Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "team@taxiassur.com",
       "toName": "Test",
       "subject": "Test IONOS SMTP",
       "htmlBody": "<h1>Test email via IONOS SMTP</h1>"
     }'
   ```

---

## CONTACT EN CAS DE PROBLÈME

Si les emails ne fonctionnent toujours pas après ces étapes :

1. Vérifiez que le mot de passe IONOS est correct : `TAXIassur!,`
2. Vérifiez que le port SMTP est bien 587 (TLS/STARTTLS)
3. Contactez le support IONOS pour vérifier que SMTP est activé sur votre compte

---

✅ **Une fois les secrets configurés, les emails partiront automatiquement !**

Le cron tourne toutes les minutes, donc les emails en attente seront envoyés dès que les secrets seront configurés.
