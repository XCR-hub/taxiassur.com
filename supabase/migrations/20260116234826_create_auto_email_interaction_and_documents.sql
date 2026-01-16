/*
  # Création automatique des interactions et documents depuis les emails
  
  1. Problème résolu
    - Les emails sont synchronisés mais ne créent pas d'interactions dans le CRM
    - Les pièces jointes ne sont pas extraites en documents
    - La timeline reste vide même quand les emails sont liés au lead
  
  2. Solution
    - Trigger qui crée automatiquement une interaction quand un email est lié à un lead
    - Extraction automatique des pièces jointes en documents prospects
    - Évite les doublons grâce à l'email_id dans metadata
  
  3. Déclenchement
    - AFTER INSERT sur email_messages (si lead_id est présent)
    - AFTER UPDATE sur email_messages (si lead_id vient d'être assigné)
*/

-- Fonction pour créer l'interaction et extraire les documents
CREATE OR REPLACE FUNCTION create_interaction_from_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attachment jsonb;
  doc_type text;
BEGIN
  -- Ne rien faire si pas de lead_id
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pour les UPDATE, vérifier si lead_id vient d'être assigné
  IF TG_OP = 'UPDATE' AND OLD.lead_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Vérifier qu'une interaction n'existe pas déjà pour cet email
  IF EXISTS (
    SELECT 1 FROM crm_interactions
    WHERE lead_id = NEW.lead_id
    AND metadata->>'email_id' = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  -- Créer l'interaction
  INSERT INTO crm_interactions (
    lead_id,
    type,
    direction,
    subject,
    content,
    created_at,
    metadata
  ) VALUES (
    NEW.lead_id,
    'email',
    NEW.direction,
    NEW.subject,
    COALESCE(NEW.body_text, NEW.body_html, ''),
    NEW.received_at,
    jsonb_build_object(
      'email_id', NEW.id,
      'from', NEW.from_email,
      'from_name', NEW.from_name,
      'to', NEW.to_emails,
      'has_attachments', (NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0),
      'provider', COALESCE(NEW.provider, 'unknown')
    )
  );

  -- Extraire les pièces jointes en documents si présentes
  IF NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0 THEN
    FOR attachment IN SELECT * FROM jsonb_array_elements(NEW.attachments)
    LOOP
      -- Déterminer le type de document selon le nom du fichier
      doc_type := CASE
        WHEN lower(attachment->>'filename') LIKE '%rib%' OR lower(attachment->>'filename') LIKE '%bank%' THEN 'rib'
        WHEN lower(attachment->>'filename') LIKE '%kbis%' OR lower(attachment->>'filename') LIKE '%siret%' THEN 'kbis'
        WHEN lower(attachment->>'filename') LIKE '%permis%' OR lower(attachment->>'filename') LIKE '%license%' THEN 'permis_conduire'
        WHEN lower(attachment->>'filename') LIKE '%identit%' OR lower(attachment->>'filename') LIKE '%carte%' THEN 'piece_identite'
        WHEN lower(attachment->>'filename') LIKE '%carte%grise%' OR lower(attachment->>'filename') LIKE '%vehicule%' THEN 'carte_grise'
        WHEN lower(attachment->>'filename') LIKE '%assurance%' OR lower(attachment->>'filename') LIKE '%attestation%' THEN 'attestation_assurance_actuelle'
        ELSE 'autre'
      END;

      -- Créer le document prospect
      INSERT INTO prospect_documents (
        lead_id,
        document_type,
        file_name,
        file_url,
        file_size,
        mime_type,
        source,
        metadata
      ) VALUES (
        NEW.lead_id,
        doc_type,
        attachment->>'filename',
        attachment->>'url',
        COALESCE((attachment->>'size')::bigint, 0),
        COALESCE(attachment->>'contentType', 'application/octet-stream'),
        'email',
        jsonb_build_object(
          'email_id', NEW.id,
          'email_subject', NEW.subject,
          'email_date', NEW.received_at,
          'attachment_id', attachment->>'id'
        )
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop et recréer le trigger
DROP TRIGGER IF EXISTS trigger_create_interaction_from_email ON email_messages;

CREATE TRIGGER trigger_create_interaction_from_email
  AFTER INSERT OR UPDATE OF lead_id ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_interaction_from_email();

-- Créer également les interactions pour les emails existants déjà liés
DO $$
DECLARE
  email_record RECORD;
  attachment jsonb;
  doc_type text;
  interactions_created integer := 0;
  documents_created integer := 0;
BEGIN
  -- Pour chaque email qui a un lead_id mais pas d'interaction
  FOR email_record IN 
    SELECT em.* 
    FROM email_messages em
    WHERE em.lead_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM crm_interactions ci
      WHERE ci.lead_id = em.lead_id
      AND ci.metadata->>'email_id' = em.id::text
    )
    ORDER BY em.received_at ASC
  LOOP
    -- Créer l'interaction
    INSERT INTO crm_interactions (
      lead_id,
      type,
      direction,
      subject,
      content,
      created_at,
      metadata
    ) VALUES (
      email_record.lead_id,
      'email',
      email_record.direction,
      email_record.subject,
      COALESCE(email_record.body_text, email_record.body_html, ''),
      email_record.received_at,
      jsonb_build_object(
        'email_id', email_record.id,
        'from', email_record.from_email,
        'from_name', email_record.from_name,
        'to', email_record.to_emails,
        'has_attachments', (email_record.attachments IS NOT NULL AND jsonb_array_length(email_record.attachments) > 0),
        'provider', COALESCE(email_record.provider, 'unknown')
      )
    );
    
    interactions_created := interactions_created + 1;

    -- Extraire les pièces jointes
    IF email_record.attachments IS NOT NULL AND jsonb_array_length(email_record.attachments) > 0 THEN
      FOR attachment IN SELECT * FROM jsonb_array_elements(email_record.attachments)
      LOOP
        doc_type := CASE
          WHEN lower(attachment->>'filename') LIKE '%rib%' OR lower(attachment->>'filename') LIKE '%bank%' THEN 'rib'
          WHEN lower(attachment->>'filename') LIKE '%kbis%' OR lower(attachment->>'filename') LIKE '%siret%' THEN 'kbis'
          WHEN lower(attachment->>'filename') LIKE '%permis%' OR lower(attachment->>'filename') LIKE '%license%' THEN 'permis_conduire'
          WHEN lower(attachment->>'filename') LIKE '%identit%' OR lower(attachment->>'filename') LIKE '%carte%' THEN 'piece_identite'
          WHEN lower(attachment->>'filename') LIKE '%carte%grise%' OR lower(attachment->>'filename') LIKE '%vehicule%' THEN 'carte_grise'
          WHEN lower(attachment->>'filename') LIKE '%assurance%' OR lower(attachment->>'filename') LIKE '%attestation%' THEN 'attestation_assurance_actuelle'
          ELSE 'autre'
        END;

        INSERT INTO prospect_documents (
          lead_id,
          document_type,
          file_name,
          file_url,
          file_size,
          mime_type,
          source,
          metadata
        ) VALUES (
          email_record.lead_id,
          doc_type,
          attachment->>'filename',
          attachment->>'url',
          COALESCE((attachment->>'size')::bigint, 0),
          COALESCE(attachment->>'contentType', 'application/octet-stream'),
          'email',
          jsonb_build_object(
            'email_id', email_record.id,
            'email_subject', email_record.subject,
            'email_date', email_record.received_at,
            'attachment_id', attachment->>'id'
          )
        )
        ON CONFLICT DO NOTHING;
        
        documents_created := documents_created + 1;
      END LOOP;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration terminée : % interactions créées, % documents extraits', interactions_created, documents_created;
END $$;

-- Commentaire de documentation
COMMENT ON FUNCTION create_interaction_from_email() IS 
'Crée automatiquement une interaction CRM et extrait les pièces jointes en documents quand un email est lié à un lead';
