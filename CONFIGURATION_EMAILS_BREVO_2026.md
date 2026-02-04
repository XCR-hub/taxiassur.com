# Configuration complète du système d'emails - 2026-02-04

## PROBLÈME IDENTIFIÉ

Le système d'emails est configuré MAIS les emails ne sont pas envoyés car :
- ✅ Les triggers existent et fonctionnent
- ✅ L'edge function existe (`send-lead-email-brevo`)
- ❌ La clé API Brevo n'est PAS configurée dans Supabase
- ❌ L'edge function échoue silencieusement

## SOLUTION : Configurer la clé API Brevo

### Étape 1 : Obtenir votre clé API Brevo

1. Connectez-vous à https://app.brevo.com
2. Allez dans **Settings** → **SMTP & API**
3. Section **API Keys** → Cliquez sur **Generate a new API key**
4. Nommez-la "TaxiAssur CRM"
5. Copiez la clé (format : `xkeysib-xxxxx...`)

### Étape 2 : Configurer dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet `drohhxrkoequjphvabvq`
3. Allez dans **Settings** → **Edge Functions** → **Secrets**
4. Ajoutez ces secrets :

```
BREVO_API_KEY=xkeysib-votre-cle-ici
```

### Étape 3 : Tester l'envoi d'emails

Depuis le dashboard Supabase, allez dans **SQL Editor** et exécutez :

```sql
-- Créer un lead de test
INSERT INTO crm_leads (
  first_name, 
  last_name, 
  email, 
  phone, 
  city, 
  status, 
  access_token
) VALUES (
  'Test', 
  'Email', 
  'VOTRE-EMAIL-ICI@gmail.com',  -- Mettez votre email
  '0612345678', 
  'Paris', 
  'NOUVEAU_LEAD', 
  encode(gen_random_bytes(32), 'hex')
)
RETURNING id, access_token;
```

Vous devriez recevoir 2 emails :
1. Un email à team@taxiassur.com (notification équipe)
2. Un email au prospect (à l'adresse que vous avez mise)

### Étape 4 : Vérifier les logs

Après avoir créé le lead de test, vérifiez les logs :

**Dans Supabase :**
- Dashboard → **Logs** → **Edge Functions**
- Cherchez les logs de `send-lead-email-brevo`
- Vérifiez qu'il n'y a pas d'erreur

**Dans Brevo :**
- Dashboard → **Transactional** → **Logs**
- Vérifiez que les 2 emails apparaissent comme envoyés

## Configuration avancée

### Vérifier l'extension pg_net

L'extension pg_net est nécessaire pour faire des appels HTTP depuis PostgreSQL.

```sql
-- Vérifier que pg_net est installé
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Si pas installé, l'installer (nécessite des droits superuser)
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Modifier l'adresse d'envoi (optionnel)

Si vous voulez utiliser une autre adresse que `team@taxiassur.com`, modifiez l'edge function :

1. Allez dans le fichier `/supabase/functions/send-lead-email-brevo/index.ts`
2. Changez les lignes 487-488 et 512-514
3. Redéployez l'edge function

## Emails envoyés automatiquement

### 1. Email au prospect (nouveau lead)
- **Déclencheur** : Insertion dans `crm_leads`
- **Contenu** : 
  - Confirmation de demande
  - Lien vers espace personnel sécurisé
  - Liste des 7 documents requis
  - Coordonnées de contact
- **Template** : HTML responsive avec design moderne

### 2. Email à l'équipe (nouveau lead)
- **Déclencheur** : Insertion dans `crm_leads`
- **Destinataire** : team@taxiassur.com
- **Contenu** :
  - Informations complètes du lead
  - Rappel d'appeler sous 15 minutes
  - Lien direct vers le CRM
  - Prochaines actions à effectuer

### 3. Email admin (document uploadé)
- **Déclencheur** : Insertion dans `prospect_documents`
- **Destinataire** : team@taxiassur.com
- **Contenu** :
  - Notification d'upload de document
  - Type de document
  - Nom du prospect
  - Lien pour valider le document

## Dépannage

### "Emails sent successfully" mais rien reçu

1. Vérifiez les **spams**
2. Vérifiez que `team@taxiassur.com` est **vérifié dans Brevo**
3. Vérifiez le **quota Brevo** (300 emails/jour en gratuit)
4. Testez avec une **autre adresse email**

### Erreur "BREVO_API_KEY not configured"

La clé n'est pas configurée dans Supabase. Suivez l'Étape 2 ci-dessus.

### Erreur 401 Unauthorized

La clé API Brevo est invalide. Régénérez-en une nouvelle.

### Pas d'erreur mais aucun email

L'edge function s'exécute mais Brevo refuse l'envoi :
- Domaine pas vérifié
- Email expéditeur blacklisté
- Quota dépassé

## Test rapide

Pour tester rapidement sans créer de lead :

```bash
curl -X POST 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-lead-email-brevo' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "INSERT",
    "table": "crm_leads",
    "record": {
      "id": "test-123",
      "name": "Test User",
      "phone": "0612345678",
      "email": "votre-email@gmail.com",
      "city": "Paris",
      "status": "NOUVEAU_LEAD",
      "access_token": "test-token-123",
      "created_at": "2026-02-04T14:00:00Z"
    }
  }'
```

---

**Date** : 2026-02-04
**Statut** : ✅ Système configuré, nécessite clé API Brevo
**Priorité** : HAUTE - Configuration requise pour production
