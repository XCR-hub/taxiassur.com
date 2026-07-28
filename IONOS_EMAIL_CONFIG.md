# Configuration Email IONOS - team@taxiassur.com

**Mis à jour le** : 14 janvier 2026

---

## 🔐 Identifiants IONOS

**Email** : `team@taxiassur.com`
**Mot de passe SMTP/IMAP** : `TAXIassur!,`

---

## 📧 Paramètres SMTP (Envoi d'emails)

| Paramètre | Valeur |
|-----------|--------|
| Serveur SMTP | `smtp.ionos.fr` |
| Port | `587` (STARTTLS) |
| Sécurité | TLS |
| Authentification | Oui |
| Utilisateur | `team@taxiassur.com` |
| Mot de passe | `TAXIassur!,` |

---

## 📥 Paramètres IMAP (Réception d'emails)

| Paramètre | Valeur |
|-----------|--------|
| Serveur IMAP | `imap.ionos.fr` |
| Port | `993` |
| Sécurité | SSL/TLS |
| Authentification | Oui |
| Utilisateur | `team@taxiassur.com` |
| Mot de passe | `TAXIassur!,` |

---

## ⚙️ Configuration effectuée dans le code

### 1. Fichier `.env` (local)
```bash
IONOS_EMAIL_USER=team@taxiassur.com
IONOS_EMAIL_PASSWORD=REDACTED,
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=587
IONOS_IMAP_HOST=imap.ionos.fr
IONOS_IMAP_PORT=993
```

### 2. Fichier `public/env-config.js` (production)
```javascript
VITE_SMTP_USER: 'team@taxiassur.com',
VITE_SMTP_PASSWORD: 'TAXIassur!,',
VITE_SMTP_HOST: 'smtp.ionos.fr',
VITE_SMTP_PORT: '587',
VITE_IMAP_HOST: 'imap.ionos.fr',
VITE_IMAP_PORT: '993',
```

---

## 🚨 ACTION REQUISE : Configuration Supabase

Pour que les Edge Functions fonctionnent en production, vous **DEVEZ** configurer ces secrets dans Supabase :

### Via le Dashboard Supabase

1. Accédez à : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/vault
2. Allez dans : **Settings** → **Edge Functions** → **Secrets**
3. Ajoutez ces 6 secrets :

| Nom du secret | Valeur |
|---------------|--------|
| `IONOS_EMAIL_USER` | `team@taxiassur.com` |
| `IONOS_EMAIL_PASSWORD` | `TAXIassur!,` |
| `IONOS_SMTP_HOST` | `smtp.ionos.fr` |
| `IONOS_SMTP_PORT` | `587` |
| `IONOS_IMAP_HOST` | `imap.ionos.fr` |
| `IONOS_IMAP_PORT` | `993` |

### Via Supabase CLI (alternative)

```bash
supabase secrets set IONOS_EMAIL_USER="team@taxiassur.com"
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!,"
supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="587"
supabase secrets set IONOS_IMAP_HOST="imap.ionos.fr"
supabase secrets set IONOS_IMAP_PORT="993"

# Vérifier
supabase secrets list
```

---

## 📦 Edge Functions utilisant ces identifiants

Ces 9 Edge Functions nécessitent la configuration Supabase pour fonctionner :

1. **send-crm-email** - Envoi d'emails CRM via SMTP
2. **sync-ionos-imap** - Synchronisation emails IMAP
3. **sync-ionos-imap-v2** - Synchronisation IMAP v2
4. **sync-all-emails** - Synchronisation multi-providers
5. **sync-all-emails-complete** - Synchronisation complète
6. **fetch-email-replies** - Récupération des réponses
7. **send-document-notification** - Notifications documents
8. **send-email-ionos** - Envoi emails génériques
9. **send-email-notification-alert** - Alertes email

---

## ✅ Checklist de configuration

- [x] Mot de passe mis à jour dans `.env`
- [x] Mot de passe mis à jour dans `public/env-config.js`
- [ ] **Secrets configurés dans Supabase** (CRITIQUE)
- [ ] Test d'envoi d'email
- [ ] Test de réception IMAP
- [ ] Vérification des logs Edge Functions

---

## 🧪 Test de connexion

### Test SMTP
```bash
curl -X POST "https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos" \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test SMTP",
    "message": "Test de connexion SMTP IONOS"
  }'
```

### Test IMAP
```bash
curl -X POST "https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-ionos-imap" \
  -H "Authorization: Bearer VOTRE_ANON_KEY"
```

---

## ⚠️ Important

**Sans la configuration des secrets Supabase, les Edge Functions ne pourront pas envoyer ni recevoir d'emails !**

Les fichiers `.env` et `env-config.js` sont utilisés uniquement pour le développement local et le build. En production (Edge Functions), seuls les secrets Supabase sont accessibles.

---

## 📞 Support

En cas de problème :
- Vérifiez les logs dans : Supabase Dashboard > Edge Functions > Logs
- Testez la connexion SMTP/IMAP avec un client email (Thunderbird, Outlook)
- Vérifiez que le mot de passe ne contient pas de caractères mal échappés

**Contact** : TaxiAssur Tech Team
