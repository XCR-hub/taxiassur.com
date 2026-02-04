# Diagnostic système d'emails - 2026-02-04

## Système en place

### 1. Triggers actifs
- `trg_send_lead_email_brevo` : Envoie email au prospect ET à l'équipe
- `trigger_notify_new_lead` : Crée une notification dans crm_event_notifications
- `trigger_send_admin_email` : Envoie email admin pour événements importants

### 2. Edge Functions
- `send-lead-email-brevo` (verifyJWT: false) : **ACTIVE**
  - Envoie 2 emails via Brevo :
    - Email à team@taxiassur.com (notification équipe)
    - Email au prospect avec lien espace personnel
  
### 3. Configuration requise
Pour que les emails fonctionnent, vérifier dans Supabase :
- Variable `BREVO_API_KEY` configurée
- Variable `SUPABASE_URL` configurée
- Variable `SUPABASE_SERVICE_ROLE_KEY` configurée

## Tests à effectuer

### Test 1 : Créer un lead de test
```sql
-- Créer un lead de test
INSERT INTO crm_leads (
  first_name, last_name, email, phone, city, status, access_token
) VALUES (
  'Test', 'Email', 'votre-email@gmail.com', '0612345678', 
  'Paris', 'Salarié', gen_random_uuid()::text
);
```

### Test 2 : Vérifier les logs
```sql
-- Voir les logs de la base de données (dernières 24h)
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%send_lead_email%'
ORDER BY calls DESC;
```

### Test 3 : Vérifier les interactions créées
```sql
-- Voir si les emails sont enregistrés
SELECT * FROM crm_interactions 
WHERE type = 'email' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Test 4 : Vérifier email_messages
```sql
-- Voir les emails envoyés via Brevo
SELECT * FROM email_messages 
WHERE provider = 'brevo' 
ORDER BY sent_at DESC 
LIMIT 10;
```

## Problèmes possibles

### 1. Clé API Brevo manquante
**Symptôme** : Aucun email reçu
**Solution** : Configurer la clé dans Dashboard Supabase > Settings > Secrets
```
BREVO_API_KEY=xkeysib-xxxxx
```

### 2. Emails bloqués par Brevo
**Symptôme** : Erreur dans les logs
**Solution** : Vérifier le compte Brevo :
- Quota d'envoi non dépassé
- Domaine team@taxiassur.com vérifié
- Template d'email valide

### 3. Trigger désactivé
**Symptôme** : Pas d'appel à l'edge function
**Solution** : Réactiver le trigger
```sql
DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON crm_leads;
CREATE TRIGGER trg_send_lead_email_brevo
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_email_via_brevo();
```

## Actions correctives appliquées

✅ Corrigé l'URL Supabase dans send_lead_email_via_brevo()
✅ Ajouté des logs pour faciliter le débogage
✅ Créé trigger pour notifications admin
✅ Vérifié que les edge functions existent et sont actives

## Prochaines étapes

1. **Tester la création d'un lead** via le formulaire sur taxiassur.com
2. **Vérifier la réception** des 2 emails (équipe + prospect)
3. **Consulter les logs** dans Supabase Dashboard > Logs
4. **Vérifier Brevo** : Dashboard Brevo > Logs > Transactional

## Contact support

Si les emails ne fonctionnent toujours pas :
- Vérifier les logs Supabase Edge Functions
- Vérifier le compte Brevo
- Tester manuellement l'edge function depuis Supabase Dashboard
