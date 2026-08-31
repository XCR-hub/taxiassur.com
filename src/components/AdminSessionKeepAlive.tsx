import { useEffect } from 'react';
import { NATIVE_ADMIN_TOKEN_KEY, nativeAdminSession } from '@/lib/native-admin-auth';

/**
 * Checks that the native backoffice session remains valid and keeps the cached
 * user timestamp current. Public pages do not trigger an authentication request.
 */
export const AdminSessionKeepAlive: React.FC = () => {
  useEffect(() => {
    const checkSession = async () => {
      if (!localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) return;

      try {
        await nativeAdminSession();
        const userStr = localStorage.getItem('taxiassur_user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            user.cachedAt = Date.now();
            localStorage.setItem('taxiassur_user', JSON.stringify(user));
          } catch {
            // A malformed cache is ignored; the native token remains authoritative.
          }
        }
      } catch {
        // The auth hook owns logout and redirection when the native session expires.
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default AdminSessionKeepAlive;
