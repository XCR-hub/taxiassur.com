# 🚀 Quick Start : WhatsApp en 10 Minutes

## Configuration Rapide pour TaxiAssur

### 1. Récupérer vos Identifiants Twilio (2 min)

1. Connectez-vous à https://console.twilio.com
2. Copiez votre **Account SID** (commence par AC...)
3. Cliquez sur "View" pour voir votre **Auth Token**
4. Notez votre **numéro de téléphone Twilio**

### 2. Mettre à Jour .env (1 min)

Ouvrez `/tmp/cc-agent/61788020/project/.env` et mettez à jour :

```env
TWILIO_ACCOUNT_SID=AC_votre_sid_ici
TWILIO_AUTH_TOKEN=votre_token_ici
TWILIO_PHONE_NUMBER=+16058006320
TWILIO_WHATSAPP_NUMBER=whatsapp:+16058006320
```

### 3. Activer WhatsApp Sandbox (2 min)

1. Dans Twilio Console : **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Vous verrez un code comme `join abc-xyz`
3. Depuis votre WhatsApp personnel, envoyez ce code au numéro affiché
4. Vous recevrez une confirmation

### 4. Configurer le Webhook (2 min)

Dans Twilio Console → **Messaging** → **WhatsApp Sandbox Settings** :

**When a message comes in** :
```
https://drohhxrkoequjphvabvq.supabase.co/functions/v1/twilio-webhook
```
Method: **HTTP POST**

Cliquez sur **Save**

### 5. Tester (3 min)

#### Test Envoi :
1. Allez sur https://taxiassur.com/backoffice/whatsapp
2. Cliquez sur **+ Nouveau Contact**
3. Entrez votre numéro : `+33...`
4. Envoyez "Test depuis backoffice"

#### Test Réception :
1. Depuis votre WhatsApp, envoyez "Test réception" au numéro Twilio
2. Le message doit apparaître dans le backoffice sous 3 secondes

### ✅ C'est Fait !

Vous pouvez maintenant :
- Recevoir les messages WhatsApp de vos clients
- Répondre directement depuis le backoffice
- Voir l'historique complet des conversations

## 🎯 Mode Production (Optionnel)

Pour passer en production avec votre propre numéro :

1. Dans Twilio : **Messaging** → **Senders** → **Request to enable your Twilio number**
2. Remplissez le formulaire (nom entreprise, site web, profil Facebook Business)
3. Attendez l'approbation (1-3 jours)
4. Une fois approuvé, mettez à jour les webhooks avec votre numéro production

## 📊 Vérification Rapide

```bash
# Vérifier que tout fonctionne
curl https://drohhxrkoequjphvabvq.supabase.co/functions/v1/twilio-webhook \
  -X POST \
  -d "From=whatsapp:+33612345678" \
  -d "Body=Test" \
  -d "To=whatsapp:+16058006320"
```

Vous devriez voir le message dans Supabase → **wa_messages**

## 🆘 Problème ?

**Messages non reçus ?**
→ Vérifiez que vous avez bien joint le sandbox (`join abc-xyz`)

**Pas d'envoi ?**
→ Vérifiez `TWILIO_AUTH_TOKEN` dans `.env`

**Webhook ne fonctionne pas ?**
→ Vérifiez l'URL dans Twilio Console (avec `/functions/v1/`)

## 📞 Besoin d'Aide ?

Consultez le guide complet : `GUIDE_TWILIO_WHATSAPP_SETUP.md`
