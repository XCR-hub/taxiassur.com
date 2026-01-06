import { Outlet } from 'react-router-dom';
import AdminSessionKeepAlive from './AdminSessionKeepAlive';
import AIChatBot from './AIChatBot';

export default function RootLayout() {
  return (
    <>
      <AdminSessionKeepAlive />
      <AIChatBot />
      <Outlet />
    </>
  );
}
