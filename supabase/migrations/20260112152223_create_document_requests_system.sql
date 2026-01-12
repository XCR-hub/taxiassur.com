/*
  # Système de Gestion des Documents Complémentaires (Flexible & Permanent)

  ## Description
  Permet de réclamer des documents non normés à tout moment du cycle de vie :
  - Avant devis (demandé par l'assureur)
  - Avant contrat (justificatif supplémentaire)
  - Après signature (contrôle, audit)
  - En gestion (mise à jour dossier)

  ## Nouveautés

  1. Table `crm_document_requests`
  2. Verrous intelligents sur `crm_leads` (can_generate_quote, can_sign_contract, can_pay)
  3. Fonctions automatiques de vérification
  4. Templates de notifications multicanales

  ## Sécurité
  - RLS activée sur crm_document_requests
  - Admin peut tout voir/modifier
  - Client peut voir uniquement ses demandes via token
*/

-- =====================================================
-- 1. CRÉATION DES ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE crm_document_phase AS ENUM (
    'avant_devis',
    'avant_contrat',
    'apres_signature',
    'gestion'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_document_request_status AS ENUM (
    'demande',
    'recu',
    'valide',
    'refuse'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. TABLE DOCUMENT_REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS crm_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  phase crm_document_phase NOT NULL DEFAULT 'avant_devis',
  compagnie text,
  titre text NOT NULL,
  description text,
  obligatoire boolean DEFAULT true,
  bloquant boolean DEFAULT true,
  statut crm_document_request_status DEFAULT 'demande',

  -- Horodatage
  created_at timestamptz DEFAULT now(),
  received_at timestamptz,
  validated_at timestamptz,

  -- Traçabilité
  created_by uuid REFERENCES admin_users(id),
  validated_by uuid REFERENCES admin_users(id),

  -- Fichier
  document_url text,
  document_filename text,
  document_size bigint,

  -- Notes
  notes_admin text,
  notes_client text,

  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_document_requests_lead_id ON crm_document_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_phase ON crm_document_requests(phase);
CREATE INDEX IF NOT EXISTS idx_document_requests_statut ON crm_document_requests(statut);
CREATE INDEX IF NOT EXISTS idx_document_requests_bloquant ON crm_document_requests(bloquant) WHERE bloquant = true;

-- =====================================================
-- 3. AJOUT DES VERROUS SUR CRM_LEADS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'can_generate_quote'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN can_generate_quote boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'can_sign_contract'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN can_sign_contract boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'can_pay'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN can_pay boolean DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_leads_locks ON crm_leads(can_generate_quote, can_sign_contract, can_pay);

-- =====================================================
-- 4. FONCTION DE VÉRIFICATION DES VERROUS
-- =====================================================

CREATE OR REPLACE FUNCTION check_document_locks(p_lead_id uuid)
RETURNS TABLE(
  can_generate_quote boolean,
  can_sign_contract boolean,
  can_pay boolean,
  blocking_docs jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_quote boolean := true;
  v_can_sign boolean := true;
  v_can_pay boolean := true;
  v_blocking jsonb := '[]'::jsonb;
BEGIN
  -- Vérifier documents avant devis (bloquants)
  IF EXISTS (
    SELECT 1 FROM crm_document_requests
    WHERE lead_id = p_lead_id
    AND phase = 'avant_devis'
    AND bloquant = true
    AND statut NOT IN ('valide')
  ) THEN
    v_can_quote := false;

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'titre', titre,
        'phase', phase,
        'statut', statut
      )
    ) INTO v_blocking
    FROM crm_document_requests
    WHERE lead_id = p_lead_id
    AND phase = 'avant_devis'
    AND bloquant = true
    AND statut NOT IN ('valide');
  END IF;

  -- Vérifier documents avant contrat (bloquants)
  IF EXISTS (
    SELECT 1 FROM crm_document_requests
    WHERE lead_id = p_lead_id
    AND phase = 'avant_contrat'
    AND bloquant = true
    AND statut NOT IN ('valide')
  ) THEN
    v_can_sign := false;
    v_can_pay := false;

    SELECT COALESCE(v_blocking, '[]'::jsonb) || jsonb_agg(
      jsonb_build_object(
        'id', id,
        'titre', titre,
        'phase', phase,
        'statut', statut
      )
    ) INTO v_blocking
    FROM crm_document_requests
    WHERE lead_id = p_lead_id
    AND phase = 'avant_contrat'
    AND bloquant = true
    AND statut NOT IN ('valide');
  END IF;

  UPDATE crm_leads
  SET
    can_generate_quote = v_can_quote,
    can_sign_contract = v_can_sign,
    can_pay = v_can_pay,
    updated_at = now()
  WHERE id = p_lead_id;

  RETURN QUERY SELECT v_can_quote, v_can_sign, v_can_pay, COALESCE(v_blocking, '[]'::jsonb);
END;
$$;

-- =====================================================
-- 5. TRIGGER AUTOMATIQUE SUR CHANGEMENT STATUT
-- =====================================================

CREATE OR REPLACE FUNCTION on_document_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_document_locks(NEW.lead_id);

  IF NEW.statut = 'recu' AND (OLD.statut IS NULL OR OLD.statut != 'recu') THEN
    INSERT INTO crm_interactions (
      lead_id,
      type,
      direction,
      channel,
      subject,
      content,
      metadata
    ) VALUES (
      NEW.lead_id,
      'notification',
      'inbound',
      'system',
      'Document complémentaire reçu',
      format('Document "%s" reçu pour la phase "%s"', NEW.titre, NEW.phase),
      jsonb_build_object(
        'document_request_id', NEW.id,
        'phase', NEW.phase,
        'titre', NEW.titre
      )
    );

    PERFORM queue_event_notifications(
      NEW.lead_id,
      'document_complementaire_recu',
      jsonb_build_object(
        'titre', NEW.titre,
        'phase', NEW.phase,
        'lead_name', (SELECT COALESCE(first_name || ' ' || last_name, email) FROM crm_leads WHERE id = NEW.lead_id)
      )
    );
  END IF;

  IF NEW.statut = 'valide' AND (OLD.statut IS NULL OR OLD.statut != 'valide') THEN
    NEW.validated_at := now();

    PERFORM queue_event_notifications(
      NEW.lead_id,
      'document_complementaire_valide',
      jsonb_build_object(
        'titre', NEW.titre,
        'phase', NEW.phase
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_document_request_change ON crm_document_requests;
CREATE TRIGGER trigger_document_request_change
  BEFORE UPDATE ON crm_document_requests
  FOR EACH ROW
  EXECUTE FUNCTION on_document_request_change();

-- =====================================================
-- 6. FONCTION POUR CRÉER UNE DEMANDE DE DOCUMENT
-- =====================================================

CREATE OR REPLACE FUNCTION create_document_request(
  p_lead_id uuid,
  p_phase crm_document_phase,
  p_titre text,
  p_description text DEFAULT NULL,
  p_compagnie text DEFAULT NULL,
  p_obligatoire boolean DEFAULT true,
  p_bloquant boolean DEFAULT true,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  INSERT INTO crm_document_requests (
    lead_id,
    phase,
    titre,
    description,
    compagnie,
    obligatoire,
    bloquant,
    created_by
  ) VALUES (
    p_lead_id,
    p_phase,
    p_titre,
    p_description,
    p_compagnie,
    p_obligatoire,
    p_bloquant,
    p_created_by
  ) RETURNING id INTO v_request_id;

  PERFORM check_document_locks(p_lead_id);

  PERFORM queue_event_notifications(
    p_lead_id,
    'document_complementaire_demande',
    jsonb_build_object(
      'titre', p_titre,
      'description', COALESCE(p_description, ''),
      'phase', p_phase,
      'obligatoire', p_obligatoire,
      'compagnie', COALESCE(p_compagnie, 'TaxiAssur')
    )
  );

  RETURN v_request_id;
END;
$$;

-- =====================================================
-- 7. TEMPLATES DE NOTIFICATIONS
-- =====================================================

INSERT INTO crm_notification_templates (template_id, name, channel, subject, content, html_content, variables, is_active)
VALUES (
  'document_complementaire_demande',
  'Document complémentaire demandé',
  'email',
  'Document complémentaire requis pour votre dossier',
  'Bonjour {{first_name}}, Pour finaliser votre dossier nous avons besoin du document : {{titre}}. Accédez à votre espace : {{upload_link}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #2563eb;">📄 Document complémentaire requis</h2><p>Bonjour {{first_name}},</p><p>Pour finaliser votre dossier d''assurance taxi, nous avons besoin d''un document complémentaire :</p><div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong style="color: #1f2937;">📎 {{titre}}</strong><br>{{#description}}<p style="margin: 10px 0 0 0; color: #6b7280;">{{description}}</p>{{/description}}{{#compagnie}}<p style="margin: 10px 0 0 0;"><em>Demandé par : {{compagnie}}</em></p>{{/compagnie}}</div>{{#obligatoire}}<p style="color: #dc2626; font-weight: bold;">⚠️ Ce document est obligatoire pour poursuivre votre dossier.</p>{{/obligatoire}}<div style="text-align: center; margin: 30px 0;"><a href="{{upload_link}}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">📤 Télécharger mon document</a></div><p style="color: #6b7280; font-size: 14px;">Formats acceptés : PDF, JPG, PNG (max 10 Mo)</p></div></body></html>',
  '["first_name", "titre", "description", "compagnie", "obligatoire", "upload_link"]'::jsonb,
  true
) ON CONFLICT (template_id) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables;

INSERT INTO crm_notification_templates (template_id, name, channel, subject, content, variables, is_active)
VALUES (
  'document_complementaire_demande_sms',
  'Document complémentaire demandé (SMS)',
  'sms',
  NULL,
  'TaxiAssur : Document requis pour votre dossier : {{titre}}. Téléchargez-le sur votre espace : {{upload_link}}',
  '["titre", "upload_link"]'::jsonb,
  true
) ON CONFLICT (template_id) DO NOTHING;

INSERT INTO crm_notification_templates (template_id, name, channel, subject, content, variables, is_active)
VALUES (
  'document_complementaire_demande_whatsapp',
  'Document complémentaire demandé (WhatsApp)',
  'whatsapp',
  NULL,
  '📄 *Document requis*\n\nBonjour {{first_name}},\n\nPour finaliser votre dossier, merci de nous fournir :\n\n📎 *{{titre}}*\n{{#description}}{{description}}\n{{/description}}\n{{#obligatoire}}⚠️ Document obligatoire{{/obligatoire}}\n\n👉 Téléchargez-le ici : {{upload_link}}',
  '["first_name", "titre", "description", "obligatoire", "upload_link"]'::jsonb,
  true
) ON CONFLICT (template_id) DO NOTHING;

INSERT INTO crm_notification_templates (template_id, name, channel, subject, content, html_content, variables, is_active)
VALUES (
  'document_complementaire_recu',
  'Document complémentaire reçu (admin)',
  'email',
  '✅ Document reçu : {{titre}} - {{lead_name}}',
  'Nouveau document reçu pour {{lead_name}} : {{titre}} (phase: {{phase}})',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h3>✅ Nouveau document complémentaire reçu</h3><p><strong>Lead :</strong> {{lead_name}}</p><p><strong>Document :</strong> {{titre}}</p><p><strong>Phase :</strong> {{phase}}</p><p style="margin-top: 20px;"><a href="{{crm_link}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Voir dans le CRM</a></p></div></body></html>',
  '["lead_name", "titre", "phase", "crm_link"]'::jsonb,
  true
) ON CONFLICT (template_id) DO UPDATE SET html_content = EXCLUDED.html_content;

INSERT INTO crm_notification_templates (template_id, name, channel, subject, content, html_content, variables, is_active)
VALUES (
  'document_complementaire_valide',
  'Document complémentaire validé (client)',
  'email',
  '✅ Document validé : {{titre}}',
  'Bonjour {{first_name}}, Votre document {{titre}} a été validé avec succès.',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #16a34a;">✅ Document validé</h2><p>Bonjour {{first_name}},</p><p>Votre document <strong>{{titre}}</strong> a été validé avec succès.</p><p>Votre dossier progresse normalement. Nous vous tiendrons informé des prochaines étapes.</p><p style="margin-top: 30px;">Merci de votre confiance,<br>L''équipe TaxiAssur</p></div></body></html>',
  '["first_name", "titre"]'::jsonb,
  true
) ON CONFLICT (template_id) DO UPDATE SET html_content = EXCLUDED.html_content;

-- =====================================================
-- 8. RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE crm_document_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access document requests" ON crm_document_requests;
CREATE POLICY "Admin full access document requests"
  ON crm_document_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view own document requests via token" ON crm_document_requests;
CREATE POLICY "Public can view own document requests via token"
  ON crm_document_requests
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_document_requests.lead_id
      AND crm_leads.access_token = current_setting('request.jwt.claims', true)::json->>'access_token'
    )
  );

DROP POLICY IF EXISTS "Public can upload document via token" ON crm_document_requests;
CREATE POLICY "Public can upload document via token"
  ON crm_document_requests
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_document_requests.lead_id
      AND crm_leads.access_token = current_setting('request.jwt.claims', true)::json->>'access_token'
    )
  )
  WITH CHECK (
    document_url IS NOT NULL OR
    document_filename IS NOT NULL OR
    notes_client IS NOT NULL OR
    statut IN ('recu')
  );

COMMENT ON TABLE crm_document_requests IS 'Demandes de documents complémentaires non normés, utilisables à tout moment du cycle de vie';
COMMENT ON COLUMN crm_document_requests.bloquant IS 'Si true, empêche la progression du pipeline tant que le document n''est pas validé';
COMMENT ON FUNCTION check_document_locks IS 'Vérifie les documents bloquants et met à jour les verrous can_generate_quote, can_sign_contract, can_pay';
