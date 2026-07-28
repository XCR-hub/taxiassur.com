# 🔥 CONFIGURATION URGENTE - Secrets IONOS (2 minutes)

## ⚠️ PROBLÈME ACTUEL
Les emails ne partent pas car les **secrets IONOS ne sont PAS configurés** dans Supabase.

## ✅ SOLUTION IMMÉDIATE (2 minutes chrono)

### Étape 1 : Ouvrir le Vault Supabase
**URL directe** : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/vault/secrets

### Étape 2 : Ajouter ces 4 secrets

Cliquez sur **"New secret"** et ajoutez UN PAR UN :

#### Secret 1
- **Name** : `IONOS_SMTP_HOST`
- **Value** : `smtp.ionos.fr`

#### Secret 2
- **Name** : `IONOS_SMTP_PORT`
- **Value** : `465`

#### Secret 3
- **Name** : `IONOS_EMAIL_USER`
- **Value** : `team@taxiassur.com`

#### Secret 4 (LE PLUS IMPORTANT)
- **Name** : `IONOS_EMAIL_PASSWORD`
- **Value** : `TAXIassur!,`

### Étape 3 : Attendre 30 secondes
Les Edge Functions redémarrent automatiquement après la modification des secrets.

### Étape 4 : Tester immédiatement
Créez un nouveau lead dans le formulaire → vous recevrez l'email en **moins de 60 secondes** !

---

## 🧪 ALTERNATIVE : Configuration via CLI

Si vous préférez utiliser le terminal (plus rapide) :

```bash
# 1. Installer Supabase CLI (une seule fois)
brew install supabase/tap/supabase  # MacOS
# ou
npm install supabase --save-dev     # npm local

# 2. Se connecter
npx supabase login

# 3. Lier le projet
npx supabase link --project-ref drohhxrkoequjphvabvq

# 4. Configurer les secrets (copiez-collez)
npx supabase secrets set IONOS_SMTP_HOST=smtp.ionos.fr \
  IONOS_SMTP_PORT=465 \
  IONOS_EMAIL_USER=team@taxiassur.com \
  IONOS_EMAIL_PASSWORD=REDACTED
```

---

## 📊 VÉRIFICATION

Une fois configuré, les emails partiront automatiquement pour :
- ✅ Chaque nouveau lead (confirmation client + notification équipe)
- ✅ Upload de documents par le prospect
- ✅ Toutes les notifications CRM

**Temps total** : 2 minutes max ⏱️
