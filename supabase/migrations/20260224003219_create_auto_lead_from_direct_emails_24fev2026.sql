/*
  # Système de création automatique de leads depuis emails directs
  
  1. Nouvelles fonctions
    - `detect_and_create_lead_from_email()` - Détecte les emails directs avec pièces jointes
    - `extract_phone_from_text()` - Extrait un numéro de téléphone du texte
    - `auto_create_lead_from_direct_email()` - Crée un lead automatiquement
  
  2. Trigger
    - Détecte automatiquement les emails avec pièces jointes sans lead associé
    - Crée un lead "incomplet" si trouvé
    - Envoie notification au commercial
  
  3. Sécurité
    - Exécution en arrière-plan (non-bloquant)
    - Gestion des erreurs silencieuse
    - Pas de duplication d'emails
*/

-- Fonction pour extraire un numéro de téléphone français du texte
CREATE OR REPLACE FUNCTION extract_phone_from_text(text_content text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  phone_match text;
BEGIN
  -- Recherche de numéros au format français (10 chiffres)
  phone_match := (
    SELECT (regexp_matches(text_content, '0[1-9](?:\d{2}){4}', 'g'))[1]
    LIMIT 1
  );
  
  RETURN COALESCE(phone_match, '0000000000');
END;
$$;

-- Fonction principale de détection et création de lead
CREATE OR REPLACE FUNCTION auto_create_lead_from_direct_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  email_count int;
  has_attachments boolean;
  lead_exists boolean;
  new_lead_id uuid;
  extracted_phone text;
  sender_name text;
  sender_parts text[];
BEGIN
  -- Seulement pour les nouveaux emails
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Vérifier si l'email a des pièces jointes
  has_attachments := EXISTS (
    SELECT 1 FROM email_attachments
    WHERE email_id = NEW.id
  );

  -- Si pas de pièces jointes, ignorer
  IF NOT has_attachments THEN
    RETURN NEW;
  END IF;

  -- Vérifier si un lead existe déjà pour cet email
  lead_exists := EXISTS (
    SELECT 1 FROM crm_leads
    WHERE email = NEW.from_email
    AND deleted_at IS NULL
  );

  -- Si lead existe déjà, juste lier l'email
  IF lead_exists THEN
    UPDATE email_messages
    SET lead_id = (SELECT id FROM crm_leads WHERE email = NEW.from_email LIMIT 1)
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  -- Extraire le téléphone du contenu de l'email
  extracted_phone := extract_phone_from_text(COALESCE(NEW.body_text, NEW.body_html, ''));

  -- Extraire le nom de l'expéditeur
  sender_name := COALESCE(NEW.from_name, split_part(NEW.from_email, '@', 1));
  sender_parts := string_to_array(sender_name, ' ');

  -- Créer un nouveau lead automatiquement
  INSERT INTO crm_leads (
    first_name,
    last_name,
    email,
    phone,
    city,
    status,
    source,
    metadata,
    access_token
  )
  VALUES (
    COALESCE(sender_parts[1], 'Prospect'),
    COALESCE(array_to_string(sender_parts[2:array_length(sender_parts, 1)], ' '), ''),
    NEW.from_email,
    extracted_phone,
    'À préciser',
    'NOUVEAU_LEAD',
    'email_direct_auto',
    jsonb_build_object(
      'vehicle_type', 'À préciser',
      'created_from_email', true,
      'original_email_id', NEW.id,
      'has_attachments', true,
      'email_subject', NEW.subject,
      'email_date', NEW.received_at,
      'notes', '⚠️ Lead créé automatiquement depuis email avec pièces jointes - Informations à compléter'
    ),
    encode(extensions.digest(concat(NEW.from_email, extract(epoch from now())::text), 'sha256'), 'hex')
  )
  RETURNING id INTO new_lead_id;

  -- Lier l'email au nouveau lead
  UPDATE email_messages
  SET lead_id = new_lead_id
  WHERE id = NEW.id;

  -- Créer une notification pour le commercial
  INSERT INTO crm_event_notifications (
    lead_id,
    title,
    message,
    event_type,
    priority,
    context_data
  )
  VALUES (
    new_lead_id,
    '📧 Nouveau lead depuis email direct',
    format('Lead créé automatiquement depuis l''email de %s (%s) avec pièces jointes. Vérifier et compléter les informations.', sender_name, NEW.from_email),
    'lead_created',
    2,
    jsonb_build_object(
      'email_id', NEW.id,
      'from_email', NEW.from_email,
      'subject', NEW.subject,
      'has_attachments', true,
      'action_required', 'Compléter les informations du lead'
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, on continue sans bloquer l'insertion de l'email
    RAISE WARNING 'Erreur lors de la création automatique du lead: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Créer le trigger (désactiver l'ancien s'il existe)
DROP TRIGGER IF EXISTS trigger_auto_create_lead_from_email ON email_messages;

CREATE TRIGGER trigger_auto_create_lead_from_email
  AFTER INSERT ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_lead_from_direct_email();

-- Créer une fonction pour traiter rétroactivement les emails existants
CREATE OR REPLACE FUNCTION process_existing_direct_emails()
RETURNS TABLE (
  email_id uuid,
  from_email text,
  created_lead_id uuid,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_rec record;
  new_lead_id uuid;
BEGIN
  -- Parcourir tous les emails avec pièces jointes sans lead associé
  FOR email_rec IN
    SELECT DISTINCT em.id, em.from_email, em.from_name, em.subject, em.body_text, em.body_html, em.received_at
    FROM email_messages em
    WHERE em.lead_id IS NULL
    AND EXISTS (
      SELECT 1 FROM email_attachments ea
      WHERE ea.email_id = em.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM crm_leads cl
      WHERE cl.email = em.from_email
      AND cl.deleted_at IS NULL
    )
  LOOP
    -- Appeler la fonction pour créer le lead
    BEGIN
      PERFORM auto_create_lead_from_direct_email()
      FROM email_messages
      WHERE id = email_rec.id;
      
      SELECT cl.id INTO new_lead_id
      FROM crm_leads cl
      WHERE cl.email = email_rec.from_email
      LIMIT 1;
      
      RETURN QUERY SELECT 
        email_rec.id,
        email_rec.from_email,
        new_lead_id,
        'success'::text;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT 
          email_rec.id,
          email_rec.from_email,
          NULL::uuid,
          format('error: %s', SQLERRM)::text;
    END;
  END LOOP;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION extract_phone_from_text TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION auto_create_lead_from_direct_email TO service_role;
GRANT EXECUTE ON FUNCTION process_existing_direct_emails TO service_role, authenticated;
