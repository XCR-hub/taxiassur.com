/*
  # CRM Gestion - Complétion du système (Rôles + Portfolio)

  ## Tables et Fonctions
  1. user_roles - Rôles utilisateurs
  2. admin_user_roles - Association utilisateurs ↔ rôles  
  3. contract_portfolio - Portefeuille de contrats
  4. Fonctions RPC pour les rôles
  5. Trigger de création portfolio
*/

-- =====================================================
-- 1. TABLE: user_roles
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  crm_access text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_name ON user_roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_access ON user_roles(crm_access);

-- =====================================================
-- 2. TABLE: admin_user_roles
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(admin_user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user ON admin_user_roles(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role ON admin_user_roles(role_id);

-- =====================================================
-- 3. TABLE: contract_portfolio
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  client_id uuid NOT NULL,
  lead_id uuid REFERENCES crm_leads(id),
  contract_id uuid,
  company_id uuid REFERENCES insurance_companies(id),
  
  contract_number text UNIQUE NOT NULL,
  
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,
  company_name text,
  siret text,
  
  assigned_to uuid REFERENCES admin_users(id),
  assigned_at timestamptz,
  
  status text DEFAULT 'active',
  activation_date date NOT NULL,
  expiry_date date NOT NULL,
  renewal_date date,
  
  annual_premium_ht decimal(10,2) NOT NULL DEFAULT 0,
  annual_premium_ttc decimal(10,2) NOT NULL DEFAULT 0,
  payment_frequency text NOT NULL DEFAULT 'monthly',
  next_payment_date date,
  payment_status text DEFAULT 'up_to_date',
  
  vehicles_count integer DEFAULT 1,
  vehicles jsonb DEFAULT '[]'::jsonb,
  
  claims_count integer DEFAULT 0,
  last_claim_date date,
  modifications_count integer DEFAULT 0,
  last_modification_date date,
  client_satisfaction_score integer,
  renewal_probability integer DEFAULT 75,
  
  has_pending_actions boolean DEFAULT false,
  pending_actions jsonb DEFAULT '[]'::jsonb,
  alerts jsonb DEFAULT '[]'::jsonb,
  
  last_contact_date timestamptz,
  next_followup_date timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_client ON contract_portfolio(client_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_gestionnaire ON contract_portfolio(assigned_to);
CREATE INDEX IF NOT EXISTS idx_portfolio_status ON contract_portfolio(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_company ON contract_portfolio(company_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_renewal ON contract_portfolio(renewal_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_portfolio_payment ON contract_portfolio(payment_status) WHERE payment_status != 'up_to_date';
CREATE INDEX IF NOT EXISTS idx_portfolio_contract_num ON contract_portfolio(contract_number);

-- =====================================================
-- 4. INSERT DEFAULT ROLES
-- =====================================================

INSERT INTO user_roles (name, display_name, description, crm_access, permissions) VALUES
(
  'commercial',
  'Commercial',
  'Accès au CRM Vente uniquement',
  'vente',
  '{"leads": {"view": true, "create": true, "edit": true}, "quotes": {"create": true, "send": true}}'::jsonb
),
(
  'gestionnaire',
  'Gestionnaire de Portefeuille',
  'Accès au CRM Gestion uniquement',
  'gestion',
  '{"contracts": {"view": true, "edit": true, "manage": true}, "portfolio": {"view": true, "manage": true}}'::jsonb
),
(
  'admin',
  'Administrateur',
  'Accès complet aux 2 CRM',
  'both',
  '{"leads": {"view": true, "create": true, "edit": true}, "contracts": {"view": true, "edit": true}, "users": {"view": true, "create": true}}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view roles" ON user_roles;
CREATE POLICY "Everyone can view roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can manage roles" ON user_roles;
CREATE POLICY "Admin can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)
  );

ALTER TABLE admin_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON admin_user_roles;
CREATE POLICY "Users can view their own roles"
  ON admin_user_roles FOR SELECT
  TO authenticated
  USING (
    admin_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can manage user roles" ON admin_user_roles;
CREATE POLICY "Admin can manage user roles"
  ON admin_user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

ALTER TABLE contract_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestionnaires can view assigned contracts" ON contract_portfolio;
CREATE POLICY "Gestionnaires can view assigned contracts"
  ON contract_portfolio FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

DROP POLICY IF EXISTS "Gestionnaires can update assigned contracts" ON contract_portfolio;
CREATE POLICY "Gestionnaires can update assigned contracts"
  ON contract_portfolio FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

DROP POLICY IF EXISTS "Admin can manage portfolio" ON contract_portfolio;
CREATE POLICY "Admin can manage portfolio"
  ON contract_portfolio FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- =====================================================
-- 6. FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_roles(p_user_id uuid)
RETURNS TABLE (
  role_name text,
  display_name text,
  crm_access text,
  permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.name,
    ur.display_name,
    ur.crm_access,
    ur.permissions
  FROM admin_user_roles aur
  JOIN user_roles ur ON ur.id = aur.role_id
  WHERE aur.admin_user_id = p_user_id
    AND aur.is_active = true
    AND ur.is_active = true;
END;
$$;
