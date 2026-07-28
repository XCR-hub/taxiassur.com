# ⚡ MISE À JOUR URGENTE IONOS - 23 FÉVRIER 2026

## 🔐 Nouveau Mot de Passe IONOS

**Email** : team@taxiassur.com
**Mot de passe** : `TAXIassur!,`

## ✅ Étape 1 : Vérifier la configuration actuelle

```bash
# Voir les secrets actuels (masqués)
supabase secrets list
```

## ✅ Étape 2 : Mettre à jour le secret IONOS

**Option A : Via Terminal (RECOMMANDÉ)**
```bash
# Définir le nouveau mot de passe
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!,"

# Vérifier que c'est bien configuré
supabase secrets list | grep IONOS
```

**Option B : Via Dashboard Supabase**
1. Aller sur https://supabase.com/dashboard/project/bpwcakjtwgdtfwghylwv/settings/functions
2. Cliquer sur "Edge Functions Secrets"
3. Chercher `IONOS_EMAIL_PASSWORD`
4. Cliquer sur "Edit"
5. Entrer : `TAXIassur!,`
6. Cliquer sur "Save"

## 📧 Fonctions concernées

Les fonctions suivantes utilisent ce mot de passe pour envoyer les emails :

1. ✅ `send-lead-email-brevo` → Redirige vers IONOS
2. ✅ `send-email-ionos` → Email principal nouveaux leads
3. ✅ `send-document-notification` → Notifications documents uploadés
4. ✅ `send-crm-email` → Emails commerciaux
5. ✅ `send-email-universal` → Envoi universel

## 🔍 Vérification après mise à jour

```bash
# Tester l'envoi d'email
npm run test:email-notification
```

## ⚙️ Configuration complète IONOS

Voici tous les secrets IONOS nécessaires :

```bash
IONOS_SMTP_HOST="smtp.ionos.fr"
IONOS_SMTP_PORT="587"
IONOS_EMAIL_USER="team@taxiassur.com"
IONOS_EMAIL_PASSWORD=REDACTED
```

## 🎯 Actions automatiques après mise à jour

Une fois le secret mis à jour, les emails suivants seront envoyés automatiquement :

### Nouveau Lead (formulaire)
- ✉️ **team@taxiassur.com** : "NOUVEAU LEAD" avec infos complètes
- ✉️ **Prospect** : Email de bienvenue + lien espace prospect + liste des 7 documents

### Document uploadé
- ✉️ **team@taxiassur.com** : "Nouveau document uploadé par [Nom Prospect]"
- ✉️ **Prospect** : Confirmation de réception du document

## ⚠️ IMPORTANT

**TOUS** les emails partent de `team@taxiassur.com`

Aucun email ne part d'un autre expéditeur. Configuration vérifiée dans :
- send-email-ionos/index.ts (ligne 39, 58, 103, 145)
- send-document-notification/index.ts (ligne 39, 149)
- send-crm-email/index.ts
- Et toutes les autres fonctions d'envoi

## 🧪 Test Rapide

Pour tester que tout fonctionne, créez un nouveau lead via le formulaire :
https://taxiassur.com/#contact

Vous devriez recevoir un email à team@taxiassur.com dans les 5 secondes.
