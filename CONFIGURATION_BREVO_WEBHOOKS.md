# 🎯 CONFIGURATION BREVO - WEBHOOKS EMAILS ENTRANTS

## 📋 ÉTAT ACTUEL

### ✅ Ce qui est DÉJÀ configuré :
- ✅ Edge Function `inbound-email-handler` déployée et fonctionnelle
- ✅ Tables `email_conversations` et `crm_interactions` créées
- ✅ AI Classifier pour traiter les emails automatiquement
- ✅ Système d'auto-réponse intelligent
- ✅ Interface CRM prête

### ❌ Ce qui MANQUE :
- ❌ Configuration du webhook Brevo pour envoyer les emails vers Supabase
- ❌ Pas d'emails reçus dans le système (table vide)

---

## 🔧 CONFIGURATION À FAIRE SUR BREVO

### Étape 1 : Activer les Webhooks Inbound

1. **Connectez-vous à Brevo**
   - URL : https://app.brevo.com/
   - Email : team@taxiassur.com

2. **Allez dans les Paramètres Inbound**
   - Menu : **Settings** > **Inbound Parsing**
   - Ou directement : https://app.brevo.com/settings/inbound-parsing

3. **Créer une route Inbound**
   - Cliquez sur **"Create a new route"**
   - Configurez comme suit :

   ```
   📧 Email Address : team@taxiassur.com

   🔗 Webhook URL :
   https://drohhxrkoequjphvabvq.supabase.co/functions/v1/inbound-email-handler

   📨 Method : POST

   🔐 Authentication : None (géré par Supabase)

   ✅ Active : Yes
   ```

4. **Tester la configuration**
   - Envoyez un email de test à team@taxiassur.com
   - Vérifiez que le webhook est appelé
   - Brevo vous montrera les logs

---

## 🧪 TESTER LE SYSTÈME

### Test 1 : Envoyer un email de test

Envoyez un email à `team@taxiassur.com` avec :

```
Sujet : Test système emails entrants
Corps :
Bonjour,

Ceci est un test du système de gestion des emails.
Merci de me confirmer la réception.

Cordialement
```

### Test 2 : Vérifier la réception

```sql
-- Vérifier les emails reçus
SELECT
  subject,
  sender_email,
  direction,
  created_at
FROM email_conversations
ORDER BY created_at DESC
LIMIT 10;

-- Vérifier les interactions CRM
SELECT
  type,
  direction,
  subject,
  from_email,
  created_at
FROM crm_interactions
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 ALTERNATIVE : Forwarder Gmail/Outlook

Si vous ne pouvez pas configurer Brevo, vous pouvez :

### Option A : Forwarder Gmail

1. Connectez-vous à Gmail avec team@taxiassur.com
2. Paramètres > Voir tous les paramètres
3. Onglet "Transfert et POP/IMAP"
4. Cliquez sur "Ajouter une adresse de transfert"
5. Entrez : `inbound-email-handler-bb6fk5bzcq-ew.a.run.app`
   (Vous obtiendrez cette URL depuis Supabase)

### Option B : Microsoft 365 / Outlook

1. Connectez-vous à Outlook.com ou admin.microsoft.com
2. Créez une règle de transfert automatique
3. Transférez tous les emails vers le webhook

---

## 🔑 URLS IMPORTANTES

### Production :
```
Webhook URL : https://drohhxrkoequjphvabvq.supabase.co/functions/v1/inbound-email-handler

Test direct :
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/inbound-email-handler \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "test-123",
    "sender": {
      "email": "test@example.com",
      "name": "Test Sender"
    },
    "to": [{
      "email": "team@taxiassur.com"
    }],
    "subject": "Test Email",
    "text": "This is a test email",
    "date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "messageId": "test-message-id"
  }'
```

---

## 🎯 AVANTAGES DU SYSTÈME

Une fois configuré, le système :

1. **Reçoit automatiquement tous les emails** envoyés à team@taxiassur.com
2. **Crée ou met à jour le contact** dans le CRM
3. **Classifie l'email** automatiquement (demande, question, réclamation...)
4. **Envoie une réponse automatique** si approprié
5. **Notifie l'équipe** via le dashboard CRM
6. **Enregistre tout l'historique** des conversations
7. **Met à jour le statut du lead** (de "nouveau" à "contacté")

---

## 🚨 PROBLÈME ACTUEL AVEC ROGENEY

### Diagnostic :
```sql
-- Vérifier si ROGENEY existe
SELECT * FROM leads
WHERE email ILIKE '%rogeney%'
   OR company_name ILIKE '%rogeney%';

-- Vérifier les interactions
SELECT * FROM crm_interactions
WHERE from_email ILIKE '%rogeney%'
   OR to_email ILIKE '%rogeney%';
```

### Solution immédiate :

1. **Configurer le webhook Brevo** (priorité 1)
2. **Marquer manuellement le lead comme "contacté"** en attendant
3. **Copier les emails manuellement** dans le CRM pour l'historique

---

## 📱 ACCÈS RAPIDE

- **Dashboard CRM** : https://taxiassur.com/admin/crm
- **Brevo Settings** : https://app.brevo.com/settings
- **Supabase Functions** : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/functions

---

**💡 Une fois le webhook configuré, le système fonctionnera de manière 100% automatique !**
