import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Keeps the admin session alive by periodically checking the session.
 * Does NOT manually call refreshSession() — Supabase handles that automatically.
 * Manual refreshSession() calls conflict with Supabase's built-in token rotation
 * and cause "Invalid Refresh Token: Already Used" errors, kicking the user out.
 */
export const AdminSessionKeepAlive: React.FC = () => {
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const userStr = localStorage.getItem('taxiassur_user');
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              user.cachedAt = Date.now();
              localStorage.setItem('taxiassur_user', JSON.stringify(user));
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // Ignore errors — Supabase handles session recovery internally
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default AdminSessionKeepAlive;
