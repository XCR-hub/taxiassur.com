# Correction Système Email & Synchronisation IONOS - 15 Janvier 2026

## 🐛 Problèmes Identifiés

### 1. Erreur d'envoi d'email depuis le CRM
**Symptôme** : Erreur lors de l'envoi d'email à abdammarie@gmail.com depuis l'interface CRM
**Destinataire** : Tony Cerda (abdammarie@gmail.com)
**Template** : Email de bienvenue
**Localisation** : https://taxiassur.com/backoffice/crm-killer/inbox

### 2. Problème de synchronisation IMAP
**Symptôme** : Les emails IONOS ne se synchronisent pas correctement dans l'inbox CRM

## ✅ Corrections Appliquées

### Edge Functions Corrigées et Déployées

1. **send-crm-email** ✅
   - Port SMTP : 587 → **465** (SSL/TLS direct)
   - Méthode : STARTTLS → **connectTls** (connexion chiffrée immédiate)

2. **send-email-ionos** ✅
   - Même correction SMTP

3. **sync-ionos-imap-v2** ✅
   - Configuration IMAP vérifiée (imap.ionos.fr:993)

## 📊 Configuration IONOS Finale

| Paramètre | Valeur |
|-----------|--------|
| Email | team@taxiassur.com |
| SMTP Host | smtp.ionos.fr |
| SMTP Port | **465** (SSL/TLS direct) |
| IMAP Host | imap.ionos.fr |
| IMAP Port | 993 |

## 🧪 Test Recommandé

1. Aller sur : https://taxiassur.com/backoffice/crm-killer/inbox
2. Cliquer sur "Composer un email"
3. Envoyer un email de test à abdammarie@gmail.com

**Résultat attendu** : Email envoyé avec succès ✅

## 📝 Monitoring

### Vérifier l'envoi d'email
```sql
SELECT email_to, subject, status, created_at
FROM email_sends
WHERE email_to = 'abdammarie@gmail.com'
ORDER BY created_at DESC LIMIT 5;
```

### Vérifier la synchronisation IMAP
```sql
SELECT from_email, subject, received_at, provider
FROM email_messages
WHERE provider = 'ionos'
ORDER BY received_at DESC LIMIT 10;
```

---
**Statut** : ✅ Corrections déployées
**Action** : Tester l'envoi d'email depuis le CRM
