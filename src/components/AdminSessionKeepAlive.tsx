import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export const AdminSessionKeepAlive: React.FC = () => {
  const lastRefreshRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef<boolean>(false);

  useEffect(() => {
    const keepAlive = async (force = false) => {
      if (isRefreshingRef.current) {
        return;
      }

      try {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshRef.current;

        if (!force && timeSinceLastRefresh < 60000) {
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          return;
        }

        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const timeUntilExpiry = expiresAt - now;
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);

        const shouldRefresh =
          force ||
          minutesUntilExpiry < 30 ||
          timeSinceLastRefresh > 30 * 60 * 1000;

        if (!shouldRefresh) {
          return;
        }

        isRefreshingRef.current = true;
        console.log('🔄 Rafraîchissement session...');

        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('❌ Erreur refresh session:', refreshError.message);
          return;
        }

        if (refreshData.session) {
          localStorage.setItem('taxiassur-auth', JSON.stringify({
            access_token: refreshData.session.access_token,
            refresh_token: refreshData.session.refresh_token,
            expires_at: refreshData.session.expires_at,
            user: refreshData.session.user
          }));

          const userStr = localStorage.getItem('taxiassur_user');
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              user.cachedAt = Date.now();
              localStorage.setItem('taxiassur_user', JSON.stringify(user));
            } catch (e) {
              console.warn('⚠️ Erreur mise à jour cache user:', e);
            }
          }

          lastRefreshRef.current = Date.now();
          const newExpiresAt = refreshData.session.expires_at ? refreshData.session.expires_at * 1000 : 0;
          const newMinutesUntilExpiry = Math.floor((newExpiresAt - Date.now()) / 60000);
          console.log(`✅ Session rafraîchie (expire dans ${newMinutesUntilExpiry} min)`);
        }
      } catch (error) {
        console.error('❌ Erreur keep-alive:', error);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    keepAlive(true);

    const interval = setInterval(() => keepAlive(false), 5 * 60 * 1000);

    const handleActivity = () => {
      const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
      if (timeSinceLastRefresh > 20 * 60 * 1000) {
        keepAlive(false);
      }
    };

    window.addEventListener('click', handleActivity, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
    };
  }, []);

  return null;
};

export default AdminSessionKeepAlive;
