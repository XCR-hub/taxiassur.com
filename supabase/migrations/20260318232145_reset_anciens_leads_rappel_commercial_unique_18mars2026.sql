/*
  # Reset leads anciens - rappel unique pour commerciaux - 18 mars 2026

  ## Actions
  1. Desactiver auto_relances pour tous les leads > 1 jour (traites par ailleurs)
  2. Une seule notification recapitulative pour l'equipe commerciale
  3. Le systeme d'email ne demarre qu'avec les nouveaux leads (crees aujourd'hui)
*/

-- 1. Desactiver les relances auto pour tous les leads existants (> 1 jour)
UPDATE crm_leads SET
  auto_relances_enabled = false,
  needs_followup = false
WHERE is_archived = false
AND deleted_at IS NULL
AND created_at < NOW() - INTERVAL '1 day';

-- 2. Une seule notification recapitulative pour les commerciaux
INSERT INTO crm_event_notifications (
  event_type, title, message, priority, is_read, metadata
)
SELECT
  'commercial_recap',
  'Recap leads existants a verifier manuellement',
  '42 leads existants dans le CRM : 9 en cours avances (collecte docs, devis, signature, contrat) et 33 en nouveau_lead. Ces leads ont ete traites par ailleurs - verifiez ceux qui necessitent une action manuelle via le CRM.',
  2,
  false,
  jsonb_build_object(
    'total_leads', 42,
    'leads_avances', 9,
    'nouveau_lead', 33,
    'action_requise', 'verification_manuelle',
    'crm_url', 'https://taxiassur.com/backoffice/crm-killer'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM crm_event_notifications
  WHERE event_type = 'commercial_recap'
  AND created_at > NOW() - INTERVAL '1 hour'
);

-- 3. S'assurer que les nouveaux leads (crees aujourd'hui) ont les relances activees
UPDATE crm_leads SET
  auto_relances_enabled = true,
  needs_followup = true
WHERE is_archived = false
AND deleted_at IS NULL
AND created_at > NOW() - INTERVAL '1 day'
AND email NOT ILIKE '%example.com%'
AND email NOT ILIKE '%instagram.com%'
AND email NOT ILIKE '%twilio%'
AND email NOT ILIKE '%monetico.com%'
AND email NOT ILIKE 'ne-pas-repondre%'
AND email NOT ILIKE '%@mail.%'
AND lower(email) != 'team@taxiassur.com'
AND first_name NOT ILIKE '%test%';
