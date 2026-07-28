# FIX EMAILS URGENTS - 25 FÉVRIER 2026

## PROBLÈME: Les emails ne partent PAS

Les emails sont créés dans la base mais ne sont JAMAIS envoyés car **les secrets IONOS manquent dans Supabase**.

## SOLUTION EN 3 ÉTAPES

### 1️⃣ Configurer les secrets Supabase (5 minutes)

```bash
cd /tmp/cc-agent/61788020/project

# Configurer TOUS les secrets IONOS en UNE commande
supabase secrets set \
  IONOS_SMTP_HOST=smtp.ionos.fr \
  IONOS_SMTP_PORT=465 \
  IONOS_EMAIL_USER=team@taxiassur.com \
  IONOS_EMAIL_PASSWORD=REDACTED

# Vérifier
supabase secrets list
```

### 2️⃣ Redéployer la fonction email

```bash
supabase functions deploy send-email-ionos
supabase functions deploy process-lead-queue
```

### 3️⃣ Renvoyer les emails manquants

```sql
-- Réessayer d'envoyer les emails du lead BAGELSTEIN
UPDATE email_queue
SET status = 'pending', sent_at = NULL, retry_count = 0
WHERE lead_id = '58eb10c8-a51f-4ab6-b245-602fc908f5af';
```

Le cron va les envoyer dans 60 secondes max.

## CHANGER L'ADRESSE EMAIL (optionnel)

Si team@taxiassur.com n'existe pas, changez l'adresse:

```sql
-- Mettre votre vraie adresse
INSERT INTO system_settings (key, value)
VALUES ('team_email', 'lattdubagel@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

## COMMANDE ULTRA-RAPIDE

```bash
supabase secrets set IONOS_SMTP_HOST=smtp.ionos.fr IONOS_SMTP_PORT=465 IONOS_EMAIL_USER=team@taxiassur.com IONOS_EMAIL_PASSWORD="TAXIassur!," && supabase functions deploy send-email-ionos process-lead-queue
```

**Puis créer un nouveau lead de test dans 2 minutes pour confirmer que ça marche.**
