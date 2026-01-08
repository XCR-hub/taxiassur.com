import { Outlet, useLocation } from 'react-router-dom';
import AdminSessionKeepAlive from './AdminSessionKeepAlive';
import AIChatBot from './AIChatBot';

export default function RootLayout() {
  const location = useLocation();
  const isBackoffice = location.pathname.startsWith('/backoffice');

  return (
    <>
      <AdminSessionKeepAlive />
      {!isBackoffice && <AIChatBot />}
      <Outlet />
    </>
  );
}
