# 📡 Architecture des Communications - TaxiAssur

**Date:** 2 Janvier 2026
**Status:** Documentation complète

---

## 🎯 Vue d'Ensemble

Votre plateforme utilise **3 canaux de communication** pour interagir avec les prospects et clients :

### 1. 📧 Emails → **Brevo** (anciennement SendGrid)
### 2. 📱 SMS → **Twilio**
### 3. 💬 WhatsApp → **Twilio**

---

## 📧 1. EMAILS - Brevo API

### Configuration Actuelle
```bash
API: Brevo (api.brevo.com)
Clé API: xkeysib-fb3f...8d74-fxE7DKuPtkL7bMlJ
Email expéditeur: team@taxiassur.com
Nom: TaxiAssur
```

### Edge Function
**Fichier:** `supabase/functions/send-email/index.ts`

### Types d'Emails
1. **Confirmation client** : Email automatique après demande de devis
2. **Notification équipe** : Alerte interne pour nouveau lead
3. **Suivi commercial** : Relances et nurturing
4. **Newsletter** : Communications marketing

### Endpoint API Brevo
```
POST https://api.brevo.com/v3/smtp/email
Headers: 
  - api-key: [BREVO_API_KEY]
  - Content-Type: application/json
```

### Status Actuel
⚠️ **DÉSACTIVÉ TEMPORAIREMENT**
- Trigger SQL désactivé à cause du bug `format()`
- L'edge function est fonctionnelle
- La clé API Brevo est configurée

---

## 📱 2. SMS - Twilio API

### Configuration Actuelle
```bash
API: Twilio (api.twilio.com)
Account SID: ACe735b7f24703a4b496ca1c816c1d610f
Auth Token: YOUR_AUTH_TOKEN_HERE ⚠️
Messaging Service SID: MGcefbb28732fdb969fea3f71913738f17
Numéro: +16058006320
```

### Edge Function
**Fichier:** `supabase/functions/send-sms/index.ts`

### Types de SMS
1. **Confirmation RDV** : Rappel de rendez-vous
2. **Code de vérification** : 2FA et sécurité
3. **Relance urgente** : Suivi hot leads
4. **Notifications critiques** : Sinistres, échéances

### Endpoint API Twilio
```
POST https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json
Auth: Basic [Base64(SID:TOKEN)]
```

### Status Actuel
⚠️ **AUTH_TOKEN NON CONFIGURÉ**
- L'edge function existe
- Besoin du vrai Auth Token Twilio

---

## 💬 3. WhatsApp - Twilio WhatsApp Business API

### Configuration Actuelle
```bash
API: Twilio WhatsApp
Account SID: ACe735b7f24703a4b496ca1c816c1d610f
Auth Token: YOUR_AUTH_TOKEN_HERE ⚠️
Numéro WhatsApp: whatsapp:+14155238886 (Twilio Sandbox)
```

### Edge Function
**Fichier:** `supabase/functions/send-whatsapp/index.ts`

### Tables Database
- `wa_conversations` : Historique des conversations
- `wa_contacts` : Contacts WhatsApp + opt-in/opt-out
- `wa_messages` : Messages entrants/sortants
- `wa_templates` : Templates WhatsApp approuvés

### Types de Messages
1. **Message libre** : Body personnalisé (nécessite conversation active)
2. **Template WhatsApp** : Messages pré-approuvés par Meta
3. **Messages avec média** : Images, PDFs, documents

### Webhooks Configurés
- **Réception messages** : `supabase/functions/twilio-webhook`
- **Status messages** : Suivi livraison/lecture

### Status Actuel
⚠️ **AUTH_TOKEN NON CONFIGURÉ**
- Structure complète en place
- Tables CRM WhatsApp créées
- Besoin du vrai Auth Token Twilio

---

## 🔧 Edge Functions Disponibles

| Fonction | API Utilisée | Status | Fichier |
|----------|--------------|--------|---------|
| `send-email` | Brevo | 🟢 Config OK | `supabase/functions/send-email/index.ts` |
| `send-sms` | Twilio | 🟡 Token manquant | `supabase/functions/send-sms/index.ts` |
| `send-whatsapp` | Twilio | 🟡 Token manquant | `supabase/functions/send-whatsapp/index.ts` |
| `twilio-webhook` | Twilio | 🟢 Fonctionnel | `supabase/functions/twilio-webhook/index.ts` |
| `whatsapp-webhook` | Twilio | 🟢 Fonctionnel | `supabase/functions/whatsapp-webhook/index.ts` |

---

## 📊 Automatisations Configurées

### Triggers Database (Supabase)
1. ✅ **Envoi email lead** : `trigger_send_lead_emails` (désactivé)
2. ✅ **Scoring automatique** : `trigger_auto_sync_lead_fields`
3. ✅ **Relances CRM** : Gestion pipeline
4. ✅ **WhatsApp auto-reply** : Webhooks Twilio

### Crons Configurés
Plusieurs crons pour :
- Génération contenu SEO
- Agrégation news
- Backup automatique
- Nettoyage données

---

## 🔐 Sécurité & Authentification

### Variables d'Environnement

**Configurées ✅**
- `BREVO_API_KEY` : Email service
- `TWILIO_ACCOUNT_SID` : Identifiant Twilio
- `TWILIO_MESSAGING_SERVICE_SID` : Service SMS

**Manquantes ⚠️**
- `TWILIO_AUTH_TOKEN` : Token d'authentification Twilio (URGENT)

### CORS & Permissions
Toutes les edge functions ont :
- Headers CORS configurés
- Authentification Supabase
- Rate limiting (à implémenter)

---

## 💰 Coûts Approximatifs

### Brevo (Emails)
- **Plan gratuit** : 300 emails/jour
- **Au-delà** : ~25€/mois (10 000 emails)

### Twilio (SMS + WhatsApp)
- **SMS France** : ~0.08€/SMS
- **WhatsApp** : 
  - Messages marketing : ~0.04€
  - Messages service : ~0.01€
  - Conversations : Gratuit sous conditions

---

## 🚀 Actions Prioritaires

### 🔴 URGENT - Twilio Auth Token
Sans ce token, **SMS et WhatsApp ne fonctionnent pas**.

**Comment le récupérer:**
1. Se connecter à [Twilio Console](https://console.twilio.com)
2. Aller dans Account → API Keys & Tokens
3. Copier le "Auth Token"
4. L'ajouter dans `.env` : `TWILIO_AUTH_TOKEN=xxx`

### 🟡 MOYEN - Réactiver Emails
Corriger le trigger SQL pour réactiver les emails automatiques.

### 🟢 BONUS - WhatsApp Production
Actuellement en **Twilio Sandbox** (numéro test).
Pour la production :
1. Demander un numéro WhatsApp Business
2. Soumettre templates à Meta pour approbation
3. Configurer le webhook de production

---

## 📞 Contact Support APIs

- **Brevo** : support@brevo.com
- **Twilio** : [Support Console](https://support.twilio.com)

---

## 🎯 Recommandations

### Pour Restaurer les Emails
**Option 1: Rester sur Brevo**
- Corriger le bug SQL du trigger
- Tester l'envoi d'emails
- Créer des templates Brevo

**Option 2: Revenir à SendGrid**
- Restaurer les anciennes edge functions
- Récupérer les modèles SendGrid
- Remettre les variables d'environnement

### Pour Activer SMS & WhatsApp
1. Compléter la configuration Twilio (Auth Token)
2. Tester les edge functions
3. Configurer les webhooks sur Twilio
4. Créer les templates WhatsApp

---

**Conclusion:** Votre architecture est solide, mais il manque :
1. Le Twilio Auth Token (critique pour SMS/WhatsApp)
2. La correction du trigger email (pour automatiser emails)
