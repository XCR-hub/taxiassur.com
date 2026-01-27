/*
  # Système de Rôles et Permissions Granulaires
  
  1. Nouveau système
    - Tables pour les rôles personnalisés
    - Permissions détaillées par module
    - Configuration des accès aux onglets
  
  2. Fonctionnalités
    - Rôles : Admin, Manager, Commercial, Collaborateur
    - Permissions: read, write, delete, export pour chaque module
    - Contrôle d'accès aux onglets du CRM
*/

-- Enum pour les rôles avec plus de granularité
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'commercial';
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Table des modules disponibles dans le système
CREATE TABLE IF NOT EXISTS system_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  parent_module_id uuid REFERENCES system_modules(id),
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW()
);

-- Table des permissions par module
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module_slug text NOT NULL REFERENCES system_modules(slug),
  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_export boolean DEFAULT false,
  can_validate boolean DEFAULT false,
  can_assign boolean DEFAULT false,
  custom_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(role, module_slug)
);

-- Table des permissions personnalisées par utilisateur (override les permissions de rôle)
CREATE TABLE IF NOT EXISTS user_custom_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  module_slug text NOT NULL REFERENCES system_modules(slug),
  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_export boolean DEFAULT false,
  can_validate boolean DEFAULT false,
  can_assign boolean DEFAULT false,
  custom_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, module_slug)
);

-- Insérer les modules système
INSERT INTO system_modules (slug, name, description, icon, display_order) VALUES
  ('crm_dashboard', 'Dashboard', 'Vue d ensemble du CRM', '📊', 1),
  ('crm_leads', 'Leads & Prospects', 'Gestion des leads', '👥', 2),
  ('crm_pipeline', 'Pipeline Commercial', 'Kanban et suivi des opportunités', '🎯', 3),
  ('crm_inbox', 'Inbox Multicanal', 'Emails, SMS, WhatsApp', '📧', 4),
  ('crm_documents', 'Documents', 'Gestion des documents clients', '📄', 5),
  ('crm_quotes', 'Devis & Contrats', 'Création et suivi des devis', '💰', 6),
  ('crm_production', 'Production', 'Validation et mise en production', '🏭', 7),
  ('crm_retention', 'Rétention Clients', 'Suivi et renouvellements', '🔄', 8),
  ('crm_settings', 'Paramètres CRM', 'Configuration du CRM', '⚙️', 9),
  ('analytics', 'Analytics', 'Statistiques et rapports', '📈', 10),
  ('seo', 'SEO', 'Référencement naturel', '🔍', 11),
  ('content', 'Contenu & Blog', 'Gestion de contenu', '✍️', 12),
  ('social_media', 'Réseaux Sociaux', 'Publication sur les réseaux', '📱', 13),
  ('email_marketing', 'Email Marketing', 'Campagnes emailing', '📬', 14),
  ('marketplace', 'Marketplace', 'Place de marché leads', '🛍️', 15),
  ('ai_tools', 'Outils IA', 'Intelligence artificielle', '🤖', 16),
  ('admin_users', 'Utilisateurs', 'Gestion des utilisateurs', '👤', 17),
  ('admin_roles', 'Rôles & Permissions', 'Configuration des accès', '🔐', 18),
  ('admin_integrations', 'Intégrations', 'APIs et webhooks', '🔗', 19),
  ('admin_system', 'Système', 'Configuration système', '⚡', 20)
ON CONFLICT (slug) DO NOTHING;

-- Permissions par défaut pour le rôle Master (accès complet)
INSERT INTO role_permissions (role, module_slug, can_read, can_write, can_delete, can_export, can_validate, can_assign)
SELECT 'master', slug, true, true, true, true, true, true
FROM system_modules
ON CONFLICT (role, module_slug) DO NOTHING;

-- Permissions par défaut pour le rôle Manager
INSERT INTO role_permissions (role, module_slug, can_read, can_write, can_delete, can_export, can_validate, can_assign)
SELECT 
  'manager', 
  slug, 
  true,
  CASE WHEN slug NOT IN ('admin_system', 'admin_roles') THEN true ELSE false END,
  CASE WHEN slug NOT IN ('admin_system', 'admin_roles', 'admin_users') THEN true ELSE false END,
  true,
  true,
  true
FROM system_modules
ON CONFLICT (role, module_slug) DO NOTHING;

-- Permissions par défaut pour le rôle Commercial
INSERT INTO role_permissions (role, module_slug, can_read, can_write, can_delete, can_export, can_validate, can_assign) VALUES
  ('commercial', 'crm_dashboard', true, false, false, false, false, false),
  ('commercial', 'crm_leads', true, true, false, true, false, false),
  ('commercial', 'crm_pipeline', true, true, false, true, false, false),
  ('commercial', 'crm_inbox', true, true, false, false, false, false),
  ('commercial', 'crm_documents', true, true, false, true, false, false),
  ('commercial', 'crm_quotes', true, true, false, true, false, false),
  ('commercial', 'analytics', true, false, false, true, false, false)
ON CONFLICT (role, module_slug) DO NOTHING;

-- Permissions par défaut pour le rôle Collaborateur
INSERT INTO role_permissions (role, module_slug, can_read, can_write, can_delete, can_export, can_validate, can_assign) VALUES
  ('collaborator', 'crm_dashboard', true, false, false, false, false, false),
  ('collaborator', 'crm_leads', true, true, false, false, false, false),
  ('collaborator', 'crm_inbox', true, true, false, false, false, false),
  ('collaborator', 'crm_documents', true, false, false, false, false, false),
  ('collaborator', 'analytics', true, false, false, false, false, false)
ON CONFLICT (role, module_slug) DO NOTHING;

-- Fonction pour obtenir les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid)
RETURNS TABLE (
  module_slug text,
  module_name text,
  module_icon text,
  can_read boolean,
  can_write boolean,
  can_delete boolean,
  can_export boolean,
  can_validate boolean,
  can_assign boolean,
  custom_config jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH user_role AS (
    SELECT role FROM admin_users WHERE id = p_user_id
  )
  SELECT 
    sm.slug,
    sm.name,
    sm.icon,
    COALESCE(ucp.can_read, rp.can_read, false) as can_read,
    COALESCE(ucp.can_write, rp.can_write, false) as can_write,
    COALESCE(ucp.can_delete, rp.can_delete, false) as can_delete,
    COALESCE(ucp.can_export, rp.can_export, false) as can_export,
    COALESCE(ucp.can_validate, rp.can_validate, false) as can_validate,
    COALESCE(ucp.can_assign, rp.can_assign, false) as can_assign,
    COALESCE(ucp.custom_config, rp.custom_config, '{}'::jsonb) as custom_config
  FROM system_modules sm
  LEFT JOIN user_role ur ON true
  LEFT JOIN role_permissions rp ON rp.role = ur.role AND rp.module_slug = sm.slug
  LEFT JOIN user_custom_permissions ucp ON ucp.user_id = p_user_id AND ucp.module_slug = sm.slug
  WHERE sm.is_active = true
  ORDER BY sm.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public';

-- Fonction pour vérifier si un utilisateur a une permission spécifique
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id uuid,
  p_module_slug text,
  p_permission text  -- 'read', 'write', 'delete', 'export', 'validate', 'assign'
)
RETURNS boolean AS $$
DECLARE
  v_user_role text;
  v_has_perm boolean;
BEGIN
  -- Obtenir le rôle de l'utilisateur
  SELECT role INTO v_user_role FROM admin_users WHERE id = p_user_id;
  
  IF v_user_role = 'master' THEN
    RETURN true; -- Master a tous les droits
  END IF;
  
  -- Vérifier les permissions personnalisées d'abord
  CASE p_permission
    WHEN 'read' THEN
      SELECT can_read INTO v_has_perm FROM user_custom_permissions 
      WHERE user_id = p_user_id AND module_slug = p_module_slug;
    WHEN 'write' THEN
      SELECT can_write INTO v_has_perm FROM user_custom_permissions 
      WHERE user_id = p_user_id AND module_slug = p_module_slug;
    WHEN 'delete' THEN
      SELECT can_delete INTO v_has_perm FROM user_custom_permissions 
      WHERE user_id = p_user_id AND module_slug = p_module_slug;
    WHEN 'export' THEN
      SELECT can_export INTO v_has_perm FROM user_custom_permissions 
      WHERE user_id = p_user_id AND module_slug = p_module_slug;
    WHEN 'validate' THEN
      SELECT can_validate INTO v_has_perm FROM user_custom_permissions 
      WHERE user_id = p_user_id AND module_slug = p_module_slug;
    WHEN 'assign' THEN
      SELECT can_assign INTO v_has_perm FROM user_custom_permissions 
      WHERE user_id = p_user_id AND module_slug = p_module_slug;
  END CASE;
  
  -- Si pas de permission personnalisée, utiliser la permission du rôle
  IF v_has_perm IS NULL THEN
    CASE p_permission
      WHEN 'read' THEN
        SELECT can_read INTO v_has_perm FROM role_permissions 
        WHERE role = v_user_role AND module_slug = p_module_slug;
      WHEN 'write' THEN
        SELECT can_write INTO v_has_perm FROM role_permissions 
        WHERE role = v_user_role AND module_slug = p_module_slug;
      WHEN 'delete' THEN
        SELECT can_delete INTO v_has_perm FROM role_permissions 
        WHERE role = v_user_role AND module_slug = p_module_slug;
      WHEN 'export' THEN
        SELECT can_export INTO v_has_perm FROM role_permissions 
        WHERE role = v_user_role AND module_slug = p_module_slug;
      WHEN 'validate' THEN
        SELECT can_validate INTO v_has_perm FROM role_permissions 
        WHERE role = v_user_role AND module_slug = p_module_slug;
      WHEN 'assign' THEN
        SELECT can_assign INTO v_has_perm FROM role_permissions 
        WHERE role = v_user_role AND module_slug = p_module_slug;
    END CASE;
  END IF;
  
  RETURN COALESCE(v_has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public';

-- Enable RLS
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tous les utilisateurs peuvent voir les modules"
  ON system_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Seuls les masters peuvent modifier les modules"
  ON system_modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Tous peuvent voir les permissions de rôle"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Seuls les masters peuvent modifier les permissions de rôle"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Les utilisateurs peuvent voir leurs permissions personnalisées"
  ON user_custom_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() AND role IN ('master', 'manager')
  ));

CREATE POLICY "Seuls les masters/managers peuvent modifier les permissions utilisateurs"
  ON user_custom_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role IN ('master', 'manager')
    )
  );

-- Grants
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission(uuid, text, text) TO authenticated;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON role_permissions(module_slug);
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_user ON user_custom_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_module ON user_custom_permissions(module_slug);

COMMENT ON TABLE system_modules IS 'Liste des modules disponibles dans le système';
COMMENT ON TABLE role_permissions IS 'Permissions par rôle pour chaque module';
COMMENT ON TABLE user_custom_permissions IS 'Permissions personnalisées par utilisateur (override role)';
COMMENT ON FUNCTION get_user_permissions IS 'Retourne toutes les permissions effectives d un utilisateur';
COMMENT ON FUNCTION has_permission IS 'Vérifie si un utilisateur a une permission spécifique sur un module';
