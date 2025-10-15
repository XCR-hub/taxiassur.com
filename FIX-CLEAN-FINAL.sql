ERROR:  22P02: invalid input value for enum lead_status_enum: "taxi"
QUERY:  SELECT l.id, COALESCE(l.first_name, '') as name, l.email, COALESCE(l.phone, ''), COALESCE(l.city, ''), COALESCE(l.status, 'taxi'), 'nouveau', l.created_at FROM leads l ORDER BY l.created_at DESC LIMIT limit_count OFFSET offset_count
CONTEXT:  PL/pgSQL function get_leads(text,integer,integer) line 1 at RETURN QUERY
SQL statement "SELECT COUNT(*)                 FROM get_leads(NULL, 5, 0)"
PL/pgSQL function inline_code_block line 12 at SQL statement