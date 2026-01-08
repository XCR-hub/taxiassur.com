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
          console.warn('⚠️ Session perdue, redirection vers login');
          navigate('/backoffice');
          return;
        }

        // AMÉLIORATION : Toujours rafraîchir, même si pas expiré
        const { data, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('Erreur refresh session:', refreshError);
          // Si erreur de refresh, essayer de récupérer la session
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) {
            console.error('❌ Plus de session valide, redirection');
            navigate('/backoffice');
          }
          return;
        }

        if (data.session) {
          console.log('✅ Session admin refreshée (expires:',
            new Date(data.session.expires_at! * 1000).toLocaleTimeString('fr-FR'), ')');
          lastActivityRef.current = Date.now();

          // Sauvegarder dans le cache custom
          localStorage.setItem('taxiassur-auth', JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            user: data.session.user
          }));

          // Appeler la fonction keep-alive côté serveur
          try {
            await supabase.rpc('keep_admin_session_alive');
          } catch (rpcErr) {
            console.warn('Keep-alive RPC échoué (non critique):', rpcErr);
          }
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

    // Refresh toutes les 5 minutes (pas trop souvent pour éviter les déconnexions)
    refreshIntervalRef.current = setInterval(() => {
      checkAndRefreshIfNeeded();
    }, 5 * 60 * 1000); // 5 minutes

    // Vérification initiale au chargement
    console.log('🔄 Vérification session initiale');
    checkAndRefreshIfNeeded();

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
