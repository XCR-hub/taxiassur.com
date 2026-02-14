/*
  # Fix Delete Spam Lead Function - 14 Février 2026

  ## Problème
  La fonction `delete_spam_lead` n'est pas trouvée lors de l'appel depuis le frontend.
  Erreur: "Could not find the function public.delete_spam_lead(to_lead_id, p_reason)"

  ## Solution
  Recréer la fonction et ses dépendances de manière sécurisée.

  ## Fonctions créées
  1. `safe_delete_lead()` - Suppression sécurisée avec logging
  2. `delete_spam_lead()` - RPC publique pour les admins
*/

-- Table de log pour les suppressions (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS lead_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  lead_email text,
  lead_name text,
  deletion_reason text NOT NULL,
  deleted_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz DEFAULT now(),
  lead_data jsonb
);

-- RLS pour lead_deletion_log
ALTER TABLE lead_deletion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view deletion logs" ON lead_deletion_log;
CREATE POLICY "Admin can view deletion logs"
  ON lead_deletion_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can insert deletion logs" ON lead_deletion_log;
CREATE POLICY "Admin can insert deletion logs"
  ON lead_deletion_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Fonction : Suppression sécurisée d'un lead
CREATE OR REPLACE FUNCTION safe_delete_lead(
  p_lead_id uuid,
  p_deletion_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_data jsonb;
  v_result jsonb;
  v_deleted_count integer;
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Accès refusé - Seuls les admins peuvent supprimer des leads'
    );
  END IF;

  -- Récupérer les données du lead avant suppression
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'email', email,
    'phone', phone,
    'city', city,
    'status', status,
    'pipeline_stage', pipeline_stage,
    'created_at', created_at
  )
  INTO v_lead_data
  FROM crm_leads
  WHERE id = p_lead_id;

  IF v_lead_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead introuvable'
    );
  END IF;

  -- Logger la suppression AVANT de supprimer
  INSERT INTO lead_deletion_log (
    lead_id,
    lead_email,
    lead_name,
    deletion_reason,
    deleted_by,
    lead_data
  ) VALUES (
    p_lead_id,
    v_lead_data->>'email',
    v_lead_data->>'name',
    p_deletion_reason,
    auth.uid(),
    v_lead_data
  );

  -- Supprimer le lead
  DELETE FROM crm_leads WHERE id = p_lead_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur lors de la suppression'
    );
  END IF;

  -- Retourner succès
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Lead supprimé avec succès',
    'lead_data', v_lead_data,
    'deleted_by', auth.uid()
  );

  RETURN v_result;
END;
$$;

-- Fonction RPC publique pour les admins
CREATE OR REPLACE FUNCTION delete_spam_lead(
  p_lead_id uuid,
  p_reason text DEFAULT 'Spam ou faux lead détecté'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN safe_delete_lead(p_lead_id, p_reason);
END;
$$;

-- Commentaires
COMMENT ON TABLE lead_deletion_log IS 'Log d''audit des suppressions de leads';
COMMENT ON FUNCTION safe_delete_lead IS 'Suppression sécurisée d''un lead avec logging (admin only)';
COMMENT ON FUNCTION delete_spam_lead IS 'RPC publique pour supprimer un spam lead (admins only)';
