/*
  # Fix Timeline RLS Permissions - Permissive Access
  
  1. Supprime les policies restrictives sur email_messages et crm_interactions
  2. Crée des policies permissives pour tous les authenticated users
  3. Permet la lecture des emails et interactions pour le backoffice
*/

-- ============================================
-- EMAIL_MESSAGES: Accès complet authenticated
-- ============================================

-- Drop les anciennes policies restrictives
DROP POLICY IF EXISTS "Authenticated admins can read email messages" ON email_messages;
DROP POLICY IF EXISTS "Authenticated admins can update email messages" ON email_messages;
DROP POLICY IF EXISTS "Authenticated admins can insert email messages" ON email_messages;

-- Nouvelle policy SELECT permissive
CREATE POLICY "Authenticated users can read all email messages"
  ON email_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Nouvelle policy UPDATE permissive
CREATE POLICY "Authenticated users can update all email messages"
  ON email_messages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Nouvelle policy INSERT permissive
CREATE POLICY "Authenticated users can insert email messages"
  ON email_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- CRM_INTERACTIONS: Accès complet authenticated
-- ============================================

-- Drop les anciennes policies en conflit
DROP POLICY IF EXISTS "Admins all interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Authenticated users can view interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Authenticated users can insert interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Unified: View interactions" ON crm_interactions;

-- Nouvelle policy SELECT permissive
CREATE POLICY "Authenticated users can read all interactions"
  ON crm_interactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Nouvelle policy INSERT permissive
CREATE POLICY "Authenticated users can insert new interactions"
  ON crm_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Nouvelle policy UPDATE permissive
CREATE POLICY "Authenticated users can update interactions"
  ON crm_interactions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Nouvelle policy DELETE permissive
CREATE POLICY "Authenticated users can delete interactions"
  ON crm_interactions
  FOR DELETE
  TO authenticated
  USING (true);
