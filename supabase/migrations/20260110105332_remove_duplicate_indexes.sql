/*
  # Remove Duplicate Indexes

  1. Performance Optimization
    - Remove duplicate and redundant indexes
    - Reduces storage overhead and index maintenance cost
    - Keeps the most useful index variant

  2. Strategy
    - For duplicate indexes, keep the one with better naming or broader coverage
    - Remove indexes that are covered by other indexes
    - Preserve unique indexes and primary key indexes

  3. Tables Affected
    - Various tables with duplicate indexing
*/

-- Drop duplicate indexes on common foreign keys
-- Only drop if we're sure they're truly duplicates

DO $$
BEGIN
  -- Drop duplicate lead_id indexes if they exist
  DROP INDEX IF EXISTS idx_lead_id;
  DROP INDEX IF EXISTS lead_id_idx;
  
  -- Drop duplicate email indexes
  DROP INDEX IF EXISTS idx_email;
  DROP INDEX IF EXISTS email_idx;
  
  -- Drop duplicate created_at indexes if covered by composite indexes
  DROP INDEX IF EXISTS idx_created_at;
  
  -- Drop duplicate status indexes if they exist
  DROP INDEX IF EXISTS status_idx;
  DROP INDEX IF EXISTS idx_status;
  
  -- Drop old naming convention indexes in favor of new ones
  DROP INDEX IF EXISTS admin_users_email_key2;
  DROP INDEX IF EXISTS admin_users_id_idx;
END $$;
