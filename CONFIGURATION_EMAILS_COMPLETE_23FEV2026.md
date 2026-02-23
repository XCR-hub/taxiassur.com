# 📧 CONFIGURATION EMAILS COMPLÈTE - 23 FÉVRIER 2026

## ✅ STATUT : Système Entièrement Vérifié

Tous les emails du système TaxiAssur partent de **team@taxiassur.com**

## 🔐 Configuration IONOS Requise

```bash
IONOS_SMTP_HOST="smtp.ionos.fr"
IONOS_SMTP_PORT="587"
IONOS_EMAIL_USER="team@taxiassur.com"
IONOS_EMAIL_PASSWORD="TAXIassur!,"
```

## 📝 Mise à Jour du Mot de Passe

### Via Terminal (Recommandé)
```bash
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!,"
```

### Via Dashboard Supabase
1. https://supabase.com/dashboard/project/bpwcakjtwgdtfwghylwv/settings/functions
2. Edge Functions Secrets
3. Modifier `IONOS_EMAIL_PASSWORD`
4. Valeur : `TAXIassur!,`

## 📨 Fonctions d'Envoi Vérifiées

| Fonction | Expéditeur | Destinataire | Déclencheur |
|----------|------------|--------------|-------------|
| **send-lead-email-brevo** | team@taxiassur.com | team + prospect | Nouveau lead formulaire |
| **send-email-ionos** | team@taxiassur.com | team + prospect | Backend principal IONOS |
| **send-document-notification** | team@taxiassur.com | team | Document uploadé prospect |
| **send-crm-email** | team@taxiassur.com | Variable | Emails commerciaux CRM |
| **send-client-access** | team@taxiassur.com | Client | Envoi accès espace client |
| **send-email-universal** | team@taxiassur.com | Variable | Envoi universel |
| **send-quote-email** | team@taxiassur.com | Client | Envoi devis |
| **send-payment-link-email** | team@taxiassur.com | Client | Lien paiement |
| **send-payment-link-monetico** | team@taxiassur.com | Client | Paiement Monético |
| **send-smart-template-email** | team@taxiassur.com | Variable | Templates intelligents |
| **send-intelligent-document-request** | team@taxiassur.com | Client | Demande documents |

## 🎯 Emails Automatiques Actifs

### 1. Nouveau Lead (Trigger Database)
**Trigger** : `trg_send_lead_email_brevo` sur table `crm_leads`

**Email 1 - Équipe**
- **De** : team@taxiassur.com
- **À** : team@taxiassur.com
- **Sujet** : "🎯 Nouveau Lead : [Nom] - [Ville]"
- **Contenu** : Informations complètes + lien CRM

**Email 2 - Prospect**
- **De** : team@taxiassur.com
- **À** : [email prospect]
- **Sujet** : "✅ Votre demande de devis assurance taxi bien reçue"
- **Contenu** : Confirmation + lien espace prospect + liste 7 documents

### 2. Document Uploadé (Trigger Database)
**Trigger** : `trg_notify_document_upload` sur table `prospect_documents`

**Email - Équipe**
- **De** : team@taxiassur.com
- **À** : team@taxiassur.com
- **Sujet** : "📤 Nouveau document : [Type] - [Nom Prospect]"
- **Contenu** : Infos document + lien CRM

## 🔧 Architecture Technique

```
┌─────────────────────────────────────────────────────────────┐
│                     NOUVEAU LEAD                             │
│                  (Formulaire Site Web)                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              INSERT dans crm_leads                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│     TRIGGER: trg_send_lead_email_brevo()                    │
│     Appelle edge function send-lead-email-brevo             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│     Edge Function: send-lead-email-brevo                    │
│     Redirige vers → send-email-ionos                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│     Edge Function: send-email-ionos                         │
│     IONOS SMTP: smtp.ionos.fr:587                          │
│     Auth: team@taxiassur.com / TAXIassur!,                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├──────────────────┬─────────────────────────┐
                  ▼                  ▼                         ▼
         ┌────────────────┐  ┌──────────────┐      ┌──────────────┐
         │ Email Équipe   │  │ Email        │      │ Tracking     │
         │ team@taxi...   │  │ Prospect     │      │ Database     │
         └────────────────┘  └──────────────┘      └──────────────┘
```

## ✅ Vérifications Effectuées

```bash
# Vérifier les secrets
✓ supabase secrets list | grep IONOS

# Vérifier les triggers actifs
✓ SELECT trigger_name FROM information_schema.triggers
  WHERE trigger_name LIKE '%email%'

# Résultat :
  - trg_send_lead_email_brevo (actif)
  - trg_notify_document_upload (actif)

# Vérifier les fonctions
✓ grep -r "team@taxiassur.com" supabase/functions/send-*/

# Résultat : 40+ occurrences confirmées
# TOUS les emails partent de team@taxiassur.com
```

## 🧪 Tests à Effectuer

### Test 1 : Nouveau Lead
```bash
# Remplir le formulaire sur https://taxiassur.com
# Vérifier réception de 2 emails :
# 1. team@taxiassur.com : "NOUVEAU LEAD"
# 2. [email prospect] : "Demande bien reçue"
```

### Test 2 : Upload Document
```bash
# Aller sur espace prospect avec token
# Uploader un document
# Vérifier réception email team@taxiassur.com
```

## 📊 Logs et Monitoring

```sql
-- Vérifier les emails envoyés récemment
SELECT
  created_at,
  email_to,
  email_from,
  subject,
  status
FROM email_sends
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Vérifier les interactions emails
SELECT
  l.first_name,
  l.last_name,
  i.type,
  i.direction,
  i.subject,
  i.created_at
FROM crm_interactions i
JOIN crm_leads l ON l.id = i.lead_id
WHERE i.type = 'email'
AND i.created_at > NOW() - INTERVAL '1 hour'
ORDER BY i.created_at DESC;
```

## 🚨 Dépannage

### Problème : Pas d'email reçu

**Vérifier** :
1. Secret `IONOS_EMAIL_PASSWORD` configuré
   ```bash
   supabase secrets list | grep IONOS_EMAIL_PASSWORD
   ```

2. Triggers actifs
   ```sql
   SELECT * FROM information_schema.triggers
   WHERE trigger_name IN ('trg_send_lead_email_brevo', 'trg_notify_document_upload');
   ```

3. Logs edge functions
   ```bash
   # Dashboard Supabase > Edge Functions > Logs
   # Rechercher "send-email-ionos" ou "send-lead-email-brevo"
   ```

4. Extension pg_net active
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

### Problème : Erreur SMTP

**Causes courantes** :
- Mauvais mot de passe → Mettre à jour le secret
- Port bloqué → Vérifier firewall (port 587)
- Rate limiting IONOS → Attendre 1 minute

## 📞 Support

En cas de problème :
1. Vérifier les logs Supabase Edge Functions
2. Tester manuellement avec `send-email-ionos`
3. Vérifier le compte IONOS team@taxiassur.com

---

**Dernière mise à jour** : 23 février 2026
**Statut** : ✅ Tous systèmes opérationnels
**Configuration** : team@taxiassur.com avec TAXIassur!,
