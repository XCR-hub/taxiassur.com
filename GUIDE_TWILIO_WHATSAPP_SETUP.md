# Guide Complet : Configuration WhatsApp avec Twilio

## 📱 Vue d'Ensemble

Ce guide vous explique comment configurer WhatsApp Business avec Twilio pour votre plateforme TaxiAssur.

## 🚀 Étapes de Configuration

### 1. Créer un Compte Twilio

1. **Inscription** : https://www.twilio.com/try-twilio
2. **Vérifiez votre compte** avec votre numéro de téléphone
3. **Notez vos identifiants** :
   - Account SID
   - Auth Token

### 2. Configurer WhatsApp Business sur Twilio

#### Option A : Numéro WhatsApp Sandbox (Test)
Pour tester rapidement sans attendre l'approbation :

1. Allez dans **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Envoyez le code joint à votre WhatsApp : `join [votre-code]`
3. Vous pouvez maintenant recevoir/envoyer des messages de test

#### Option B : Numéro WhatsApp Production (Recommandé)
Pour la production avec votre propre numéro :

1. **Demander un numéro WhatsApp Business** :
   - Dans Twilio Console : **Messaging** → **WhatsApp** → **Senders**
   - Cliquez sur **Request to enable your Twilio number for WhatsApp**

2. **Vérifications requises** :
   - Nom de l'entreprise : **TaxiAssur**
   - Site web : **https://taxiassur.com**
   - Profil Facebook Business (requis)
   - Description de votre cas d'usage

3. **Délai d'approbation** : 1-3 jours ouvrables

### 3. Configurer les Variables d'Environnement

Ajoutez dans votre fichier `.env` :

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACe735b7f24703a4b496ca1c816c1d610f
TWILIO_AUTH_TOKEN=votre_auth_token_ici
TWILIO_PHONE_NUMBER=+16058006320

# WhatsApp Configuration
TWILIO_WHATSAPP_NUMBER=whatsapp:+16058006320
```

**⚠️ Important** : Remplacez `votre_auth_token_ici` par votre vrai Auth Token depuis Twilio Console

### 4. Configurer le Webhook Twilio

Les webhooks permettent à Twilio d'envoyer les messages entrants vers votre application.

#### A. URL du Webhook
Votre webhook est déjà configuré à :
```
https://taxiassur.com/functions/v1/twilio-webhook
```

#### B. Configuration dans Twilio Console

1. Allez dans **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
2. Dans **"WHEN A MESSAGE COMES IN"** :
   ```
   https://drohhxrkoequjphvabvq.supabase.co/functions/v1/twilio-webhook
   ```
   - Méthode : **HTTP POST**

3. Dans **"STATUS CALLBACK URL"** (optionnel) :
   ```
   https://drohhxrkoequjphvabvq.supabase.co/functions/v1/whatsapp-status
   ```
   - Méthode : **HTTP POST**

### 5. Configurer les Templates de Messages

#### Templates Pré-approuvés
WhatsApp nécessite des templates pré-approuvés pour l'envoi proactif.

**Template 1 : Bienvenue**
```
Bonjour {{1}} ! 👋

Bienvenue chez TaxiAssur, votre expert en assurance taxi.

Nous avons bien reçu votre demande concernant {{2}}.

Un conseiller reviendra vers vous sous 2h maximum.

Des questions ? Répondez directement à ce message !

L'équipe TaxiAssur
```

**Template 2 : Confirmation Devis**
```
Bonjour {{1}} ! 📋

Votre devis d'assurance taxi est prêt :
• Garanties : {{2}}
• Tarif : {{3}}€/mois

Pour valider : répondez OUI
Pour modifier : répondez MODIFIER

Besoin d'aide ? Nous sommes là !
```

**Template 3 : Rappel Document**
```
Bonjour {{1}} ! 📄

Un petit rappel : il nous manque {{2}} pour finaliser votre dossier.

Vous pouvez :
• Répondre avec la photo du document
• L'envoyer par email : contact@taxiassur.com

Merci !
```

#### Soumettre vos Templates

1. Dans Twilio Console : **Messaging** → **Content Templates**
2. Cliquez sur **Create new Template**
3. Remplissez :
   - **Friendly Name** : `welcome_message`
   - **Language** : French (fr)
   - **Category** : UTILITY
   - **Content** : Copiez le template
4. **Submit for approval** (délai : 24-48h)

### 6. Tester la Configuration

#### Test 1 : Envoyer un Message depuis le Backoffice

1. Connectez-vous au backoffice : https://taxiassur.com/backoffice
2. Allez dans **WhatsApp Manager**
3. Cliquez sur **+ Nouveau Contact**
4. Entrez un numéro au format : `+33612345678`
5. Envoyez un message de test

#### Test 2 : Recevoir un Message

1. Depuis votre WhatsApp, envoyez un message au numéro Twilio
2. Le message devrait apparaître dans le backoffice sous 3 secondes
3. Vérifiez dans **Supabase** → **wa_messages** que le message est bien enregistré

#### Test 3 : Vérifier les Webhooks

```bash
# Tester le webhook manuellement
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/twilio-webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+33612345678" \
  -d "To=whatsapp:+16058006320" \
  -d "Body=Test message"
```

### 7. Configurer l'Interface Admin

#### Accès WhatsApp Manager
**URL** : https://taxiassur.com/backoffice/whatsapp

#### Fonctionnalités Disponibles :

1. **Liste des Conversations**
   - Toutes les conversations WhatsApp
   - Filtres : Non lues, Assignées, Toutes
   - Compteur de messages non lus

2. **Chat en Temps Réel**
   - Messages entrants/sortants
   - Indicateurs de lecture (✓ ✓)
   - Horodatage précis

3. **Templates Rapides**
   - Cliquez sur 📋 pour utiliser un template
   - Variables automatiquement remplies
   - Gain de temps considérable

4. **Gestion des Contacts**
   - Ajouter un contact : `+33612345678`
   - Voir l'historique complet
   - Marquer comme opt-out

5. **Tags et Assignation**
   - Taguer les conversations (nouveau_lead, urgent, etc.)
   - Assigner à un utilisateur
   - Statut : Ouvert, Fermé, Archivé

### 8. Base de Données

Vos conversations WhatsApp sont stockées dans Supabase :

#### Tables Créées :

**wa_contacts**
- `id` : UUID unique
- `phone_e164` : Numéro au format E.164 (+33...)
- `display_name` : Nom d'affichage
- `opted_out` : Boolean (désabonnement)

**wa_conversations**
- `id` : UUID unique
- `contact_id` : Lien vers wa_contacts
- `status` : open, closed, archived
- `unread_count` : Nombre de non lus
- `tags` : Array de tags
- `assigned_to_user_id` : Assigné à qui

**wa_messages**
- `id` : UUID unique
- `conversation_id` : Lien vers wa_conversations
- `direction` : inbound / outbound
- `body` : Contenu du message
- `status` : queued, sent, delivered, read, failed
- `message_sid` : ID Twilio

**wa_templates**
- `id` : UUID unique
- `name` : Nom du template
- `body` : Contenu
- `variables` : Variables {{1}}, {{2}}...
- `category` : Type de template

### 9. Automatisations Possibles

#### Réponses Automatiques

Modifiez `/functions/v1/twilio-webhook/index.ts` pour ajouter :

```typescript
// Réponse automatique hors heures ouvrables
const now = new Date();
const hour = now.getHours();
if (hour < 9 || hour > 18) {
  await sendWhatsAppMessage(fromNumber,
    "Merci de votre message ! Nos bureaux sont ouverts de 9h à 18h. " +
    "Nous vous répondrons dès notre retour. Pour une urgence, appelez le 0X XX XX XX XX."
  );
}

// Détection de mots-clés
if (body.toLowerCase().includes('devis')) {
  await sendWhatsAppMessage(fromNumber,
    "Parfait ! Pour un devis personnalisé, j'ai besoin de quelques infos :\n" +
    "1. Votre ville\n" +
    "2. Type de véhicule\n" +
    "3. Années d'expérience"
  );
}
```

#### Intégration CRM

Les messages WhatsApp sont automatiquement liés aux leads :

```typescript
// Si le numéro existe dans crm_leads
const { data: lead } = await supabase
  .from('crm_leads')
  .select('*')
  .eq('phone', phoneNumber)
  .single();

if (lead) {
  // Mettre à jour le lead avec le dernier message
  await supabase
    .from('crm_leads')
    .update({
      last_whatsapp_message: body,
      last_contact_date: new Date().toISOString()
    })
    .eq('id', lead.id);
}
```

### 10. Bonnes Pratiques WhatsApp Business

#### 📋 Règles WhatsApp

1. **Fenêtre de 24h** : Vous pouvez répondre librement pendant 24h après le dernier message du client
2. **Après 24h** : Utilisez UNIQUEMENT des templates pré-approuvés
3. **Pas de spam** : Maximum 1 message proactif par jour
4. **Opt-out** : Respectez les désabonnements immédiatement

#### ✅ Messages Autorisés

- ✅ Réponses aux questions
- ✅ Confirmation de rendez-vous
- ✅ Envoi de devis demandé
- ✅ Suivi de dossier en cours
- ✅ Notifications importantes

#### ❌ Messages Interdits

- ❌ Promotions non sollicitées
- ❌ Messages marketing de masse
- ❌ Contenu illégal ou offensant
- ❌ Chaînes de messages
- ❌ Fausses informations

### 11. Monitoring et Analytics

#### Métriques à Suivre

Dans le backoffice, vous pouvez voir :

1. **Taux de réponse** : % de messages répondus sous 2h
2. **Temps de réponse moyen** : Rapidité de votre équipe
3. **Conversations actives** : Nombre de conversations en cours
4. **Taux de conversion** : Leads → Clients via WhatsApp

#### Dashboard SQL (Supabase)

```sql
-- Messages par jour
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound,
  COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound
FROM wa_messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Temps de réponse moyen
SELECT
  AVG(
    EXTRACT(EPOCH FROM (
      reply.created_at - incoming.created_at
    )) / 60
  ) as avg_response_minutes
FROM wa_messages incoming
JOIN wa_messages reply ON reply.conversation_id = incoming.conversation_id
WHERE incoming.direction = 'inbound'
AND reply.direction = 'outbound'
AND reply.created_at > incoming.created_at;
```

### 12. Dépannage

#### Problème : Messages non reçus

**Solutions** :
1. Vérifiez le webhook dans Twilio Console
2. Vérifiez les logs Supabase : Edge Functions → twilio-webhook
3. Testez avec curl (voir section Test)
4. Vérifiez que le numéro est au format E.164 : `+33...`

#### Problème : Messages non envoyés

**Solutions** :
1. Vérifiez `TWILIO_AUTH_TOKEN` dans `.env`
2. Vérifiez le crédit Twilio (minimum $1)
3. Vérifiez que le destinataire a accepté le sandbox (mode test)
4. Regardez les logs dans Twilio Console → Messaging Logs

#### Problème : Template rejeté

**Raisons courantes** :
- Variables mal formatées (utilisez {{1}}, pas {1})
- Contenu trop marketing
- Fautes d'orthographe
- URL sans contexte

**Solution** : Reformulez et resoumettez avec plus de contexte

### 13. Sécurité

#### Valider les Webhooks Twilio

Ajoutez la validation dans votre Edge Function :

```typescript
import { validateRequest } from 'npm:twilio';

const signature = req.headers.get('X-Twilio-Signature');
const url = 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/twilio-webhook';
const params = await req.formData();

const isValid = validateRequest(
  Deno.env.get('TWILIO_AUTH_TOKEN')!,
  signature!,
  url,
  Object.fromEntries(params)
);

if (!isValid) {
  return new Response('Invalid signature', { status: 403 });
}
```

#### Protection des Données

- ✅ Tous les messages sont cryptés en base
- ✅ RLS activé sur toutes les tables WhatsApp
- ✅ Logs d'audit automatiques
- ✅ Rétention des données : 90 jours

### 14. Coûts Twilio WhatsApp

**Tarifs indicatifs** (vérifiez sur twilio.com/pricing) :

- **Messages entrants** : GRATUIT 🎉
- **Messages sortants (conversation)** : ~0.005€ / message
- **Templates (hors conversation)** : ~0.01€ / message
- **Numéro WhatsApp** : ~1€ / mois

**Estimation mensuelle** :
- 100 conversations/mois : ~3€
- 500 conversations/mois : ~12€
- 1000 conversations/mois : ~25€

### 15. Support

#### Aide Twilio
- Documentation : https://www.twilio.com/docs/whatsapp
- Support : https://support.twilio.com
- Community : https://www.twilio.com/community

#### Aide TaxiAssur
- Email : contact@taxiassur.com
- WhatsApp : Utilisez le système lui-même ! 😉

---

## 🎯 Checklist de Démarrage

- [ ] Compte Twilio créé et vérifié
- [ ] WhatsApp Business activé (ou sandbox)
- [ ] Variables d'environnement configurées
- [ ] Webhook configuré dans Twilio
- [ ] Au moins 1 template approuvé
- [ ] Test d'envoi réussi
- [ ] Test de réception réussi
- [ ] Équipe formée au backoffice
- [ ] Automatisations configurées
- [ ] Monitoring en place

## 🚀 Prêt à Démarrer !

Une fois tout configuré, vous pourrez :
- Répondre aux leads en temps réel
- Envoyer des devis par WhatsApp
- Automatiser les suivis
- Améliorer votre taux de conversion

**WhatsApp = +30% de taux de réponse vs Email** 📈

Bonne configuration ! 🎉
