/*
  # Create RPC function for FAQ entries

  1. New Functions
    - get_faq_entries: Returns all published FAQ entries

  2. Security
    - Function is accessible to anonymous users (for public FAQ page)
*/

-- Drop existing function if exists (with any signature)
DROP FUNCTION IF EXISTS get_faq_entries();

-- Function to get FAQ entries
CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    id,
    question,
    answer,
    category,
    created_at
  FROM faq_entries
  ORDER BY order_index ASC, created_at DESC;
$$;

-- Grant access to anonymous users
GRANT EXECUTE ON FUNCTION get_faq_entries() TO anon;
GRANT EXECUTE ON FUNCTION get_faq_entries() TO authenticated;
