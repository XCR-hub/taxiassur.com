# ✅ Configuration IONOS Email - Terminée

## 📋 Résumé des Modifications

Tous les paramètres IONOS ont été configurés avec le mot de passe `TaxiAssur2025!,&` pour l'inbox CRM.

---

## 🔐 Identifiants Configurés

### Compte Email
- **Email**: team@taxiassur.com
- **Mot de passe**: `TaxiAssur2025!,&`

### Serveurs
- **IMAP**: imap.ionos.fr:993 (SSL/TLS)
- **SMTP**: smtp.ionos.fr:465 (SSL)

---

## ✅ Fichiers Modifiés

### 1. Variables d'Environnement

#### `.env` (Développement Local)
```bash
IONOS_EMAIL_USER=team@taxiassur.com
IONOS_EMAIL_PASSWORD=TaxiAssur2025!,&
IONOS_IMAP_HOST=imap.ionos.fr
IONOS_IMAP_PORT=993
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=465
```

#### `.env.example` (Template Production)
Template mis à jour avec les mêmes variables pour déploiement.

### 2. Edge Functions Supabase

#### `sync-ionos-imap/index.ts`
✅ Utilise maintenant les variables d'environnement:
- `IONOS_IMAP_HOST` (défaut: imap.ionos.fr)
- `IONOS_IMAP_PORT` (défaut: 993)
- `IONOS_EMAIL_USER`
- `IONOS_EMAIL_PASSWORD`

#### `send-email-ionos/index.ts`
✅ Utilise maintenant les variables d'environnement:
- `IONOS_SMTP_HOST` (défaut: smtp.ionos.fr)
- `IONOS_SMTP_PORT` (défaut: 465)
- `IONOS_EMAIL_USER`
- `IONOS_EMAIL_PASSWORD`

#### `fetch-email-replies/index.ts`
✅ Corrigé pour utiliser les bonnes variables:
- Avant: `IONOS_SMTP_USER`, `IONOS_SMTP_PASSWORD`
- Après: `IONOS_EMAIL_USER`, `IONOS_EMAIL_PASSWORD`

### 3. Base de Données

#### Table `email_accounts`
✅ Compte mis à jour:
```sql
UPDATE email_accounts
SET
  smtp_host = 'smtp.ionos.fr',
  smtp_port = 465,
  imap_host = 'imap.ionos.fr',
  imap_port = 993,
  imap_username = 'team@taxiassur.com',
  imap_password_encrypted = 'TaxiAssur2025!,&',
  is_active = true
WHERE email = 'team@taxiassur.com';
```

---

## 🚀 Configuration Supabase Production

Pour que l'inbox fonctionne en production, vous devez configurer les secrets dans Supabase:

### Via Dashboard Web (Recommandé)

1. Aller sur https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Cliquer sur "Project Settings" (⚙️)
3. Aller dans "Edge Functions"
4. Cliquer sur "Manage secrets"
5. Ajouter ces 6 variables:

```
IONOS_EMAIL_USER = team@taxiassur.com
IONOS_EMAIL_PASSWORD = TaxiAssur2025!,&
IONOS_IMAP_HOST = imap.ionos.fr
IONOS_IMAP_PORT = 993
IONOS_SMTP_HOST = smtp.ionos.fr
IONOS_SMTP_PORT = 465
```

### Via CLI Supabase (Alternative)

```bash
supabase secrets set IONOS_EMAIL_USER="team@taxiassur.com"
supabase secrets set IONOS_EMAIL_PASSWORD="TaxiAssur2025!,&"
supabase secrets set IONOS_IMAP_HOST="imap.ionos.fr"
supabase secrets set IONOS_IMAP_PORT="993"
supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="465"
```

---

## 🧪 Comment Tester

### 1. Test Local (Développement)

Le fichier `.env` contient déjà tous les paramètres. Lancez:

```bash
npm run dev
```

Puis allez sur http://localhost:5173/backoffice/crm-killer/inbox

### 2. Test Synchronisation Manuelle

Dans l'interface inbox:
1. Cliquez sur le bouton "Synchroniser maintenant"
2. Attendez quelques secondes
3. Les emails IONOS devraient apparaître

### 3. Test Edge Function Directement

```bash
# Test sync IMAP
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-ionos-imap \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Résultat attendu
{
  "success": true,
  "emails_retrieved": 450,
  "emails_inserted": 120,
  "emails_skipped": 330
}
```

### 4. Test Envoi Email

```bash
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test IONOS",
    "html": "<p>Email de test</p>"
  }'
```

---

## 📊 Synchronisation Automatique

Un cron job est configuré pour synchroniser automatiquement les emails toutes les **15 minutes**:

```sql
-- Visible dans: supabase/migrations/*_create_email_sync_automation_cron.sql
SELECT cron.schedule(
  'sync-emails-and-assign-leads',
  '*/15 * * * *',
  $$
    SELECT net.http_post(...)
  $$
);
```

Vérifier que le cron est actif:
```sql
SELECT * FROM cron.job WHERE jobname = 'sync-emails-and-assign-leads';
```

---

## 🎯 Accès Interface CRM

### URL Inbox
https://taxiassur.com/backoffice/crm-killer/inbox

### Fonctionnalités Disponibles
- ✅ Affichage emails IONOS + Brevo
- ✅ Filtres (non lu, important, archivé)
- ✅ Recherche par expéditeur/sujet
- ✅ Bouton "Synchroniser maintenant"
- ✅ Création automatique leads depuis emails
- ✅ Affectation emails → leads existants
- ✅ Réponses IA automatiques
- ✅ Tracking ouvertures/clics
- ✅ Gestion pièces jointes

---

## 🔍 Dépannage

### Problème: Pas d'emails dans l'inbox

**Solutions**:
1. Vérifier que les secrets Supabase sont configurés
2. Vérifier que le compte `email_accounts` est actif:
   ```sql
   SELECT * FROM email_accounts WHERE email = 'team@taxiassur.com';
   ```
3. Consulter les logs Edge Functions dans Supabase Dashboard
4. Tester la connexion IMAP manuellement

### Problème: Erreur d'authentification IMAP/SMTP

**Solutions**:
1. Vérifier que le mot de passe est exact (avec les caractères spéciaux)
2. Vérifier que le compte n'est pas bloqué chez IONOS
3. Se connecter manuellement avec un client email (Thunderbird) pour tester

### Problème: Emails envoyés mais pas trackés

**Solutions**:
1. Vérifier que les tables `email_tracking_opens` et `email_tracking_clicks` existent
2. Vérifier que les Edge Functions `track-email-open` et `track-email-click` sont déployées
3. Consulter les logs Supabase

---

## 📁 Documentation Complète

Voir `CONFIGURATION_IONOS_EMAIL.md` pour le guide complet incluant:
- Architecture détaillée
- Schéma base de données
- Tous les Edge Functions
- Exemples de code
- Troubleshooting avancé

---

## ✅ Checklist Configuration

- [x] Variables `.env` configurées
- [x] Template `.env.example` mis à jour
- [x] Edge Functions modifiées (3 fichiers)
- [x] Base de données `email_accounts` mise à jour
- [x] Build production validé (sans erreurs)
- [ ] **Secrets Supabase à configurer en production** ⚠️
- [ ] Tester sync manuelle depuis interface
- [ ] Vérifier que les emails apparaissent
- [ ] Tester envoi email
- [ ] Vérifier création automatique leads

---

## 🎉 Résultat Final

**Tous les fichiers sont configurés** pour utiliser les identifiants IONOS avec le mot de passe `TaxiAssur2025!,&`.

**Prochaine étape**: Configurer les secrets dans Supabase Dashboard pour activer en production.

**Temps estimé**: 5 minutes pour ajouter les 6 secrets dans Supabase

---

**Date**: 2026-01-10
**Status**: ✅ Configuration locale complète
**Action requise**: Configurer secrets Supabase pour production
