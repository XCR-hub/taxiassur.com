# Intégration Keyyo Softphone - Guide Complet 2026

## Vue d'ensemble

L'intégration Keyyo permet de gérer les appels téléphoniques directement depuis le CRM TaxiAssur avec :
- **Click-to-Call** : Initier des appels en 1 clic depuis une fiche lead
- **Historique automatique** : Tous les appels sont enregistrés automatiquement
- **Enregistrements audio** : Téléchargement et stockage des enregistrements
- **Liaison automatique** : Les appels sont liés automatiquement aux leads
- **Statistiques en temps réel** : Dashboard des performances d'appels

---

## Architecture

### Tables créées

1. **telephony_providers** - Configuration des fournisseurs VoIP
2. **telephony_users** - Mapping utilisateurs CRM ↔ extensions téléphoniques
3. **telephony_calls** - Historique complet des appels
4. **telephony_recordings** - Enregistrements audio stockés

### Edge Functions déployées

1. **keyyo-click-to-call** - Initie un appel via l'API Keyyo
2. **keyyo-fetch-calls** - Récupère l'historique des appels
3. **keyyo-webhook** - Reçoit les événements Keyyo (appels, enregistrements)

### Service Frontend

- **keyyo-service.ts** - Service singleton pour interagir avec Keyyo
- **CallDialog.tsx** - Interface d'appel améliorée avec support Keyyo

---

## Configuration

### Étape 1 : Obtenir les identifiants Keyyo

1. Connectez-vous à votre compte Keyyo
2. Allez dans **Paramètres** → **API**
3. Créez une nouvelle clé API
4. Notez :
   - `API Key`
   - `Account ID`
   - URL de base : `https://api.keyyo.com/v1`

### Étape 2 : Configurer dans Supabase

Exécutez cette requête SQL dans Supabase :

```sql
-- Activer Keyyo et configurer les identifiants
UPDATE telephony_providers
SET
  is_active = true,
  config = jsonb_build_object(
    'api_key', 'VOTRE_CLE_API_KEYYO',
    'account_id', 'VOTRE_ACCOUNT_ID',
    'base_url', 'https://api.keyyo.com/v1',
    'click_to_call_enabled', true,
    'auto_fetch_recordings', true,
    'recording_retention_days', 90
  )
WHERE name = 'keyyo';
```

### Étape 3 : Associer les extensions aux utilisateurs

```sql
-- Exemple : Associer l'extension 101 à un utilisateur
INSERT INTO telephony_users (user_id, provider_id, extension, phone_number)
VALUES (
  'uuid-de-lutilisateur',
  (SELECT id FROM telephony_providers WHERE name = 'keyyo'),
  '101',
  '+33123456789'
);
```

### Étape 4 : Configurer le webhook Keyyo

1. Dans l'interface Keyyo, allez dans **Webhooks**
2. Créez un nouveau webhook avec l'URL :
   ```
   https://VOTRE_PROJET.supabase.co/functions/v1/keyyo-webhook
   ```
3. Activez les événements :
   - `call.started`
   - `call.answered`
   - `call.ended`
   - `recording.available`

---

## Utilisation

### Click-to-Call depuis le CRM

1. Ouvrir une fiche lead
2. Cliquer sur le bouton "Appeler"
3. Le dialogue d'appel s'ouvre avec 2 modes :
   - **Keyyo** : Click-to-Call réel (si configuré)
   - **Manuel** : Enregistrement manuel de l'appel

4. Si mode Keyyo :
   - Votre téléphone (extension) sonne automatiquement
   - Décrochez, l'appel se connecte au lead
   - Le chronomètre démarre automatiquement
   - L'appel est enregistré en base de données

5. Pendant l'appel :
   - Prenez des notes en temps réel
   - Le temps d'appel est affiché
   - Terminez l'appel quand vous le souhaitez

6. Après l'appel :
   - Ajoutez vos notes
   - Sauvegardez → L'appel apparaît dans la timeline du lead

### Consulter l'historique des appels

Dans le CRM, section "Historique" d'un lead :
- Tous les appels entrants et sortants
- Durée, date, statut
- Notes associées
- Lien vers l'enregistrement (si disponible)

### Statistiques d'appels

Le service fournit des statistiques :

```typescript
import { keyyoService } from '@/lib/keyyo-service';

const stats = await keyyoService.getCallStatistics(userId);
// Retourne :
// {
//   total_calls: 150,
//   outbound: 100,
//   inbound: 50,
//   answered: 120,
//   missed: 30,
//   total_minutes: 450
// }
```

---

## API du Service Keyyo

### Méthodes disponibles

#### `keyyoService.isConfigured()`
Vérifie si Keyyo est configuré et actif.

```typescript
const isReady = await keyyoService.isConfigured();
if (isReady) {
  // Keyyo est prêt
}
```

#### `keyyoService.initiateCall(params)`
Initie un appel Click-to-Call.

```typescript
const result = await keyyoService.initiateCall({
  fromExtension: '101',
  toNumber: '+33612345678',
  leadId: 'uuid-du-lead',
});

if (result.success) {
  console.log('Appel initié:', result.callId);
}
```

#### `keyyoService.fetchCallHistory(params)`
Récupère l'historique des appels depuis Keyyo.

```typescript
const calls = await keyyoService.fetchCallHistory({
  startDate: new Date('2026-01-01'),
  endDate: new Date(),
  extension: '101',
});
```

#### `keyyoService.saveCall(params)`
Enregistre un appel manuellement dans la base de données.

```typescript
await keyyoService.saveCall({
  leadId: 'uuid-du-lead',
  userId: 'uuid-du-commercial',
  direction: 'outbound',
  fromNumber: '101',
  toNumber: '+33612345678',
  status: 'completed',
  duration: 180, // secondes
  talkTime: 150,
  notes: 'Client intéressé, rappeler demain',
});
```

#### `keyyoService.updateCallNotes(callId, notes)`
Met à jour les notes d'un appel existant.

```typescript
await keyyoService.updateCallNotes(
  'uuid-de-lappel',
  'Prospect très intéressé, a demandé un devis'
);
```

#### `keyyoService.getUserExtension(userId)`
Récupère l'extension téléphonique d'un utilisateur.

```typescript
const extension = await keyyoService.getUserExtension(userId);
// Retourne : '101' ou '+33123456789'
```

---

## Liaison automatique Leads ↔ Appels

Un trigger PostgreSQL lie automatiquement les appels aux leads :

```sql
-- Fonction déjà créée dans la migration
-- Fonctionne automatiquement pour :
-- - Appels entrants : cherche le lead par le numéro appelant
-- - Appels sortants : cherche le lead par le numéro appelé
-- - Crée une interaction dans la timeline
```

### Exemple d'interaction créée

Quand un appel est lié à un lead :

```json
{
  "lead_id": "uuid-du-lead",
  "type": "call",
  "subject": "Appel sortant",
  "content": "Durée: 2 min",
  "metadata": {
    "call_id": "uuid-de-lappel",
    "from": "101",
    "to": "+33612345678",
    "duration": 120
  }
}
```

---

## Webhooks Keyyo

Les événements Keyyo sont reçus automatiquement :

### `call.started`
Appelé quand un appel démarre.
→ Crée une entrée dans `telephony_calls` avec statut `ringing`.

### `call.answered`
Appelé quand l'appel est décroché.
→ Met à jour le statut à `answered` et enregistre `answered_at`.

### `call.ended`
Appelé quand l'appel se termine.
→ Met à jour `ended_at`, `duration_seconds`, `talk_time_seconds`.

### `recording.available`
Appelé quand l'enregistrement est prêt.
→ Met à jour `recording_url` et marque `has_recording = true`.

---

## Sécurité

### RLS (Row Level Security)

Toutes les tables ont des politiques RLS :

- **telephony_providers** : Admins seulement
- **telephony_users** : Utilisateurs voient leurs propres configs
- **telephony_calls** : Utilisateurs voient leurs appels + ceux de leurs leads
- **telephony_recordings** : Même politique que les appels

### Permissions

```sql
-- Les commerciaux peuvent :
-- - Créer des appels (INSERT)
-- - Voir leurs propres appels (SELECT)
-- - Mettre à jour leurs propres appels (UPDATE)

-- Les admins peuvent :
-- - Gérer les providers
-- - Configurer les extensions
-- - Voir tous les appels
```

---

## Alternatives à Keyyo

Le système est conçu pour supporter plusieurs fournisseurs :

### Aircall
```sql
INSERT INTO telephony_providers (name, display_name, config)
VALUES (
  'aircall',
  'Aircall',
  '{"api_key":"xxx","base_url":"https://api.aircall.io/v1"}'::jsonb
);
```

### RingCentral
```sql
INSERT INTO telephony_providers (name, display_name, config)
VALUES (
  'ringcentral',
  'RingCentral',
  '{"api_key":"xxx","base_url":"https://platform.ringcentral.com"}'::jsonb
);
```

Il suffit d'adapter les Edge Functions pour appeler l'API du provider choisi.

---

## Troubleshooting

### "Keyyo provider not configured"

**Solution** : Vérifier que le provider est actif et a une `api_key` :

```sql
SELECT name, is_active, config->>'api_key' as api_key
FROM telephony_providers
WHERE name = 'keyyo';
```

### "No extension found for user"

**Solution** : Associer une extension à l'utilisateur :

```sql
INSERT INTO telephony_users (user_id, provider_id, extension)
VALUES (
  'uuid-utilisateur',
  (SELECT id FROM telephony_providers WHERE name = 'keyyo'),
  '101'
);
```

### Les appels ne sont pas liés aux leads

**Vérifier** :
1. Le numéro de téléphone du lead est bien rempli
2. Le format correspond (avec ou sans +33)
3. Le trigger `trig_auto_link_call` est actif :

```sql
SELECT * FROM pg_trigger WHERE tgname = 'trig_auto_link_call';
```

### L'enregistrement ne se télécharge pas

**Vérifier** :
1. Le bucket `telephony-recordings` existe
2. Les permissions storage sont correctes
3. L'URL de Keyyo est valide et non expirée

---

## Monitoring

### Voir les appels récents

```sql
SELECT
  tc.id,
  tc.direction,
  tc.from_number,
  tc.to_number,
  tc.status,
  tc.duration_seconds,
  l.first_name || ' ' || l.last_name as lead_name,
  au.email as commercial_email
FROM telephony_calls tc
LEFT JOIN crm_leads l ON l.id = tc.lead_id
LEFT JOIN admin_users au ON au.id = tc.user_id
ORDER BY tc.initiated_at DESC
LIMIT 20;
```

### Statistiques par commercial

```sql
SELECT
  au.email,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE direction = 'outbound') as outbound,
  COUNT(*) FILTER (WHERE direction = 'inbound') as inbound,
  ROUND(AVG(talk_time_seconds) / 60, 2) as avg_minutes,
  SUM(talk_time_seconds) / 60 as total_minutes
FROM telephony_calls tc
JOIN admin_users au ON au.id = tc.user_id
WHERE tc.initiated_at > now() - interval '30 days'
GROUP BY au.email
ORDER BY total_calls DESC;
```

---

## Prochaines évolutions

### Phase 2 (à venir)

- [ ] Transcription automatique des appels (Whisper AI)
- [ ] Analyse de sentiment (positif/négatif/neutre)
- [ ] Résumé automatique par IA
- [ ] Détection de mots-clés
- [ ] Alertes sur appels manqués
- [ ] Rappel automatique (workflow)

### Phase 3 (future)

- [ ] Click-to-SMS
- [ ] Visioconférence intégrée
- [ ] Appels groupés (conférence)
- [ ] IVR personnalisé
- [ ] Routage intelligent

---

## Support

**Problème avec l'intégration Keyyo ?**

1. Vérifier la configuration dans `telephony_providers`
2. Consulter les logs des Edge Functions
3. Tester l'API Keyyo directement (curl/Postman)
4. Vérifier les permissions RLS

**Contact Keyyo** : support@keyyo.com

---

## Résumé

L'intégration Keyyo est maintenant **complète et fonctionnelle** :

✅ Migration créée (tables + RLS)
✅ Service Keyyo (keyyo-service.ts)
✅ 3 Edge Functions déployées
✅ CallDialog amélioré avec Click-to-Call
✅ Liaison automatique leads ↔ appels
✅ Statistiques et monitoring
✅ Build réussi

**Prêt à l'emploi !** Il suffit de configurer les identifiants Keyyo dans Supabase.
