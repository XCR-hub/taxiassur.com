/*
  # Injection retroactive des emails pour les leads existants - 18 mars 2026

  ## Contexte
  Les crons etaient en panne depuis plusieurs semaines. Les leads existants n'ont
  jamais recu leurs emails de confirmation/relance. Cette migration corrige ca.

  ## Strategie
  - Leads en stages avances (collecte_documents, etc.) → relance specifique au stade
  - Leads < 7 jours sans email → email de confirmation "devis bien recu"
  - Leads 7-60 jours sans email → email de relance "suite a votre demande"
  - Leads > 60 jours → needs_followup = true uniquement (trop anciens pour auto-email)
  - Notifications equipe pour TOUS les leads actifs sans suivi recent
*/

-- ============================================================
-- 1. LEADS EN STAGES AVANCES : relance specifique au stade
-- ============================================================

INSERT INTO email_queue (
  to_email, to_name, subject, body, from_email, from_name,
  priority, status, email_type, lead_id, metadata, scheduled_for
)
SELECT
  cl.email,
  cl.first_name || ' ' || cl.last_name,
  CASE cl.pipeline_stage
    WHEN 'collecte_documents' THEN 'Vos documents pour votre assurance taxi - TaxiAssur'
    WHEN 'saisie_devis' THEN 'Votre devis assurance taxi est en cours - TaxiAssur'
    WHEN 'signature_devis' THEN 'Votre devis est pret a signer - TaxiAssur'
    WHEN 'contrat_signature' THEN 'Votre contrat assurance taxi - TaxiAssur'
    ELSE 'Suite a votre demande assurance taxi - TaxiAssur'
  END,
  CASE cl.pipeline_stage
    WHEN 'collecte_documents' THEN
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
      '<h2 style="color: #1a56db;">Bonjour ' || cl.first_name || ',</h2>'
      '<p>Votre dossier assurance taxi est bien enregistre chez TaxiAssur.</p>'
      '<p>Pour finaliser votre devis, nous avons besoin de vos documents (carte grise, permis, releve d information...).</p>'
      '<p style="margin: 25px 0;">'
      '<a href="https://taxiassur.com/espace-prospect/' || COALESCE(cl.access_token, '') || '" '
      'style="background: #1a56db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block;">'
      'Deposer mes documents</a></p>'
      '<p>Notre equipe est disponible au <strong>01 86 65 06 06</strong> pour vous accompagner.</p>'
      '<p>Cordialement,<br><strong>L equipe TaxiAssur</strong></p>'
      '</div>'
    WHEN 'saisie_devis' THEN
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
      '<h2 style="color: #1a56db;">Bonjour ' || cl.first_name || ',</h2>'
      '<p>Bonne nouvelle ! Votre dossier est complet et notre equipe finalise votre devis assurance taxi.</p>'
      '<p>Vous recevrez votre devis tres prochainement. En attendant, vous pouvez consulter votre espace personnel :</p>'
      '<p style="margin: 25px 0;">'
      '<a href="https://taxiassur.com/espace-prospect/' || COALESCE(cl.access_token, '') || '" '
      'style="background: #1a56db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block;">'
      'Mon espace TaxiAssur</a></p>'
      '<p>Des questions ? Appelez-nous au <strong>01 86 65 06 06</strong>.</p>'
      '<p>Cordialement,<br><strong>L equipe TaxiAssur</strong></p>'
      '</div>'
    WHEN 'signature_devis' THEN
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
      '<h2 style="color: #059669;">Bonjour ' || cl.first_name || ',</h2>'
      '<p>Votre devis assurance taxi est pret ! Il vous attend dans votre espace personnel.</p>'
      '<p style="margin: 25px 0;">'
      '<a href="https://taxiassur.com/espace-prospect/' || COALESCE(cl.access_token, '') || '" '
      'style="background: #059669; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block;">'
      'Voir et signer mon devis</a></p>'
      '<p>Ce devis est valable 30 jours. Pour toute question : <strong>01 86 65 06 06</strong>.</p>'
      '<p>Cordialement,<br><strong>L equipe TaxiAssur</strong></p>'
      '</div>'
    WHEN 'contrat_signature' THEN
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
      '<h2 style="color: #059669;">Bonjour ' || cl.first_name || ',</h2>'
      '<p>Votre contrat assurance taxi est en cours de finalisation.</p>'
      '<p style="margin: 25px 0;">'
      '<a href="https://taxiassur.com/espace-prospect/' || COALESCE(cl.access_token, '') || '" '
      'style="background: #059669; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block;">'
      'Finaliser mon contrat</a></p>'
      '<p>Besoin d aide ? Appelez-nous au <strong>01 86 65 06 06</strong>.</p>'
      '<p>Cordialement,<br><strong>L equipe TaxiAssur</strong></p>'
      '</div>'
    ELSE
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
      '<h2 style="color: #1a56db;">Bonjour ' || cl.first_name || ',</h2>'
      '<p>Suite a votre demande de devis assurance taxi, nous souhaitons vous recontacter.</p>'
      '<p style="margin: 25px 0;">'
      '<a href="https://taxiassur.com/espace-prospect/' || COALESCE(cl.access_token, '') || '" '
      'style="background: #1a56db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block;">'
      'Mon espace TaxiAssur</a></p>'
      '<p>Cordialement,<br><strong>L equipe TaxiAssur</strong></p>'
      '</div>'
  END,
  'contact@taxiassur.com',
  'TaxiAssur',
  1,
  'pending',
  'relance_stage',
  cl.id,
  jsonb_build_object('retroactive', true, 'stage', cl.pipeline_stage),
  NOW() + INTERVAL '5 minutes'
FROM crm_leads cl
WHERE cl.is_archived = false
AND cl.deleted_at IS NULL
AND cl.pipeline_stage IN ('collecte_documents', 'saisie_devis', 'signature_devis', 'contrat_signature')
AND cl.email NOT ILIKE '%example.com%'
AND cl.email NOT ILIKE '%instagram.com%'
AND cl.email NOT ILIKE '%twilio%'
AND cl.email NOT ILIKE '%monetico.com%'
AND cl.email NOT ILIKE '%mfa.fr%'
AND cl.email NOT ILIKE '%monceauassurances%'
AND cl.email NOT ILIKE 'ne-pas-repondre%'
AND cl.email NOT ILIKE '%@mail.%'
AND lower(cl.email) != 'team@taxiassur.com'
AND cl.first_name NOT ILIKE '%test%'
AND cl.first_name NOT ILIKE '%instagram%'
AND cl.created_at > '2025-12-01'
AND NOT EXISTS (
  SELECT 1 FROM email_queue eq
  WHERE eq.to_email = cl.email
  AND eq.status = 'sent'
  AND eq.sent_at > NOW() - INTERVAL '7 days'
)
AND NOT EXISTS (
  SELECT 1 FROM email_queue eq2
  WHERE eq2.lead_id = cl.id
  AND eq2.status = 'pending'
  AND (eq2.metadata->>'retroactive')::boolean = true
);

-- ============================================================
-- 2. LEADS NOUVEAU_LEAD RECENTS (< 7 jours) : email de confirmation
-- ============================================================

INSERT INTO email_queue (
  to_email, to_name, subject, body, from_email, from_name,
  priority, status, email_type, lead_id, metadata, scheduled_for
)
SELECT
  cl.email,
  cl.first_name || ' ' || cl.last_name,
  'Votre demande de devis TaxiAssur bien recue',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
  '<h2 style="color: #1a56db;">Bonjour ' || cl.first_name || ',</h2>'
  '<p>Nous avons bien recu votre demande de devis assurance taxi.</p>'
  '<p>Un expert TaxiAssur va vous contacter tres prochainement pour vous proposer la meilleure offre.</p>'
  '<p style="margin: 25px 0;">'
  '<a href="https://taxiassur.com/espace-prospect/' || COALESCE(cl.access_token, '') || '" '
  'style="background: #1a56db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block;">'
  'Acceder a mon espace</a></p>'
  '<p>Des questions ? Appelez-nous au <strong>01 86 65 06 06</strong>.</p>'
  '<p>Cordialement,<br><strong>L equipe TaxiAssur</strong></p>'
  '</div>',
  'contact@taxiassur.com',
  'TaxiAssur',
  2,
  'pending',
  'confirmation_devis',
  cl.id,
  jsonb_build_object('retroactive', true, 'age_days', EXTRACT(DAY FROM NOW() - cl.created_at)::integer),
  NOW() + INTERVAL '2 minutes'
FROM crm_leads cl
WHERE cl.is_archived = false
AND cl.deleted_at IS NULL
AND cl.pipeline_stage = 'nouveau_lead'
AND cl.created_at > NOW() - INTERVAL '7 days'
AND cl.email NOT ILIKE '%example.com%'
AND cl.email NOT ILIKE '%instagram.com%'
AND cl.email NOT ILIKE '%twilio%'
AND cl.email NOT ILIKE '%monetico.com%'
AND cl.email NOT ILIKE '%mfa.fr%'
AND cl.email NOT ILIKE '%monceauassurances%'
AND cl.email NOT ILIKE 'ne-pas-repondre%'
AND cl.email NOT ILIKE '%@mail.%'
AND lower(cl.email) != 'team@taxiassur.com'
AND cl.first_name NOT ILIKE '%test%'
AND NOT EXISTS (
  SELECT 1 FROM email_queue eq
  WHERE eq.to_email = cl.email
  AND eq.status = 'sent'
  AND eq.email_type IN ('confirmation_devis', 'confirmation')
)
AND NOT EXISTS (
  SELECT 1 FROM email_queue eq2
  WHERE eq2.lead_id = cl.id
  AND eq2.status = 'pending'
);

-- ============================================================
-- 3. LEADS NOUVEAU_LEAD ENTRE 7 ET 60 JOURS : email de relance
-- ============================================================

INSERT INTO email_queue (
  to_email, to_name, subject, body, from_email, from_name,
  priority, status, email_type, lead_id, metadata, scheduled_for
)
SELECT
  cl.email,
  cl.first_name || ' ' || cl.last_name,
  'Suite a votre demande assurance taxi - TaxiAssur',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
  '<h2 style="color: #1a56db;">Bonjour ' || cl.first_name || ',</h2>'
  '<p>Vous nous avez fait confiance il y a quelques semaines pour votre assurance taxi.</p>'
  '<p>Nous souhaitons vous proposer la meilleure offre du marche. Etes-vous toujours a la recherche d une assurance taxi ?</p>'
  '<p style="margin: 25px 0;">'
  '<a href="https://taxiassur.com/espace-prospect/' || COALESCE(cl.access_token, '') || '" '
  'style="background: #1a56db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block;">'
  'Obtenir mon devis</a></p>'
  '<p>Vous pouvez aussi nous appeler directement au <strong>01 86 65 06 06</strong>.</p>'
  '<p>Cordialement,<br><strong>L equipe TaxiAssur</strong></p>'
  '</div>',
  'contact@taxiassur.com',
  'TaxiAssur',
  2,
  'pending',
  'relance_lead',
  cl.id,
  jsonb_build_object('retroactive', true, 'age_days', EXTRACT(DAY FROM NOW() - cl.created_at)::integer),
  NOW() + INTERVAL '10 minutes'
FROM crm_leads cl
WHERE cl.is_archived = false
AND cl.deleted_at IS NULL
AND cl.pipeline_stage = 'nouveau_lead'
AND cl.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '7 days'
AND cl.email NOT ILIKE '%example.com%'
AND cl.email NOT ILIKE '%instagram.com%'
AND cl.email NOT ILIKE '%twilio%'
AND cl.email NOT ILIKE '%monetico.com%'
AND cl.email NOT ILIKE '%mfa.fr%'
AND cl.email NOT ILIKE '%monceauassurances%'
AND cl.email NOT ILIKE 'ne-pas-repondre%'
AND cl.email NOT ILIKE '%@mail.%'
AND lower(cl.email) != 'team@taxiassur.com'
AND cl.first_name NOT ILIKE '%test%'
AND cl.first_name NOT ILIKE '%instagram%'
AND NOT EXISTS (
  SELECT 1 FROM email_queue eq
  WHERE eq.to_email = cl.email
  AND eq.status = 'sent'
  AND eq.sent_at > NOW() - INTERVAL '30 days'
)
AND NOT EXISTS (
  SELECT 1 FROM email_queue eq2
  WHERE eq2.lead_id = cl.id
  AND eq2.status = 'pending'
);

-- ============================================================
-- 4. LEADS > 60 JOURS : juste needs_followup pour les commerciaux
-- ============================================================

UPDATE crm_leads SET
  needs_followup = true,
  followup_reason = 'Lead ancien sans contact - relance manuelle recommandee',
  auto_relances_enabled = false
WHERE is_archived = false
AND deleted_at IS NULL
AND pipeline_stage = 'nouveau_lead'
AND created_at < NOW() - INTERVAL '60 days'
AND email NOT ILIKE '%example.com%'
AND email NOT ILIKE '%instagram.com%'
AND email NOT ILIKE '%twilio%'
AND email NOT ILIKE '%monetico.com%'
AND email NOT ILIKE '%mfa.fr%'
AND email NOT ILIKE '%monceauassurances%'
AND email NOT ILIKE 'ne-pas-repondre%'
AND email NOT ILIKE '%@mail.%'
AND lower(email) != 'team@taxiassur.com'
AND first_name NOT ILIKE '%test%'
AND first_name NOT ILIKE '%instagram%';

-- ============================================================
-- 5. ACTIVER LES RELANCES AUTO pour les leads recents
-- ============================================================

UPDATE crm_leads SET
  auto_relances_enabled = true,
  needs_followup = true
WHERE is_archived = false
AND deleted_at IS NULL
AND created_at > NOW() - INTERVAL '60 days'
AND email NOT ILIKE '%example.com%'
AND email NOT ILIKE '%instagram.com%'
AND email NOT ILIKE '%twilio%'
AND email NOT ILIKE '%monetico.com%'
AND email NOT ILIKE '%mfa.fr%'
AND email NOT ILIKE '%monceauassurances%'
AND email NOT ILIKE 'ne-pas-repondre%'
AND email NOT ILIKE '%@mail.%'
AND lower(email) != 'team@taxiassur.com'
AND first_name NOT ILIKE '%test%'
AND first_name NOT ILIKE '%instagram%'
AND pipeline_stage NOT IN ('perdu', 'archive');

-- ============================================================
-- 6. Notifications equipe pour leads actifs sans suivi recent
-- ============================================================

INSERT INTO crm_event_notifications (
  lead_id, event_type, title, message, priority, is_read
)
SELECT
  cl.id,
  'lead_needs_attention',
  'Lead en attente - ' || cl.first_name || ' ' || COALESCE(cl.last_name, ''),
  'Ce lead n a pas ete traite depuis ' ||
  EXTRACT(DAY FROM NOW() - cl.created_at)::integer || ' jours. Pipeline: ' || cl.pipeline_stage,
  CASE
    WHEN cl.pipeline_stage IN ('signature_devis', 'contrat_signature') THEN 3
    WHEN cl.pipeline_stage IN ('saisie_devis', 'collecte_documents') THEN 2
    ELSE 1
  END,
  false
FROM crm_leads cl
WHERE cl.is_archived = false
AND cl.deleted_at IS NULL
AND cl.created_at > '2025-12-01'
AND cl.created_at < NOW() - INTERVAL '3 days'
AND cl.email NOT ILIKE '%example.com%'
AND cl.email NOT ILIKE '%instagram.com%'
AND cl.email NOT ILIKE '%twilio%'
AND cl.email NOT ILIKE '%monetico.com%'
AND cl.email NOT ILIKE '%mfa.fr%'
AND cl.email NOT ILIKE '%monceauassurances%'
AND cl.email NOT ILIKE 'ne-pas-repondre%'
AND cl.email NOT ILIKE '%@mail.%'
AND lower(cl.email) != 'team@taxiassur.com'
AND cl.first_name NOT ILIKE '%test%'
AND cl.first_name NOT ILIKE '%instagram%'
AND cl.pipeline_stage NOT IN ('perdu', 'archive')
AND NOT EXISTS (
  SELECT 1 FROM crm_event_notifications n
  WHERE n.lead_id = cl.id
  AND n.event_type = 'lead_needs_attention'
  AND n.created_at > NOW() - INTERVAL '24 hours'
);
