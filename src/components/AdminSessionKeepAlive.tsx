import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export const AdminSessionKeepAlive: React.FC = () => {
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    const keepAlive = async () => {
      try {
        // Éviter les rafraîchissements trop fréquents (max 1 par minute)
        const now = Date.now();
        if (now - lastRefreshRef.current < 60000) {
          console.log('⏭️ Skip refresh (too soon)');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Rafraîchir la session Supabase
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('❌ Erreur refresh session:', refreshError);
            return;
          }

          // Appeler la fonction RPC pour maintenir la session côté serveur
          try {
            await supabase.rpc('keep_admin_session_alive');
          } catch (rpcError) {
            // Ignorer l'erreur RPC si la fonction n'existe pas
            console.log('⚠️ RPC keep_admin_session_alive non disponible');
          }

          lastRefreshRef.current = now;
          console.log('✅ Session rafraîchie et maintenue active');
        } else {
          console.log('⚠️ Pas de session à maintenir');
        }
      } catch (error) {
        console.error('❌ Erreur keep-alive:', error);
      }
    };

    // Premier refresh immédiat
    keepAlive();

    // Refresh automatique toutes les 2 minutes (au lieu de 5)
    const interval = setInterval(keepAlive, 2 * 60 * 1000);

    // Refresh sur activité utilisateur (avec throttle de 1 min)
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
