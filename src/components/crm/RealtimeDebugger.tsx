import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface RealtimeDebuggerProps {
  show?: boolean;
}

export function RealtimeDebugger({ show = false }: RealtimeDebuggerProps) {
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (!show) return;

    const channel = supabase
      .channel('debug-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_lead_documents'
        },
        (payload) => {
          console.log('🔔 Realtime event received:', payload);
          setLastEvent({
            event: payload.eventType,
            timestamp: new Date().toLocaleTimeString(),
            data: payload.new || payload.old
          });
          setEventCount(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime status:', status);
        setConnectionStatus(status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [show]);

  if (!show) return null;

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'SUBSCRIBED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'CLOSED':
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Activity className="h-5 w-5 text-yellow-600 animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'SUBSCRIBED':
        return 'bg-green-50 border-green-200';
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 w-80 border-2 rounded-lg p-4 shadow-lg ${getStatusColor()} z-50`}>
      <div className="flex items-center gap-2 mb-3">
        {getStatusIcon()}
        <div>
          <h4 className="font-semibold text-sm">Realtime Debugger</h4>
          <p className="text-xs text-gray-600">Status: {connectionStatus}</p>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Events reçus:</span>
          <span className="font-semibold">{eventCount}</span>
        </div>

        {lastEvent && (
          <div className="bg-white rounded p-2 border border-gray-200">
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-blue-600">{lastEvent.event}</span>
              <span className="text-gray-500">{lastEvent.timestamp}</span>
            </div>
            <pre className="text-[10px] overflow-x-auto">
              {JSON.stringify(lastEvent.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-[10px] text-gray-500">
          Ce composant montre les événements realtime en direct
        </p>
      </div>
    </div>
  );
}

export default RealtimeDebugger;
