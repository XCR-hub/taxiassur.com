# 📧 Configuration Email IONOS - Guide Complet

## 🔐 Identifiants IONOS

### Compte Email
- **Email**: team@taxiassur.com
- **Mot de passe**: `TaxiAssur2025!,&`

### Serveur IMAP (Réception)
- **Hôte**: imap.ionos.fr
- **Port**: 993
- **Protocole**: SSL/TLS
- **Authentification**: Mot de passe normal

### Serveur SMTP (Envoi)
- **Hôte**: smtp.ionos.fr
- **Port**: 465
- **Protocole**: SSL (pas STARTTLS)
- **Authentification**: Mot de passe normal

---

## ⚙️ Configuration Supabase Edge Functions

### Variables d'environnement requises

Les Edge Functions Supabase utilisent ces variables (configurées dans Supabase Dashboard > Project Settings > Edge Functions > Secrets):

```bash
IONOS_EMAIL_USER=team@taxiassur.com
IONOS_EMAIL_PASSWORD=TaxiAssur2025!,&
IONOS_IMAP_HOST=imap.ionos.fr
IONOS_IMAP_PORT=993
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=465
```

### Comment configurer dans Supabase

1. **Via Dashboard Web**:
   - Aller sur https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
   - Cliquer sur "Project Settings" (icône engrenage)
   - Aller dans "Edge Functions" > "Secrets"
   - Ajouter chaque variable une par une

2. **Via CLI Supabase** (alternative):
```bash
supabase secrets set IONOS_EMAIL_USER=team@taxiassur.com
supabase secrets set IONOS_EMAIL_PASSWORD="TaxiAssur2025!,&"
supabase secrets set IONOS_IMAP_HOST=imap.ionos.fr
supabase secrets set IONOS_IMAP_PORT=993
supabase secrets set IONOS_SMTP_HOST=smtp.ionos.fr
supabase secrets set IONOS_SMTP_PORT=465
```

---

## 📊 Edge Functions utilisant IONOS

### 1. sync-ionos-imap
**Fonction**: Récupère les emails depuis IMAP IONOS
- Lit INBOX (500 derniers emails)
- Lit Sent (200 derniers emails)
- Stocke dans `email_messages` table

**Variables utilisées**:
- `IONOS_IMAP_HOST` (défaut: imap.ionos.fr)
- `IONOS_IMAP_PORT` (défaut: 993)
- `IONOS_EMAIL_USER`
- `IONOS_EMAIL_PASSWORD`

### 2. send-email-ionos
**Fonction**: Envoie des emails via SMTP IONOS
- Tracking pixels (ouvertures)
- Tracking liens (clics)
- Gestion pièces jointes

**Variables utilisées**:
- `IONOS_SMTP_HOST` (défaut: smtp.ionos.fr)
- `IONOS_SMTP_PORT` (défaut: 465)
- `IONOS_EMAIL_USER`
- `IONOS_EMAIL_PASSWORD`

### 3. sync-all-emails-complete
**Fonction**: Orchestrateur complet
- Appelle sync-ionos-imap
- Puis sync-emails-to-leads
- Crée automatiquement les leads depuis emails

### 4. fetch-email-replies
**Fonction**: Récupère les réponses aux emails envoyés
- Utilise imapflow (moderne)
- Match emails avec leads existants

---

## 🔄 Synchronisation Automatique

### Cron Job Configuration

Un cron job tourne toutes les **15 minutes** pour synchroniser automatiquement:

```sql
-- Voir dans: supabase/migrations/*_create_email_sync_automation_cron.sql
SELECT cron.schedule(
  'sync-emails-and-assign-leads',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url:='https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-all-emails-complete',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
    )
  $$
);
```

---

## 📱 Interface CRM - Inbox

### Accès
- **URL**: https://taxiassur.com/backoffice/crm-killer/inbox
- **Composant**: `src/backoffice/CRMInboxMulticanal.tsx`

### Fonctionnalités
- ✅ Affichage emails IONOS + Brevo
- ✅ Filtres par statut (non lu, important, etc.)
- ✅ Recherche par expéditeur/sujet
- ✅ Bouton "Synchroniser maintenant"
- ✅ Création automatique leads depuis emails
- ✅ Réponses IA automatiques
- ✅ Gestion pièces jointes

### Bouton Sync Manuelle
Le bouton "Synchroniser maintenant" appelle:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all-emails-complete`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  }
);
```

---

## 🗄️ Structure Base de Données

### Table: email_accounts
Stocke les comptes email configurés:
```sql
CREATE TABLE email_accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  imap_host text,
  imap_port integer,
  smtp_host text,
  smtp_port integer,
  password_encrypted text,
  is_active boolean DEFAULT true
);
```

**Note**: Le mot de passe peut être stocké dans:
1. `password_encrypted` dans la table (chiffré)
2. OU dans les variables d'environnement Supabase (recommandé)

### Table: email_messages
Stocke tous les emails synchronisés:
```sql
CREATE TABLE email_messages (
  id uuid PRIMARY KEY,
  message_id text UNIQUE,
  from_email text,
  from_name text,
  to_emails text[],
  to_names text[],
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz,
  direction text, -- 'inbound' ou 'outbound'
  lead_id uuid REFERENCES crm_leads(id),
  is_read boolean DEFAULT false,
  is_important boolean DEFAULT false
);
```

---

## 🔧 Dépannage

### Problème: Emails ne se synchronisent pas

**Vérifications**:
1. Variables d'environnement configurées dans Supabase?
2. Mot de passe correct (avec caractères spéciaux)?
3. Compte `email_accounts` actif avec `is_active = true`?
4. Edge Function logs (Supabase Dashboard > Edge Functions > Logs)?

**Test manuel**:
```bash
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-ionos-imap \
  -H "Authorization: Bearer SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Problème: Envoi SMTP échoue

**Vérifications**:
1. Port 465 (pas 587)?
2. SSL direct (pas STARTTLS)?
3. Firewall autorise connexions sortantes port 465?

**Test depuis serveur**:
```bash
openssl s_client -connect smtp.ionos.fr:465 -crlf
```

### Problème: Authentification IMAP refuse

**Solutions**:
- Vérifier que le mot de passe contient bien tous les caractères spéciaux
- Essayer de se connecter manuellement avec un client email (Thunderbird, Outlook)
- Contacter support IONOS si blocage IP

---

## 📚 Fichiers Concernés

### Backend (Edge Functions)
- `supabase/functions/sync-ionos-imap/index.ts`
- `supabase/functions/send-email-ionos/index.ts`
- `supabase/functions/sync-all-emails-complete/index.ts`
- `supabase/functions/sync-emails-to-leads/index.ts`
- `supabase/functions/fetch-email-replies/index.ts`

### Frontend
- `src/backoffice/CRMInboxMulticanal.tsx`
- `src/backoffice/EmailAccountSettings.tsx`
- `src/backoffice/EmailInboxManager.tsx`

### Configuration
- `.env` (développement local)
- `.env.example` (template)
- Supabase Edge Functions Secrets (production)

### Migrations
- `supabase/migrations/*_create_email_sync_automation_cron.sql`
- `supabase/migrations/*_add_email_messages_lead_sync_columns.sql`

---

## ✅ Checklist Configuration

- [ ] Variables d'environnement configurées dans Supabase
- [ ] Compte `email_accounts` créé avec bon mot de passe
- [ ] Test sync manuelle depuis interface réussie
- [ ] Cron job activé (vérifier dans `cron.job`)
- [ ] Emails apparaissent dans l'inbox après sync
- [ ] Leads créés automatiquement depuis nouveaux emails
- [ ] Envoi d'email test fonctionne
- [ ] Tracking ouvertures/clics opérationnel

---

**Date de mise à jour**: 2026-01-10
**Configuration validée**: ✅ PRODUCTION READY
**Support**: team@taxiassur.com
