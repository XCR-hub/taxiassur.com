import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export const AdminSessionKeepAlive: React.FC = () => {
  const lastRefreshRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const keepAlive = async (force = false) => {
      try {
        const now = Date.now();

        // Vérifier si on a besoin de rafraîchir
        const timeSinceLastRefresh = now - lastRefreshRef.current;

        // Ne rafraîchir que :
        // 1. Si forcé (première fois)
        // 2. Si plus de 30 minutes depuis le dernier refresh
        // 3. Mais pas plus d'une fois par minute
        if (!force && timeSinceLastRefresh < 60000) {
          return; // Trop tôt
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Erreur récupération session:', sessionError);
          return;
        }

        if (!session) {
          console.log('⚠️ Pas de session active');
          return;
        }

        // Calculer le temps avant expiration
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const timeUntilExpiry = expiresAt - now;
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);

        // Ne rafraîchir que si on est à moins de 30 minutes de l'expiration
        // OU si ça fait plus de 30 minutes qu'on n'a pas rafraîchi
        const shouldRefresh =
          force ||
          minutesUntilExpiry < 30 ||
          timeSinceLastRefresh > 30 * 60 * 1000;

        if (!shouldRefresh) {
          console.log(`⏳ Session OK (expire dans ${minutesUntilExpiry} min)`);
          return;
        }

        console.log('🔄 Rafraîchissement session...');

        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('❌ Erreur refresh session:', refreshError.message);

          // Si erreur 401/403, forcer reconnexion
          if (refreshError.message?.includes('session') || refreshError.message?.includes('unauthorized')) {
            console.warn('⚠️ Session invalide, redirection vers login...');
            localStorage.removeItem('taxiassur_user');
            localStorage.removeItem('taxiassur-auth');
            window.location.href = '/backoffice';
          }
          return;
        }

        if (refreshData.session) {
          // Mettre à jour le localStorage avec la nouvelle session
          localStorage.setItem('taxiassur-auth', JSON.stringify({
            access_token: refreshData.session.access_token,
            refresh_token: refreshData.session.refresh_token,
            expires_at: refreshData.session.expires_at,
            user: refreshData.session.user
          }));

          // Mettre à jour le timestamp du cache utilisateur
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

          lastRefreshRef.current = now;
          const newExpiresAt = refreshData.session.expires_at ? refreshData.session.expires_at * 1000 : 0;
          const newMinutesUntilExpiry = Math.floor((newExpiresAt - Date.now()) / 60000);
          console.log(`✅ Session rafraîchie avec succès (expire dans ${newMinutesUntilExpiry} min)`);
        }
      } catch (error) {
        console.error('❌ Erreur keep-alive:', error);
      }
    };

    // Premier refresh immédiat (forcé)
    keepAlive(true);

    // Vérifier toutes les 5 minutes (mais ne rafraîchir que si nécessaire)
    const interval = setInterval(() => keepAlive(false), 5 * 60 * 1000);

    // Rafraîchir sur activité utilisateur (avec throttle intelligent)
    const handleActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // Seulement si la dernière activité date de plus de 10 minutes
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      if (timeSinceLastRefresh > 10 * 60 * 1000) {
        keepAlive(false);
      }
    };

    // Écouter uniquement les clics (pas trop invasif)
    window.addEventListener('click', handleActivity, { passive: true });

    // Vérifier avant fermeture
    const handleBeforeUnload = () => {
      keepAlive(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return null;
};

export default AdminSessionKeepAlive;
