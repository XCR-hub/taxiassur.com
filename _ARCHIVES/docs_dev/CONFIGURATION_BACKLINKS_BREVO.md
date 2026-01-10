# Configuration du Système de Backlinks avec Brevo

## Vue d'ensemble

Le système de backlinks a été migré de SendGrid vers Brevo avec tracking complet des emails (envoyés, ouverts, clics, réponses).

## Architecture

### 1. Base de données

Deux nouvelles tables créées :

- **`backlink_email_campaigns`** : Gestion des campagnes d'outreach
  - Stats automatiques : emails envoyés, ouverts, clics, réponses, backlinks obtenus
  - Taux de conversion calculé automatiquement

- **`backlink_email_tracking`** : Tracking détaillé de chaque email
  - Statut : sent, opened, clicked, replied, bounced
  - Timestamps précis pour chaque action
  - ID message Brevo pour corrélation
  - Données d'événements complètes

### 2. Edge Functions

#### `send-backlink-email-brevo`
- Envoie les emails de prospection via Brevo
- Design HTML professionnel avec template TaxiAssur
- Enregistrement automatique du tracking dans la base
- Retourne l'ID du message Brevo

#### `brevo-webhook-handler`
- Reçoit les événements Brevo en temps réel
- Met à jour automatiquement le statut des emails
- Gère : opened, clicked, bounced, spam, unsubscribed
- Pas d'authentification (webhook public)

## Configuration Brevo

### Étape 1 : Obtenir la clé API Brevo

1. Connectez-vous à votre compte Brevo : https://app.brevo.com
2. Allez dans **Settings** → **SMTP & API** → **API Keys**
3. Créez une nouvelle clé API avec les permissions :
   - Envoi d'emails (obligatoire)
   - Webhooks (obligatoire)

### Étape 2 : Configurer le Webhook Brevo

1. Dans Brevo, allez dans **Settings** → **Webhooks**
2. Cliquez sur **Add a new webhook**
3. URL du webhook : `https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/brevo-webhook-handler`
4. Sélectionnez les événements à tracker :
   - ✅ **Delivered** (email délivré)
   - ✅ **Opened** (email ouvert)
   - ✅ **Clicked** (lien cliqué)
   - ✅ **Soft bounce** (échec temporaire)
   - ✅ **Hard bounce** (échec permanent)
   - ✅ **Spam** (marqué comme spam)
   - ✅ **Unsubscribed** (désabonné)

5. Cliquez sur **Create**

### Étape 3 : Tester le système

URL du webhook : `https://kdsaagvnklycxghqbdjl.supabase.co/functions/v1/brevo-webhook-handler`

## Utilisation du système

### Envoyer un email de backlink

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/send-backlink-email-brevo`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      campaign_id: 'uuid-de-la-campagne',
      recipient_email: 'contact@example.com',
      recipient_name: 'Jean Dupont',
      recipient_website: 'example.com',
      subject: 'Collaboration TaxiAssur x Example',
      content: `Bonjour Jean,

Je vous contacte au sujet d'une collaboration potentielle...

Cordialement,
L'équipe TaxiAssur`
    })
  }
);
```

### Consulter les stats d'une campagne

```sql
SELECT
  name,
  total_sent,
  total_opened,
  total_clicked,
  total_replied,
  total_backlinks,
  conversion_rate
FROM backlink_email_campaigns
WHERE id = 'votre-campaign-id';
```

### Voir tous les emails d'une campagne

```sql
SELECT
  recipient_email,
  recipient_name,
  status,
  sent_at,
  opened_at,
  clicked_at,
  replied_at,
  backlink_obtained
FROM backlink_email_tracking
WHERE campaign_id = 'votre-campaign-id'
ORDER BY sent_at DESC;
```

## Dashboard Backoffice

Le dashboard `/backoffice/backlink-automation` affiche maintenant :

- **Statistiques temps réel** : emails envoyés, ouverts, taux d'ouverture
- **Liste des campagnes** : avec stats détaillées par campagne
- **Journal d'activité** : historique complet des emails envoyés
- **Tracking en direct** : mise à jour automatique via webhooks Brevo

## Migration depuis SendGrid

Tous les emails sont maintenant envoyés via Brevo au lieu de SendGrid. Les avantages :

✅ Tracking complet automatique (ouvertures, clics)
✅ Webhooks en temps réel
✅ Dashboard analytics intégré dans Brevo
✅ Meilleure délivrabilité
✅ Support français 24/7
✅ Prix plus compétitifs

## Monitoring

### Vérifier que les webhooks fonctionnent

Consultez les logs Supabase :
```
supabase functions logs brevo-webhook-handler
```

Vous devriez voir :
- `✅ Tracking updated for <message-id>`
- `👀 Email opened: <email>`
- `👆 Email clicked: <email>`

### Stats globales

```sql
-- Stats globales toutes campagnes
SELECT
  COUNT(*) as total_emails,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
  COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked,
  COUNT(CASE WHEN backlink_obtained THEN 1 END) as backlinks,
  ROUND(
    COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as taux_ouverture
FROM backlink_email_tracking;
```

## Prochaines étapes

1. ✅ Migrer tous les envois vers Brevo
2. ✅ Configurer le webhook Brevo
3. ⏳ Créer des templates d'emails personnalisés
4. ⏳ Ajouter la détection automatique de réponses
5. ⏳ Implémenter le scoring automatique des prospects
6. ⏳ Dashboard analytics avancé

## Support

Pour toute question sur la configuration :
- Documentation Brevo : https://developers.brevo.com/
- URL webhook : https://kdsaagvnklycxghqbdjl.supabase.co/functions/v1/brevo-webhook-handler
