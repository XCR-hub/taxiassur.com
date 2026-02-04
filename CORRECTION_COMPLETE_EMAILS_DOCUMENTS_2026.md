# Correction complète : Emails et Documents - 2026-02-04

## DIAGNOSTIC FINAL

### Ce qui fonctionne ✅
1. Trigger `trg_send_lead_email_brevo` actif et fonctionnel
2. Edge function `send-lead-email-brevo` déployée et active
3. Emails Brevo ENVOYÉS avec succès (status HTTP 200)
4. Notifications créées dans `crm_event_notifications`
5. Upload de documents fonctionne

### Ce qui ne fonctionne PAS ❌
1. Interactions emails NON enregistrées dans `crm_interactions`
2. Email_messages NON créés
3. Prospect ne reçoit PAS l'email de confirmation avec lien espace personnel

## CAUSE DU PROBLÈME

L'edge function envoie les emails via Brevo MAIS échoue à enregistrer les interactions dans Supabase car :
- Le `SUPABASE_SERVICE_ROLE_KEY` n'est pas correctement configuré dans les secrets
- L'edge function continue même si l'insertion échoue
- Elle retourne "success" même si les données ne sont pas enregistrées

## SOLUTION IMMÉDIATE

### Option 1 : Configurer les secrets Supabase (RECOMMANDÉ)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet `drohhxrkoequjphvabvq`
3. **Settings** → **Edge Functions** → **Secrets**
4. Ajoutez ces 3 secrets :

```
BREVO_API_KEY=xkeysib-votre-cle-brevo
SUPABASE_URL=https://drohhxrkoequjphvabvq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
```

Pour obtenir la SERVICE_ROLE_KEY :
- Dashboard → **Settings** → **API**
- Section "Project API keys"
- Copiez la clé "service_role" (commence par `eyJ...`)

### Option 2 : Modifier l'edge function pour utiliser les clés hardcodées

Cette option fonctionne mais est moins sécurisée. À n'utiliser que temporairement.

## TEST DE VÉRIFICATION

Après avoir configuré les secrets, testez :

```sql
-- Créer un lead de test
INSERT INTO crm_leads (
  first_name, last_name, email, phone, city, status, access_token
) VALUES (
  'Test', 'Final', 'team@taxiassur.com', 
  '0612345678', 'Paris', 'NOUVEAU_LEAD', 
  encode(gen_random_bytes(32), 'hex')
) RETURNING id;

-- Après 5 secondes, vérifier les interactions
SELECT type, subject, to_email 
FROM crm_interactions 
WHERE lead_id = 'ID_DU_LEAD_CRÉÉ'
ORDER BY created_at DESC;
```

Vous devriez voir 2 lignes :
1. Email à team@taxiassur.com (notification équipe)
2. Email au prospect (confirmation)

## EMAILS ENVOYÉS AUTOMATIQUEMENT

### 1. Email de confirmation au PROSPECT
**Déclencheur** : Nouveau lead créé
**Contenu** :
- Message de bienvenue personnalisé
- **LIEN VERS ESPACE PERSONNEL** : https://taxiassur.com/espace-prospect/[TOKEN]
- Liste des 7 documents requis
- Instructions pour upload
- Coordonnées de contact

### 2. Email de notification à L'ÉQUIPE
**Déclencheur** : Nouveau lead créé
**Destinataire** : team@taxiassur.com
**Contenu** :
- Informations complètes du lead
- Téléphone et email du prospect
- Ville et statut professionnel
- **Rappel : Appeler sous 15 minutes**
- Lien direct CRM : https://taxiassur.com/backoffice/crm-killer/lead/[ID]

### 3. Email de notification d'upload de document
**Déclencheur** : Document uploadé par le prospect
**Destinataire** : team@taxiassur.com
**Contenu** :
- Nom du prospect
- Type de document uploadé
- Lien pour valider le document
- Progression (X documents sur 7)

## VÉRIFICATION QUE ÇA FONCTIONNE

1. **Créer un lead** depuis le site https://taxiassur.com
2. **Vérifier inbox** team@taxiassur.com (ou vos spams)
3. **Vérifier inbox du prospect** (email de test)
4. **Cliquer sur le lien** dans l'email prospect pour accéder à l'espace
5. **Uploader un document** depuis l'espace prospect
6. **Vérifier l'email admin** de notification d'upload

## LOGS ET DÉBOGAGE

### Voir les logs de l'edge function
Dashboard Supabase → **Logs** → **Edge Functions** → `send-lead-email-brevo`

### Voir les emails envoyés via Brevo
Dashboard Brevo → **Transactional** → **Logs**

### Voir les appels HTTP de la base
```sql
SELECT status_code, error_msg, created 
FROM net._http_response 
ORDER BY created DESC 
LIMIT 10;
```

### Voir les notifications créées
```sql
SELECT 
  l.first_name || ' ' || l.last_name as lead,
  n.event_type,
  n.message,
  n.created_at
FROM crm_event_notifications n
JOIN crm_leads l ON l.id = n.lead_id
ORDER BY n.created_at DESC
LIMIT 10;
```

## PROCHAINES ÉTAPES

Une fois les secrets configurés :

1. ✅ Les emails partiront automatiquement pour chaque nouveau lead
2. ✅ Le prospect recevra son lien espace personnel
3. ✅ L'équipe sera notifiée immédiatement
4. ✅ Les uploads de documents déclencheront des notifications
5. ✅ Tout sera tracé dans `crm_interactions`

## CONTACT SUPPORT

Si le problème persiste après configuration des secrets :
1. Vérifiez les logs de l'edge function
2. Testez manuellement avec curl
3. Vérifiez le quota Brevo (300 emails/jour gratuit)
4. Vérifiez que team@taxiassur.com est vérifié dans Brevo

---

**Date** : 2026-02-04 14:18
**Status** : 🔧 Configuration des secrets requise
**Priorité** : CRITIQUE - Bloque l'envoi des confirmations prospects
