/*
  # Autoriser les doublons de leads et suppression sécurisée

  ## Changements

  1. **Autoriser les doublons d'email**
     - Supprimer l'index unique sur email
     - Désactiver le trigger de déduplication automatique
     - Permettre la création de plusieurs leads avec le même email

  2. **Suppression sécurisée (master admin uniquement)**
     - Ajouter une colonne deleted_at pour soft delete
     - Ajouter une colonne deleted_by pour traçabilité
     - Policy RLS pour autoriser DELETE uniquement au master admin
     - Fonction helper pour vérifier si user est master admin

  ## Sécurité

  - Seul le master admin peut supprimer des leads
  - Suppression tracée avec deleted_by et deleted_at
  - Les leads supprimés restent en base mais sont marqués deleted_at
*/

-- ================================================================
-- 1. Désactiver le trigger de déduplication pour autoriser doublons
-- ================================================================

DROP TRIGGER IF EXISTS trg_deduplicate_lead_before_all ON crm_leads;

COMMENT ON FUNCTION deduplicate_and_update_lead() IS 
  'DÉSACTIVÉ - Fonction de déduplication (trigger supprimé pour autoriser les doublons)';

-- ================================================================
-- 2. Supprimer l'index unique sur email
-- ================================================================

DROP INDEX IF EXISTS crm_leads_email_unique_lower;

-- ================================================================
-- 3. Ajouter colonnes pour soft delete si pas présentes
-- ================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN deleted_by uuid REFERENCES admin_users(id);
  END IF;
END $$;

-- ================================================================
-- 4. Fonction helper pour vérifier si user est master admin
-- ================================================================

CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_is_master boolean;
BEGIN
  v_user_email := auth.jwt()->>'email';
  
  IF v_user_email IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM admin_users
    WHERE email = v_user_email
    AND role = 'master'
    AND is_active = true
  ) INTO v_is_master;
  
  RETURN COALESCE(v_is_master, false);
END;
$$;

-- ================================================================
-- 5. Fonction pour soft delete d'un lead (master admin uniquement)
-- ================================================================

CREATE OR REPLACE FUNCTION soft_delete_lead(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_user_email text;
  v_lead record;
BEGIN
  IF NOT is_master_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seul le master admin peut supprimer des leads'
    );
  END IF;
  
  v_user_email := auth.jwt()->>'email';
  SELECT id INTO v_admin_id FROM admin_users WHERE email = v_user_email;
  
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead non trouvé ou déjà supprimé'
    );
  END IF;
  
  UPDATE crm_leads
  SET 
    deleted_at = NOW(),
    deleted_by = v_admin_id,
    updated_at = NOW()
  WHERE id = p_lead_id;
  
  BEGIN
    INSERT INTO crm_audit_logs (
      entity_type,
      entity_id,
      action,
      changed_by,
      changes,
      created_at
    ) VALUES (
      'lead',
      p_lead_id,
      'soft_delete',
      v_admin_id,
      jsonb_build_object(
        'lead_email', v_lead.email,
        'lead_name', v_lead.full_name,
        'deleted_at', NOW(),
        'reason', 'Master admin deletion'
      ),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not log to audit table: %', SQLERRM;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'deleted_at', NOW()
  );
END;
$$;

-- ================================================================
-- 6. Policy RLS pour la suppression (master admin uniquement)
-- ================================================================

DROP POLICY IF EXISTS "Master admins can delete leads" ON crm_leads;
DROP POLICY IF EXISTS "Only master admin can delete leads" ON crm_leads;

CREATE POLICY "Only master admin can delete leads"
  ON crm_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.email = (auth.jwt()->>'email')
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- ================================================================
-- 7. Index pour améliorer les performances des requêtes
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_crm_leads_deleted_at 
  ON crm_leads(deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_email_lower 
  ON crm_leads(LOWER(email)) 
  WHERE deleted_at IS NULL;

-- ================================================================
-- 8. Vue pour les leads actifs (non supprimés)
-- ================================================================

CREATE OR REPLACE VIEW crm_leads_active AS
SELECT * FROM crm_leads
WHERE deleted_at IS NULL;

-- ================================================================
-- 9. Fonction pour identifier les doublons (pour l'admin)
-- ================================================================

CREATE OR REPLACE FUNCTION find_duplicate_leads()
RETURNS TABLE (
  email text,
  count bigint,
  lead_ids uuid[],
  first_created timestamptz,
  last_created timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    LOWER(email) as email,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY created_at) as lead_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
  FROM crm_leads
  WHERE deleted_at IS NULL
    AND email IS NOT NULL
    AND email != ''
  GROUP BY LOWER(email)
  HAVING COUNT(*) > 1
  ORDER BY count DESC, last_created DESC;
$$;

-- ================================================================
-- Commentaires et documentation
-- ================================================================

COMMENT ON FUNCTION is_master_admin() IS
  'Vérifie si l''utilisateur connecté est un master admin actif';

COMMENT ON FUNCTION soft_delete_lead(uuid) IS
  'Supprime un lead (soft delete) - Réservé au master admin uniquement';

COMMENT ON FUNCTION find_duplicate_leads() IS
  'Liste les emails en doublon avec leurs IDs pour faciliter le nettoyage';

COMMENT ON VIEW crm_leads_active IS
  'Vue des leads actifs (non supprimés) - À utiliser dans les requêtes standards';

-- ================================================================
-- Logs de confirmation
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '✅ DOUBLONS AUTORISÉS';
  RAISE NOTICE '   - Index unique sur email supprimé';
  RAISE NOTICE '   - Trigger de déduplication désactivé';
  RAISE NOTICE '   - Les prospects peuvent soumettre plusieurs fois';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SUPPRESSION SÉCURISÉE ACTIVÉE';
  RAISE NOTICE '   - Seul le master admin peut supprimer';
  RAISE NOTICE '   - Soft delete avec traçabilité (deleted_at, deleted_by)';
  RAISE NOTICE '   - Fonction: soft_delete_lead(lead_id)';
  RAISE NOTICE '   - Helper: find_duplicate_leads() pour identifier les doublons';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VUES DISPONIBLES';
  RAISE NOTICE '   - crm_leads_active: leads non supprimés';
  RAISE NOTICE '=================================================================';
END $$;
