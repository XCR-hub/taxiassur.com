# ✅ Résumé des Corrections IONOS - 15 Janvier 2026

## 🎯 Problèmes Corrigés

### 1. Port SMTP Incorrect
- **Avant** : Port 587 avec STARTTLS
- **Après** : Port 465 avec SSL/TLS direct ✅
- **Impact** : Connexion directe chiffrée, plus rapide et plus sécurisée

### 2. Serveur IMAP Incorrect
- **Avant** : imap.ionos.com
- **Après** : imap.ionos.fr ✅
- **Impact** : Connexion au bon serveur IMAP français

### 3. Méthode de Connexion SMTP
- **Avant** : `Deno.connect()` + `STARTTLS` (incompatible avec port 465)
- **Après** : `Deno.connectTls()` avec SSL direct ✅
- **Impact** : Connexion SMTP fonctionnelle sur port 465

## 📦 Fichiers Modifiés

### ✅ Configuration Locale
- `.env` - Paramètres corrects pour développement local
- `package.json` - Ajout des scripts `update:ionos-secrets` et `test:ionos`

### ✅ Configuration Production
- `public/env-config.js` - Port SMTP 465 configuré

### ✅ Code
- `supabase/functions/send-email-ionos/index.ts` - Utilisation de `connectTls()` pour SSL direct

### 📝 Documentation
- `IONOS_CONFIG_CORRECTION_2026.md` - Guide complet de la configuration
- `scripts/update-ionos-secrets.sh` - Script automatique de mise à jour Supabase
- `scripts/test-ionos-connection.js` - Script de test de la configuration

## 🧪 Test Local : ✅ RÉUSSI

```
✅ Configuration IONOS correcte !
  ✅ Port SMTP: 465 (OK)
  ✅ Host IMAP: imap.ionos.fr (OK)
  ✅ Port IMAP: 993 (OK)
  ✅ Host SMTP: smtp.ionos.fr (OK)
```

## ⚠️ ACTION REQUISE : Mise à Jour Supabase

Pour finaliser la configuration, vous devez mettre à jour les secrets dans Supabase Edge Functions :

### Option 1 : Script Automatique (Recommandé)
```bash
npm run update:ionos-secrets
```

### Option 2 : Manuellement via Dashboard
1. Allez sur : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/functions
2. Cliquez sur "Manage secrets"
3. Ajoutez/Mettez à jour ces secrets :

```
IONOS_EMAIL_USER = team@taxiassur.com
IONOS_EMAIL_PASSWORD = REDACTED,
IONOS_SMTP_HOST = smtp.ionos.fr
IONOS_SMTP_PORT = 465
IONOS_IMAP_HOST = imap.ionos.fr
IONOS_IMAP_PORT = 993
IONOS_IMAP_USER = team@taxiassur.com
IONOS_IMAP_PASSWORD = REDACTED,
IONOS_IMAP_TLS = true
```

### Option 3 : Supabase CLI
```bash
supabase login
supabase link --project-ref drohhxrkoequjphvabvq
supabase secrets set IONOS_SMTP_PORT=465
supabase secrets set IONOS_IMAP_HOST=imap.ionos.fr
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!,"
supabase secrets set IONOS_IMAP_PASSWORD="TAXIassur!,"
```

## 🚀 Déploiement des Edge Functions

Après avoir mis à jour les secrets, redéployez les fonctions modifiées :

```bash
# Option 1 : Via le script
npm run update:ionos-secrets

# Option 2 : Manuellement
supabase functions deploy send-email-ionos
supabase functions deploy sync-ionos-imap-v2
supabase functions deploy sync-ionos-imap
```

## 📊 Configuration Finale

| Service | Paramètre | Valeur |
|---------|-----------|--------|
| **Email** | Compte | team@taxiassur.com |
| **Email** | Mot de passe | TAXIassur!, |
| **SMTP** | Serveur | smtp.ionos.fr |
| **SMTP** | Port | 465 (SSL/TLS direct) |
| **SMTP** | Méthode | SSL/TLS (pas STARTTLS) |
| **IMAP** | Serveur | imap.ionos.fr |
| **IMAP** | Port | 993 (TLS) |

## 🧪 Test Après Déploiement

Pour tester que tout fonctionne :

```bash
# Test de la configuration locale
npm run test:ionos

# Test d'envoi d'email via Edge Function
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"INSERT","table":"crm_leads","record":{"id":"test","name":"Test","email":"test@example.com","phone":"0600000000","city":"Paris","status":"test","created_at":"2026-01-15T10:00:00Z"}}'

# Test de synchronisation IMAP
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-ionos-imap-v2 \
  -H "Authorization: Bearer VOTRE_ANON_KEY"
```

## 📝 Commandes Disponibles

```bash
# Tester la configuration IONOS locale
npm run test:ionos

# Mettre à jour les secrets Supabase
npm run update:ionos-secrets

# Build et déploiement
npm run build
npm run deploy
```

## 🔍 Logs et Débogage

Pour voir les logs des Edge Functions :

```bash
# Logs en temps réel
supabase functions logs send-email-ionos --follow

# Logs des dernières heures
supabase functions logs send-email-ionos --tail 100
```

## ✅ Checklist de Vérification

- [x] Configuration `.env` corrigée (port 465, imap.ionos.fr)
- [x] Configuration `public/env-config.js` corrigée
- [x] Code Edge Function `send-email-ionos` corrigé (SSL direct)
- [x] Scripts de test et mise à jour créés
- [ ] **TODO: Mettre à jour les secrets Supabase**
- [ ] **TODO: Redéployer les Edge Functions**
- [ ] **TODO: Tester l'envoi d'email en production**
- [ ] **TODO: Tester la synchronisation IMAP**

## 💡 Notes Importantes

1. **Mot de passe** : Notez que le mot de passe se termine par une virgule : `TAXIassur!,`
2. **Port 465** : Utilise SSL/TLS direct (pas STARTTLS comme le port 587)
3. **imap.ionos.fr** : Serveur français, différent de imap.ionos.com
4. **Secrets Supabase** : Doivent être mis à jour manuellement ou via le script

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs : `supabase functions logs send-email-ionos`
2. Testez la connexion : `npm run test:ionos`
3. Vérifiez les secrets : Dashboard Supabase > Settings > Edge Functions > Secrets

---

**Date** : 15 Janvier 2026
**Status** : ✅ Configuration locale corrigée
**Action requise** : ⚠️ Mettre à jour les secrets Supabase

**Prochaine étape** :
```bash
npm run update:ionos-secrets
```
