# Configuration IONOS Corrigée - 15 Janvier 2026

## ✅ Corrections Appliquées

### 1. Fichier `.env` (Local Development)
```bash
# IONOS Email Configuration (team@taxiassur.com)
IONOS_EMAIL_USER=team@taxiassur.com
IONOS_EMAIL_PASSWORD=REDACTED,
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=465              # Port 465 pour SSL/TLS direct (corrigé)
IONOS_IMAP_HOST=imap.ionos.fr   # imap.ionos.fr (corrigé)
IONOS_IMAP_PORT=993
IONOS_IMAP_USER=team@taxiassur.com
IONOS_IMAP_PASSWORD=REDACTED,
IONOS_IMAP_TLS=true
```

### 2. Fichier `public/env-config.js` (Production)
```javascript
VITE_SMTP_HOST: 'smtp.ionos.fr',
VITE_SMTP_PORT: '465',           // Corrigé de 587 à 465
VITE_SMTP_USER: 'team@taxiassur.com',
VITE_SMTP_PASSWORD: 'TAXIassur!,',
VITE_IMAP_HOST: 'imap.ionos.fr',
VITE_IMAP_PORT: '993',
```

### 3. Edge Function `send-email-ionos/index.ts`
**Changement majeur :** Utilisation de `Deno.connectTls()` au lieu de `Deno.connect()` + `STARTTLS`

**Avant (incorrect pour port 465) :**
```typescript
const conn = await Deno.connect({
  hostname: SMTP_HOST,
  port: SMTP_PORT,
});
// ... puis STARTTLS
await sendCommand("STARTTLS");
const tlsConn = await Deno.startTls(conn, { hostname: SMTP_HOST });
```

**Après (correct pour port 465) :**
```typescript
// Port 465 utilise SSL/TLS direct, pas STARTTLS
const conn = await Deno.connectTls({
  hostname: SMTP_HOST,
  port: SMTP_PORT,
});
// ... connexion déjà chiffrée
```

## 🔐 Configuration Supabase Secrets (IMPORTANT)

### ⚠️ ACTION REQUISE : Mettre à jour les secrets Supabase

Vous devez mettre à jour les secrets des Edge Functions Supabase avec ces valeurs :

```bash
# Via Supabase Dashboard :
# https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/functions

# Ou via CLI :
supabase secrets set IONOS_EMAIL_USER=team@taxiassur.com
supabase secrets set IONOS_EMAIL_PASSWORD=REDACTED
supabase secrets set IONOS_SMTP_HOST=smtp.ionos.fr
supabase secrets set IONOS_SMTP_PORT=465
supabase secrets set IONOS_IMAP_HOST=imap.ionos.fr
supabase secrets set IONOS_IMAP_PORT=993
supabase secrets set IONOS_IMAP_USER=team@taxiassur.com
supabase secrets set IONOS_IMAP_PASSWORD=REDACTED
supabase secrets set IONOS_IMAP_TLS=true
```

## 📋 Récapitulatif des Paramètres IONOS

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| **Email** | team@taxiassur.com | Compte email |
| **Mot de passe** | TAXIassur!, | Mot de passe du compte |
| **SMTP Host** | smtp.ionos.fr | Serveur d'envoi |
| **SMTP Port** | 465 | Port SSL/TLS direct |
| **SMTP Méthode** | SSL/TLS direct | Pas STARTTLS |
| **IMAP Host** | imap.ionos.fr | Serveur de réception |
| **IMAP Port** | 993 | Port avec TLS |

## 🔧 Différences techniques

### Port 587 (STARTTLS) vs Port 465 (SSL/TLS direct)

**Port 587 avec STARTTLS (ancien) :**
1. Connexion non chiffrée initiale
2. Commande `EHLO`
3. Commande `STARTTLS`
4. Upgrade vers connexion chiffrée
5. Nouveau `EHLO`
6. Authentification

**Port 465 avec SSL/TLS direct (correct) :**
1. Connexion immédiatement chiffrée avec `connectTls()`
2. Commande `EHLO`
3. Authentification directe
4. Envoi de l'email

## ✅ Edge Functions Affectées

Ces Edge Functions utilisent la configuration IONOS et ont été mises à jour :

1. ✅ `send-email-ionos` - Corrigée pour SSL/TLS direct
2. 🔄 `sync-ionos-imap-v2` - Utilise déjà le bon IMAP host
3. 🔄 Toutes les autres fonctions qui référencent `IONOS_*` en variables d'environnement

## 🧪 Tests Recommandés

### 1. Test d'envoi d'email
```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "crm_leads",
    "record": {
      "id": "test-id",
      "name": "Test User",
      "email": "test@example.com",
      "phone": "0600000000",
      "city": "Paris",
      "status": "Nouveau",
      "created_at": "2026-01-15T10:00:00Z"
    }
  }'
```

### 2. Test de synchronisation IMAP
```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-ionos-imap-v2 \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 📝 Notes Importantes

1. **Mot de passe** : Le mot de passe contient une virgule à la fin : `TAXIassur!,`
2. **Port SMTP** : Toujours utiliser 465 avec SSL/TLS direct, jamais 587
3. **IMAP Host** : Toujours `imap.ionos.fr`, jamais `imap.ionos.com`
4. **Secrets Supabase** : Doivent être mis à jour manuellement dans le dashboard

## 🚀 Déploiement

Pour déployer les Edge Functions mises à jour :

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref drohhxrkoequjphvabvq

# Mettre à jour les secrets
supabase secrets set IONOS_SMTP_PORT=465
supabase secrets set IONOS_IMAP_HOST=imap.ionos.fr

# Déployer la fonction modifiée
supabase functions deploy send-email-ionos
```

## 📞 Support

En cas de problème :
- Vérifier les logs : `supabase functions logs send-email-ionos`
- Tester la connexion SMTP manuellement
- Vérifier que les secrets sont bien définis dans Supabase

---

**Date de correction** : 15 Janvier 2026
**Fichiers modifiés** :
- `.env`
- `public/env-config.js`
- `supabase/functions/send-email-ionos/index.ts`

**Action requise** : Mettre à jour les secrets Supabase Edge Functions
