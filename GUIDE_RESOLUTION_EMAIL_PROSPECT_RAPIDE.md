# Guide Résolution Rapide - Email Espace Prospect

## Problème Actuel

**Erreur** : "Edge Function returned a non-2xx status code"

**Fonction concernée** : `send-client-access`

---

## ✅ Correction Appliquée

La fonction `send-client-access` a été corrigée et déployée avec :

1. Support SSL/TLS correct (port 465)
2. Fallback sur plusieurs noms de secrets
3. Logs détaillés pour diagnostic
4. Buffer augmenté pour compatibilité

---

## 🔧 Configuration Requise

### Secrets Supabase à Vérifier

Allez sur : **Dashboard Supabase → Settings → Edge Functions → Secrets**

Vérifiez que ces secrets existent :

```bash
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=465
IONOS_EMAIL_USER=team@taxiassur.com

# Au moins l'un des deux suivants :
IONOS_EMAIL_PASSWORD=REDACTED
# OU
IONOS_SMTP_PASSWORD=REDACTED
```

### Si un secret manque

```bash
# Via CLI Supabase
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!"
supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="465"
supabase secrets set IONOS_EMAIL_USER="team@taxiassur.com"
```

Ou via le Dashboard Supabase : Settings → Edge Functions → Secrets → Add secret

---

## 🧪 Test Rapide

### Méthode 1 : Via le CRM (Recommandé)

1. Ouvrez **CRM Killer** : https://taxiassur.com/backoffice/crm-killer
2. Cliquez sur un **lead** ayant un email
3. Cherchez le bouton **"Envoyer accès espace client"**
4. Cliquez et attendez
5. Résultat attendu :
   - ✅ "Email d'accès envoyé avec succès !"
   - ❌ Message d'erreur détaillé si problème

### Méthode 2 : Via Script de Test

```bash
# Lister les leads disponibles
npx supabase db query "SELECT id, first_name, last_name, email FROM crm_leads LIMIT 5"

# Tester l'envoi avec un lead ID
node scripts/test-email-prospect-access.js <lead_id>

# Exemple
node scripts/test-email-prospect-access.js 123e4567-e89b-12d3-a456-426614174000
```

### Méthode 3 : Vérifier les Secrets

```bash
node scripts/test-email-prospect-access.js --check-secrets
```

---

## 📊 Vérifier les Logs

### Dashboard Supabase

1. Allez sur : **Dashboard Supabase → Edge Functions**
2. Cliquez sur : **send-client-access**
3. Onglet : **Logs**
4. Cherchez les derniers logs

### Logs à Vérifier

**Succès** :
```
🔧 Configuration SMTP: {
  host: 'smtp.ionos.fr',
  port: 465,
  user: 'team@taxiassur.com',
  hasPassword: true
}

→ SMTP: EHLO smtp.ionos.fr
← SMTP: 250-smtp.ionos.fr Hello

→ SMTP: AUTH LOGIN
← SMTP: 334 VXNlcm5hbWU6

→ SMTP: ***
← SMTP: 235 2.7.0 Authentication successful

✅ Email envoyé avec succès via SMTP
```

**Échec** :
```
❌ Erreur SMTP: Error: IONOS_EMAIL_PASSWORD non configuré
```

---

## ❌ Erreurs Fréquentes

### Erreur : "IONOS_EMAIL_PASSWORD non configuré"

**Cause** : Secret manquant dans Supabase

**Solution** :
```bash
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!"
```

Ou via Dashboard : Settings → Edge Functions → Secrets

### Erreur : "Connection refused"

**Cause** : Port ou host incorrect

**Solution** :
```bash
supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="465"
```

### Erreur : "Authentication failed" (535)

**Cause** : Mot de passe incorrect ou compte bloqué

**Solution** :
1. Vérifier le mot de passe IONOS : `TAXIassur!`
2. Tester la connexion manuellement :
   ```bash
   openssl s_client -connect smtp.ionos.fr:465 -crlf
   # Puis taper :
   EHLO smtp.ionos.fr
   AUTH LOGIN
   # Base64 de : team@taxiassur.com
   # Base64 de : TAXIassur!
   ```
3. Vérifier que le compte IONOS n'est pas bloqué

### Erreur : "Invalid recipient" (550)

**Cause** : Email du lead invalide

**Solution** :
- Vérifier que le lead a un email valide
- Tester avec un autre email connu

---

## 🔄 Redéploiement

Si les corrections ne sont pas appliquées :

```bash
# Redéployer la fonction
supabase functions deploy send-client-access --no-verify-jwt
```

---

## 📧 Email Envoyé

Si l'envoi réussit, le client reçoit :

**Sujet** : 🎉 Bienvenue ! Accédez à votre espace client TaxiAssur

**Contenu** :
- Message de bienvenue personnalisé
- Bouton CTA : "🚀 ACCÉDER À MON ESPACE CLIENT"
- Lien direct : `https://taxiassur.com/espace-client/{lead_id}`
- Liste des fonctionnalités de l'espace client
- Coordonnées de contact

**Design** :
- Responsive et moderne
- Gradient vert/orange (couleur TaxiAssur)
- Compatible tous clients email

---

## ✅ Checklist Finale

- [ ] Secrets SMTP configurés dans Supabase
- [ ] Fonction `send-client-access` déployée
- [ ] Test d'envoi réussi depuis le CRM
- [ ] Email bien reçu par le prospect/client
- [ ] Lien d'accès fonctionne
- [ ] Interaction créée dans `crm_interactions`

---

## 🆘 Besoin d'Aide ?

1. **Consulter les logs** : Dashboard Supabase → Functions → send-client-access → Logs
2. **Lire la doc complète** : `FIX_EMAIL_ESPACE_PROSPECT_2026.md`
3. **Tester les secrets** : `node scripts/test-email-prospect-access.js --check-secrets`
4. **Tester l'envoi** : `node scripts/test-email-prospect-access.js <lead_id>`

---

**Date** : 21 février 2026
**Statut** : ✅ Corrections déployées
**Prochaine étape** : Tester l'envoi depuis le CRM
