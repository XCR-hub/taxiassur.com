# Correction Structure Table email_messages - 15 Janvier 2026

## Problème Identifié

La table `email_messages` n'avait pas toutes les colonnes requises par l'Edge Function `sync-ionos-imap-v2`, causant des erreurs lors de la synchronisation.

## Colonnes Manquantes Ajoutées

| Colonne | Type | Description |
|---------|------|-------------|
| `provider` | text | Fournisseur (ionos, brevo, sendgrid) |
| `direction` | text | Direction (inbound/outbound) |
| `from_name` | text | Nom de l'expéditeur |
| `to_emails` | text[] | Liste des destinataires |
| `to_names` | text[] | Noms des destinataires |
| `attachments` | jsonb | Pièces jointes |
| `is_read` | boolean | Email lu (false par défaut) |
| `is_starred` | boolean | Email favori (false par défaut) |
| `is_important` | boolean | Email important |
| `classification` | text | Classification auto |
| `confidence_score` | numeric | Score de confiance |
| `lead_id` | uuid | Référence vers crm_leads |
| `auto_matched` | boolean | Correspondance auto |
| `message_id` | text | ID unique du message |

## Index Ajoutés

Pour améliorer les performances :
- `idx_email_messages_provider`
- `idx_email_messages_direction`
- `idx_email_messages_lead_id`
- `idx_email_messages_message_id`
- `idx_email_messages_received_at`
- `idx_email_messages_from_email`
- `idx_email_messages_is_read`

## Test de Synchronisation

La synchronisation IMAP devrait maintenant fonctionner correctement :

1. Allez sur https://taxiassur.com/backoffice/crm-killer/inbox
2. Cliquez sur "Synchroniser"
3. Les emails de team@taxiassur.com devraient apparaître

## Statut

✅ Migration appliquée
✅ Structure de table corrigée
✅ Index créés
⏳ Tester la synchronisation
