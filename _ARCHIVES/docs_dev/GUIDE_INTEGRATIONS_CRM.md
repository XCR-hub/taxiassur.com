# 📧 GUIDE INTÉGRATIONS CRM - EMAIL & SMS

## 🎯 OBJECTIF
Connecter le CRM TaxiAssur.com aux providers email/SMS pour :
- **Envoyer des emails** automatiques et manuels
- **Envoyer des SMS** de relance et notifications
- **Recevoir les réponses** et les tracer dans le CRM
- **Analyser les performances** (taux d'ouverture, clics, réponses)

---

## 📧 INTÉGRATION EMAIL

### **Option 1 : Brevo (ex-Sendinblue)** ⭐ RECOMMANDÉ

**Pourquoi Brevo ?**
- Plan gratuit : **300 emails/jour**
- API simple et française (RGPD compliant)
- Tracking ouvertures/clics inclus
- Prix abordable si scaling

**Setup Brevo :**

#### 1. Créer compte Brevo
1. Aller sur : https://app.brevo.com/account/register
2. S'inscrire (gratuit)
3. Vérifier votre email

#### 2. Obtenir API Key
1. Aller sur : https://app.brevo.com/settings/keys/api
2. Cliquer "Generate a new API key"
3. Nom : `TaxiAssur CRM`
4. Copier la clé (format : `xkeysib-xxxxx`)

#### 3. Configurer dans `.env`
```env
# Brevo (ex-Sendinblue)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_SENDER_EMAIL=contact@taxiassur.com
BREVO_SENDER_NAME=TaxiAssur.com
```

#### 4. Vérifier domaine email
1. Aller sur : https://app.brevo.com/settings/domains
2. Ajouter `taxiassur.com`
3. Configurer les DNS (SPF, DKIM, DMARC)
   - SPF : `v=spf1 include:spf.brevo.com ~all`
   - DKIM : suivre instructions Brevo
4. Attendre validation (quelques heures)

**Code intégration Brevo :**

```typescript
// Dans votre Edge Function ou API
async function sendEmailBrevo(
  to: string,
  subject: string,
  htmlContent: string
) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': Deno.env.get('BREVO_API_KEY')!
    },
    body: JSON.stringify({
      sender: {
        name: Deno.env.get('BREVO_SENDER_NAME'),
        email: Deno.env.get('BREVO_SENDER_EMAIL')
      },
      to: [{ email: to }],
      subject,
      htmlContent
    })
  });

  return await response.json();
}
```

**Prix Brevo :**
- **Gratuit** : 300 emails/jour
- **Starter (€25/mois)** : 20 000 emails/mois
- **Business (€65/mois)** : 100 000 emails/mois

---

### **Option 2 : Resend** (Alternative moderne)

**Pourquoi Resend ?**
- API ultra-simple
- Support React Email (templates JSX)
- Plan gratuit : 100 emails/jour
- Très rapide

**Setup Resend :**

1. Créer compte : https://resend.com/signup
2. Obtenir API Key : https://resend.com/api-keys
3. Ajouter dans `.env` :
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

**Code intégration Resend :**

```typescript
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

await resend.emails.send({
  from: 'TaxiAssur <contact@taxiassur.com>',
  to: prospect.email,
  subject: 'Votre devis personnalisé',
  html: emailContent
});
```

**Prix Resend :**
- **Gratuit** : 100 emails/jour
- **Pro ($20/mois)** : 50 000 emails/mois

---

## 📱 INTÉGRATION SMS

### **Option 1 : Twilio** ⭐ RECOMMANDÉ

**Pourquoi Twilio ?**
- Leader mondial SMS
- API robuste et documentée
- Webhooks pour réponses entrantes
- Bon deliverability

**Setup Twilio :**

#### 1. Créer compte Twilio
1. Aller sur : https://www.twilio.com/try-twilio
2. S'inscrire (crédit gratuit $15)
3. Vérifier votre téléphone

#### 2. Obtenir numéro Twilio
1. Aller sur : https://console.twilio.com/phone-numbers/
2. Acheter un numéro français (+33)
   - Coût : ~€1/mois
3. Activer SMS sortants

#### 3. Obtenir credentials
1. Aller sur : https://console.twilio.com/
2. Copier :
   - **Account SID** : `ACxxxxxxxxxxxx`
   - **Auth Token** : `xxxxxxxxxx`
   - **Twilio Phone Number** : `+33xxxxxxxxx`

#### 4. Configurer dans `.env`
```env
# Twilio SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx
```

**Code intégration Twilio :**

```typescript
async function sendSMSTwilio(
  to: string,
  message: string
) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

  const auth = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: fromPhone,
        Body: message
      })
    }
  );

  return await response.json();
}
```

**Prix Twilio :**
- **Numéro français** : €1/mois
- **SMS sortant France** : €0.08/SMS
- **SMS entrant France** : €0.01/SMS

**Budget estimé 1000 SMS/mois :** €81/mois

---

### **Option 2 : OVH Telecom** (Alternative française)

**Pourquoi OVH ?**
- Français (RGPD)
- Moins cher que Twilio
- Bonne deliverability France

**Setup OVH SMS :**

1. Commander service : https://www.ovhtelecom.fr/sms/
2. Obtenir credentials API
3. Configuration similaire à Twilio

**Prix OVH SMS :**
- **SMS France** : €0.035/SMS
- Pas de frais mensuels

---

## 🔔 WEBHOOKS POUR RÉPONSES ENTRANTES

### Recevoir réponses email (Brevo)

**Endpoint webhook :**
```
https://taxiassur.com/api/webhooks/brevo-email-reply
```

**Configuration Brevo :**
1. Aller sur : https://app.brevo.com/settings/webhooks
2. Ajouter webhook
3. URL : `https://taxiassur.com/api/webhooks/brevo-email-reply`
4. Events : `email_reply`, `email_opened`, `email_clicked`

**Code handler webhook :**

```typescript
// public/api/webhooks/brevo-email-reply.php
<?php
header('Content-Type: application/json');

$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Logger dans Supabase
$supabase_url = getenv('VITE_SUPABASE_URL');
$supabase_key = getenv('VITE_SUPABASE_ANON_KEY');

if ($data['event'] === 'email_reply') {
  // Enregistrer réponse dans crm_interactions
  $ch = curl_init("$supabase_url/rest/v1/crm_interactions");
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'lead_id' => $data['message_id'], // À mapper
    'type' => 'email',
    'direction' => 'inbound',
    'content' => $data['reply_body'],
    'from_email' => $data['from_email']
  ]));
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabase_key,
    'Authorization: Bearer ' . $supabase_key,
    'Content-Type: application/json'
  ]);
  curl_exec($ch);
}

echo json_encode(['success' => true]);
?>
```

### Recevoir réponses SMS (Twilio)

**Endpoint webhook :**
```
https://taxiassur.com/api/webhooks/twilio-sms-reply
```

**Configuration Twilio :**
1. Aller sur : https://console.twilio.com/phone-numbers/
2. Cliquer sur votre numéro
3. Section "Messaging" > Webhook "A MESSAGE COMES IN"
4. URL : `https://taxiassur.com/api/webhooks/twilio-sms-reply`
5. Method : POST

**Code handler webhook :**

```typescript
// Supabase Edge Function
Deno.serve(async (req: Request) => {
  const formData = await req.formData();
  const from = formData.get('From');
  const body = formData.get('Body');
  const messageSid = formData.get('MessageSid');

  // Trouver lead par téléphone
  const { data: lead } = await supabase
    .from('crm_leads_enhanced')
    .select('id')
    .eq('phone', from)
    .single();

  if (lead) {
    // Enregistrer réponse SMS
    await supabase.from('crm_interactions').insert({
      lead_id: lead.id,
      type: 'sms',
      direction: 'inbound',
      content: body,
      from_phone: from
    });

    // Analyse sentiment automatique
    await fetch(
      `${supabaseUrl}/functions/v1/crm-ai-assistant`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze_sentiment',
          content: body,
          lead_id: lead.id
        })
      }
    );
  }

  // Réponse Twilio (vide = pas de SMS auto)
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' }
  });
});
```

---

## 📊 TRACKING PERFORMANCES

### Créer table analytics

```sql
CREATE TABLE IF NOT EXISTS crm_email_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid REFERENCES crm_interactions(id),
  lead_id uuid REFERENCES crm_leads_enhanced(id),

  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,

  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,

  provider text NOT NULL, -- 'brevo', 'resend'
  provider_message_id text,

  created_at timestamptz DEFAULT now()
);
```

### Webhooks tracking (Brevo)

**Events supportés :**
- `email_opened` : Email ouvert
- `email_clicked` : Lien cliqué
- `email_bounced` : Email rejeté
- `email_spam` : Marqué spam

**Handler tracking :**

```typescript
if (data.event === 'email_opened') {
  await supabase.from('crm_email_analytics')
    .update({
      opened_at: new Date().toISOString(),
      open_count: supabase.rpc('increment', { x: 1 })
    })
    .eq('provider_message_id', data.message_id);
}
```

---

## 🧪 TESTER LES INTÉGRATIONS

### Test Email (Brevo)

```bash
curl -X POST https://api.brevo.com/v3/smtp/email \
  -H 'api-key: YOUR_BREVO_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "sender": {
      "name": "TaxiAssur Test",
      "email": "contact@taxiassur.com"
    },
    "to": [{
      "email": "votre-email@gmail.com"
    }],
    "subject": "Test CRM",
    "htmlContent": "<h1>Email envoyé depuis le CRM !</h1>"
  }'
```

### Test SMS (Twilio)

```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  --data-urlencode "From=+33XXXXXXXXX" \
  --data-urlencode "To=+33XXXXXXXXX" \
  --data-urlencode "Body=Test SMS depuis CRM TaxiAssur" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

---

## 💰 BUDGET ESTIMÉ

### Scénario : 100 leads/jour

| Service | Usage | Prix |
|---------|-------|------|
| **Brevo Email** | 3000 emails/mois | Gratuit |
| **Twilio SMS** | 1000 SMS/mois | €81/mois |
| **Twilio Numéro** | 1 numéro FR | €1/mois |
| **TOTAL** | | **€82/mois** |

### Scénario : 500 leads/jour (scaling)

| Service | Usage | Prix |
|---------|-------|------|
| **Brevo Email** | 15 000 emails/mois | €25/mois |
| **Twilio SMS** | 5000 SMS/mois | €401/mois |
| **Twilio Numéro** | 1 numéro FR | €1/mois |
| **TOTAL** | | **€427/mois** |

---

## ✅ CHECKLIST INTÉGRATION

- [ ] Créer compte Brevo
- [ ] Obtenir API Key Brevo
- [ ] Vérifier domaine email
- [ ] Configurer SPF/DKIM
- [ ] Tester envoi email
- [ ] Créer compte Twilio
- [ ] Acheter numéro français
- [ ] Obtenir credentials Twilio
- [ ] Tester envoi SMS
- [ ] Configurer webhooks Brevo
- [ ] Configurer webhooks Twilio
- [ ] Créer tables analytics
- [ ] Tester réception réponses

---

## 🚀 AUTOMATISATIONS POST-INTÉGRATION

### Email automatique nouveau lead (5min)

```typescript
// Trigger Supabase
CREATE TRIGGER on_lead_created_send_email
  AFTER INSERT ON crm_leads_enhanced
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email();

CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler Edge Function
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'lead_id', NEW.id,
      'template', 'welcome_5min'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### SMS relance J+2 si pas de réponse

```typescript
// Cron quotidien
SELECT cron.schedule(
  'sms_followup_day2',
  '0 10 * * *', -- Tous les jours à 10h
  $$
  SELECT send_followup_sms(id)
  FROM crm_leads_enhanced
  WHERE
    stage = 'Premier Contact'
    AND created_at < NOW() - INTERVAL '2 days'
    AND NOT EXISTS (
      SELECT 1 FROM crm_interactions
      WHERE lead_id = crm_leads_enhanced.id
      AND type = 'sms'
      AND created_at > NOW() - INTERVAL '2 days'
    );
  $$
);
```

---

**🎯 RÉSULTAT : CRM 100% OPÉRATIONNEL AVEC COMMUNICATIONS AUTOMATISÉES**

Les commerciaux peuvent désormais envoyer emails/SMS directement depuis le CRM, avec assistance IA, et toutes les interactions sont tracées automatiquement.
