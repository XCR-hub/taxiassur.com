/*
  # Templates WhatsApp Production TaxiAssur

  Ajoute 10 templates métier essentiels pour toute la chaîne commerciale
*/

-- Supprimer templates de démo
DELETE FROM wa_templates 
WHERE name IN ('wa_bienvenue', 'wa_pieces', 'wa_devis', 'wa_rdv', 'wa_confirm', 'wa_relance');

-- Templates production
INSERT INTO wa_templates (name, language, body, variables, category, approved) VALUES

-- 1. Relance pièces manquantes (PRIORITY)
(
  'taxiassur_pieces_manquantes_v1',
  'fr',
  'Bonjour {{nom_client}}, suite à votre demande de devis TaxiAssur, pouvez-vous nous transmettre : {{liste_pieces}}. Vous pouvez répondre ici en joignant les documents. Merci. Team TaxiAssur – {{telephone}}',
  '["nom_client", "liste_pieces", "telephone"]'::jsonb,
  'utility',
  true
),

-- 2. RIB / Finalisation souscription (PRIORITY)
(
  'taxiassur_rib_finalisation_v1',
  'fr',
  'Bonjour {{nom_client}}, pour finaliser votre souscription TaxiAssur, merci de transmettre votre RIB via ce lien sécurisé : {{lien_upload}}. Dès réception, nous vous envoyons la signature électronique et vos attestations. Team TaxiAssur – {{telephone}}',
  '["nom_client", "lien_upload", "telephone"]'::jsonb,
  'utility',
  true
),

-- 3. Confirmation contact post-appel (PRIORITY)
(
  'taxiassur_confirmation_contact_v1',
  'fr',
  'Bonjour {{nom_client}}, nous confirmons notre échange avec TaxiAssur. Prochaine étape : {{etape_suivante}}. Si vous avez une question, répondez directement à ce message. Team TaxiAssur – {{telephone}}',
  '["nom_client", "etape_suivante", "telephone"]'::jsonb,
  'utility',
  true
),

-- 4. Avis Google
(
  'taxiassur_avis_google_v1',
  'fr',
  'Bonjour {{nom_client}}, merci pour votre confiance. Si notre accompagnement vous a satisfait, pouvez-vous laisser un avis ici : {{lien_avis}} ? Cela nous aide beaucoup. Merci. Team TaxiAssur – {{telephone}}',
  '["nom_client", "lien_avis", "telephone"]'::jsonb,
  'marketing',
  true
),

-- 5. Bienvenue lead
(
  'taxiassur_bienvenue_lead',
  'fr',
  'Bonjour {{prenom}}, merci pour votre demande d''assurance taxi chez TaxiAssur. Un conseiller vous contactera sous 24h au {{telephone_lead}}. Pour toute urgence : 01 80 85 57 86',
  '["prenom", "telephone_lead"]'::jsonb,
  'utility',
  true
),

-- 6. Devis prêt
(
  'taxiassur_devis_pret',
  'fr',
  'Bonne nouvelle {{prenom}} ! Votre devis TaxiAssur est prêt : {{montant}} euros/mois. Formule {{formule}}. Consultez-le ici : {{lien_devis}}. Répondez OUI pour souscrire ou appelez-nous au {{telephone}}',
  '["prenom", "montant", "formule", "lien_devis", "telephone"]'::jsonb,
  'utility',
  true
),

-- 7. Rappel RDV
(
  'taxiassur_rappel_rdv',
  'fr',
  'Rappel RDV : Vous avez rendez-vous avec {{conseiller}} le {{date}} à {{heure}} pour votre assurance taxi. Pour annuler ou reporter, répondez à ce message. TaxiAssur – {{telephone}}',
  '["conseiller", "date", "heure", "telephone"]'::jsonb,
  'utility',
  true
),

-- 8. Documents reçus
(
  'taxiassur_documents_recus',
  'fr',
  'Bonjour {{prenom}}, nous avons bien reçu vos documents. Notre équipe les analyse et revient vers vous sous 2h maximum. TaxiAssur – {{telephone}}',
  '["prenom", "telephone"]'::jsonb,
  'utility',
  true
),

-- 9. Souscription validée
(
  'taxiassur_souscription_validee',
  'fr',
  'Félicitations {{prenom}} ! Votre contrat d''assurance taxi TaxiAssur numero {{numero_contrat}} est activé. Vous recevrez vos documents par email sous 1h. Bienvenue dans la famille TaxiAssur !',
  '["prenom", "numero_contrat"]'::jsonb,
  'utility',
  true
),

-- 10. Relance lead froid
(
  'taxiassur_relance_lead_froid',
  'fr',
  'Bonjour {{prenom}}, votre demande de devis assurance taxi du {{date_demande}} est toujours d''actualité ? Nous avons de nouvelles offres à vous proposer. Répondez OUI pour être rappelé rapidement. TaxiAssur – {{telephone}}',
  '["prenom", "date_demande", "telephone"]'::jsonb,
  'marketing',
  true
)

ON CONFLICT (name) DO UPDATE SET
  body = EXCLUDED.body,
  variables = EXCLUDED.variables,
  category = EXCLUDED.category,
  approved = EXCLUDED.approved;

-- Vue stats templates
CREATE OR REPLACE VIEW wa_templates_usage AS
SELECT
  t.name,
  t.category,
  t.language,
  t.approved,
  t.usage_count,
  t.variables,
  LENGTH(t.body) as body_length,
  jsonb_array_length(t.variables) as variable_count,
  t.created_at
FROM wa_templates t
ORDER BY t.usage_count DESC, t.name;
