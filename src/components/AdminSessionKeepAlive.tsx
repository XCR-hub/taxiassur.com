import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminSessionKeepAlive: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const activityTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const isBackoffice = location.pathname.startsWith('/backoffice');

    if (!isBackoffice) {
      return;
    }

    console.log('🔐 Session Keep-Alive activé pour backoffice');

    const refreshSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Erreur récupération session:', error);
          return;
        }

        if (!session) {
          console.warn('⚠️ Session perdue, pas de refresh');
          return;
        }

        const { data, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('Erreur refresh session:', refreshError);
          return;
        }

        if (data.session) {
          console.log('✅ Session admin refreshée automatiquement');
          lastActivityRef.current = Date.now();
        }
      } catch (err) {
        console.error('Erreur refresh token:', err);
      }
    };

    const checkAndRefreshIfNeeded = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          return;
        }

        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry < 5 * 60 * 1000) {
          console.log('⚠️ Token expire bientôt, refresh préventif');
          await refreshSession();
        }
      } catch (err) {
        console.error('Erreur vérification expiration:', err);
      }
    };

    const trackActivity = () => {
      lastActivityRef.current = Date.now();

      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      activityTimeoutRef.current = setTimeout(() => {
        const inactiveDuration = Date.now() - lastActivityRef.current;
        if (inactiveDuration < 30 * 60 * 1000) {
          refreshSession();
        }
      }, 10 * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, trackActivity, { passive: true });
    });

    refreshIntervalRef.current = setInterval(() => {
      checkAndRefreshIfNeeded();
    }, 2 * 60 * 1000);

    refreshSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed par Supabase');
        lastActivityRef.current = Date.now();
      }

      if (event === 'SIGNED_OUT') {
        console.log('👋 Déconnexion détectée');
        if (isBackoffice) {
          navigate('/backoffice/login');
        }
      }

      if (event === 'USER_UPDATED') {
        console.log('👤 User mis à jour');
      }
    });

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, trackActivity);
      });
      authListener.subscription.unsubscribe();
    };
  }, [location.pathname, navigate]);

  return null;
};

export default AdminSessionKeepAlive;
