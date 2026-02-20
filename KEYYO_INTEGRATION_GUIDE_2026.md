# Guide Complet d'Intégration Keyyo - API CTI v1.6

## Vue d'ensemble

L'intégration Keyyo dans TaxiAssur CRM permet de :
- **Click-to-Call** : Lancer des appels depuis le CRM en 1 clic
- **Notifications automatiques** : Remontée de fiche sur appel entrant
- **Historique complet** : Tous les appels sont enregistrés
- **Enregistrements audio** : Enregistrement optionnel (envoi par email)
- **Liaison aux leads** : Appels automatiquement liés aux fiches clients

**Documentation officielle** : Guide Keyyo CTI/API/TAPI v1.6

---

## Prérequis

### Ce dont vous avez besoin

1. **Un compte Keyyo actif** avec accès administrateur
2. **Une ou plusieurs lignes Keyyo** (numéros de téléphone)
3. **Login et mot de passe SIP** pour chaque ligne
4. **Accès à l'interface Web Keyyo** : https://www.keyyo.com

### Limitations à connaître

- **1 appel par seconde maximum** (rate limit Keyyo)
- **Pas d'API REST moderne** : Keyyo utilise des requêtes GET/HTTP Digest
- **IP fixe recommandée** : Pour l'authentification par IP whitelist

---

## Étape 1 : Collecter les informations Keyyo

### A. Identifiants SIP

Pour chaque ligne Keyyo que vous souhaitez utiliser :

| Information | Description | Exemple |
|------------|-------------|---------|
| **Numéro de ligne** | Format international (33XXXXXXXXX) | `33123456789` |
| **Login SIP** | Identique au numéro de ligne | `33123456789` |
| **Mot de passe SIP** | Mot de passe de la ligne | `Abcd1234!` |
| **Extension** | Numéro de poste interne (optionnel) | `101` |

#### Où trouver ces informations ?

1. Connectez-vous sur https://www.keyyo.com
2. Allez dans **Mon Compte** → **Mes Lignes**
3. Cliquez sur une ligne
4. Vous verrez :
   - Le numéro de ligne
   - Le login SIP (= numéro de ligne)
   - Un lien pour "Afficher/Modifier le mot de passe SIP"

### B. Configuration du webhook

1. Dans l'interface Keyyo, allez dans **Paramètres** → **CTI/API**
2. Notez l'**URL de notification** actuelle (si existante)
3. Préparez l'URL du webhook :
   ```
   https://VOTRE_PROJET.supabase.co/functions/v1/keyyo-webhook?account=_ACCOUNT_&caller=_CALLER_&callee=_CALLEE_&type=_N_TYPE_&callref=_CALLREF_&dref=_DREF_&drefreplace=_DREF_REPLACE_&_TSMS_=_TSMS_
   ```

### C. Configuration de l'IP source (optionnel)

Si vous ne souhaitez pas utiliser l'authentification SIP pour les appels sortants :

1. Trouvez votre IP publique : https://www.whatismyip.com/
2. Dans Keyyo → **Paramètres** → **CTI/API**
3. Remplissez le champ **Regexp d'autorisation sur l'IP source**
4. Entrez votre IP (ex: `123.456.789.123`)
5. Pour plusieurs IPs, utilisez le pipe : `123.456.789.123|98.765.432.10`

---

## Étape 2 : Configuration dans Supabase

### A. Activer et configurer le provider Keyyo

Exécutez ce SQL dans l'éditeur Supabase :

```sql
-- Activer Keyyo
UPDATE telephony_providers
SET
  is_active = true,
  config = jsonb_build_object(
    'base_url', 'https://ssl.keyyo.com',
    'makecall_endpoint', '/makecall.html',
    'sendsms_endpoint', '/sendsms.html',
    'setprofil_endpoint', '/setprofil.html',
    'auth_method', 'http_digest',
    'sip_login', '33123456789',           -- REMPLACER par votre login SIP
    'sip_password', 'VotreMotDePasse',    -- REMPLACER par votre mot de passe SIP
    'ip_whitelist', '',                    -- Optionnel : votre IP publique
    'webhook_ip', '83.136.160.79',        -- IP de Keyyo (ne pas modifier)
    'click_to_call_enabled', true,
    'sms_enabled', true,
    'profil_management_enabled', true,
    'recording_by_email', false,          -- true pour enregistrer les appels
    'rate_limit_per_second', 1
  ),
  updated_at = now()
WHERE name = 'keyyo';

-- Vérifier la configuration
SELECT
  name,
  is_active,
  config->>'base_url' as base_url,
  config->>'sip_login' as sip_login,
  config->>'sip_password' IS NOT NULL as password_configured
FROM telephony_providers
WHERE name = 'keyyo';
```

### B. Associer les utilisateurs aux lignes Keyyo

Pour chaque commercial qui utilisera le Click-to-Call :

```sql
-- Exemple : Associer Martin à la ligne 33123456789
INSERT INTO telephony_users (user_id, provider_id, extension, phone_number, is_active)
VALUES (
  '<UUID_DE_MARTIN>',                                          -- ID de l'utilisateur dans admin_users
  (SELECT id FROM telephony_providers WHERE name = 'keyyo'),   -- ID du provider Keyyo
  '101',                                                       -- Extension (optionnel)
  '33123456789',                                               -- Numéro de ligne Keyyo
  true                                                         -- Actif
)
ON CONFLICT (user_id, provider_id)
DO UPDATE SET
  extension = EXCLUDED.extension,
  phone_number = EXCLUDED.phone_number,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Répétez pour chaque utilisateur
```

**Pour trouver les UUID des utilisateurs** :

```sql
SELECT id, email, role
FROM admin_users
WHERE role IN ('admin', 'commercial')
ORDER BY email;
```

### C. Configurer l'URL de notification dans Keyyo

1. Récupérez l'URL de votre projet Supabase :
   ```
   https://VOTRE_PROJET.supabase.co/functions/v1/keyyo-webhook
   ```

2. Dans l'interface Keyyo, pour chaque ligne :
   - Allez dans **Paramètres** → **CTI/API**
   - **URL de notification** : Collez l'URL complète avec les paramètres :
     ```
     https://VOTRE_PROJET.supabase.co/functions/v1/keyyo-webhook?account=_ACCOUNT_&caller=_CALLER_&callee=_CALLEE_&type=_N_TYPE_&callref=_CALLREF_&dref=_DREF_&drefreplace=_DREF_REPLACE_&_SESSION_ID_=_SESSION_ID_&_IS_ACD_=_IS_ACD_&_REDIRECTING_NUMBER_=_REDIRECTING_NUMBER_&_TSMS_=_TSMS_
     ```

3. Cliquez sur **Enregistrer**

---

## Étape 3 : Test de l'intégration

### Test 1 : Vérifier la connexion

```sql
-- Cette requête doit retourner 1 ligne avec is_active = true
SELECT * FROM telephony_providers WHERE name = 'keyyo' AND is_active = true;

-- Cette requête doit retourner vos utilisateurs configurés
SELECT
  tu.extension,
  tu.phone_number,
  au.email as user_email
FROM telephony_users tu
JOIN admin_users au ON tu.user_id = au.id
JOIN telephony_providers tp ON tu.provider_id = tp.id
WHERE tp.name = 'keyyo';
```

### Test 2 : Click-to-Call depuis le CRM

1. Connectez-vous au CRM
2. Ouvrez une fiche lead avec un numéro de téléphone
3. Cliquez sur le bouton **Appeler** (icône téléphone)
4. Sélectionnez le mode **Keyyo** (si disponible)
5. Cliquez sur **Lancer l'appel**

**Résultat attendu** :
- Votre téléphone Keyyo sonne
- Vous décrochez
- L'appel se connecte au numéro du lead
- L'appel apparaît dans la timeline du lead

### Test 3 : Notifications d'appels entrants

1. Appelez votre ligne Keyyo depuis un mobile
2. Décrochez l'appel
3. Raccrochez

**Vérification** :
```sql
-- Vous devriez voir l'appel enregistré
SELECT
  direction,
  from_number,
  to_number,
  status,
  duration_seconds,
  created_at
FROM telephony_calls
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Utilisation quotidienne

### Click-to-Call

1. Ouvrir une fiche lead
2. Cliquer sur "Appeler"
3. Votre téléphone sonne automatiquement
4. Décrochez et parlez
5. L'appel est automatiquement enregistré

### Enregistrement des appels (optionnel)

Si vous avez activé `recording_by_email: true` :

- Tous les appels Click-to-Call sont enregistrés
- L'enregistrement est envoyé par email à l'adresse associée à votre ligne
- **Important** : En France, vous DEVEZ informer votre interlocuteur que l'appel est enregistré

### Historique des appels

Dans le CRM :
- **Timeline du lead** : Voir tous les appels avec ce lead
- **Statistiques** : Dashboard avec nombre d'appels, durée, taux de réponse

---

## Fonctionnalités avancées

### Envoi de SMS (si activé)

Le service Keyyo permet d'envoyer des SMS :

```typescript
import { keyyoService } from '@/lib/keyyo-service';

const result = await keyyoService.sendSMS({
  account: '33123456789',      // Votre ligne Keyyo
  callee: '33612345678',       // Destinataire
  message: 'Bonjour, voici...' // Message (160 caractères max)
});
```

### Mise en relation (Call Transfer)

Pour mettre en relation deux personnes sans qu'elles vous entendent :

```sql
-- Via l'Edge Function keyyo-click-to-call
{
  "account": "33123456789",    -- Votre ligne (celle qui paie)
  "callee": "33987654321",     -- Personne à qui vous transférez
  "caller": "33612345678"      -- Numéro qui sera mis en relation
}
```

Résultat :
1. Votre ligne appelle le `caller`
2. Quand il décroche, il est transféré vers `callee`
3. Les deux sont en communication directe
4. Vous êtes facturé pour 2 appels

### Statistiques et reporting

```typescript
import { keyyoService } from '@/lib/keyyo-service';

const stats = await keyyoService.getCallStatistics(userId);

// Retourne:
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

## Résolution des problèmes

### Erreur : "Authentification Keyyo échouée"

**Causes possibles** :
1. Login ou mot de passe SIP incorrect
2. IP non whitelistée (si vous utilisez l'auth par IP)

**Solutions** :
1. Vérifiez le login/password SIP dans Keyyo
2. Mettez à jour la config dans Supabase
3. Ou ajoutez votre IP dans le champ "Regexp d'autorisation" sur Keyyo

### Erreur : "Limite de débit atteinte"

**Cause** : Vous avez lancé plus d'1 appel par seconde

**Solution** : Attendez 1 seconde entre chaque appel (limitation Keyyo)

### Les notifications ne fonctionnent pas

**Vérifications** :
1. L'URL de notification est bien configurée dans Keyyo ?
2. L'URL contient bien tous les paramètres (_ACCOUNT_, _CALLER_, etc.) ?
3. Le webhook reçoit-il les requêtes ? (vérifier les logs Supabase)

**Debug** :
```sql
-- Voir les logs de la fonction webhook
-- Dans Dashboard Supabase → Edge Functions → keyyo-webhook → Logs
```

### Mon téléphone ne sonne pas

**Vérifications** :
1. Votre ligne est bien configurée dans `telephony_users` ?
2. Le numéro de ligne (phone_number) est correct (format international) ?
3. Votre softphone/téléphone est bien connecté à Keyyo ?

---

## Sécurité et bonnes pratiques

### Mots de passe SIP

- **NE JAMAIS** stocker les mots de passe en clair dans le code
- Utilisez la configuration Supabase (table `telephony_providers`)
- Les mots de passe sont chiffrés dans la base de données

### IP Whitelisting

Si vous utilisez l'authentification par IP :
- Utilisez une IP fixe
- Mettez à jour la config si votre IP change
- Plus sécurisé que le password pour les appels automatisés

### Webhook sécurisé

- Keyyo envoie depuis l'IP `83.136.160.79`
- Le webhook vérifie l'IP source
- En cas de doute, ajoutez un secret partagé dans l'URL

### RGPD et enregistrements

- **Obligation légale** : Informer les appelants si l'appel est enregistré
- Durée de conservation : Maximum 90 jours recommandé
- Droit d'accès : Les personnes peuvent demander leurs enregistrements

---

## Support et assistance

### Documentation Keyyo

- Guide CTI/API/TAPI v1.6 (fourni)
- Interface web : https://www.keyyo.com
- Support Keyyo : Via votre espace client

### Logs et debug

#### Logs Edge Functions

Dashboard Supabase → Edge Functions → Logs :
- `keyyo-click-to-call` : Logs des appels sortants
- `keyyo-webhook` : Logs des notifications

#### Logs base de données

```sql
-- Voir les derniers appels
SELECT * FROM telephony_calls
ORDER BY created_at DESC
LIMIT 10;

-- Voir les erreurs
SELECT
  status,
  metadata,
  created_at
FROM telephony_calls
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## Checklist de déploiement

Avant de passer en production :

- [ ] Configuration Keyyo testée (login/password SIP corrects)
- [ ] Provider activé dans Supabase (`is_active = true`)
- [ ] Utilisateurs associés aux lignes Keyyo
- [ ] URL de notification configurée dans Keyyo
- [ ] Test Click-to-Call réussi
- [ ] Test notification d'appel entrant réussi
- [ ] Enregistrements configurés selon besoins
- [ ] Message légal d'enregistrement préparé (si applicable)
- [ ] Formation des utilisateurs effectuée

---

## Évolutions futures possibles

### Non supporté actuellement par Keyyo API v1.6

- API REST moderne (utilise GET/HTTP Digest)
- Webhooks en temps réel (utilise polling HTTP GET)
- Téléchargement automatique des enregistrements via API
- Gestion avancée des conférences

### Améliorations possibles dans le CRM

- Dashboard temps réel des appels
- Transcription automatique des enregistrements (IA)
- Analyse de sentiment des appels
- Prédiction de succès commercial
- Intégration avec un système de scoring de leads

---

## Résumé des URLs et endpoints

| Fonction | URL | Méthode |
|----------|-----|---------|
| Click-to-Call | `https://ssl.keyyo.com/makecall.html` | GET |
| Envoi SMS | `https://ssl.keyyo.com/sendsms.html` | GET |
| Changement de profil | `https://ssl.keyyo.com/setprofil.html` | GET |
| Webhook notifications | `https://VOTRE_PROJET.supabase.co/functions/v1/keyyo-webhook` | GET |

---

## Contact

Pour toute question sur l'intégration :
1. Consultez d'abord ce guide
2. Vérifiez les logs Supabase
3. Testez avec les commandes SQL de debug
4. Contactez le support Keyyo si problème côté téléphonie

---

**Dernière mise à jour** : Février 2026
**Version de l'API Keyyo** : CTI/API/TAPI v1.6
**Version du CRM** : TaxiAssur CRM 2026
