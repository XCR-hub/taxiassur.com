/*
  # Add new permission types to user_permissions

  1. Changes
    - Drop existing CHECK constraint on `permission_type` column
    - Add new CHECK constraint with 12 permission types (was 8)
    - New types added: `facturation`, `production`, `communication`, `ia_automation`
  
  2. Why
    - The sidebar navigation has 12 categories but only 8 were manageable via permissions
    - Missing: Facturation, Production, Communication, IA & Automatisation
    - This aligns the permission system with all sidebar navigation sections
*/

ALTER TABLE user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_permission_type_check;

ALTER TABLE user_permissions
  ADD CONSTRAINT user_permissions_permission_type_check
  CHECK (permission_type = ANY (ARRAY[
    'crm_leads',
    'facturation',
    'production',
    'communication',
    'marketplace',
    'ia_automation',
    'content_ia',
    'seo',
    'backlinks',
    'social_media',
    'analytics',
    'settings'
  ]));
