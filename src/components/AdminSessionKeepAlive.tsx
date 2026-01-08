import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const AdminSessionKeepAlive: React.FC = () => {
  useEffect(() => {
    const keepAlive = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.refreshSession();
          await supabase.rpc('keep_admin_session_alive');
          console.log('✅ Session maintenue active');
        }
      } catch (error) {
        console.error('Erreur keep-alive:', error);
      }
    };

    keepAlive();

    const interval = setInterval(keepAlive, 5 * 60 * 1000);

    const handleActivity = () => {
      keepAlive();
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  return null;
};

export default AdminSessionKeepAlive;
