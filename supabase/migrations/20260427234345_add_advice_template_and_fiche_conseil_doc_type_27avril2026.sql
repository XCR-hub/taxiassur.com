/*
  # Auto-generated advice sheet (fiche de conseil) per insurance company

  1. Schema changes
    - Add `advice_template` jsonb column to `insurance_companies`
      stores the per-company template (formulas, optional guarantees, advice text, broker info, mediation info)
    - Allow `fiche_conseil` value in `crm_lead_documents.document_type` check constraint

  2. Data
    - Populate Solly Azar template based on the official Solly Azar fiche de conseil PDF
    - Populate sensible defaults for the 4 other active companies (Generali, 2MA, +Simple, Zephir)

  3. Notes
    - No RLS changes needed (insurance_companies and crm_lead_documents already have policies)
    - Existing rows keep document_type valid
*/

ALTER TABLE public.insurance_companies
  ADD COLUMN IF NOT EXISTS advice_template jsonb DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.crm_lead_documents'::regclass
      AND conname = 'crm_lead_documents_document_type_check'
  ) THEN
    ALTER TABLE public.crm_lead_documents
      DROP CONSTRAINT crm_lead_documents_document_type_check;
  END IF;

  ALTER TABLE public.crm_lead_documents
    ADD CONSTRAINT crm_lead_documents_document_type_check
    CHECK (document_type = ANY (ARRAY[
      'licence_taxi','permis_conduire','carte_grise','releve_information',
      'carte_professionnelle','kbis','piece_identite','carte_identite',
      'justificatif_domicile','autorisation_stationnement','rib','RIB',
      'contrat_signe','devis','fiche_conseil','autre','custom'
    ]));
END $$;

UPDATE public.insurance_companies
SET advice_template = jsonb_build_object(
  'broker', jsonb_build_object(
    'name', 'TaxiAssur',
    'legal_form', 'Société de courtage en assurances',
    'address', '60 rue François 1er, 75008 Paris',
    'phone', '01 80 85 57 88',
    'email', 'team@taxiassur.com',
    'orias', 'XX XXX XXX',
    'rcp', 'MMA IARD - Police n° 113.245.029',
    'gf', 'CGPA - Police n° RC.GP.XXX'
  ),
  'formulas', jsonb_build_array(
    jsonb_build_object(
      'name', 'Tiers Simple',
      'guarantees', jsonb_build_array(
        'Responsabilité Civile illimitée',
        'Défense Recours',
        'Protection Juridique',
        'Assistance 0 km'
      )
    ),
    jsonb_build_object(
      'name', 'Tiers Plus',
      'guarantees', jsonb_build_array(
        'Responsabilité Civile illimitée',
        'Défense Recours',
        'Protection Juridique',
        'Bris de glace',
        'Vol et Incendie',
        'Catastrophes naturelles et technologiques',
        'Attentats',
        'Assistance 0 km'
      )
    ),
    jsonb_build_object(
      'name', 'Tous Risques',
      'guarantees', jsonb_build_array(
        'Responsabilité Civile illimitée',
        'Défense Recours',
        'Protection Juridique',
        'Bris de glace',
        'Vol et Incendie',
        'Catastrophes naturelles et technologiques',
        'Attentats',
        'Dommages tous accidents',
        'Assistance 0 km'
      )
    )
  ),
  'optional_guarantees', jsonb_build_array(
    'Garantie du conducteur (capital invalidité / décès)',
    'Garantie perte financière (location longue durée / crédit)',
    'Garantie effets personnels',
    'Garantie équipements professionnels (taximètre, lumineux, terminal CB)',
    'Véhicule de remplacement',
    'Indemnisation perte d''exploitation'
  ),
  'advice_text', 'Compte tenu du profil du chauffeur, de l''usage professionnel taxi du véhicule et des informations communiquées sur ses besoins, nous lui recommandons une formule adaptée au niveau de couverture souhaité, en tenant compte de la valeur du véhicule, de l''ancienneté du permis, du coefficient bonus-malus et de l''historique de sinistralité. La formule retenue couvre les risques essentiels liés à l''activité de transport de personnes à titre onéreux.',
  'important_remarks', jsonb_build_array(
    'Le contrat est régi par le Code des assurances et par les Conditions Générales de la compagnie remises au souscripteur.',
    'Toute fausse déclaration intentionnelle entraîne la nullité du contrat (art. L. 113-8 du Code des assurances).',
    'Toute omission ou déclaration inexacte non intentionnelle entraîne une réduction proportionnelle d''indemnité (art. L. 113-9).',
    'Le souscripteur doit déclarer en cours de contrat toute aggravation du risque (changement de véhicule, de conducteur principal, suspension de permis, etc.).'
  ),
  'claim_info', 'En cas de sinistre, le souscripteur doit déclarer le sinistre dans les 5 jours ouvrés (2 jours en cas de vol). Numéro de déclaration : voir conditions particulières.',
  'mediation_info', 'En cas de litige non résolu avec l''assureur, le souscripteur peut saisir gratuitement le Médiateur de l''Assurance : La Médiation de l''Assurance, TSA 50110, 75441 Paris Cedex 09 - www.mediation-assurance.org.',
  'gdpr_info', 'Les données personnelles collectées sont traitées par TaxiAssur et l''assureur pour la souscription et la gestion du contrat. Le souscripteur dispose d''un droit d''accès, de rectification, d''opposition et de suppression auprès de TaxiAssur - team@taxiassur.com.'
)
WHERE code = 'solly_azar' OR LOWER(name) LIKE '%solly%azar%';

UPDATE public.insurance_companies
SET advice_template = jsonb_set(
  advice_template,
  '{insurer}',
  jsonb_build_object('name', name, 'phone', COALESCE(contact_phone, ''), 'email', COALESCE(contact_email, ''))
)
WHERE advice_template IS NOT NULL AND advice_template != '{}'::jsonb;

UPDATE public.insurance_companies
SET advice_template = jsonb_build_object(
  'broker', jsonb_build_object(
    'name', 'TaxiAssur',
    'legal_form', 'Société de courtage en assurances',
    'address', '60 rue François 1er, 75008 Paris',
    'phone', '01 80 85 57 88',
    'email', 'team@taxiassur.com',
    'orias', 'XX XXX XXX',
    'rcp', 'MMA IARD - Police n° 113.245.029',
    'gf', 'CGPA - Police n° RC.GP.XXX'
  ),
  'insurer', jsonb_build_object('name', name, 'phone', COALESCE(contact_phone, ''), 'email', COALESCE(contact_email, '')),
  'formulas', jsonb_build_array(
    jsonb_build_object(
      'name', 'Tiers',
      'guarantees', jsonb_build_array('Responsabilité Civile illimitée','Défense Recours','Protection Juridique','Assistance')
    ),
    jsonb_build_object(
      'name', 'Tiers Plus',
      'guarantees', jsonb_build_array('Responsabilité Civile illimitée','Bris de glace','Vol et Incendie','Catastrophes naturelles','Attentats','Assistance')
    ),
    jsonb_build_object(
      'name', 'Tous Risques',
      'guarantees', jsonb_build_array('Responsabilité Civile illimitée','Bris de glace','Vol et Incendie','Catastrophes naturelles','Attentats','Dommages tous accidents','Assistance')
    )
  ),
  'optional_guarantees', jsonb_build_array(
    'Garantie du conducteur',
    'Garantie perte financière',
    'Véhicule de remplacement',
    'Garantie équipements professionnels'
  ),
  'advice_text', 'En tenant compte du profil du chauffeur taxi, de la valeur du véhicule et des besoins exprimés, nous recommandons une formule adaptée à l''usage professionnel et conforme aux exigences réglementaires applicables aux taxis.',
  'important_remarks', jsonb_build_array(
    'Le contrat est régi par le Code des assurances.',
    'Toute fausse déclaration intentionnelle entraîne la nullité du contrat (art. L. 113-8).',
    'Toute déclaration inexacte non intentionnelle entraîne une réduction d''indemnité (art. L. 113-9).'
  ),
  'claim_info', 'Déclarer tout sinistre sous 5 jours ouvrés (2 jours en cas de vol).',
  'mediation_info', 'En cas de litige : La Médiation de l''Assurance, TSA 50110, 75441 Paris Cedex 09 - www.mediation-assurance.org.',
  'gdpr_info', 'Données traitées par TaxiAssur et l''assureur. Droits d''accès et rectification : team@taxiassur.com.'
)
WHERE (advice_template IS NULL OR advice_template = '{}'::jsonb)
  AND is_active = true;
