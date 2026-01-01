import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Upload } from 'lucide-react';
import { useOfflineQueue } from '../lib/offline-manager';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { getStatus } = useOfflineQueue();
  const [status, setStatus] = useState(getStatus());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setStatus(getStatus());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [getStatus]);

  if (isOnline && status.queueLength === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-yellow-500 text-gray-900'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          {status.isSyncing ? (
            <>
              <Upload className="h-4 w-4 animate-bounce" />
              <span className="text-sm font-medium">
                Synchronisation... ({status.queueLength} en attente)
              </span>
            </>
          ) : (
            <span className="text-sm font-medium">En ligne</span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            Hors ligne
            {status.queueLength > 0 && ` - ${status.queueLength} en attente`}
          </span>
        </>
      )}
    </div>
  );
}
